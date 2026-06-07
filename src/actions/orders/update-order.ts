"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
import { logAuditEvent } from "@/actions/audit";

export type UpdateOrderResult =
  | { success: true }
  | { success: false; error: string };

export async function updateOrder(
  orderId: string,
  brandId: string | null,
  data: {
    customer_name?: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    status?: string;
    discount_amount?: number | null;
    discount_reason?: string | null;
    internal_notes?: string | null;
    pickup_complete?: boolean;
    pickup_completed_at?: string | null;
    subtotal?: number;
    // Payment fields
    payment_processor?: string | null;
    payment_status?: string | null;
    payment_transaction_id?: string | null;
  }
): Promise<UpdateOrderResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  // Build a partial SET clause. Each set column is added in the order
  // the caller passed it; we don't care about column ordering.
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };

  if (data.customer_name !== undefined) push("customer_name", data.customer_name);
  if (data.customer_email !== undefined) push("customer_email", data.customer_email);
  if (data.customer_phone !== undefined) push("customer_phone", data.customer_phone);
  if (data.status !== undefined) push("status", data.status);
  if (data.discount_amount !== undefined) push("discount_amount", data.discount_amount);
  if (data.discount_reason !== undefined) push("discount_reason", data.discount_reason);
  if (data.internal_notes !== undefined) push("internal_notes", data.internal_notes);
  if (data.pickup_complete !== undefined) push("pickup_complete", data.pickup_complete);
  if (data.pickup_completed_at !== undefined) push("pickup_completed_at", data.pickup_completed_at);
  if (data.subtotal !== undefined) push("subtotal", data.subtotal);
  if (data.payment_processor !== undefined) push("payment_processor", data.payment_processor);
  if (data.payment_status !== undefined) push("payment_status", data.payment_status);
  if (data.payment_transaction_id !== undefined) push("payment_transaction_id", data.payment_transaction_id);

  if (sets.length === 0) {
    return { success: true };
  }

  params.push(orderId);
  const patchData = Object.fromEntries(
    sets.map((s, i) => {
      const col = s.split(" = ")[0];
      return [col, params[i]];
    }),
  );

  try {
    await pool.query(
      `UPDATE orders SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params,
    );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed",
    };
  }

  logAuditEvent({
    table_name: "orders",
    record_id: orderId,
    action: "UPDATE",
    old_data: {},
    new_data: patchData,
    brand_id: brandId,
  });

  return { success: true };
}

export async function updateOrderItem(
  itemId: string,
  data: { quantity?: number; price?: number }
): Promise<UpdateOrderResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };

  if (data.quantity !== undefined) push("quantity", data.quantity);
  if (data.price !== undefined) push("price", data.price);

  if (sets.length === 0) {
    return { success: true };
  }

  params.push(itemId);
  try {
    await pool.query(
      `UPDATE order_items SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params,
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed",
    };
  }
}

export async function deleteOrderItem(itemId: string): Promise<UpdateOrderResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  try {
    await pool.query("DELETE FROM order_items WHERE id = $1", [itemId]);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed",
    };
  }
}
