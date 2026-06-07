import "server-only";

/**
 * Auth.js (NextAuth v5) — server-side configuration.
 *
 * This file is Node-only. It is imported by:
 *   - `src/app/api/auth/[...nextauth]/route.ts` (the OAuth + credentials handlers)
 *   - Server actions that call `signIn` / `signOut`
 *   - `src/lib/admin-permissions.ts` (reads `auth()` for the current user)
 *
 * The middleware imports a separate, edge-safe instance built from
 * `src/auth.config.ts`. Both instances share the same JWT cookie, so the
 * middleware can read sessions minted here.
 *
 * Providers:
 *   - Google OAuth — active when AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET are set.
 *   - Email + password (Credentials) — active in dev only; backed by the
 *     `users.password_hash` column. In production, set ALLOW_DEV_LOGIN=false
 *     (the default) and the provider is omitted entirely.
 *
 * For local dev, run `npm run db:seed` to create the seeded admin user
 * (`admin@route-commerce.local` / `admin`). The `authorize` function
 * looks up the user by email, verifies the password against the stored
 * hash, and returns the real user record. No `dev_session` cookie
 * bypass; this is real Auth.js sign-in.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { authConfig, isDevLoginEnabled } from "@/auth.config";
import { withDb } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/passwords";

function buildCredentialsProvider() {
  return Credentials({
    id: "credentials",
    name: "Email + password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    /**
     * Returns the user on success, or `null` on any failure. Auth.js
     * never throws from `authorize` — a throw is treated as a 500.
     */
    async authorize(creds) {
      if (!isDevLoginEnabled()) return null;
      const email = String(creds?.email ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;

      try {
        // The `users` table is global (not tenant-scoped), so we use
        // `withDb` rather than `withTenant` — no GUC to set.
        const u = await withDb(async (db) => {
          const rows = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          return rows[0] ?? null;
        });
        if (!u || !u.passwordHash) return null;
        if (!verifyPassword(password, u.passwordHash)) return null;
        return {
          id: u.id,
          name: u.name ?? undefined,
          email: u.email,
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[auth] credentials authorize failed:", err);
        return null;
      }
    },
  });
}

const providers = [
  ...authConfig.providers,
  ...(isDevLoginEnabled() ? [buildCredentialsProvider()] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
});
