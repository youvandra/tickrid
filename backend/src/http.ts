import express from "express";
import cors from "cors";
import type pg from "pg";
import { createRedis, CHANNEL_CONFIG_PUSH, HASH_PAIR_COUNTS, KEY_ONLINE_PREFIX, KEY_SERIES_PREFIX } from "./redis/index.js";
import { fetchTwelveSeries } from "./services/priceProviders/twelvedata.js";
import {
  getConfiguration,
  getDevice,
  getSymbols,
  getDevicesAdmin,
  upsertConfiguration,
  upsertDevice,
  upsertSymbols,
} from "./db/index.js";

const CRYPTO_PAIRS: string[] = [];
const STOCK_SYMBOLS: string[] = [];

function normalizeOrigin(input: string): string {
  return input.replace(/\/$/, "");
}

function parseCorsOrigins(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

function requireAdminKey(req: express.Request, res: express.Response): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    res.status(500).json({ error: "missing_admin_api_key" });
    return false;
  }
  const provided = req.header("x-admin-key") ?? "";
  if (provided !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

function uniqStrings(input: string[]): string[] {
  return Array.from(new Set(input.map((s) => s.trim()).filter(Boolean)));
}

function diffPairs(prev: string[], next: string[]): { added: string[]; removed: string[] } {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  const added = Array.from(nextSet).filter((p) => !prevSet.has(p));
  const removed = Array.from(prevSet).filter((p) => !nextSet.has(p));
  return { added, removed };
}

function normalizeTickers(
  input: unknown,
): Array<{ type?: string; symbol: string; interval?: string; exchange?: string; show_interval?: boolean }> {
  const out: Array<{ type?: string; symbol: string; interval?: string; exchange?: string; show_interval?: boolean }> = [];
  const arr = Array.isArray(input) ? input : [];
  for (const item of arr) {
    let obj: any = item;
    if (typeof item === "string") {
      try {
        obj = JSON.parse(item);
      } catch {
        continue;
      }
    }
    if (!obj || typeof obj !== "object") continue;
    const symbol = typeof obj.symbol === "string" ? String(obj.symbol) : "";
    if (!symbol) continue;
    const type = typeof obj.type === "string" ? String(obj.type) : undefined;
    const interval = typeof obj.interval === "string" ? String(obj.interval) : undefined;
    const exchange = typeof obj.exchange === "string" ? String(obj.exchange) : undefined;
    const show_interval = typeof obj.show_interval === "boolean" ? Boolean(obj.show_interval) : undefined;
    out.push({ symbol, type, interval, exchange, show_interval });
  }
  return out;
}

export async function createHttpApp(opts: {
  pool: pg.Pool;
  redisUrl: string;
  webBaseUrl: string;
}): Promise<{ app: express.Express; close: () => Promise<void> }> {
  const redis = createRedis(opts.redisUrl);
  await redis.connect();
  const twelveCacheSec = Number(process.env.TWELVE_CACHE_SECONDS ?? "60") || 60;
  const logSeriesRequests = process.env.LOG_SERIES_REQUESTS === "1";

  const app = express();
  const corsOrigins = parseCorsOrigins(
    process.env.CORS_ORIGINS ?? [opts.webBaseUrl, "http://localhost:3000", "http://127.0.0.1:3000"].join(","),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser clients (no Origin header). For browsers, only allow configured origins.
        if (!origin) return cb(null, true);
        if (corsOrigins.includes("*")) return cb(null, true);
        return cb(null, corsOrigins.includes(normalizeOrigin(origin)));
      },
    }),
  );
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/assets", (_req, res) => {
    res.json({
      crypto: CRYPTO_PAIRS.map((pair) => ({ type: "crypto", pair })),
      stocks: STOCK_SYMBOLS.map((pair) => ({ type: "stock", pair })),
      // Keep these in-sync with the web UI type values.
      types: ["crypto", "stock", "etf", "forex", "commodity"],
      intervals: {
        m: [1, 5, 15, 30, 45],
        h: [1, 2, 4],
        d: [1],
        w: [1],
        mo: [1]
      }
    });
  });

  app.get("/api/series", async (req, res) => {
    const symbol = String(req.query.symbol ?? req.query.pair ?? "");
    const interval = String(req.query.interval ?? "1min");
    const exchange = req.query.exchange ? String(req.query.exchange) : "";
    const points = Math.max(2, Math.min(128, Number(req.query.points ?? 32)));
    
    const apiKey = process.env.TWELVE_DATA_API_KEY || "";
    const timezone = process.env.TWELVE_TIMEZONE || "Asia/Jakarta";
    if (!symbol) return res.status(400).json({ error: "missing_symbol" });
    if (symbol.length > 64) return res.status(400).json({ error: "symbol_too_long" });
    if (exchange.length > 32) return res.status(400).json({ error: "exchange_too_long" });

    if (logSeriesRequests) {
      console.log(`[API] Series request: symbol=${symbol}, interval=${interval}, exchange=${exchange}, points=${points}`);
    }

    const cacheKey = `${KEY_SERIES_PREFIX}${symbol}:${exchange}:${interval}:${points}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return res.json(JSON.parse(cached));
      } catch {
      }
    }

    try {
      if (!apiKey) throw new Error("missing_twelve_data_api_key");

      const { closes, latest } = await fetchTwelveSeries(symbol, apiKey, interval, points, {
        exchange: exchange || undefined,
        timezone,
      });

      const oldest = closes[0];
      const newest = closes[closes.length - 1];
      const change = oldest !== 0 ? ((newest - oldest) / oldest) * 100 : 0;

      const payload = {
        symbol,
        exchange: exchange || null,
        interval,
        latest,
        change,
        closes,
        ts: Date.now(),
      };

      await redis.set(cacheKey, JSON.stringify(payload), { EX: twelveCacheSec });
      return res.json(payload);
    } catch (e: any) {
      if (e?.message === "twelve_data_rate_limit") {
        return res.status(429).json({ error: "twelve_data_rate_limit" });
      }
      console.error(`Error fetching series for ${symbol}:`, e);
      return res.status(502).json({ error: "twelve_data_error" });
    }
  });

  app.get("/api/devices/:deviceId", async (req, res) => {
    const deviceId = req.params.deviceId;
    if (!deviceId) return res.status(400).json({ error: "missing_device_id" });
    if (deviceId.length > 64) return res.status(400).json({ error: "device_id_too_long" });
    await upsertDevice(opts.pool, deviceId);
    const [device, config, online] = await Promise.all([
      getDevice(opts.pool, deviceId),
      getConfiguration(opts.pool, deviceId),
      redis.exists(`${KEY_ONLINE_PREFIX}${deviceId}`),
    ]);
    res.json({
      device,
      configuration: config,
      online: online === 1,
      pairing_url: `${opts.webBaseUrl.replace(/\/$/, "")}/setup?device_id=${encodeURIComponent(
        deviceId,
      )}`,
    });
  });

  app.put("/api/devices/:deviceId/config", async (req, res) => {
    const deviceId = req.params.deviceId;
    if (!deviceId) return res.status(400).json({ error: "missing_device_id" });
    if (deviceId.length > 64) return res.status(400).json({ error: "device_id_too_long" });

    const body = req.body as {
      pairs?: unknown;
      rotation_interval?: unknown;
      tickers?: unknown;
      rotate_seconds?: unknown;
      display_mode?: unknown;
      brightness?: unknown;
    };

    const pairsRaw = Array.isArray(body.pairs) ? body.pairs : [];
    const pairs = uniqStrings(pairsRaw.filter((x): x is string => typeof x === "string"));
    if (pairs.length > 8) return res.status(400).json({ error: "max_8_pairs" });

    const rotationInterval = typeof body.rotation_interval === "number" ? body.rotation_interval : 10;
    if (!Number.isFinite(rotationInterval) || rotationInterval < 0 || rotationInterval > 3600) {
      return res.status(400).json({ error: "invalid_rotation_interval" });
    }
    const tickers = Array.isArray(body.tickers) ? body.tickers : [];
    const rotateSeconds = typeof body.rotate_seconds === "number" ? body.rotate_seconds : 60;
    const displayMode = typeof body.display_mode === "string" ? body.display_mode : "auto";
    const brightness = typeof body.brightness === "number" ? body.brightness : 100;
    const normalizedTickers = normalizeTickers(tickers);
    const tickerCount = normalizedTickers.length;

    if (displayMode === "one" && tickerCount !== 1) {
      return res.status(400).json({ error: "one_requires_1_ticker" });
    }
    if (displayMode === "two" && tickerCount !== 2) {
      return res.status(400).json({ error: "two_requires_2_tickers" });
    }
    if (displayMode === "multi_one" && tickerCount < 2) {
      return res.status(400).json({ error: "multi_one_requires_2_tickers" });
    }
    if (displayMode === "multi_two" && tickerCount < 4) {
      return res.status(400).json({ error: "multi_two_requires_4_tickers" });
    }

    await upsertDevice(opts.pool, deviceId);
    const prevCfg = await getConfiguration(opts.pool, deviceId);
    const prevPairs = prevCfg?.pairs ?? [];

    const rotationIntervalToStore = displayMode === "multi_one" || displayMode === "multi_two" ? rotationInterval : 0;
    const rotateSecondsToStore = displayMode === "multi_one" || displayMode === "multi_two" ? rotateSeconds : 0;
    await upsertConfiguration(opts.pool, {
      deviceId,
      pairs,
      rotationInterval: rotationIntervalToStore,
      tickers: normalizedTickers,
      rotateSeconds: rotateSecondsToStore,
      displayMode,
      brightness,
    });

    const { added, removed } = diffPairs(prevPairs, pairs);
    const multi = redis.multi();
    for (const p of added) multi.hIncrBy(HASH_PAIR_COUNTS, p, 1);
    for (const p of removed) multi.hIncrBy(HASH_PAIR_COUNTS, p, -1);
    await multi.exec();

    await redis.publish(
      CHANNEL_CONFIG_PUSH,
      JSON.stringify({ device_id: deviceId, pairs, rotation_interval: rotationInterval }),
    );

    res.json({ ok: true });
  });

  app.get("/api/admin/symbols", async (req, res) => {
    const type = req.query.type ? String(req.query.type) : undefined;
    const q = req.query.q ? String(req.query.q) : undefined;
    const limitRaw = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const effectiveLimit = Math.max(1, Math.min(500, limitRaw ?? 200));
    const rows = await getSymbols(opts.pool, { type, search: q, limit: effectiveLimit, offset });
    res.json({ data: rows, offset: offset ?? 0, limit: effectiveLimit, has_more: rows.length === effectiveLimit });
  });

  // Public stats endpoint for UI counts (no mock numbers).
  app.get("/api/symbols/stats", async (_req, res) => {
    const byTypeRes = await opts.pool.query<{ type: string; count: string }>(
      `SELECT type, COUNT(*)::text AS count FROM symbols GROUP BY type ORDER BY type ASC`,
    );
    const totalRes = await opts.pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM symbols`);
    const by_type: Record<string, number> = {};
    for (const r of byTypeRes.rows) by_type[String(r.type)] = Number(r.count);
    const total = Number(totalRes.rows[0]?.count ?? 0);
    res.json({ total, by_type });
  });

  app.post("/api/admin/symbols/upload", async (req, res) => {
    if (!requireAdminKey(req, res)) return;
    const body = req.body as { data?: unknown; type?: unknown };
    const data = Array.isArray((body as any)?.data) ? (body as any).data : undefined;
    if (!data) return res.status(400).json({ error: "missing_data" });
    const defaultType = typeof body.type === "string" ? String(body.type) : undefined;
    const items: Array<{
      symbol: string;
      type?: string;
      available_exchanges?: string[];
      currency_base?: string;
      currency_quote?: string;
    }> = [];
    for (const it of data) {
      if (!it || typeof it !== "object") continue;
      const symbol = typeof (it as any).symbol === "string" ? String((it as any).symbol) : "";
      if (!symbol) continue;
      const type = typeof (it as any).type === "string" ? String((it as any).type) : defaultType;
      const available_exchanges = Array.isArray((it as any).available_exchanges)
        ? (it as any).available_exchanges.filter((x: any) => typeof x === "string")
        : [];
      const currency_base = typeof (it as any).currency_base === "string" ? String((it as any).currency_base) : undefined;
      const currency_quote = typeof (it as any).currency_quote === "string" ? String((it as any).currency_quote) : undefined;
      items.push({ symbol, type, available_exchanges, currency_base, currency_quote });
    }
    const count = await upsertSymbols(opts.pool, items);
    res.json({ ok: true, upserted: count });
  });

  app.get("/api/admin/devices", async (req, res) => {
    if (!requireAdminKey(req, res)) return;
    const q = req.query.q ? String(req.query.q) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const rows = await getDevicesAdmin(opts.pool, { search: q, limit });
    res.json({ data: rows });
  });

  return {
    app,
    close: async () => {
      await redis.quit();
    },
  };
}
