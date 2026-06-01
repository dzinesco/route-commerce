import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { svcHeaders } from "@/lib/svc-headers";

export async function POST(req: NextRequest) {
  const { orderId, customerId } = await req.json();

  if (!orderId || !customerId) {
    return NextResponse.json({ error: "orderId and customerId are required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ── 1. Fetch order and brand info ──────────────────────────────────────────
  // Use direct select with both orderId AND customerId filters to prevent cross-brand access
  const orderRes = await fetch(
    `${supabaseUrl}/rest/v1/wholesale_orders?id=eq.${orderId}&customer_id=eq.${customerId}&select=id,brand_id,customer_id,balance_due,invoice_number,subtotal,deposit_required,deposit_paid`,
    {
      headers: { ...svcHeaders(supabaseKey) },
    }
  );

  if (!orderRes.ok) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }

  const orders = await orderRes.json() as Array<{
    id: string;
    brand_id: string;
    customer_id: string;
    balance_due: number;
    invoice_number: string | null;
    subtotal: number;
    deposit_required: number;
    deposit_paid: number;
  }>;

  const order = orders[0];
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { balance_due } = order;
  if (balance_due <= 0) {
    return NextResponse.json({ error: "No balance due on this order" }, { status: 400 });
  }

  // ── 2. Check online payment is enabled ────────────────────────────────────
  const wsRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: order.brand_id }),
    }
  );

  if (!wsRes.ok) {
    return NextResponse.json({ error: "Failed to fetch wholesale settings" }, { status: 500 });
  }

  const wsData = await wsRes.json();
  if (!wsData?.online_payment_enabled) {
    return NextResponse.json({ error: "Online payments are not enabled for this brand" }, { status: 403 });
  }

  // ── 3. Fetch Stripe credentials from payment_settings ─────────────────────
  const psRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_payment_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: order.brand_id }),
    }
  );

  if (!psRes.ok) {
    return NextResponse.json({ error: "Failed to fetch payment settings" }, { status: 500 });
  }

  const psData = await psRes.json();
  const stripeSecretKey = psData?.stripe_secret_key;

  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured for this brand" }, { status: 500 });
  }

  // ── 4. Create Stripe Checkout Session ──────────────────────────────────────
  const stripe = new Stripe(stripeSecretKey);

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Wholesale Order ${order.invoice_number ?? orderId.slice(0, 8)}`,
            description:
              balance_due >= order.deposit_required
                ? "Deposit payment"
                : "Balance payment",
          },
          unit_amount: Math.round(balance_due * 100), // convert to cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/wholesale/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/wholesale/portal?tab=orders`,
    metadata: {
      order_id: orderId,
      customer_id: customerId,
      brand_id: order.brand_id,
    },
  });

  // Store checkout session ID on the order
  await fetch(
    `${supabaseUrl}/rest/v1/wholesale_orders?id=eq.${orderId}`,
    {
      method: "PATCH",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ checkout_session_id: session.id }),
    }
  );

  return NextResponse.json({ checkoutUrl: session.url });
}