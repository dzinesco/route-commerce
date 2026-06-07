"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { pool } from "@/lib/db";
import { randomUUID } from "crypto";

export type AdminCreateOrderItem = {
  product_id: string;
  quantity: number;
  price: number;
  fulfillment?: "pickup" | "ship";
};

export type AdminCreateOrderInput = {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  stop_id?: string | null; // null for shipping-only / manual
  items: AdminCreateOrderItem[];
  internal_notes?: string | null;
  // Optional overrides; if omitted we can compute simple or let RPC default
  tax_amount?: number;
  discount_amount?: number;
  discount_reason?: string | null;
};

export type AdminCreateOrderResult =
  | { success: true; orderId: string; order: any }
  | { success: false; error: string };

export async function createAdminOrder(
  brandId: string | null,
  input: AdminCreateOrderInput
): Promise<AdminCreateOrderResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }
  if (!adminUser.can_manage_orders) {
    return { success: false, error: "Not authorized to create orders" };
  }

  // Brand scoping
  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, error: "Brand access required" };
  }
  const effectiveBrandId = activeBrandId;
  if (adminUser.role === "brand_admin" && adminUser.brand_id && effectiveBrandId !== adminUser.brand_id) {
    return { success: false, error: "Not authorized for this brand" };
  }

  if (!input.customer_name?.trim()) {
    return { success: false, error: "Customer name is required" };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "At least one item is required" };
  }

  // Build items for RPC (match checkout shape)
  const rpcItems = input.items.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
    price: i.price,
    fulfillment: i.fulfillment ?? "pickup",
  }));

  const idempotencyKey = randomUUID();

  // For admin manual orders we pass minimal tax info (0 or provided). Full tax calc can be added later.
  const taxAmount = input.tax_amount ?? 0;
  const taxRate = 0;
  const taxLocation = null;

  try {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT * FROM create_order_with_items(
         $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9
       )`,
      [
        idempotencyKey,
        input.customer_name.trim(),
        input.customer_email?.trim() || null,
        input.customer_phone?.trim() || null,
        input.stop_id || null,
        JSON.stringify(rpcItems),
        taxAmount,
        taxRate,
        taxLocation,
      ],
    );
    const data = rows[0];
    if (!data || !data.id) {
      return { success: false, error: "Order created but no ID returned" };
    }

    // Optionally attach internal notes via a follow-up update if the RPC doesn't support it directly.
    if (input.internal_notes?.trim()) {
      // Best-effort; don't fail the whole create if this secondary update fails.
      try {
        await pool.query(
          "UPDATE orders SET internal_notes = $1 WHERE id = $2",
          [input.internal_notes.trim(), data.id],
        );
      } catch {
        // ignore
      }
    }

    return { success: true, orderId: data.id, order: data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error creating order",
    };
  }
}
