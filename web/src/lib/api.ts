export type Asset = { type: "crypto" | "stock"; pair: string };

export type AssetsResponse = {
  crypto: Asset[];
  stocks: Asset[];
  types?: string[];
  intervals?: { m: number[]; h: number[]; d: number[]; w: number[]; mo: number[] };
};

export type SymbolRow = {
  symbol: string;
  type: string;
  available_exchanges: string[];
  currency_base: string | null;
  currency_quote: string | null;
  updated_at: string;
};

export async function searchSymbols(params: {
  q?: string;
  type?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ data: SymbolRow[]; offset: number; limit: number; has_more: boolean }> {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.type) usp.set("type", params.type);
  if (params.limit) usp.set("limit", String(params.limit));
  if (typeof params.offset === "number") usp.set("offset", String(params.offset));
  const res = await fetch(`${apiBaseUrl()}/api/admin/symbols?${usp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("symbols_fetch_failed");
  return res.json();
}

export type DeviceResponse = {
  device: { device_id: string; created_at: string; last_seen: string | null } | null;
  configuration: {
    device_id: string;
    pairs: string[];
    rotation_interval: number;
    tickers?: unknown;
    rotate_seconds?: number;
    display_mode?: string;
    brightness?: number;
    updated_at: string;
  } | null;
  online: boolean;
  pairing_url: string;
};

export function apiBaseUrl(): string {
  // If unset, default to same-origin API routes.
  // When deploying web + backend separately, set NEXT_PUBLIC_API_BASE_URL (e.g. https://example.com).
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return raw.replace(/\/$/, "");
}

export async function fetchAssets(): Promise<AssetsResponse> {
  const res = await fetch(`${apiBaseUrl()}/api/assets`, { cache: "no-store" });
  if (!res.ok) throw new Error("assets_fetch_failed");
  return (await res.json()) as AssetsResponse;
}

export async function fetchDevice(deviceId: string): Promise<DeviceResponse> {
  const res = await fetch(`${apiBaseUrl()}/api/devices/${encodeURIComponent(deviceId)}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("device_fetch_failed");
  return (await res.json()) as DeviceResponse;
}

export async function saveConfig(input: {
  deviceId: string;
  pairs: string[];
  rotationInterval: number;
  tickers?: unknown;
  rotateSeconds?: number;
  displayMode?: string;
  brightness?: number;
}): Promise<void> {
  const res = await fetch(`${apiBaseUrl()}/api/devices/${encodeURIComponent(input.deviceId)}/config`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      pairs: input.pairs,
      rotation_interval: input.rotationInterval,
      tickers: input.tickers ?? [],
      rotate_seconds: input.rotateSeconds ?? 60,
      display_mode: input.displayMode ?? "auto",
      brightness: input.brightness ?? 100
    })
  });
  if (!res.ok) throw new Error("config_save_failed");
}
