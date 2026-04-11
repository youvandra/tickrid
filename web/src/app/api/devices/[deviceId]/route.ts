import { NextResponse } from "next/server";
import { backendBaseUrl } from "../../_backend";

export async function GET(_req: Request, ctx: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await ctx.params;
  const res = await fetch(`${backendBaseUrl()}/api/devices/${encodeURIComponent(deviceId)}`, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store"
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" }
  });
}

