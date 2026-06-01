"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_admin_orders`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) {
    return { success: false, orders: [], stops: [], error: `HTTP ${response.status}: ${response.statusText}` };
  }

  const data = await response.json();
  return {
    success: true,
    orders: data?.orders ?? [],
    stops: data?.stops ?? [],
    error: null,
  };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_admin_order_detail`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_order_id: orderId, p_brand_id: brandId }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data;
}