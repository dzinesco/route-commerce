"use server";

/**
 * List the customers with pending pickups for a given stop.
 *
 * TODO(migration): the SaaS rebuild's `orders` table
 * (db/schema/orders.ts) doesn't carry a `stop_id` column, so this
 * helper queries the legacy `orders` table directly via `pool.query`
 * for the customer-name / email / phone. When the new schema grows a
 * `stop_id` reference, switch this read to a Drizzle query.
 */

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

export type StopCustomer = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_complete: boolean;
};

export type GetStopPendingCustomersResult =
  | { success: true; customers: StopCustomer[] }
  | { success: false; error: string };

export async function getStopPendingCustomers(
  stopId: string
): Promise<GetStopPendingCustomersResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  // Resolve the stop's brand so we can scope-check.
  const { rows: stopRows } = await pool.query<{ brand_id: string | null }>(
    "SELECT brand_id::text AS brand_id FROM stops WHERE id = $1 LIMIT 1",
    [stopId]
  );
  const brandId = stopRows[0]?.brand_id ?? null;
  if (brandId) {
    try { assertBrandAccess(adminUser, brandId); } catch {
      return { success: false, error: "Brand access denied" };
    }
  }

  try {
    const { rows } = await pool.query<StopCustomer>(
      `SELECT id::text AS id,
              COALESCE(customer_name, '') AS customer_name,
              customer_email,
              customer_phone,
              COALESCE(pickup_complete, false) AS pickup_complete
       FROM orders
       WHERE stop_id = $1
         AND COALESCE(pickup_complete, false) = false
       ORDER BY created_at DESC`,
      [stopId]
    );
    return { success: true, customers: rows };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load customers",
    };
  }
}
