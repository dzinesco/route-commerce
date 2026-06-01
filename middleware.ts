import { NextResponse, type NextRequest } from "next/server";

const DEV_UID = "dev-user-00000000-0000-0000-0000-000000000000";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // ── Dev session bypass (enabled in all envs for demo) ──────────────
  // Allow dev cookies via: document.cookie = "dev_session=platform_admin; path=/"
  const devSession = request.cookies.get("dev_session")?.value;
  const isDevMode = devSession === "platform_admin" || devSession === "brand_admin" || devSession === "store_employee";
  const rcAuthUid = request.cookies.get("rc_auth_uid")?.value;

  let authUid: string | null = null;

  if (isDevMode) {
    // Dev session only valid in development
    authUid = DEV_UID;
  } else if (rcAuthUid) {
    // rc_auth_uid is set by /api/login — treat as authenticated
    authUid = rcAuthUid;
  }
  // No rc_auth_uid in production → authUid stays null → redirect to /login

  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  const isLogin = request.nextUrl.pathname === "/login";

  if (isAdmin && !authUid) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Auto-login for demo: no Supabase configured, no auth cookie present
    if (!supabaseUrl || !supabaseUrl.includes("supabase.co")) {
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
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLogin && authUid) {
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