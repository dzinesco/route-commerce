"use server";

import { svcHeaders } from "@/lib/svc-headers";

export type CartItem = {
  id: string;
  name: string;
  price: string;
  quantity: number;
  fulfillment: "pickup" | "ship";
  brand_id: string;
  brand_slug: string;
};

type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  fulfillment: "pickup" | "ship";
  is_taxable?: boolean;
};

type CreatedOrder = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subtotal: number;
  status: string;
  stop_id: string | null;
  brand_id: string;
  stop_city: string;
  stop_state: string;
  stop_date: string;
  stop_time: string | null;
  stop_location: string;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    fulfillment: string;
  }[];
};

type CheckoutResult =
  | { success: true; order: CreatedOrder }
  | { success: false; error: string };

type ShippingAddress = {
  state: string;
  postal_code: string;
  city?: string;
};

export async function createOrder(
  idempotencyKey: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  stopId: string | null,
  items: CheckoutItem[],
  brandId?: string,
  shippingAddress?: ShippingAddress
): Promise<CheckoutResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ── Calculate tax if brand collects tax ─────────────────────────────────
  let taxAmount = 0;
  let taxRate = 0;
  let taxLocation = "";

  if (brandId && shippingAddress) {
    try {
      const { calculateOrderTax } = await import("@/actions/tax");
      const taxResult = await calculateOrderTax({
        brandId,
        subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        items: items.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price, is_taxable: i.is_taxable })),
        fulfillment: items.some((i) => i.fulfillment === "ship") ? "ship" : "pickup",
        shippingAddress,
      });
      taxAmount = taxResult.taxAmount;
      taxRate = taxResult.taxRate;
      taxLocation = taxResult.taxLocation;
    } catch {
      // Tax calculation failure should not block checkout
    }
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/create_order_with_items`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        p_idempotency_key: idempotencyKey,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_customer_phone: customerPhone,
        p_stop_id: stopId,
        p_items: items,
        p_tax_amount: taxAmount,
        p_tax_rate: taxRate,
        p_tax_location: taxLocation || null,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Unknown error" }));
    return { success: false, error: err.message ?? "Failed to create order" };
  }

  const data = await response.json();

  // RPC returns a JSONB object with order + items
  if (!data || !data.id) {
    return { success: false, error: "Order created but data not returned" };
  }

  // Send order receipt email
  try {
    const { sendOrderReceiptEmail } = await import("@/lib/email-service");
    await sendOrderReceiptEmail({
      customerName,
      customerEmail,
      orderId: data.id,
      items: data.items ?? [],
      subtotal: data.subtotal ?? 0,
      taxAmount: data.tax_amount ?? 0,
      total: (data.subtotal ?? 0) + (data.tax_amount ?? 0),
      fulfillment: items.some((i) => i.fulfillment === "ship") ? "ship" : "pickup",
      stopCity: data.stop_city ?? undefined,
      stopState: data.stop_state ?? undefined,
      stopDate: data.stop_date ?? undefined,
      stopTime: data.stop_time ?? undefined,
      stopLocation: data.stop_location ?? undefined,
      brandName: "Tuxedo Corn",
    });
  } catch (e) {
    // Email failure should not fail the order
  }

  return { success: true, order: data as CreatedOrder };
}

// ── Cart Persistence ──────────────────────────────────────────────────────────

export async function getServerCart(userId: string): Promise<CartItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_user_cart`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: userId }),
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function mergeLocalCart(
  localCart: CartItem[],
  userId: string
): Promise<{ merged: CartItem[] }> {
  if (!localCart || localCart.length === 0) return { merged: [] };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Fetch server cart
  let serverCart: CartItem[] = [];
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_user_cart`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: userId }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      serverCart = Array.isArray(data) ? data : [];
    }
  } catch {
    // proceed with local cart only
  }

  // Merge: server items take precedence for fulfillment conflicts;
  // quantities are summed for same product IDs.
  const mergedMap = new Map<string, CartItem>();

  // Add server items first
  for (const item of serverCart) {
    mergedMap.set(item.id, { ...item });
  }

  // Overlay local items — sum quantities, prefer server fulfillment
  for (const local of localCart) {
    const existing = mergedMap.get(local.id);
    if (existing) {
      mergedMap.set(local.id, {
        ...existing,
        quantity: existing.quantity + local.quantity,
        // Server fulfillment wins if set
        fulfillment: existing.fulfillment ?? local.fulfillment,
      });
    } else {
      mergedMap.set(local.id, local);
    }
  }

  const merged = Array.from(mergedMap.values());

  // Persist merged cart to server
  try {
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/upsert_user_cart`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: userId, p_items: merged }),
      }
    );
  } catch {
    // best-effort — localStorage is still source of truth for now
  }

  return { merged };
}

export async function clearServerCart(userId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/clear_user_cart`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: userId }),
      }
    );
  } catch {
    // ignore
  }
}