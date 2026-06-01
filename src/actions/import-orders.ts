"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type ImportOrdersResult =
  | { success: true; imported: number; errors: { row: number; error: string }[] }
  | { success: false; error: string };

export async function importOrdersBatch(
  brandId: string,
  orders: Array<{
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    stop_id: string;
    items: Array<{ product_id: string; quantity: number; fulfillment: string }>;
  }>
): Promise<ImportOrdersResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const results = { imported: 0, errors: [] as { row: number; error: string }[] };

  for (const order of orders) {
    const idempotencyKey = crypto.randomUUID();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/create_order_with_items`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_idempotency_key: idempotencyKey,
          p_customer_name: order.customer_name,
          p_customer_email: order.customer_email,
          p_customer_phone: order.customer_phone,
          p_stop_id: order.stop_id,
          p_items: order.items.map((it) => ({
            id: it.product_id,
            quantity: it.quantity,
            fulfillment: it.fulfillment,
          })),
        }),
      }
    );

    if (!response.ok) {
      results.errors.push({ row: 0, error: `Failed to import order for ${order.customer_name}` });
    } else {
      results.imported++;
    }
  }

  return { success: true, imported: results.imported, errors: results.errors };
}