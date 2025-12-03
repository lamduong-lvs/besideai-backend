import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware bảo vệ các route cần đăng nhập.
 * Hiện tại chỉ kiểm tra sự tồn tại của cookie auth_token.
 * Sau này có thể mở rộng để verify với backend nếu cần.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/account") || pathname.startsWith("/admin");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};


