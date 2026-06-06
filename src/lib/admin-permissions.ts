import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

export type AdminUser = {
  id: string;
  user_id: string;
  brand_id: string | null;
  role: string;
  active: boolean;
  can_manage_products: boolean;
  can_manage_stops: boolean;
  can_manage_orders: boolean;
  can_manage_pickup: boolean;
  can_manage_messages: boolean;
  can_manage_refunds: boolean;
  can_manage_users: boolean;
  can_manage_water_log: boolean;
  can_manage_reports: boolean;
  can_manage_settings: boolean;
  must_change_password: boolean;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the current admin user.
 *
 * Auth source precedence:
 *   1. `NEXT_PUBLIC_USE_MOCK_DATA=true` — return a platform_admin dev shim.
 *   2. `dev_session` cookie — return the matching dev shim
 *      (platform_admin / brand_admin / store_employee).
 *   3. Auth.js v5 session — call the `get_admin_user_for_session` RPC,
 *      which transparently looks up by `user_id` (Supabase UUID) or
 *      `auth_subject` (Google `sub` claim). Falls back to a direct
 *      `user_id` / `email` REST query for the pre-migration schema.
 *      Auto-provisions first-time sign-ins via `upsert_admin_user`
 *      (also handles both provider paths).
 *
 * Both RPCs are added by supabase/migrations/204_admin_users_email_and_auth_subject.sql.
 * Until that migration is applied, the function degrades to a direct REST
 * query (the same lookup the previous code did) and skips auto-provisioning.
 *
 * Errors from the auth library or the network are caught and return `null`
 * — the admin layout's existing `try/catch` then renders `AdminAccessDenied`
 * with a generic message instead of crashing the server render.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return null;
  }

  // ── Mock data mode for UI review ─────────────────────────────────
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    return buildDevAdmin("platform_admin");
  }

  // ── Dev session bypass (enabled for testing on all envs) ────────
  const dev = cookieStore.get("dev_session")?.value;
  if (dev === "platform_admin" || dev === "brand_admin" || dev === "store_employee") {
    return buildDevAdmin(dev);
  }

  // ── Auth.js v5 session ──────────────────────────────────────────
  let session;
  try {
    session = await auth();
  } catch {
    return null;
  }
  const sessionId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!sessionId) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const adminHeaders = { apikey: serviceKey, "Content-Type": "application/json" } as const;
  let admin: Record<string, unknown> | null = null;

  // 1. Try the new `get_admin_user_for_session` RPC (handles both UUID
  //    and Google-subject lookups in one call). 404 = function doesn't
  //    exist yet (migration 204 not applied) — fall through to legacy.
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_admin_user_for_session`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ p_session_id: sessionId }),
    });
    if (res.ok) {
      admin = await parseRpcSingle(res);
    }
    // 404 / 5xx → fall through to legacy
  } catch {
    // network error — fall through
  }

  // 2. Legacy fallback: direct REST query. UUIDs match `user_id`,
  //    non-UUIDs (Google subjects) match `email`.
  if (!admin) {
    try {
      const filter = UUID_REGEX.test(sessionId)
        ? `user_id=eq.${sessionId}&limit=1`
        : `email=ilike.${encodeURIComponent(email ?? "")}&limit=1`;
      const res = await fetch(`${supabaseUrl}/rest/v1/admin_users?${filter}`, {
        headers: adminHeaders,
      });
      if (res.ok) admin = await parseFirstRow(res);
    } catch {
      // fetch failed silently
    }
  }

  if (admin) {
    if (!admin.active) return null;
    return buildAdminUser(admin);
  }

  // 3. First-time sign-in: auto-provision via the new RPC. Only runs
  //    once the migration is applied (404 on the RPC = no-op, fall
  //    through to `null`).
  try {
    const isUuid = UUID_REGEX.test(sessionId);
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_admin_user`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        p_user_id: isUuid ? sessionId : null,
        p_email: email,
        p_auth_provider: isUuid ? "supabase" : "google",
        p_auth_subject: isUuid ? null : sessionId,
      }),
    });
    if (res.ok) {
      const row = await parseRpcSingle(res);
      if (row) return buildAdminUser(row);
    }
  } catch {
    // RPC failed silently
  }

  return null;
}

async function parseRpcSingle(res: Response): Promise<Record<string, unknown> | null> {
  const data = await res.json().catch(() => null);
  if (Array.isArray(data) && data.length > 0) return data[0] as Record<string, unknown>;
  if (data && typeof data === "object" && "id" in (data as Record<string, unknown>)) {
    return data as Record<string, unknown>;
  }
  return null;
}

async function parseFirstRow(res: Response): Promise<Record<string, unknown> | null> {
  const data = (await res.json().catch(() => [])) as unknown;
  if (Array.isArray(data) && data.length > 0) return data[0] as Record<string, unknown>;
  return null;
}

/**
 * Builds an `AdminUser` for a `dev_session` cookie holder. Exported so
 * unit tests can verify the dev shim is the source of truth for the
 * demo flow.
 */
export function buildDevAdmin(role: string): AdminUser {
  const base = { id: "dev", user_id: "dev", brand_id: null, role, active: true, must_change_password: false };
  if (role === "store_employee") {
    return { ...base, can_manage_products: false, can_manage_stops: false, can_manage_orders: true,
      can_manage_pickup: true, can_manage_messages: false, can_manage_refunds: false,
      can_manage_users: false, can_manage_water_log: false, can_manage_reports: false, can_manage_settings: false };
  }
  return { ...base, can_manage_products: true, can_manage_stops: true, can_manage_orders: true,
    can_manage_pickup: true, can_manage_messages: true, can_manage_refunds: true,
    can_manage_users: true, can_manage_water_log: true, can_manage_reports: true, can_manage_settings: true };
}

function buildAdminUser(r: Record<string, unknown>): AdminUser {
  const role = r.role as string;
  const base = { id: r.id as string, user_id: r.user_id as string, brand_id: r.brand_id as string | null,
    role, active: r.active as boolean, must_change_password: Boolean(r.must_change_password) };
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
