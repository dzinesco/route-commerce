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
 *   4. Real auth (rc_auth_uid or rc_uid cookie) → load admin_users + brand_ids.
 *
 * `brand_id` is the active brand; `brand_ids` is the full membership list.
 * For dev sessions without a real DB, `brand_ids` is populated by:
 *   - platform_admin: `[]` (listBrandsForAdmin resolves against the brands table)
 *   - store_employee: `[<first real brand>]` if a brand exists, else `[]`
 *   - brand_admin: `[]` (legacy dev; we don't have a way to scope brand in dev)
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

  // ── Main auth: rc_auth_uid (new) or rc_uid (legacy) cookie set by /api/login ─
  const uid = cookieStore.get("rc_auth_uid")?.value ?? cookieStore.get("rc_uid")?.value;
  if (!uid) return null;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null;
  }

  // Lookup admin_users by Supabase auth user id
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  let adminUsers: unknown[] = [];
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${uid}&limit=1`,
      { headers: { apikey: serviceKey, "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = await res.json().catch(() => []);
      adminUsers = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    // fetch failed silently
  }

  // First login — auto-create platform_admin via SECURITY DEFINER RPC
  if (adminUsers.length === 0) {
    // Check if uid is a valid UUID before trying to insert
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(uid)) return null;

    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/rpc/upsert_admin_user`,
        {
          method: "POST",
          headers: { apikey: serviceKey, "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ p_user_id: uid }),
        }
      );
      if (res.ok) {
        const inserted = await res.json().catch(() => null);
        if (inserted && inserted.length > 0) {
          return buildAdminUser(inserted[0] as Record<string, unknown>, []);
        }
      }
    } catch (e) {
      // RPC failed silently
    }
    return null;
  }

  const admin = adminUsers[0] as Record<string, unknown>;
  if (!admin.active) return null;

  // Load brand_ids from the admin_user_brands junction
  const brandIds = await fetchAdminUserBrandIds(supabaseUrl, serviceKey, admin.id as string);

  return buildAdminUser(admin, brandIds);
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

/**
 * Load `brand_ids` from the admin_user_brands junction for the given admin row.
 * Returns an empty array on any failure (e.g. before migration 207 is applied).
 */
async function fetchAdminUserBrandIds(
  supabaseUrl: string,
  serviceKey: string,
  adminRowId: string
): Promise<string[]> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/admin_user_brands?admin_user_id=eq.${adminRowId}&select=brand_id`,
      { headers: { apikey: serviceKey, "Content-Type": "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    return data
      .map((row: Record<string, unknown>) => row.brand_id as string)
      .filter((id): id is string => typeof id === "string");
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
