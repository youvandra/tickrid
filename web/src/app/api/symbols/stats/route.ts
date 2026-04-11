import { NextResponse } from "next/server";
import { backendBaseUrl } from "../../_backend";

export async function GET() {
  const upstream = `${backendBaseUrl()}/api/symbols/stats`;
  const res = await fetch(upstream, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

