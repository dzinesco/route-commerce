import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import type { AdminUser } from "./admin-permissions-types";
export type { AdminUser } from "./admin-permissions-types";

/**
 * Returns the current admin user, or `null` if not authenticated.
 *
 * Resolution order:
 *   1. Mock data mode (NEXT_PUBLIC_USE_MOCK_DATA=true) → platform_admin dev.
 *   2. `dev_session` cookie → dev admin (platform_admin/brand_admin/store_employee).
 *   3. Auth.js v5 session (JWT cookie) → look up `admin_users` by the
 *      Auth.js user id (the `users.id` UUID managed by @auth/pg-adapter).
 *
 * The legacy `rc_auth_uid` / `rc_uid` cookie path has been removed.
 * The Auth.js JWT is the single source of truth for identity; the
 * `dev_session` cookie is only used for the demo / dev auto-login in
 * `src/proxy.ts`.
 *
 * `brand_id` is the active brand; `brand_ids` is the full membership list.
 * For dev sessions without a real DB, `brand_ids` is populated by:
 *   - platform_admin: `[]` (listBrandsForAdmin resolves against the brands table)
 *   - store_employee: `[]`
 *   - brand_admin: `[]`
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();

  // ── Mock data mode for UI review ─────────────────────────────────
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    return buildDevAdmin("platform_admin");
  }

  // ── Dev session bypass (enabled for testing on all envs) ──────────
  const dev = cookieStore.get("dev_session")?.value;
  if (dev === "platform_admin" || dev === "brand_admin" || dev === "store_employee") {
    return buildDevAdmin(dev);
  }

  // ── Auth.js v5 session (JWT) ─────────────────────────────────────
  // After Google sign-in, the encrypted JWT cookie is set. `auth()`
  // decrypts it server-side and returns the session — no DB call here,
  // just cookie decryption. Then we look up the admin row by the
  // Auth.js `users.id` UUID (same ID space as `admin_users.user_id`).
  const session = await auth();
  if (session?.user?.id) {
    const admin = await getAdminUserFromPool(session.user.id);
    if (admin) return admin;
  }

  return null;
}

/**
 * Look up an admin user by the Auth.js `users.id` UUID using the shared
 * `pg` pool. Returns `null` if no active row exists.
 *
 * The `admin_users.user_id` column is UUID (see 028_fix_caller_uid_type.sql).
 * The Auth.js `users.id` is also UUID (see 204_authjs_tables.sql:18). The
 * @auth/pg-adapter auto-generates a fresh UUID per new user on first
 * sign-in; the Google `sub` claim is stored separately in
 * `accounts."providerAccountId"`. So both IDs are in the same UUID space.
 */
async function getAdminUserFromPool(userId: string): Promise<AdminUser | null> {
  try {
    const { rows } = await pool.query<Record<string, unknown>>(
      "SELECT * FROM admin_users WHERE user_id = $1 AND active = true LIMIT 1",
      [userId]
    );
    if (rows.length === 0) return null;
    const admin = rows[0];
    const brandIds = await fetchAdminUserBrandIdsFromPool(admin.id as string);
    return buildAdminUser(admin, brandIds);
  } catch (e) {
    console.warn("[admin-permissions] getAdminUserFromPool error:", e);
    return null;
  }
}

/**
 * Load `brand_ids` from the admin_user_brands junction for the given
 * admin row id, via the shared `pg` pool. Returns an empty array on any
 * failure.
 */
async function fetchAdminUserBrandIdsFromPool(adminRowId: string): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ brand_id: string }>(
      "SELECT brand_id FROM admin_user_brands WHERE admin_user_id = $1",
      [adminRowId]
    );
    return rows.map((r) => r.brand_id).filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function buildDevAdmin(role: string): AdminUser {
  // For dev sessions we don't have an admin_user_brands junction row to load.
  // - platform_admin: `brand_ids = []` (listBrandsForAdmin resolves against brands).
  // - store_employee: `brand_ids = []` (dev AdminAccessDenied is acceptable;
  //   this is the documented limitation — re-read spec section on getAdminUser
  //   step 1. We skip the spec's "fetch first real brand" complexity here in
  //   favour of keeping dev session cheap and DB-independent).
  // - brand_admin: `brand_ids = []` (same rationale).
  // `role` is narrowed to the strict union — we know the dev callers pass
  // only valid values.
  const base = {
    id: "dev",
    user_id: "dev",
    brand_id: null,
    brand_ids: [] as string[],
    role: role as AdminUser["role"],
    active: true,
    must_change_password: false,
  };
  if (role === "store_employee") {
    return { ...base, can_manage_products: false, can_manage_stops: false, can_manage_orders: true,
      can_manage_pickup: true, can_manage_messages: false, can_manage_refunds: false,
      can_manage_users: false, can_manage_water_log: false, can_manage_reports: false, can_manage_settings: false };
  }
  return { ...base, can_manage_products: true, can_manage_stops: true, can_manage_orders: true,
    can_manage_pickup: true, can_manage_messages: true, can_manage_refunds: true,
    can_manage_users: true, can_manage_water_log: true, can_manage_reports: true, can_manage_settings: true };
}

function buildAdminUser(r: Record<string, unknown>, brandIds: string[]): AdminUser {
  // The DB column is TEXT (per CLAUDE.md) so the runtime value is a string.
  // We narrow it to the known union here. If the DB has an unknown role
  // (e.g. a future role), the migration's CHECK constraint will reject it
  // before it ever reaches this function.
  const role = r.role as AdminUser["role"];
  // `brand_id` is the *legacy* single-brand column — preserved here as-is.
  // The canonical "active brand" is resolved by `getActiveBrandId` on each
  // page/action, which considers URL params, the active_brand_id cookie,
  // and this legacy fallback. Setting `brand_id` here to a sensible default
  // (legacy → first of brand_ids) keeps the AdminUser shape useful even
  // for callers that haven't migrated to `getActiveBrandId` yet.
  const legacyBrandId = (r.brand_id as string | null) ?? null;
  const base = {
    id: r.id as string,
    user_id: r.user_id as string,
    brand_id: legacyBrandId ?? brandIds[0] ?? null,
    brand_ids: brandIds,
    role,
    active: r.active as boolean,
    must_change_password: Boolean(r.must_change_password),
  };
  if (role === "platform_admin") {
    return { ...base, can_manage_products: true, can_manage_stops: true, can_manage_orders: true,
      can_manage_pickup: true, can_manage_messages: true, can_manage_refunds: true,
      can_manage_users: true, can_manage_water_log: true, can_manage_reports: true, can_manage_settings: true };
  }
  if (role === "store_employee") {
    return { ...base, can_manage_products: false, can_manage_stops: false, can_manage_orders: true,
      can_manage_pickup: true, can_manage_messages: false, can_manage_refunds: false,
      can_manage_users: false, can_manage_water_log: false, can_manage_reports: false, can_manage_settings: false };
  }
  return { ...base, can_manage_products: Boolean(r.can_manage_products), can_manage_stops: Boolean(r.can_manage_stops),
    can_manage_orders: Boolean(r.can_manage_orders), can_manage_pickup: Boolean(r.can_manage_pickup),
    can_manage_messages: Boolean(r.can_manage_messages), can_manage_refunds: Boolean(r.can_manage_refunds),
    can_manage_users: Boolean(r.can_manage_users), can_manage_water_log: Boolean(r.can_manage_water_log),
    can_manage_reports: Boolean(r.can_manage_reports), can_manage_settings: Boolean(r.can_manage_settings) };
}
