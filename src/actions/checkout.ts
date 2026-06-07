"use server";

import { pool } from "@/lib/db";

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

  const { rows } = await pool.query<{ create_order_with_items: CreatedOrder | null }>(
    `SELECT create_order_with_items($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9) AS "create_order_with_items"`,
    [
      idempotencyKey,
      customerName,
      customerEmail,
      customerPhone,
      stopId,
      JSON.stringify(items),
      taxAmount,
      taxRate,
      taxLocation || null,
    ],
  );
  const data = rows[0]?.create_order_with_items;

  if (!data || !data.id) {
    return { success: false, error: "Order created but data not returned" };
  }

  // Send order receipt email
  try {
    const { sendOrderReceiptEmail } = await import("@/lib/email-service");
    const rawItems = data.items ?? [];
    const taxAmount = (data as { tax_amount?: number }).tax_amount ?? 0;
    await sendOrderReceiptEmail({
      customerName,
      customerEmail,
      orderId: data.id,
      items: rawItems.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        price: i.price,
      })),
      subtotal: data.subtotal ?? 0,
      taxAmount,
      total: (data.subtotal ?? 0) + taxAmount,
      fulfillment: items.some((i) => i.fulfillment === "ship") ? "ship" : "pickup",
      stopCity: data.stop_city ?? undefined,
      stopState: data.stop_state ?? undefined,
      stopDate: data.stop_date ?? undefined,
      stopTime: data.stop_time ?? undefined,
      stopLocation: data.stop_location ?? undefined,
      brandName: "Tuxedo Corn",
    });
  } catch {
    // Email failure should not fail the order
  }

  return { success: true, order: data };
}

// ── Cart Persistence ──────────────────────────────────────────────────────────

export async function getServerCart(userId: string): Promise<CartItem[]> {
  try {
    const { rows } = await pool.query<{ get_user_cart: CartItem[] | null }>(
      `SELECT get_user_cart($1) AS "get_user_cart"`,
      [userId],
    );
    const data = rows[0]?.get_user_cart;
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

  // Fetch server cart
  let serverCart: CartItem[] = [];
  try {
    const { rows } = await pool.query<{ get_user_cart: CartItem[] | null }>(
      `SELECT get_user_cart($1) AS "get_user_cart"`,
      [userId],
    );
    const data = rows[0]?.get_user_cart;
    serverCart = Array.isArray(data) ? data : [];
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
    await pool.query(
      `SELECT upsert_user_cart($1, $2::jsonb)`,
      [userId, JSON.stringify(merged)],
    );
  } catch {
    // best-effort — localStorage is still source of truth for now
  }

  return { merged };
}

export async function clearServerCart(userId: string): Promise<void> {
  try {
    await pool.query(
      `SELECT clear_user_cart($1)`,
      [userId],
    );
  } catch {
    // ignore
  }
}

// ── Stop picker (used by cart + checkout client components) ───────────────

export type PublicStop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  brand_id: string;
};

export async function getPublicStopsForBrand(brandId: string): Promise<PublicStop[]> {
  const { rows } = await pool.query<PublicStop>(
    `SELECT id, city, state, date, time, location, brand_id
     FROM stops
     WHERE active = true AND brand_id = $1
     ORDER BY date`,
    [brandId],
  );
  return rows;
}

export type ProductAvailability = {
  product_id: string;
  is_available: boolean;
};

export async function checkStopProductAvailability(
  stopId: string,
  productIds: string[]
): Promise<ProductAvailability[]> {
  if (!productIds || productIds.length === 0) return [];
  const { rows } = await pool.query<{ check_stop_product_availability: ProductAvailability[] | null }>(
    `SELECT check_stop_product_availability($1, $2::uuid[]) AS "check_stop_product_availability"`,
    [stopId, productIds],
  );
  const data = rows[0]?.check_stop_product_availability;
  return Array.isArray(data) ? data : [];
}
