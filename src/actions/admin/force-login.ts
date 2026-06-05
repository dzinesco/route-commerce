"use server";

import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEV_ADMIN_UID = "dev-user-00000000-0000-0000-0000-000000000001";

export async function forceAdminLogin(): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    // Upsert dev platform_admin record
    const res = await pool.query(
      `INSERT INTO admin_users (
        user_id, brand_id, role, active,
        can_manage_products, can_manage_stops, can_manage_orders, can_manage_pickup,
        can_manage_messages, can_manage_refunds, can_manage_users, can_manage_water_log,
        can_manage_reports, can_manage_settings, must_change_password
      ) VALUES (
        $1, NULL, 'platform_admin', true,
        true, true, true, true,
        true, true, true, true,
        true, true, false
      )
      ON CONFLICT (user_id) DO UPDATE SET active = EXCLUDED.active
      RETURNING id, role`,
      [DEV_ADMIN_UID]
    );

    if (res.rows.length === 0) {
      return { success: false, error: "Failed to upsert dev admin" };
    }

    return { success: true, uid: DEV_ADMIN_UID };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}
