import { createPool, ensureSchema, upsertSymbols } from "../db/index.js";
import { requireEnv } from "../env.js";

type SeedItem = {
  symbol: string;
  type: string;
  available_exchanges: string[];
  currency_base?: string;
  currency_quote?: string;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchText(url: string, referer?: string): Promise<string> {
  const headers: Record<string, string> = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
  };
  if (referer) headers.referer = referer;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`fetch_failed ${res.status} ${url}`);
  return await res.text();
}

async function getTop100GlobalStocksFromStockAnalysis(): Promise<SeedItem[]> {
  // Source: https://stockanalysis.com/list/biggest-companies/
  const html = await fetchText("https://stockanalysis.com/list/biggest-companies/", "https://stockanalysis.com/");
  const re =
    /<td class="sym[^>]*>\s*<!----><a href="\/stocks\/[^/]+\/">([A-Z0-9.\-]+)<\/a>.*?<\/td>\s*<!--\]-->.*?<td class="slw[^>]*">([^<]+)<\/td>/gms;
  const items: SeedItem[] = [];
  for (const match of html.matchAll(re)) {
    const symbol = String(match[1] ?? "").trim().toUpperCase();
    const name = String(match[2] ?? "").trim();
    if (!symbol) continue;
    items.push({
      symbol,
      type: "stocks",
      available_exchanges: ["Yahoo Finance"],
      currency_base: name,
      currency_quote: "US Dollar",
    });
    if (items.length >= 100) break;
  }
  if (items.length < 50) {
    throw new Error(`parse_failed_global_only_got_${items.length}`);
  }
  return items;
}

async function getAllIndonesiaStocksFromKontan(): Promise<SeedItem[]> {
  // Source: https://emiten.kontan.co.id/daftar-emiten (paginated)
  const maxPage = 199;
  const urls: string[] = ["https://emiten.kontan.co.id/daftar-emiten"];
  for (let p = 2; p <= maxPage; p += 1) urls.push(`https://emiten.kontan.co.id/daftar-emiten/halaman/${p}`);

  const out = new Map<string, SeedItem>();
  const re = />\s*([^<>]+?)\s*\(([A-Z0-9]{3,8})\)\s*</g;

  // Be gentle to the site: small concurrency.
  for (const batch of chunk(urls, 6)) {
    const pages = await Promise.all(batch.map((u) => fetchText(u)));
    for (const html of pages) {
      for (const m of html.matchAll(re)) {
        const name = String(m[1] ?? "").trim();
        const symbol = String(m[2] ?? "").trim().toUpperCase();
        if (!symbol) continue;
        // User requested no ".JK" suffix stored in symbols table.
        out.set(symbol, {
          symbol,
          type: "stocks",
          available_exchanges: ["Yahoo Finance"],
          currency_base: name || undefined,
          currency_quote: "Indonesian Rupiah",
        });
      }
    }
  }

  const items = Array.from(out.values());
  if (items.length < 200) {
    throw new Error(`parse_failed_indo_only_got_${items.length}`);
  }
  return items;
}

async function main(): Promise<void> {
  const includeGlobal = !hasFlag("--indo-only");
  const includeIndo = !hasFlag("--global-only");

  const postgresUrl = requireEnv("POSTGRES_URL");
  const pool = createPool(postgresUrl);
  await ensureSchema(pool);

  const items: SeedItem[] = [];
  if (includeGlobal) {
    try {
      const global = await getTop100GlobalStocksFromStockAnalysis();
      items.push(...global);
      console.log(`[seed] global stocks: ${global.length}`);
    } catch (e) {
      console.warn("[seed] global stocks fetch failed, skipping:", e);
    }
  }
  if (includeIndo) {
    const indo = await getAllIndonesiaStocksFromKontan();
    items.push(...indo);
    console.log(`[seed] indonesia stocks: ${indo.length}`);
  }

  const upsertCount = await upsertSymbols(pool, items);
  console.log(`[seed] upserted: ${upsertCount}`);
  await pool.end();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});

