import { Pool } from "pg";

/**
 * Shared `pg.Pool` for direct Postgres access.
 *
 * This is the single connection pool for the entire app — server actions,
 * API routes, and Auth.js all import `pool` from here. No more ad-hoc pools
 * in individual files.
 *
 * Replaces the Supabase JS client (see CLAUDE.md "Supabase is being
 * removed in favor of a direct Postgres connection"). SECURITY DEFINER
 * RPCs are the recommended way to do reads/writes; this pool is the
 * transport.
 *
 * Connection resolution:
 *   1. `DATABASE_URL` — preferred, single connection string
 *   2. `SUPABASE_DB_URL` — legacy, for projects still on Supabase
 *   3. `POSTGRES_URL` — alternative
 *
 * Singleton pattern: `globalThis.__pgPool` so Next.js hot reload doesn't
 * open a new pool on every request.
 */

const globalForPool = globalThis as unknown as { __pgPool?: Pool };

function createPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_URL;

  if (!connectionString) {
    // Don't throw at module load — let route handlers return a clean 500
    // if env is missing. The deploy workflow and `.env.example` document
    // the required vars.
    console.warn(
      "[db] No DATABASE_URL / SUPABASE_DB_URL / POSTGRES_URL set — pg pool will fail on first query."
    );
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool: Pool =
  globalForPool.__pgPool ?? (globalForPool.__pgPool = createPool());
