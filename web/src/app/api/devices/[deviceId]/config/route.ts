import { NextResponse } from "next/server";
import { backendBaseUrl } from "../../../_backend";

export async function PUT(req: Request, ctx: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await ctx.params;
  const body = await req.text();
  const res = await fetch(`${backendBaseUrl()}/api/devices/${encodeURIComponent(deviceId)}/config`, {
    method: "PUT",
    headers: { "content-type": req.headers.get("content-type") ?? "application/json", accept: "application/json" },
    body
  });
  const out = await res.text();
  return new NextResponse(out, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" }
  });
}

