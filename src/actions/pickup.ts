"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { logAuditEvent } from "@/actions/audit";
import { pool } from "@/lib/db";

type MarkPickupResult =
  | { success: true; pickup_completed_at: string; pickup_completed_by: string | null }
  | { success: false; error: string };

export async function markPickupComplete(
  orderId: string,
  brandId: string | null
): Promise<MarkPickupResult> {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }

  if (!adminUser.can_manage_pickup) {
    return { success: false, error: "Not authorized to manage pickup" };
  }

  const now = new Date().toISOString();
  // `user_id` is null for Google-authenticated admins who haven't been
  // linked to a Supabase auth user yet. Pass null through; downstream
  // audit/assignment RPCs will surface a clearer error.
  const performedBy = adminUser.user_id;

  // brand_admin: verify the order belongs to their brand
  if (adminUser.role === "brand_admin" && adminUser.brand_id) {
    const orderRes = await pool.query<{ brand_id: string | null; stop_id: string | null }>(
      "SELECT brand_id, stop_id FROM orders WHERE id = $1 LIMIT 1",
      [orderId],
    );
    if (orderRes.rows.length === 0) {
      return { success: false, error: "Order not found" };
    }
    const order = orderRes.rows[0];

    if (order.brand_id && order.brand_id !== adminUser.brand_id) {
      return { success: false, error: "Not authorized for this order" };
    }

    if (!order.brand_id && order.stop_id) {
      const stopRes = await pool.query<{ brand_id: string | null }>(
        "SELECT brand_id FROM stops WHERE id = $1 LIMIT 1",
        [order.stop_id],
      );
      if (
        stopRes.rows[0] &&
        stopRes.rows[0].brand_id !== adminUser.brand_id
      ) {
        return { success: false, error: "Not authorized for this order" };
      }
    }
  }

  // UPDATE the order
  const updateRes = await pool.query(
    `UPDATE orders
        SET pickup_complete = true,
            pickup_completed_at = $1,
            pickup_completed_by = $2
      WHERE id = $3`,
    [now, performedBy, orderId],
  );
  if ((updateRes.rowCount ?? 0) === 0) {
    return { success: false, error: "Order not found" };
  }

  // Fire-and-forget audit log
  logAuditEvent({
    table_name: "orders",
    record_id: orderId,
    action: "UPDATE",
    old_data: {
      pickup_complete: false,
      pickup_completed_at: null,
      pickup_completed_by: null,
    },
    new_data: {
      pickup_complete: true,
      pickup_completed_at: now,
      pickup_completed_by: performedBy,
    },
    brand_id: brandId,
  });

  // Emit pickup_completed event
  // Need brand_id — get it from the order we just patched
  const orderRes = await pool.query<{ brand_id: string | null }>(
    "SELECT brand_id FROM orders WHERE id = $1",
    [orderId],
  );
  const orderBrandId = orderRes.rows[0]?.brand_id;
  if (orderBrandId) {
    try {
      await pool.query(
        "SELECT * FROM record_pickup_completed_event($1, $2, $3)",
        [orderId, orderBrandId, performedBy],
      );
    } catch {
      // Event emission is best-effort.
    }
  }

  return {
    success: true,
    pickup_completed_at: now,
    pickup_completed_by: performedBy,
  };
}
