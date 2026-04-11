"server-only";

export function backendBaseUrl(): string {
  const raw = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:4000";
  return raw.replace(/\/$/, "");
}

