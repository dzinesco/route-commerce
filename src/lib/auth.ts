import "server-only";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Providers:
 *   - Google OAuth — only active when AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
 *     are set.
 *
 * Supabase is no longer used for auth (or anything else) on this platform.
 * The historical Supabase-backed Credentials provider was removed in the
 * cleanup pass. New admin users are provisioned manually by an existing
 * platform admin via /admin/users (the action creates an `admin_users`
 * row linked to the Google `sub` after the user signs in for the first
 * time).
 *
 * Session strategy: JWT. No database adapter — admin user lookup is
 * delegated to `getAdminUser()` in `src/lib/admin-permissions.ts`.
 *
 * Required env vars (production):
 *   - AUTH_SECRET          — JWT signing secret
 *   - AUTH_URL             — base URL (auto-detected on Vercel)
 *   - AUTH_GOOGLE_ID       — Google OAuth client id
 *   - AUTH_GOOGLE_SECRET   — Google OAuth client secret
 *
 * Backward compatibility: the `dev_session` cookie was the source of
 * truth for the demo flow but has been removed — `getAdminUser()` and
 * the middleware now use only the Auth.js session. The legacy
 * `rc_auth_uid` cookie was retired earlier — see the
 * final report for the cleanup notes.
 */

import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: googleProvider,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // `user.id` is the provider's stable subject — for Google sign-ins
        // this is the opaque `sub` claim.
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
});
