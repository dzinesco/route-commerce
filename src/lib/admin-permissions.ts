import { cookies } from "next/headers";

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

export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();

  // ── Mock data mode for UI review ─────────────────────────────────
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    return buildDevAdmin("platform_admin");
  }

  // ── Dev session bypass (enabled for testing on all envs) ──────────────
  const dev = cookieStore.get("dev_session")?.value;
  if (dev === "platform_admin" || dev === "brand_admin" || dev === "store_employee") {
    return buildDevAdmin(dev);
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
          return buildAdminUser(inserted[0] as Record<string, unknown>);
        }
      }
    } catch (e) {
      // RPC failed silently
    }
    return null;
  }

  const admin = adminUsers[0] as Record<string, unknown>;
  if (!admin.active) return null;

  return buildAdminUser(admin);
}

function buildDevAdmin(role: string): AdminUser {
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