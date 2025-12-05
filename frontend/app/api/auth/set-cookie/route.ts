import { NextRequest, NextResponse } from "next/server";

/**
 * API route to set auth_token cookie after OAuth login
 * This is needed because middleware checks for cookie, not localStorage
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    // Create response with cookie
    const response = NextResponse.json({ success: true });

    // Set cookie with secure options
    response.cookies.set("auth_token", token, {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/", // Available for all paths
    });

    return response;
  } catch (error) {
    console.error("[Set Cookie API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set cookie" },
      { status: 500 }
    );
  }
}

