import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const DEV_UID = "dev-user-00000000-0000-0000-0000-000000000000";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // ── Dev session bypass (enabled in all envs for demo) ──────────────
  // Allow dev cookies via: document.cookie = "dev_session=platform_admin; path=/"
  const devSession = request.cookies.get("dev_session")?.value;
  const isDevMode = devSession === "platform_admin" || devSession === "brand_admin" || devSession === "store_employee";

  // Better Auth sets cookie named "rc_session_token" by default (with cookiePrefix: "rc")
  const sessionCookie = getSessionCookie(request);
  const hasSession = Boolean(sessionCookie);

  let authed = false;
  if (isDevMode) {
    authed = true;
  } else if (hasSession) {
    authed = true;
  }

  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  const isLogin = request.nextUrl.pathname === "/login";

  if (isAdmin && !authed) {
    // Auto-login for demo: no auth cookie present
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.searchParams.set("demo", "1");
    const response = NextResponse.redirect(url);
    response.cookies.set("dev_session", "platform_admin", {
      path: "/",
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      sameSite: "strict",
    });
    return response;
  }

  if (isLogin && authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/admin",
    "/login",
  ],
};
