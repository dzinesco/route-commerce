import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple route protection — admin pages redirect to login when no rc_auth_uid cookie.
// Dev bypass: dev_session cookie bypasses this check in development only.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Development bypass — dev_session cookie is set client-side by the login form
  if (process.env.NODE_ENV === "development") {
    const devSession = request.cookies.get("dev_session")?.value;
    if (devSession) return NextResponse.next();
  }

  // Check rc_auth_uid (new) or rc_uid (legacy) cookie
  const uid = request.cookies.get("rc_auth_uid")?.value ?? request.cookies.get("rc_uid")?.value;
  if (uid) return NextResponse.next();

  // Not authenticated — redirect to login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};