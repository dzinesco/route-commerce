"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type UpdateShippingStatusResult =
  | { success: true }
  | { success: false; error: string };

export async function updateShippingStatus(
  orderId: string,
  status: string,
  trackingNumber?: string
): Promise<UpdateShippingStatusResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_shipping_order`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_order_id: orderId,
        p_shipping_status: status,
        p_tracking_number: trackingNumber ?? null,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to update shipping status" };
  const data = await response.json();
  if (!data.success) return { success: false, error: data.error ?? "Update failed" };
  return { success: true };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_shipping_orders`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch shipping orders" };
  const data = await response.json();
  return { success: true, orders: data };
}