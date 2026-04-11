import type http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type pg from "pg";
import { createRedis, CHANNEL_CONFIG_PUSH, CHANNEL_PRICES, KEY_ONLINE_PREFIX } from "../redis/index.js";
import type {
  ConfigPushMessage,
  DeviceToServer,
  PricePubSubMessage,
  ServerConfig,
  ServerError,
  ServerPrice,
} from "../protocol.js";
import { getConfiguration, touchLastSeen, upsertDevice } from "../db/index.js";

type ConnectedDevice = {
  deviceId: string;
  socket: WebSocket;
};

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function wsSend(socket: WebSocket, message: unknown): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function nowTs(): number {
  return Date.now();
}

export async function startDeviceWsServer(opts: {
  server: http.Server;
  pool: pg.Pool;
  redisUrl: string;
}): Promise<() => Promise<void>> {
  const wss = new WebSocketServer({ noServer: true });

  const redisPub = createRedis(opts.redisUrl);
  const redisSub = createRedis(opts.redisUrl);
  await Promise.all([redisPub.connect(), redisSub.connect()]);

  const devicesById = new Map<string, ConnectedDevice>();
  const deviceIdBySocket = new Map<WebSocket, string>();
  const pairsByDevice = new Map<string, string[]>();
  const devicesByPair = new Map<string, Set<string>>();

  function indexDevicePairs(deviceId: string, pairs: string[]): void {
    const prevPairs = pairsByDevice.get(deviceId) ?? [];
    for (const p of prevPairs) {
      const set = devicesByPair.get(p);
      if (!set) continue;
      set.delete(deviceId);
      if (set.size === 0) devicesByPair.delete(p);
    }
    pairsByDevice.set(deviceId, pairs);
    for (const p of pairs) {
      const set = devicesByPair.get(p) ?? new Set<string>();
      set.add(deviceId);
      devicesByPair.set(p, set);
    }
  }

  async function pushConfigToDevice(deviceId: string): Promise<void> {
    const device = devicesById.get(deviceId);
    if (!device) return;
    const cfg = await getConfiguration(opts.pool, deviceId);
    const message: ServerConfig = {
      type: "config",
      device_id: deviceId,
      pairs: cfg?.pairs ?? [],
      rotation_interval: cfg?.rotation_interval ?? 10,
    };
    indexDevicePairs(deviceId, message.pairs);
    wsSend(device.socket, message);
  }

  async function markOnline(deviceId: string): Promise<void> {
    await redisPub.set(`${KEY_ONLINE_PREFIX}${deviceId}`, "1", { EX: 45 });
  }

  function markOffline(deviceId: string): void {
    void redisPub.del(`${KEY_ONLINE_PREFIX}${deviceId}`);
  }

  async function attachDevice(socket: WebSocket, deviceId: string): Promise<void> {
    await upsertDevice(opts.pool, deviceId);
    await markOnline(deviceId);

    devicesById.set(deviceId, { deviceId, socket });
    deviceIdBySocket.set(socket, deviceId);
    await pushConfigToDevice(deviceId);
  }

  async function handleDeviceMessage(socket: WebSocket, rawText: string): Promise<void> {
    const msg = safeJsonParse<DeviceToServer>(rawText);
    if (!msg || typeof msg !== "object" || !("type" in msg)) {
      const e: ServerError = { type: "error", message: "invalid_message" };
      wsSend(socket, e);
      return;
    }

    if (msg.type === "hello") {
      const deviceId = (msg as { device_id?: unknown }).device_id;
      if (typeof deviceId !== "string" || deviceId.length < 4) {
        const e: ServerError = { type: "error", message: "invalid_device_id" };
        wsSend(socket, e);
        return;
      }
      await attachDevice(socket, deviceId);
      return;
    }

    if (msg.type === "ping") {
      const deviceId = deviceIdBySocket.get(socket);
      if (!deviceId) return;
      await Promise.all([touchLastSeen(opts.pool, deviceId), markOnline(deviceId)]);
      return;
    }
  }

  opts.server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname !== "/device") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
    const deviceId = url.searchParams.get("device_id");

    if (deviceId && deviceId.length >= 4) {
      void attachDevice(socket, deviceId);
    }

    socket.on("message", (data) => {
      const text = typeof data === "string" ? data : data.toString("utf8");
      void handleDeviceMessage(socket, text);
    });

    socket.on("close", () => {
      const deviceId = deviceIdBySocket.get(socket);
      if (!deviceId) return;
      deviceIdBySocket.delete(socket);
      devicesById.delete(deviceId);
      pairsByDevice.delete(deviceId);
      for (const [pair, set] of devicesByPair.entries()) {
        set.delete(deviceId);
        if (set.size === 0) devicesByPair.delete(pair);
      }
      markOffline(deviceId);
    });
  });

  await redisSub.subscribe(CHANNEL_PRICES, (payload) => {
    const msg = safeJsonParse<PricePubSubMessage>(payload);
    if (!msg) return;
    const targets = devicesByPair.get(msg.pair);
    if (!targets || targets.size === 0) return;
    const out: ServerPrice = {
      type: "price",
      pair: msg.pair,
      price: msg.price,
      change: msg.change,
      ts: msg.ts,
      interval_sec: msg.interval_sec,
      history: msg.history,
    };
    for (const deviceId of targets) {
      const device = devicesById.get(deviceId);
      if (!device) continue;
      wsSend(device.socket, out);
    }
  });

  await redisSub.subscribe(CHANNEL_CONFIG_PUSH, (payload) => {
    const msg = safeJsonParse<ConfigPushMessage>(payload);
    if (!msg) return;
    const device = devicesById.get(msg.device_id);
    if (!device) return;
    indexDevicePairs(msg.device_id, msg.pairs);
    const out: ServerConfig = {
      type: "config",
      device_id: msg.device_id,
      pairs: msg.pairs,
      rotation_interval: msg.rotation_interval,
    };
    wsSend(device.socket, out);
  });

  const heartbeat = setInterval(() => {
    for (const device of devicesById.values()) {
      wsSend(device.socket, { type: "ping", ts: nowTs() });
    }
  }, 20_000);

  return async () => {
    clearInterval(heartbeat);
    await Promise.allSettled([redisSub.quit(), redisPub.quit()]);
    wss.close();
  };
}
