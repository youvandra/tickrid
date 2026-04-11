import { NextResponse } from "next/server";
import { backendBaseUrl } from "../../_backend";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const upstream = new URL(`${backendBaseUrl()}/api/admin/symbols`);
  upstream.search = url.search;
  const res = await fetch(upstream.toString(), {
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

