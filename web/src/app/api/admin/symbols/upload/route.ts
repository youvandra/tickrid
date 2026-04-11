import { NextResponse } from "next/server";
import { backendBaseUrl } from "../../../_backend";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminToken(token))) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const adminKey = process.env.BACKEND_ADMIN_API_KEY;
  if (!adminKey) {
    return new NextResponse(JSON.stringify({ error: "missing_backend_admin_api_key" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const upstream = `${backendBaseUrl()}/api/admin/symbols/upload`;
  const body = await req.text();
  const res = await fetch(upstream, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
      accept: "application/json",
      "x-admin-key": adminKey,
    },
    body
  });
  const out = await res.text();
  return new NextResponse(out, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" }
  });
}
