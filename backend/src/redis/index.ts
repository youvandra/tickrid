import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

export function createRedis(url: string): RedisClient {
  return createClient({ url });
}

export const CHANNEL_PRICES = "tickr:prices";
export const CHANNEL_CONFIG_PUSH = "tickr:config_push";

export const KEY_PRICE_PREFIX = "tickr:price:";
export const KEY_ONLINE_PREFIX = "tickr:online:";

export const HASH_PAIR_COUNTS = "tickr:pair_counts";
export const KEY_SERIES_PREFIX = "tickr:series:";
