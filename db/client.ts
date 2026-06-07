/**
 * Drizzle client + tenant-scoped query helper.
 *
 * The app connects to Postgres directly via the `pg` driver. Drizzle sits
 * on top, providing typed queries. The `withTenant` wrapper is the only
 * sanctioned way to run a tenant-scoped query — it sets the
 * `app.current_tenant_id` GUC transaction-locally, and the database's
 * RLS policies enforce tenant isolation even if application code forgets
 * a `WHERE tenant_id = $1`.
 *
 * Usage (read):
 *   const products = await withTenant(tenantId, (db) =>
 *     db.select().from(productsTable).where(eq(productsTable.active, true)),
 *   );
 *
 * Usage (platform admin — sees all tenants):
 *   const allTenants = await withPlatformAdmin((db) =>
 *     db.select().from(tenantsTable),
 *   );
 *
 * Usage (no tenant — for the rare case the query isn't tenant-scoped):
 *   const plans = await withDb((db) => db.select().from(plansTable));
 */

import "server-only";
import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.example).",
    );
  }
  _pool = new Pool({
    connectionString,
    max: parseInt(process.env.PG_POOL_MAX ?? "10", 10),
    idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE_MS ?? "30000", 10),
    connectionTimeoutMillis: parseInt(
      process.env.PG_POOL_CONN_TIMEOUT_MS ?? "10000",
      10,
    ),
    allowExitOnIdle: false,
  });
  _pool.on("error", (err) => {
    console.error("[db] idle client error", err);
  });
  return _pool;
}

/**
 * Run `fn` with a Drizzle client. No tenant context is set — the caller
 * is responsible for RLS bypass (e.g. for the `plans` and `add_ons` tables,
 * which are not tenant-scoped). For tenant-scoped reads, prefer
 * `withTenant` or `withPlatformAdmin`.
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    const db = drizzle(client, { schema });
    return await fn(db);
  } finally {
    client.release();
  }
}

/**
 * Run `fn` inside a transaction with the current tenant id set as a
 * transaction-local GUC. RLS policies on tenant-scoped tables will allow
 * reads/writes only for rows where `tenant_id` matches. Pass `null` to
 * fail open (don't set the GUC) — only useful for the migrations
 * themselves, never for app code.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  return runInTransaction(async (client) => {
    // set_config(setting, value, is_local) — is_local=true makes it
    // transaction-local so it auto-resets at COMMIT/ROLLBACK and never
    // leaks across pooled connections.
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [
      tenantId,
    ]);
    await client.query("SELECT set_config('app.platform_admin', 'false', true)");
    const db = drizzle(client, { schema });
    return fn(db);
  });
}

/**
 * Run `fn` as platform admin. RLS policies permit access to all tenants.
 * Use sparingly — typically only in the /admin/platform routes.
 */
export async function withPlatformAdmin<T>(
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  return runInTransaction(async (client) => {
    await client.query("SELECT set_config('app.platform_admin', 'true', true)");
    const db = drizzle(client, { schema });
    return fn(db);
  });
}

async function runInTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
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

export { schema };
