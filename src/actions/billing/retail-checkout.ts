"use server";

import { pool } from "@/lib/db";

type LineItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export async function createRetailStripeCheckoutSession(
  items: LineItem[],
  orderId: string,
  brandId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ success: boolean; url?: string; sessionId?: string; error?: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Stripe not configured on this server." };

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

  const lineItems = items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100), // stripe uses cents
    },
    quantity: item.quantity,
  }));

  // Get brand name for Stripe metadata
  let brandName = "Route Commerce";
  try {
    const brandRes = await pool.query<{ name: string }>(
      "SELECT name FROM tenants WHERE id = $1 LIMIT 1",
      [brandId]
    );
    if (brandRes.rows[0]?.name) brandName = brandRes.rows[0].name;
  } catch {
    // use default
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      order_id: orderId,
      brand_id: brandId,
      brand_name: brandName,
    },
  });

  return { success: true, url: session.url ?? undefined, sessionId: session.id };
}