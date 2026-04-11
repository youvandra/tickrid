import { createRedis, CHANNEL_PRICES, HASH_PAIR_COUNTS, KEY_PRICE_PREFIX, KEY_SERIES_PREFIX } from "../redis/index.js";
import type { PricePubSubMessage } from "../protocol.js";
import type pg from "pg";
import { fetchMockStock, isStockSymbol } from "./priceProviders/mockStocks.js";
import { fetchTwelveSeries } from "./priceProviders/twelvedata.js";
import { fetchYahooSeries } from "./priceProviders/yahooFinance.js";

function isCryptoPair(pair: string): boolean {
  return pair.includes("/") && !pair.includes(" ");
}

type MarketServiceOptions = {
  redisUrl: string;
  pollIntervalMs: number;
  pool: pg.Pool;
};

type CachedPrice = {
  pair: string;
  price: number;
  change: number;
  ts: number;
};

export async function startMarketService(opts: MarketServiceOptions): Promise<() => Promise<void>> {
  const redis = createRedis(opts.redisUrl);
  await redis.connect();

  let stopped = false;
  const activePairs = new Set<string>();
  const indoStockSymbols = new Set<string>();
  let lastIndoRefreshTs = 0;
  const twelveApiKey = process.env.TWELVE_DATA_API_KEY || "";
  const twelveCacheMs = (Number(process.env.TWELVE_CACHE_SECONDS ?? "60") || 60) * 1000;
  const yahooCacheMs = (Number(process.env.YAHOO_CACHE_SECONDS ?? "30") || 30) * 1000;
  const indoRefreshMs = (Number(process.env.INDO_SYMBOLS_REFRESH_SECONDS ?? "600") || 600) * 1000; // default 10m
  const logMarketPolls = process.env.LOG_MARKET_POLLS === "1";

  async function refreshActivePairs(): Promise<void> {
    const counts = await redis.hGetAll(HASH_PAIR_COUNTS);
    activePairs.clear();
    for (const [pair, countStr] of Object.entries(counts)) {
      const count = Number(countStr);
      if (Number.isFinite(count) && count > 0) activePairs.add(pair);
    }
  }

  async function refreshIndoStockSetIfNeeded(): Promise<void> {
    if (Date.now() - lastIndoRefreshTs < indoRefreshMs && indoStockSymbols.size > 0) return;
    lastIndoRefreshTs = Date.now();
    try {
      const res = await opts.pool.query<{ symbol: string }>(
        `
        SELECT symbol
        FROM symbols
        WHERE
          type = 'stocks'
          AND currency_quote IS NOT NULL
          AND (
            upper(currency_quote) = 'IDR'
            OR upper(currency_quote) LIKE '%RUPIAH%'
          )
        `,
      );
      indoStockSymbols.clear();
      for (const r of res.rows) {
        const sym = String(r.symbol ?? "").trim().toUpperCase();
        if (sym) indoStockSymbols.add(sym);
      }
      if (logMarketPolls) console.log(`[MarketService] Loaded Indo stock symbols: ${indoStockSymbols.size}`);
    } catch (e) {
      // Don't break market loop if this fails.
      console.warn("[MarketService] Failed to refresh Indo stock symbols:", e);
    }
  }

  async function computeAndPublish(pair: string): Promise<void> {
    const cacheKey = `${KEY_PRICE_PREFIX}${pair}`;
    const cachedStr = await redis.get(cacheKey);
    const minAgeMs = twelveApiKey && isCryptoPair(pair) ? twelveCacheMs : yahooCacheMs;
    const cacheTtlSec = Math.max(1, Math.ceil(minAgeMs / 1000));
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr) as CachedPrice;
        if (Date.now() - cached.ts < minAgeMs) return;
      } catch {
      }
    }

    let price = 0;
    let change = 0;
    let intervalSec: number | undefined;
    let history: number[] | undefined;

    if (isCryptoPair(pair)) {
      if (twelveApiKey) {
        try {
          if (logMarketPolls) console.log(`[MarketService] Polling ${pair}...`);
          const { closes, latest } = await fetchTwelveSeries(pair, twelveApiKey, "1min", 32);
          if (closes.length >= 2) {
            price = latest;
            intervalSec = 60;
            history = closes;
            const oldest = closes[0];
            const newest = closes[closes.length - 1];
            change = ((newest - oldest) / oldest) * 100;
            await redis.set(
              `${KEY_SERIES_PREFIX}${pair}`,
              JSON.stringify({ pair, interval_sec: intervalSec, history, ts: Date.now() }),
              { EX: 120 },
            );
          } else {
            return;
          }
        } catch (e) {
          console.error(`TwelveData poll failed for ${pair}:`, e);
          return;
        }
      } else {
        return;
      }
    } else if (isStockSymbol(pair)) {
      // Stocks: fetch from Yahoo Finance (no API key). Fallback to mock if Yahoo fails.
      await refreshIndoStockSetIfNeeded();
      const pairUpper = pair.toUpperCase();
      const isIndo = pairUpper.endsWith(".JK") || indoStockSymbols.has(pairUpper);
      // User requirement: Indonesian stocks MUST use .JK (no fallback to non-.JK).
      const trySymbols = isIndo
        ? [pairUpper.endsWith(".JK") ? pairUpper : `${pairUpper}.JK`]
        : [pairUpper];
      let ok = false;
      for (const yahooSymbol of trySymbols) {
        try {
          if (logMarketPolls) console.log(`[MarketService] Polling ${pair} via Yahoo (${yahooSymbol})...`);
          const { closes, latest } = await fetchYahooSeries(yahooSymbol, { interval: "1m", range: "1d" });
          if (closes.length >= 2) {
            price = latest;
            intervalSec = 60;
            history = closes.slice(-64); // cap size
            const oldest = history[0]!;
            const newest = history[history.length - 1]!;
            change = ((newest - oldest) / oldest) * 100;
          } else {
            price = latest;
            change = 0;
          }
          await redis.set(
            `${KEY_SERIES_PREFIX}${pair}`,
            JSON.stringify({ pair, interval_sec: intervalSec, history, ts: Date.now() }),
            { EX: 120 },
          );
          ok = true;
          break;
        } catch (e) {
          // try next candidate
          if (logMarketPolls) console.warn(`[MarketService] Yahoo failed for ${yahooSymbol}:`, e);
        }
      }
      if (!ok) {
        const r = await fetchMockStock(redis, pair);
        price = r.price;
        change = r.change;
      }
    } else {
      return;
    }

    const message: PricePubSubMessage = { pair, price, change, ts: Date.now(), interval_sec: intervalSec, history };
    await redis.set(cacheKey, JSON.stringify(message), { EX: cacheTtlSec });
    await redis.publish(CHANNEL_PRICES, JSON.stringify(message));
  }

  const tick = async (): Promise<void> => {
    if (stopped) return;
    await refreshActivePairs();
    const pairs = Array.from(activePairs);
    await Promise.allSettled(pairs.map((p) => computeAndPublish(p)));
    setTimeout(() => void tick(), opts.pollIntervalMs);
  };

  void tick();

  return async () => {
    stopped = true;
    await redis.quit();
  };
}
