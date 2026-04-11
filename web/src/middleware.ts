import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "./lib/adminAuth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin dashboard routes, except the login page itself.
  if (pathname.startsWith("/am-dashboard") && !pathname.startsWith("/am-dashboard/login")) {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const ok = await verifyAdminToken(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/am-dashboard/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/am-dashboard/:path*"],
};

