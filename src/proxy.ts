import { NextResponse, type NextRequest } from "next/server";

/**
 * Root-level proxy (formerly `middleware.ts`, renamed in Next.js 16).
 *
 * Routing policy:
 *   1. `/admin/*` with no auth cookie + `ALLOW_DEV_LOGIN !== "false"`
 *      → set `dev_session=platform_admin` and let the request through.
 *      This makes `/admin` "just work" in dev/demo without any login
 *      UI gymnastics.
 *   2. `/login` with an auth cookie (any flavour)
 *      → redirect to `/admin` so an authenticated user never sees the
 *      login form.
 *   3. `/admin/*` (or `/protected-example`) with no auth cookie
 *      → redirect to `/login`.
 *   4. Everything else → continue.
 *
 * Auth-cookie flavours recognised:
 *   - `dev_session` (dev auto-login, see above)
 *   - `rc_auth_uid` / `rc_uid` (legacy /api/login flow)
 *   - `authjs.session-token` / `__Secure-authjs.session-token` (Auth.js v5)
 *
 * The proxy only checks cookie *presence*. The real auth check (JWT
 * signature decryption, admin role lookup) happens in
 * `getAdminUser()` server-side. The proxy is just routing.
 */

function isAuthenticated(request: NextRequest): boolean {
  const dev = request.cookies.get("dev_session")?.value;
  if (
    dev === "platform_admin" ||
    dev === "brand_admin" ||
    dev === "store_employee"
  ) {
    return true;
  }
  if (request.cookies.get("rc_auth_uid")?.value) return true;
  if (request.cookies.get("rc_uid")?.value) return true;
  if (request.cookies.get("authjs.session-token")?.value) return true;
  if (request.cookies.get("__Secure-authjs.session-token")?.value) return true;
  return false;
}

export default function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const isOnAdmin = nextUrl.pathname.startsWith("/admin");
  const isOnProtectedExample = nextUrl.pathname.startsWith(
    "/protected-example"
  );
  const isOnLogin = nextUrl.pathname === "/login";
  const authenticated = isAuthenticated(request);

  // ── 1. Dev auto-login for /admin/* ───────────────────────────────
  if (isOnAdmin && !authenticated) {
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
  }

  // ── 2. Bounce authenticated users away from /login ───────────────
  if (isOnLogin && isAuthenticated(request)) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  // ── 3. Gate protected routes ─────────────────────────────────────
  if ((isOnAdmin || isOnProtectedExample) && !authenticated) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // ── 4. Everything else: continue ─────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/login", "/protected-example"],
};
