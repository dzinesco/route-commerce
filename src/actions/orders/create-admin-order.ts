"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
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
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? null;
  if (adminUser.role === "brand_admin" && adminUser.brand_id && effectiveBrandId !== adminUser.brand_id) {
    return { success: false, error: "Not authorized for this brand" };
  }

  if (!input.customer_name?.trim()) {
    return { success: false, error: "Customer name is required" };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "At least one item is required" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/create_order_with_items`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          p_idempotency_key: idempotencyKey,
          p_customer_name: input.customer_name.trim(),
          p_customer_email: input.customer_email?.trim() || null,
          p_customer_phone: input.customer_phone?.trim() || null,
          p_stop_id: input.stop_id || null,
          p_items: rpcItems,
          p_tax_amount: taxAmount,
          p_tax_rate: taxRate,
          p_tax_location: taxLocation,
          // The RPC may also accept brand scoping internally via stop or we can extend later.
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      return { success: false, error: `Failed to create order: ${errText}` };
    }

    const data = await response.json();

    if (!data || !data.id) {
      return { success: false, error: "Order created but no ID returned" };
    }

    // Optionally attach internal notes via a follow-up update if the RPC doesn't support it directly.
    if (input.internal_notes?.trim()) {
      // Best-effort; don't fail the whole create if this secondary update fails.
      try {
        await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${data.id}`, {
          method: "PATCH",
          headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
          body: JSON.stringify({ internal_notes: input.internal_notes.trim() }),
        });
      } catch {
        // ignore
      }
    }

    return { success: true, orderId: data.id, order: data };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unexpected error creating order" };
  }
}
