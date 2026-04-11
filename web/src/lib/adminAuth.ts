import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "tickr_admin";

function getAdminSecret(): string | null {
  return process.env.ADMIN_JWT_SECRET ?? null;
}

function requireAdminSecret(): string {
  const secret = getAdminSecret();
  if (!secret) throw new Error("Missing env ADMIN_JWT_SECRET");
  return secret;
}

function normalizeToken(token: string): string {
  let t = token.trim();
  // Some environments may store cookie values with quotes.
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
  return t;
}

export async function signAdminToken(): Promise<string> {
  const secret = new TextEncoder().encode(requireAdminSecret());
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const secretStr = getAdminSecret();
    if (!secretStr) {
      // Middleware runs in the Edge runtime; env access can be misconfigured.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[adminAuth] Missing ADMIN_JWT_SECRET; treating admin as logged out.");
      }
      return false;
    }

    const secret = new TextEncoder().encode(secretStr);
    const { payload } = await jwtVerify(normalizeToken(token), secret);
    return payload.role === "admin";
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[adminAuth] Invalid admin token; redirecting to login.");
    }
    return false;
  }
}
