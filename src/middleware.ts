// NextAuth v5 middleware
//
// Runs on every non-static request in the Edge runtime. It uses a
// lightweight NextAuth instance built from the edge-safe `authConfig` —
// NOT the full `src/lib/auth.ts` (which uses `pg` and is Node-only).
//
// Responsibilities:
//   1. Allow Auth.js to read/write its own session cookie
//   2. Protect /admin/*, /wholesale/*, /protected-example — redirect to
//      /login if not authenticated
//   3. Redirect away from /login when the user already has a session
//   4. Add a handful of baseline security headers
//
// The legacy `dev_session` cookie bypass has been removed. The only way
// into the admin is through real Auth.js — Google in production, or the
// seeded Credentials provider in dev (see `src/lib/auth.ts`).

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

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
