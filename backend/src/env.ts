export type ServiceRole = "all" | "ws" | "market";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return value;
}

export function envString(name: string, fallback: string): string {
  const value = process.env[name];
  return value ?? fallback;
}

export function envRole(): ServiceRole {
  const role = (process.env.SERVICE_ROLE ?? "all") as ServiceRole;
  if (role === "all" || role === "ws" || role === "market") return role;
  return "all";
}
