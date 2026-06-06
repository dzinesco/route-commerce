import NextAuth from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import Credentials from "next-auth/providers/credentials";
import { pool } from "@/lib/db";
import { authConfig, isDevLoginEnabled } from "@/auth.config";

/**
 * Build the dev Credentials provider. Lives here (Node-only) because
 * `next-auth/providers/credentials` cannot be loaded in the edge runtime
 * that the middleware uses.
 */
function buildDevCredentialsProvider() {
  return Credentials({
    id: "dev-login",
    name: "Dev login",
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      if (!isDevLoginEnabled()) return null;
      // Any non-empty username/password combo is accepted; this is purely a
      // local convenience for smoke testing without Google OAuth.
      const username = String(creds?.username ?? "").trim();
      const password = String(creds?.password ?? "");
      if (!username || !password) return null;

      return {
        id: `dev-${username.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
        name: username,
        email: `${username}@dev.local`,
        // Custom field surfaced via `jwt` callback if needed
        devRole: "platform_admin",
      } as unknown as { id: string; name: string; email: string };
    },
  });
}

/**
 * Final server-side Auth.js config.
 *
 * Builds on `authConfig` (edge-safe) and layers on:
 *   1. The Postgres database adapter (uses the shared `pool` from @/lib/db)
 *   2. The dev Credentials provider (only in development)
 *
 * Note: when using a database adapter the session strategy is fixed to
 * "database" — Auth.js will persist sessions in the `sessions` table.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Use JWT sessions to match the edge-friendly config in `authConfig`.
  // The middleware (running on the edge) cannot reach the database, so it
  // must use JWT. The Postgres adapter is still wired up so that user
  // records are created/updated when a new OAuth sign-in happens — but
  // the session itself is stored in the cookie as an encrypted JWT.
  adapter: PostgresAdapter(pool),
  // `session.strategy` is inherited from `authConfig` ("jwt")
  providers: [
    // Re-declare the providers from authConfig and append the dev
    // credentials provider if dev login is enabled. (NextAuth merges by
    // provider id, so this overrides the edge stubs.)
    ...authConfig.providers,
    ...(isDevLoginEnabled() ? [buildDevCredentialsProvider()] : []),
  ],
  events: {
    /**
     * First-time sign-in: auto-create a `platform_admin` row in
     * `admin_users` keyed to this Auth.js user id. The RPC is
     * idempotent (ON CONFLICT DO NOTHING) so repeat sign-ins are no-ops.
     *
     * This is the seam between the new Auth.js auth layer and the
     * existing admin authorization model. After this fires, the user
     * is recognized by `getAdminUser()` in `src/lib/admin-permissions.ts`.
     */
    async signIn({ user }) {
      try {
        const userId = user.id;
        if (!userId) return;
        await pool.query(
          "SELECT * FROM upsert_admin_user_for_authjs($1)",
          [userId]
        );
      } catch (e) {
        // Don't block sign-in on a missing admin_users row.
        console.warn("[auth] signIn event error (non-fatal):", e);
      }
    },
  },
});
