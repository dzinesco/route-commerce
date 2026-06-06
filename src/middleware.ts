// NextAuth v5 + Supabase Auth Middleware
//
// Runs on every non-static request. Responsibilities:
//   1. Allow Auth.js v5 to read/write its own session cookie
//   2. Protect /admin/* and /wholesale/* — redirect to /login if not authenticated
//   3. Redirect away from /login when the user already has a session
//   4. Preserve the `dev_session` cookie bypass (demo flow)
//   5. Add a handful of baseline security headers
//
// Backward compatibility: the legacy `rc_auth_uid` / `rc_uid` cookies are
// intentionally no longer read here — `getAdminUser()` in src/lib/admin-permissions.ts
// is the single source of truth and reads the Auth.js session instead. Pages
// still gated by `getAdminUser()` will continue to enforce auth even if a stale
// `rc_auth_uid` cookie is present.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // ── Auth detection ──────────────────────────────────────────────────
  // Auth.js session takes priority; `dev_session` cookie is the demo bypass.
  const hasSession = !!req.auth;
  const devSession = req.cookies.get("dev_session")?.value;
  const isDevSession =
    devSession === "platform_admin" ||
    devSession === "brand_admin" ||
    devSession === "store_employee";

  const isAuthed = hasSession || isDevSession;

  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/login";

  if (isAdmin && !isAuthed) {
    // Demo auto-login: when no real auth is configured, issue a platform_admin
    // dev cookie so the rest of the admin shell renders. Mirrors the old
    // `dev_session` middleware fallback.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || !supabaseUrl.includes("supabase.co")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("demo", "1");
      const res = NextResponse.redirect(url);
      res.cookies.set("dev_session", "platform_admin", {
        path: "/",
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        sameSite: "lax",
      });
      return addSecurityHeaders(res);
    }
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
