import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Root-level proxy (formerly `middleware.ts`, renamed in Next.js 16).
 * This is the single source of truth for route protection. The legacy
 * `src/middleware.ts` has been deleted (Next.js only runs one).
 *
 * Why an `auth` wrapper instead of a hand-rolled `NextResponse.next()`?
 *   1. Auth.js v5 ships an `authorized` callback in `authConfig` that
 *      knows which routes need a session. We reuse it here at the edge.
 *   2. It auto-populates `request.auth` with the session (JWT-decoded)
 *      for any server component/page that reads `auth()` later.
 *
 * Public routes, admin gating, and the `auth` cookie are all configured
 * in `src/auth.config.ts`.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Run on /admin and the protected example, plus /login so the
  // `authorized` callback can bounce already-signed-in users away from it.
  matcher: ["/admin/:path*", "/admin", "/login", "/protected-example"],
};
