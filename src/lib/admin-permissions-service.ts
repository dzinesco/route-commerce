/**
 * Service-layer admin user creation. Hits the `admin_users` table directly
 * via the shared pg pool. Returns the inserted row (or existing row if the
 * user was already provisioned).
 */
export async function createAdminUser(
  userId: string,
  role: string,
  brandId: string | null
): Promise<Record<string, unknown> | null> {
  const { pool } = await import("@/lib/db");
  const body = {
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
  };

  try {
    const { rows } = await pool.query<Record<string, unknown>>(
      `INSERT INTO admin_users
         (user_id, role, brand_id, active,
          can_manage_products, can_manage_stops, can_manage_orders,
          can_manage_pickup, can_manage_messages, can_manage_refunds,
          can_manage_users, can_manage_water_log, can_manage_reports,
          can_manage_settings, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (user_id) DO UPDATE
         SET role = EXCLUDED.role,
             brand_id = EXCLUDED.brand_id,
             active = EXCLUDED.active,
             can_manage_products = EXCLUDED.can_manage_products,
             can_manage_stops = EXCLUDED.can_manage_stops,
             can_manage_orders = EXCLUDED.can_manage_orders,
             can_manage_pickup = EXCLUDED.can_manage_pickup,
             can_manage_messages = EXCLUDED.can_manage_messages,
             can_manage_refunds = EXCLUDED.can_manage_refunds,
             can_manage_users = EXCLUDED.can_manage_users,
             can_manage_water_log = EXCLUDED.can_manage_water_log,
             can_manage_reports = EXCLUDED.can_manage_reports,
             can_manage_settings = EXCLUDED.can_manage_settings
       RETURNING *`,
      [
        body.user_id,
        body.role,
        body.brand_id,
        body.active,
        body.can_manage_products,
        body.can_manage_stops,
        body.can_manage_orders,
        body.can_manage_pickup,
        body.can_manage_messages,
        body.can_manage_refunds,
        body.can_manage_users,
        body.can_manage_water_log,
        body.can_manage_reports,
        body.can_manage_settings,
        body.must_change_password,
      ],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
