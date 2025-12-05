import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware bảo vệ các route cần đăng nhập.
 * Checks for auth_token cookie and verifies with backend for admin routes.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/account") || 
    pathname.startsWith("/admin") || 
    pathname.startsWith("/test-oauth");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin routes, verify user has admin role
  if (pathname.startsWith("/admin")) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://besideai-backend.vercel.app";
      const response = await fetch(`${apiUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const user = await response.json();
      
      // Check admin role from database (not hardcoded email)
      // Backend should return user.role field
      if (user.role !== "admin") {
        // Redirect non-admin users to account page
        return NextResponse.redirect(new URL("/account", req.url));
      }
    } catch (error) {
      // Network error or other issues - redirect to login
      console.error("[Middleware] Error verifying admin access:", error);
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/test-ai/:path*", "/test-oauth/:path*"],
};


