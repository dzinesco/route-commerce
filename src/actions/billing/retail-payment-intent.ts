"use server";

import { svcHeaders } from "@/lib/svc-headers";

/**
 * Creates a Stripe PaymentIntent for the supplied cart so the browser
 * can confirm the payment with embedded Stripe Elements (Apple Pay /
 * Google Pay / card) without redirecting to a hosted page.
 *
 * Mirrors `createRetailStripeCheckoutSession` in `retail-checkout.ts`:
 * the PaymentIntent is the embedded equivalent of the Checkout Session.
 * Order creation itself still happens on `/checkout/success` so the
 * webhooks and order pipeline don't need to know which path the buyer
 * used.
 */
type LineItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CustomerInfo = {
  name?: string;
  email?: string;
};

type CreatePaymentIntentResult =
  | { success: true; clientSecret: string; paymentIntentId: string; amount: number }
  | { success: false; error: string };

export async function createRetailPaymentIntent(
  items: LineItem[],
  customer: CustomerInfo,
  brandId: string | null,
  stopId: string | null,
  shippingAddress?: { state?: string; postal_code?: string; city?: string } | null
): Promise<CreatePaymentIntentResult> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { success: false, error: "Stripe not configured on this server." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Cart is empty." };
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

  // Compute the subtotal in cents. We don't compute sales tax here —
  // Stripe's `automatic_tax` would be ideal but requires address collection
  // client-side; for this single-product corn box the price is tax-inclusive
  // (see Tuxedo Corn product card) so we treat the line total as final.
  const amount = items.reduce((sum, item) => {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const unit = Math.max(0, Math.round(Number(item.price) * 100));
    return sum + unit * qty;
  }, 0);

  if (amount <= 0) {
    return { success: false, error: "Cart total must be greater than $0." };
  }

  // Pull the brand name for Stripe receipts + metadata
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let brandName = "Route Commerce";
  if (supabaseUrl && supabaseKey && brandId) {
    try {
      const brandRes = await fetch(
        `${supabaseUrl}/rest/v1/brands?id=eq.${brandId}&select=name`,
        { headers: { ...svcHeaders(supabaseKey) } }
      );
      const brands = (await brandRes.json()) as Array<{ name: string }>;
      if (brands?.[0]?.name) brandName = brands[0].name;
    } catch {
      // ignore — use default
    }
  }

  // Build a short human-readable description for the Stripe dashboard
  const description = items
    .slice(0, 3)
    .map((i) => `${i.quantity}× ${i.name}`)
    .join(", ");

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: customer.email || undefined,
      description,
      metadata: {
        brand_id: brandId ?? "unknown",
        brand_name: brandName,
        stop_id: stopId ?? "",
        customer_name: customer.name ?? "",
        customer_email: customer.email ?? "",
        shipping_state: shippingAddress?.state ?? "",
        shipping_postal_code: shippingAddress?.postal_code ?? "",
        shipping_city: shippingAddress?.city ?? "",
        item_count: String(items.reduce((s, i) => s + i.quantity, 0)),
        source: "storefront_express",
      },
    });

    if (!intent.client_secret) {
      return { success: false, error: "Stripe did not return a client secret." };
    }

    return {
      success: true,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: intent.amount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment intent.";
    return { success: false, error: message };
  }
}
