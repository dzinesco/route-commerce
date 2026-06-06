import "server-only";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Providers:
 *   - Google OAuth (real, primary; only active when AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET are set)
 *   - Credentials (email/password, wraps the existing Supabase auth flow so the login
 *     page keeps working during the cutover. Will be removed when Supabase auth is gone.)
 *
 * Session strategy: JWT. No database adapter — admin user lookup is handled by
 * the existing SECURITY DEFINER RPCs + Supabase REST in `getAdminUser()`.
 *
 * Required env vars (production):
 *   - AUTH_SECRET          — JWT signing secret
 *   - AUTH_URL             — base URL (auto-detected on Vercel)
 *   - AUTH_GOOGLE_ID       — Google OAuth client id
 *   - AUTH_GOOGLE_SECRET   — Google OAuth client secret
 *
 * Backward compatibility: the legacy `rc_auth_uid` cookie and `dev_session` cookie
 * are still read by `src/lib/admin-permissions.ts` (via `getAdminUser()`) and the
 * middleware, so the dev/demo flow keeps working. New code should call `auth()`
 * from this file instead of reading cookies directly.
 */

import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

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

// Google provider is only added when both env vars are set so the build
// doesn't fail on hosts where Google isn't configured yet.
const googleProvider = hasGoogleCreds
  ? [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    ]
  : [];

// Credentials provider wraps the existing Supabase email/password flow.
// It returns a user with `id` = Supabase auth user id, which `getAdminUser()`
// then uses to look up `admin_users.user_id`. The JWT persists `id` and `email`.
const credentialsProvider = [
  Credentials({
    id: "supabase-password",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const email = typeof creds?.email === "string" ? creds.email.trim() : "";
      const password = typeof creds?.password === "string" ? creds.password : "";
      if (!email || !password) return null;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return null;

      try {
        const res = await fetch(
          `${supabaseUrl}/auth/v1/token?grant_type=password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({ email, password }),
          }
        );
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as
          | { user?: { id?: string; email?: string }; access_token?: string }
          | null;
        const userId = data?.user?.id;
        if (!userId) return null;
        return {
          id: userId,
          email: data?.user?.email ?? email,
          name: data?.user?.email ?? email,
        };
      } catch {
        return null;
      }
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [...googleProvider, ...credentialsProvider],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // user.id comes from the provider's authorize() return (Supabase user id)
        // or from Google's `sub` claim for Google sign-ins.
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
