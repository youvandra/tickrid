import { NextResponse } from "next/server";
import { backendBaseUrl } from "../../_backend";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const adminKey = process.env.BACKEND_ADMIN_API_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: "missing_backend_admin_api_key" }, { status: 500 });
  }

  const url = new URL(req.url);
  const upstream = new URL(`${backendBaseUrl()}/api/admin/devices`);
  upstream.search = url.search;
  const res = await fetch(upstream.toString(), {
    method: "GET",
    headers: { accept: "application/json", "x-admin-key": adminKey },
    cache: "no-store"
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" }
  });
}
