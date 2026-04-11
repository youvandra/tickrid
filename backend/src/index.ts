import http from "node:http";
import { createPool, ensureSchema } from "./db/index.js";
import { envNumber, envRole, envString, requireEnv } from "./env.js";
import { createHttpApp } from "./http.js";
import { getAllConfigurations } from "./db/index.js";
import { createRedis, HASH_PAIR_COUNTS } from "./redis/index.js";
import { startMarketService } from "./services/marketService.js";
import { startDeviceWsServer } from "./ws/deviceServer.js";

async function main(): Promise<void> {
  const role = envRole();
  const httpPort = envNumber("HTTP_PORT", 4000);
  const webBaseUrl = envString("WEB_BASE_URL", "http://localhost:3000");

  const postgresUrl = requireEnv("POSTGRES_URL");
  const redisUrl = requireEnv("REDIS_URL");
  const pollIntervalMs = envNumber("POLL_INTERVAL_MS", 3000);

  const pool = createPool(postgresUrl);
  await ensureSchema(pool);

  {
    const redis = createRedis(redisUrl);
    await redis.connect();
    const configs = await getAllConfigurations(pool);
    const counts = new Map<string, number>();
    for (const cfg of configs) {
      for (const pair of cfg.pairs) counts.set(pair, (counts.get(pair) ?? 0) + 1);
    }
    await redis.del(HASH_PAIR_COUNTS);
    if (counts.size > 0) {
      const args: Record<string, string> = {};
      for (const [k, v] of counts.entries()) args[k] = String(v);
      await redis.hSet(HASH_PAIR_COUNTS, args);
    }
    await redis.quit();
  }

  let stopMarket: null | (() => Promise<void>) = null;
  let stopWs: null | (() => Promise<void>) = null;
  let stopHttp: null | (() => Promise<void>) = null;
  let server: http.Server | null = null;

  if (role === "all" || role === "ws") {
    const { app, close } = await createHttpApp({ pool, redisUrl, webBaseUrl });
    stopHttp = close;
    server = http.createServer(app);
    stopWs = await startDeviceWsServer({ server, pool, redisUrl });
    await new Promise<void>((resolve) => server!.listen(httpPort, resolve));
    console.log(`tickr.id backend listening on :${httpPort}`);
  }

  if (role === "all" || role === "market") {
    stopMarket = await startMarketService({ redisUrl, pollIntervalMs, pool });
    console.log(`tickr.id market service started (poll ${pollIntervalMs}ms)`);
  }

  const shutdown = async (): Promise<void> => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await Promise.allSettled([stopWs?.(), stopHttp?.(), stopMarket?.()]);
    await pool.end();
  };

  process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
  process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
}

void main();
