import type { RedisClient } from "../../redis/index.js";

export function isStockSymbol(pair: string): boolean {
  return !pair.includes("/") && /^[A-Z0-9.\-]{1,10}$/i.test(pair);
}

function seedFromSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  return 50 + (hash % 200);
}

export async function fetchMockStock(
  redis: RedisClient,
  symbol: string,
): Promise<{ price: number; change: number }> {
  const key = `tickr:stock:${symbol.toUpperCase()}`;
  const prevStr = await redis.get(key);
  const prev = prevStr ? Number(prevStr) : seedFromSymbol(symbol.toUpperCase());
  const step = (Math.random() - 0.5) * 0.8;
  const next = Math.max(1, prev + step);
  const change = ((next - prev) / prev) * 100;
  await redis.set(key, String(next), { EX: 60 * 60 });
  return { price: next, change };
}
