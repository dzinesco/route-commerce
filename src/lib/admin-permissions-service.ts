/**
 * Service-layer admin user creation via Supabase REST API.
 * Uses apikey-only authentication — no Authorization header (which fails on
 * Vercel Edge due to raw JWT chars +, /, = in the token).
 */
export async function createAdminUser(
  userId: string,
  role: string,
  brandId: string | null
): Promise<Record<string, unknown> | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const body = JSON.stringify({
    user_id: userId,
    role,
    brand_id: brandId,
    active: true,
    can_manage_products: role === "platform_admin",
    can_manage_stops: role === "platform_admin",
    can_manage_orders: true,
    can_manage_pickup: role !== "store_employee",
    can_manage_messages: role === "platform_admin",
    can_manage_refunds: role === "platform_admin",
    can_manage_users: role === "platform_admin",
    can_manage_water_log: role === "platform_admin",
    can_manage_reports: role === "platform_admin",
    can_manage_settings: role === "platform_admin",
    must_change_password: false,
  });

  // Use apikey-only — no Authorization header to avoid Vercel Edge JWT rejection
  const res = await fetch(`${supabaseUrl}/rest/v1/admin_users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body,
  });

  if (res.status === 409) {
    // User already exists — fetch and return
    const existing = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${userId}&limit=1`,
      { headers: { apikey: serviceKey, "Content-Type": "application/json" } }
    );
    const data = existing.ok ? await existing.json().catch(() => null) : null;
    return (Array.isArray(data) && data.length > 0) ? data[0] as Record<string, unknown> : null;
  }

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
}