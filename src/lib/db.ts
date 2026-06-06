/**
 * Shared Postgres connection pool.
 *
 * The app connects to Postgres directly via the `pg` driver — no Supabase
 * platform, JS client, or REST gateway. Server actions and API routes
 * import `pool` (or the typed `query` helper below) and call SECURITY
 * DEFINER PL/pgSQL functions.
 *
 * Usage:
 *   import { pool, query } from "@/lib/db";
 *   const { rows } = await query<MyRow>("SELECT * FROM my_table WHERE id = $1", [id]);
 *
 * Configuration:
 *   - DATABASE_URL (required) — full Postgres connection string. Same env var
 *     is used by `supabase/push-migrations.js` and any external migration
 *     tooling. Format: `postgres://user:pass@host:port/dbname`.
 *
 * Notes:
 *   - This module is server-only. It must never be imported from a Client
 *     Component. The `import "server-only"` line below makes Next.js fail
 *     the build if a client import is attempted.
 *   - The pool is created lazily on first use. If `DATABASE_URL` is missing
 *     at import time, the first query throws a clear error pointing at the
 *     missing env var. This keeps local builds (e.g. `next build` static
 *     analysis, lint) from failing just because the DB isn't configured.
 *   - SSL is enabled for non-localhost connections; `pg` reads `?sslmode=`
 *     from the URL automatically.
 */

import "server-only";
import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

let _pool: Pool | null = null;
let _poolError: Error | null = null;

function buildPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.example).",
    );
  }

  const config: PoolConfig = {
    connectionString,
    // Conservative defaults for a serverless environment (Vercel, Lambda).
    // Adjust via env vars if you need more headroom:
    //   PG_POOL_MAX              (default 10)
    //   PG_POOL_IDLE_MS          (default 30s)
    //   PG_POOL_CONN_TIMEOUT_MS  (default 10s)
    max: parseInt(process.env.PG_POOL_MAX ?? "10", 10),
    idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE_MS ?? "30000", 10),
    connectionTimeoutMillis: parseInt(
      process.env.PG_POOL_CONN_TIMEOUT_MS ?? "10000",
      10,
    ),
    // Vercel/serverless recycling: keep the pool hot for warm invocations.
    allowExitOnIdle: false,
  };

  const pool = new Pool(config);

  // Surface connection errors loudly. Without these handlers, `pg` swallows
  // backend disconnects (e.g. idle TCP RSTs from Vercel's network) and the
  // pool goes silently dead.
  pool.on("error", (err) => {
    console.error("[db] idle client error", err);
  });

  return pool;
}

/**
 * The shared connection pool. Lazy-initialized; throws a clear error on
 * first use if `DATABASE_URL` is not set.
 */
export function getPool(): Pool {
  if (_pool) return _pool;
  if (_poolError) throw _poolError;
  try {
    _pool = buildPool();
    return _pool;
  } catch (err) {
    _poolError = err instanceof Error ? err : new Error(String(err));
    throw _poolError;
  }
}

/**
 * Convenience alias matching the previous Supabase client shape so call
 * sites read naturally: `pool.query(...)`. Lazy.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool(), prop, receiver);
  },
});

/**
 * Typed query helper. Use this everywhere a `SELECT` / simple `INSERT/UPDATE`
 * is enough. For transactions or `LISTEN/NOTIFY`, use `getPool()` directly.
 *
 * Example:
 *   const { rows } = await query<AdminUserRow>(
 *     "SELECT * FROM admin_users WHERE user_id = $1 LIMIT 1",
 *     [uid]
 *   );
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>,
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[] | undefined);
}

/**
 * Run `fn` inside a single transaction. Commits on success, rolls back on
 * any thrown error. The provided client must be used for all queries inside
 * `fn` to keep them on the same connection.
 *
 * Example:
 *   const result = await withTx(async (client) => {
 *     await client.query("INSERT INTO foo ...", [...]);
 *     const { rows } = await client.query<Bar>("SELECT ...", [...]);
 *     return rows[0];
 *   });
 */
export async function withTx<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore secondary rollback failure
    }
    throw err;
  } finally {
    client.release();
  }
}
