"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { withTx, pool } from "@/lib/db";
import { orders, orderItems, customers } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ImportOrdersResult =
  | { success: true; imported: number; errors: { row: number; error: string }[] }
  | { success: false; error: string };

/**
 * Bulk-import orders. Replaces the legacy `create_order_with_items` SECURITY
 * DEFINER RPC (`supabase/migrations/021_shipping_only_brand.sql`). The new
 * `orders` schema doesn't have `subtotal`, `customer_name`, `customer_email`,
 * `customer_phone`, or `stop_id` columns — totals are stored in
 * `total_cents` and customers are referenced by `customer_id`. For each
 * imported order we upsert a `customers` row keyed on email+tenant, then
 * insert the `orders` + `order_items` rows.
 */
export async function importOrdersBatch(
  brandId: string,
  ordersToImport: Array<{
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

  const results = { imported: 0, errors: [] as { row: number; error: string }[] };

  for (let i = 0; i < ordersToImport.length; i++) {
    const order = ordersToImport[i];
    try {
      // Compute total_cents server-side from current product prices.
      const productIds = order.items.map((it) => it.product_id);
      if (productIds.length === 0) {
        results.errors.push({ row: i, error: "Order has no items" });
        continue;
      }

      // Fetch product prices for the brand.
      const productRes = await pool.query<{ id: string; price_cents: number }>(
        `SELECT id, price_cents FROM products WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [brandId, productIds]
      );
      const priceMap = new Map(productRes.rows.map((p) => [p.id, p.price_cents]));

      let totalCents = 0;
      for (const it of order.items) {
        const unit = priceMap.get(it.product_id);
        if (typeof unit !== "number") {
          results.errors.push({ row: i, error: `Unknown product: ${it.product_id}` });
          totalCents = -1;
          break;
        }
        totalCents += unit * it.quantity;
      }
      if (totalCents < 0) continue;

      // Determine fulfillment: pickup | ship | mixed based on items.
      const fulfillments = new Set(order.items.map((it) => it.fulfillment));
      const fulfillment: "pickup" | "ship" | "mixed" =
        fulfillments.size > 1
          ? "mixed"
          : (Array.from(fulfillments)[0] as "pickup" | "ship" | "mixed") ?? "pickup";

      // Insert in a single transaction: customers + orders + order_items.
      await withTx(async (client) => {
        // Upsert customer by (tenant_id, email).
        const customerRes = await client.query<{ id: string }>(
          `INSERT INTO customers (tenant_id, name, email, phone, email_opt_in)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL
           DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, updated_at = now()
           RETURNING id`,
          [brandId, order.customer_name, order.customer_email || null, order.customer_phone || null]
        );
        const customerId = customerRes.rows[0]?.id ?? null;

        const orderRes = await client.query<{ id: string }>(
          `INSERT INTO orders (tenant_id, customer_id, total_cents, status, fulfillment)
           VALUES ($1, $2, $3, 'pending', $4)
           RETURNING id`,
          [brandId, customerId, totalCents, fulfillment]
        );
        const orderId = orderRes.rows[0]?.id;
        if (!orderId) throw new Error("Order insert returned no id");

        for (const it of order.items) {
          const unit = priceMap.get(it.product_id) ?? 0;
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price_cents, fulfillment)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, it.product_id, it.quantity, unit, it.fulfillment === "shipping" ? "ship" : it.fulfillment]
          );
        }
      });

      results.imported++;
    } catch (err) {
      results.errors.push({
        row: i,
        error: `Failed to import order for ${order.customer_name}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { success: true, imported: results.imported, errors: results.errors };
}
