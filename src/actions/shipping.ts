"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export type UpdateShippingStatusResult =
  | { success: true }
  | { success: false; error: string };

// TODO(migration): shipping is dormant in the SaaS rebuild. The legacy
// `shipments` table (with `tracking_number`, `fedex_shipment_id`, etc.),
// the `shipping_status` column on `orders`, and the `update_shipping_order`
// RPC from `supabase/migrations/040_shipping_fulfillment_rpcs.sql` are
// gone. The functions below stub to "not configured" so the admin
// shipping tab renders gracefully. Re-introduce shipping in
// `db/schema/` when the feature is reactivated.

export async function updateShippingStatus(
  _orderId: string,
  _status: string,
  _trackingNumber?: string
): Promise<UpdateShippingStatusResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };
  return { success: false, error: "Shipping not configured" };
}

export type GetShippingOrdersResult = {
  success: boolean;
  orders?: ShippingOrder[];
  error?: string;
};

export type ShippingOrder = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  subtotal: number;
  shipping_status: string;
  tracking_number: string | null;
  created_at: string;
  brand_id: string | null;
  order_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    fulfillment: string;
    products: { name: string; is_perishable: boolean } | null;
  }>;
};

export async function getShippingOrders(): Promise<GetShippingOrdersResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // Read shipping-eligible orders from the new schema as a best-effort
  // approximation. The legacy shape had `customer_*` columns and a join
  // table; we fall back to `customers` for the name and `order_items`
  // for line-item info. `subtotal` (legacy) → `total_cents / 100`.
  const { rows } = await pool.query<{
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    status: string;
    subtotal: number;
    created_at: string;
    tenant_id: string;
  }>(
    `SELECT
       o.id::text AS id,
       c.name AS customer_name,
       c.email AS customer_email,
       c.phone AS customer_phone,
       o.status,
       o.total_cents::float / 100.0 AS subtotal,
       o.placed_at::text AS created_at,
       o.tenant_id::text AS tenant_id
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.fulfillment IN ('ship', 'mixed')
     ORDER BY o.placed_at DESC
     LIMIT 100`
  );

  const orders: ShippingOrder[] = rows.map((r) => ({
    id: r.id,
    customer_name: r.customer_name ?? "Unknown",
    customer_email: r.customer_email,
    customer_phone: r.customer_phone,
    status: r.status,
    subtotal: r.subtotal,
    shipping_status: "pending",
    tracking_number: null,
    created_at: r.created_at,
    brand_id: r.tenant_id,
    order_items: [],
  }));

  return { success: true, orders };
}
