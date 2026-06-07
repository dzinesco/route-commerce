// NextAuth v5 middleware
//
// Runs on every non-static request. Responsibilities:
//   1. Allow Auth.js v5 to read/write its own session cookie
//   2. Protect /admin/* and /wholesale/* — redirect to /login if not authenticated
//   3. Redirect away from /login when the user already has a session
//   4. Add a handful of baseline security headers
//
// The legacy `dev_session` cookie bypass has been removed. The only way
// into the admin is through real Auth.js (Google in production; for
// local dev, configure `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`).
//
// Backward compatibility: the legacy `rc_auth_uid` / `rc_uid` cookies
// are intentionally no longer read here — `getAdminUser()` in
// src/lib/admin-permissions.ts is the single source of truth and reads
// the Auth.js session instead.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAuthed = !!req.auth;

  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/login";

  if (isAdmin && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  if (isLogin && isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  return addSecurityHeaders(NextResponse.next());
});

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
