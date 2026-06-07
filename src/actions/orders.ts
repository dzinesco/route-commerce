"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
import { mockOrders, mockStops } from "@/lib/mock-data";

type AdminOrder = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  stop_id: string | null;
  status: string;
  subtotal: number;
  pickup_complete: boolean;
  pickup_completed_at: string | null;
  pickup_completed_by: string | null;
  created_at: string;
  payment_processor: string | null;
  // For AdminOrdersPanel: stops is { city, state, date }
  // For DriverPickupPanel: stops is { id, city, state, date, brand_id }
  // Both share city/state/date so we use the broader shape
  stops: {
    id?: string;
    city: string;
    state: string;
    date: string;
    brand_id?: string;
  } | null;
  order_items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    fulfillment?: string;
    products: { name: string } | null;
  }>;
};

type AdminStop = {
  id: string;
  city: string;
  state: string;
  date: string;
  location: string;
  brand_id: string;
};

type AdminOrdersResult = {
  orders: AdminOrder[];
  stops: AdminStop[];
};

type AdminOrdersResponse =
  | { success: true; orders: AdminOrder[]; stops: AdminStop[]; error: null }
  | { success: false; orders: []; stops: []; error: string };

type AdminOrderDetail = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  stop_id: string | null;
  status: string;
  subtotal: number;
  pickup_complete: boolean;
  pickup_completed_at: string | null;
  pickup_completed_by: string | null;
  created_at: string;
  discount_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  tax_location: string | null;
  discount_reason: string | null;
  internal_notes: string | null;
  payment_processor: string | null;
  payment_status: string | null;
  payment_transaction_id: string | null;
  refunded_amount: number | null;
  refund_reason: string | null;
  stops: {
    id?: string;
    city: string;
    state: string;
    date: string;
    brand_id?: string;
    location?: string;
  } | null;
  order_items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    fulfillment?: string;
    products: { name: string } | null;
  }>;
  refunds?: Array<{
    id: string;
    order_id: string;
    amount: number;
    reason: string | null;
    processor: string | null;
    processor_refund_id: string | null;
    status: string;
    created_at: string;
  }>;
};

// Mock orders for UI review
const mockAdminOrders: AdminOrder[] = mockOrders.map((o: any) => ({
  id: o.id,
  customer_name: o.customer_name,
  customer_email: o.customer_email,
  customer_phone: o.customer_phone,
  stop_id: o.stop_id,
  status: o.status,
  subtotal: o.subtotal,
  pickup_complete: o.pickup_complete,
  pickup_completed_at: o.pickup_completed_at,
  pickup_completed_by: null,
  created_at: o.created_at,
  payment_processor: o.payment_processor,
  stops: o.stops,
  order_items: o.order_items,
}));

const mockAdminStops: AdminStop[] = mockStops.map((s: any) => ({
  id: s.id,
  city: s.city,
  state: s.state,
  date: s.date,
  location: s.location,
  brand_id: s.brand_id,
}));

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export async function getAdminOrders(): Promise<AdminOrdersResponse> {
  // Return mock data in mock mode
  if (useMockData) {
    return {
      success: true,
      orders: mockAdminOrders,
      stops: mockAdminStops,
      error: null,
    };
  }

  const adminUser = await getAdminUser();
  const brandId = adminUser?.brand_id ?? null;

  // The legacy `get_admin_orders` RPC is a SECURITY DEFINER function that
  // returns orders + stops joined with order_items. Call it directly via
  // the shared pg pool so we don't go through Supabase REST.
  try {
    const { rows } = await pool.query<AdminOrdersResult>(
      "SELECT * FROM get_admin_orders($1)",
      [brandId],
    );
    const data = rows[0] ?? { orders: [], stops: [] };
    return {
      success: true,
      orders: data.orders ?? [],
      stops: data.stops ?? [],
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      orders: [],
      stops: [],
      error: err instanceof Error ? err.message : "Failed to fetch orders",
    };
  }
}

export async function getAdminStops(): Promise<AdminStop[]> {
  const result = await getAdminOrders();
  if (!result.success) return [];
  return result.stops;
}

export async function getAdminPendingOrders(): Promise<AdminOrder[]> {
  const result = await getAdminOrders();
  if (!result.success) return [];
  return result.orders.filter((o) => !o.pickup_complete);
}

export async function getAdminPickedUpOrders(): Promise<AdminOrder[]> {
  const result = await getAdminOrders();
  if (!result.success) return [];
  return result.orders.filter((o) => o.pickup_complete);
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  // Return mock order detail in mock mode
  if (useMockData) {
    const order = mockAdminOrders.find((o) => o.id === orderId);
    if (!order) return null;
    return {
      ...order,
      discount_amount: null,
      tax_amount: order.subtotal * 0.08,
      tax_rate: 0.08,
      tax_location: "Colorado",
      discount_reason: null,
      internal_notes: null,
      payment_status: "paid",
      payment_transaction_id: `txn_mock_${orderId}`,
      refunded_amount: 0,
      refund_reason: null,
      refunds: [],
    };
  }

  const adminUser = await getAdminUser();
  const brandId = adminUser?.brand_id ?? null;

  try {
    const { rows } = await pool.query<AdminOrderDetail>(
      "SELECT * FROM get_admin_order_detail($1, $2)",
      [orderId, brandId],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Toggle the `pickup_complete` flag on the legacy `orders` table.
 * TODO(migration): the SaaS rebuild's `orders` table (db/schema/orders.ts)
 * doesn't carry a `pickup_complete` column. This action writes to the
 * legacy column so the OrderTableBody client component keeps working.
 * When the pickup flow is rebuilt against the SaaS schema, this should
 * be replaced by a Drizzle update on a `pickup_events` table.
 */
export async function toggleOrderPickupComplete(params: {
  orderId: string;
  pickupComplete: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  try {
    await pool.query(
      `UPDATE orders
       SET pickup_complete = $2,
           pickup_completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
           pickup_completed_by = CASE WHEN $2 THEN $3::uuid ELSE NULL END
       WHERE id = $1`,
      [params.orderId, params.pickupComplete, adminUser.user_id],
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update pickup status",
    };
  }
}
