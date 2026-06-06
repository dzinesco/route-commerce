import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-compatible Auth.js v5 configuration.
 *
 * This file is imported by `src/middleware.ts`, which runs in the Edge runtime.
 * It must NOT import the `@auth/pg-adapter` (which uses `pg`, a Node-only lib)
 * or any other Node-only module. Database wiring lives in `src/lib/auth.ts`.
 *
 * If you need to add a provider that uses Node-only APIs (e.g. an adapter
 * implementation), define it in `src/lib/auth.ts` instead and add a thin
 * placeholder here so the middleware can still reference it.
 */
const isDev = process.env.NODE_ENV !== "production";
const allowDevLogin = process.env.ALLOW_DEV_LOGIN !== "false"; // on by default in dev

export const authConfig = {
  // Custom sign-in page (must exist at /login)
  pages: {
    signIn: "/login",
  },

  // Trust the host header in dev for callback URLs
  trustHost: true,

  // Providers — referenced from middleware edge runtime.
  // The Google provider only needs the env vars at runtime; it does not pull
  // in any Node-only code. The dev Credentials provider is added in
  // `src/lib/auth.ts` (server-side only) — it's not safe to import
  // `next-auth/providers/credentials` from the edge runtime.
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
      // No `authorization` override — we want the default scopes (openid email profile)
    }),
  ],

  // New users are persisted in the database (handled in src/lib/auth.ts)
  // Default to JWT here so middleware can run in edge runtime; the full
  // server-side handler in src/lib/auth.ts switches this to "database".
  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Gate /admin routes. Anything not on the public list and not signed in
     * gets redirected to /login. This mirrors what the page-level checks do,
     * but runs first at the edge so unauthorized requests never hit the
     * server component tree.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnProtectedExample = nextUrl.pathname.startsWith(
        "/protected-example"
      );

      if (isOnAdmin) {
        if (isLoggedIn) return true;
        return false; // Redirect to /login
      }

      if (isOnProtectedExample) {
        if (isLoggedIn) return true;
        return false;
      }

      return true;
    },

    /**
     * Forward the user id from the database user record into the JWT on
     * initial sign-in. With database sessions this is what populates
     * `session.user.id` for downstream server actions.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },

  // Cookie config — keep default names so legacy `rc_auth_uid` consumers
  // continue to work until they're migrated. New Auth.js cookies default to
  // `authjs.session-token` (dev) and `__Secure-authjs.session-token` (prod).
} satisfies NextAuthConfig;

/**
 * Helper: are we in development AND allowed to use the dev credentials
 * provider? Exposed so server-side `src/lib/auth.ts` can decide whether to
 * include the provider in its provider list.
 */
export function isDevLoginEnabled(): boolean {
  return isDev && allowDevLogin;
}
