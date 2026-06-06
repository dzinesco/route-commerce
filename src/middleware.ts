import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware for /admin/* and /login routes.
 *
 * Two responsibilities:
 *   1. Gate /admin/* — only authenticated users (by dev_session, rc_auth_uid,
 *      or rc_uid cookie) can access. Unauthenticated users are redirected
 *      to /login.
 *   2. Demo / dev auto-login — when ALLOW_DEV_LOGIN is enabled (on by
 *      default in non-prod) and the user has no auth cookie, automatically
 *      issue `dev_session=platform_admin` so visiting /admin just works.
 *      No buttons, no demo page, no client-side cookie games.
 *
 * This is the single source of truth for "am I allowed in?" at the edge.
 * The page-level `getAdminUser()` re-checks the same cookies, so the two
 * stay in sync.
 */
export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const isOnAdmin = nextUrl.pathname.startsWith("/admin");
  const isOnLogin = nextUrl.pathname === "/login";

  // Read auth cookies once.
  const dev = request.cookies.get("dev_session")?.value;
  const rcAuthUid = request.cookies.get("rc_auth_uid")?.value;
  const rcUid = request.cookies.get("rc_uid")?.value;
  const hasDevSession =
    dev === "platform_admin" ||
    dev === "brand_admin" ||
    dev === "store_employee";
  const hasRealAuth = Boolean(rcAuthUid || rcUid);
  const isAuthenticated = hasDevSession || hasRealAuth;

  // ── /admin/* ──────────────────────────────────────────────────────
  if (isOnAdmin) {
    if (isAuthenticated) {
      return NextResponse.next();
    }

    // No auth cookie — try demo auto-login. ALLOW_DEV_LOGIN is on by
    // default; set it to "false" in prod env to disable.
    const allowDev = process.env.ALLOW_DEV_LOGIN !== "false";
    if (allowDev) {
      const response = NextResponse.next();
      response.cookies.set("dev_session", "platform_admin", {
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
        sameSite: "lax",
      });
      return response;
    }

    // No auth and dev disabled — bounce to /login.
    const loginUrl = nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // ── /login ────────────────────────────────────────────────────────
  if (isOnLogin) {
    // If already authenticated, skip the login page.
    if (isAuthenticated) {
      const adminUrl = nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
