"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const patchData: Record<string, unknown> = {};
  if (data.customer_name !== undefined) patchData.customer_name = data.customer_name;
  if (data.customer_email !== undefined) patchData.customer_email = data.customer_email;
  if (data.customer_phone !== undefined) patchData.customer_phone = data.customer_phone;
  if (data.status !== undefined) patchData.status = data.status;
  if (data.discount_amount !== undefined) patchData.discount_amount = data.discount_amount;
  if (data.discount_reason !== undefined) patchData.discount_reason = data.discount_reason;
  if (data.internal_notes !== undefined) patchData.internal_notes = data.internal_notes;
  if (data.pickup_complete !== undefined) patchData.pickup_complete = data.pickup_complete;
  if (data.pickup_completed_at !== undefined) patchData.pickup_completed_at = data.pickup_completed_at;
  if (data.subtotal !== undefined) patchData.subtotal = data.subtotal;
  if (data.payment_processor !== undefined) patchData.payment_processor = data.payment_processor;
  if (data.payment_status !== undefined) patchData.payment_status = data.payment_status;
  if (data.payment_transaction_id !== undefined) patchData.payment_transaction_id = data.payment_transaction_id;

  const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
    method: "PATCH",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify(patchData),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const patchData: Record<string, unknown> = {};
  if (data.quantity !== undefined) patchData.quantity = data.quantity;
  if (data.price !== undefined) patchData.price = data.price;

  const res = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${itemId}`, {
    method: "PATCH",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify(patchData),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
  }

  return { success: true };
}

export async function deleteOrderItem(itemId: string): Promise<UpdateOrderResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${itemId}`, {
    method: "DELETE",
    headers: { ...svcHeaders(supabaseKey) },
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
  }

  return { success: true };
}
