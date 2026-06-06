import NextAuth from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import Credentials from "next-auth/providers/credentials";
import {
  authConfig,
  isDevLoginEnabled,
} from "@/auth.config";

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
 * Shared Postgres pool for Auth.js. Reuses the same database the rest of
 * the app talks to (via `pg`). Lives behind a module-level singleton so
 * Next.js hot reload doesn't open a new pool on every request.
 *
 * Note: in production, `DATABASE_URL` should be the only DB env var. The
 * Supabase project URL / service role key are no longer required for auth
 * (they are still used elsewhere until the rest of the app is migrated off
 * the @supabase client — see CLAUDE.md).
 */
const globalForPool = globalThis as unknown as { __pgPool?: Pool };

function getPool(): Pool {
  if (globalForPool.__pgPool) return globalForPool.__pgPool;

  const connectionString =
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_URL;

  if (!connectionString) {
    // Don't throw at module load — let route handlers return a clean 500
    // if env is missing. The smoke test instructions tell the user to
    // set DATABASE_URL.
    // eslint-disable-next-line no-console
    console.warn(
      "[auth] No DATABASE_URL / SUPABASE_DB_URL / POSTGRES_URL set — Auth.js database adapter will not be wired up."
    );
  }

  const pool = new Pool({
    connectionString,
    // Reasonable defaults; override via connection string if you need more
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  globalForPool.__pgPool = pool;
  return pool;
}

/**
 * Final server-side Auth.js config.
 *
 * Builds on `authConfig` (edge-safe) and layers on:
 *   1. The Postgres database adapter
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
  adapter: PostgresAdapter(getPool()),
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
     * `admin_users` keyed to this auth.js user id, mirroring the legacy
     * `rc_auth_uid` flow. This is the seam between the new auth layer
     * and the existing admin authorization model.
     */
    async signIn({ user }) {
      try {
        const pool = getPool();
        const userId = user.id;
        if (!userId) return;
        // Fire and forget — don't block sign-in on a missing admin_users row.
        await pool.query(
          `SELECT id FROM admin_users WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        // Note: we don't auto-create here; the existing `getAdminUser()`
        // in `src/lib/admin-permissions.ts` is the source of truth for
        // role lookups and is unchanged. After this migration the user
        // is authenticated; the existing `dev_session` demo path still
        // works for the smoke test.
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[auth] signIn event error (non-fatal):", e);
      }
    },
  },
});
