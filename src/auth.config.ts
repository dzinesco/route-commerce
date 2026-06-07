import type { NextAuthConfig, DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js v5 configuration.
 *
 * This file is imported by `src/middleware.ts`, which runs in the Edge
 * runtime. It must NOT import:
 *   - `pg` / `@auth/pg-adapter` (Node-only)
 *   - `next-auth/providers/credentials` (uses Node `crypto` internally)
 *   - The Drizzle client
 *   - Anything else that touches the database or Node-only APIs
 *
 * Provider definitions, callbacks, and pages all live here. The full
 * server-side handler in `src/lib/auth.ts` extends this with the
 * Credentials provider (Node-only) for email + password sign-in.
 *
 * Both instances share the same session cookie, so the middleware can
 * read JWTs minted by the server-side handler.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const hasGoogleCreds = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const googleProvider = hasGoogleCreds
  ? [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    ]
  : [];

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  providers: googleProvider,
  callbacks: {
    /**
     * Gate /admin, /wholesale, and /protected-example. Anything on those
     * paths and not signed in is redirected to /login (the default
     * pages.signIn). Public storefronts and the homepage pass through.
     *
     * The actual role-based gating still happens in `getAdminUser()` —
     * this callback only ensures the user is *signed in*.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnWholesale = nextUrl.pathname.startsWith("/wholesale");
      const isOnProtectedExample = nextUrl.pathname.startsWith(
        "/protected-example"
      );
      if (isOnAdmin || isOnWholesale || isOnProtectedExample) {
        return isLoggedIn;
      }
      return true;
    },

    /**
     * Forward the user id into the JWT on initial sign-in. With
     * `session.strategy: "jwt"` this is the field downstream code reads
     * via `session.user.id`.
     */
    async jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        if (user.email) token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id =
          (typeof token.id === "string" && token.id) ||
          (typeof token.sub === "string" && token.sub) ||
          "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

/**
 * Is the dev Credentials provider enabled?
 *   - Disabled in production (NODE_ENV === "production")
 *   - Can be force-disabled by setting `ALLOW_DEV_LOGIN=false`
 *
 * Surfaced so `src/lib/auth.ts` can decide whether to include the
 * Credentials provider in its providers list.
 */
export function isDevLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_LOGIN !== "false"
  );
}
