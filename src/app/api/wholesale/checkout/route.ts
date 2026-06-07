/**
 * Wholesale order Stripe checkout endpoint.
 *
 * TODO(migration): wholesale_orders is part of the legacy schema and
 * is read/written via raw `pool.query` SQL. The `get_wholesale_settings`
 * and `get_payment_settings` SECURITY DEFINER RPCs still live in the
 * database (see supabase/migrations/046 and 045) and are also called
 * via `pool.query`. When wholesale is reactivated, declare the tables
 * in `db/schema/wholesale.ts` and switch the reads to typed Drizzle.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { orderId, customerId } = await req.json();

  if (!orderId || !customerId) {
    return NextResponse.json({ error: "orderId and customerId are required" }, { status: 400 });
  }

  // ── 1. Fetch order and brand info ──────────────────────────────────────────
  // Use direct select with both orderId AND customerId filters to prevent cross-brand access
  const { rows: orderRows } = await pool.query<{
    id: string;
    brand_id: string;
    customer_id: string;
    balance_due: number;
    invoice_number: string | null;
    subtotal: number;
    deposit_required: number;
    deposit_paid: number;
  }>(
    `SELECT id::text AS id,
            brand_id::text AS brand_id,
            customer_id::text AS customer_id,
            COALESCE(balance_due, 0)::float8 AS balance_due,
            invoice_number,
            COALESCE(subtotal, 0)::float8 AS subtotal,
            COALESCE(deposit_required, 0)::float8 AS deposit_required,
            COALESCE(deposit_paid, 0)::float8 AS deposit_paid
     FROM wholesale_orders
     WHERE id = $1 AND customer_id = $2
     LIMIT 1`,
    [orderId, customerId]
  );

  const order = orderRows[0];
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { balance_due } = order;
  if (balance_due <= 0) {
    return NextResponse.json({ error: "No balance due on this order" }, { status: 400 });
  }

  // ── 2. Check online payment is enabled ────────────────────────────────────
  const { rows: wsRows } = await pool.query<{ online_payment_enabled: boolean | null }>(
    "SELECT * FROM get_wholesale_settings($1)",
    [order.brand_id]
  );
  const wsData = wsRows[0];
  if (!wsData?.online_payment_enabled) {
    return NextResponse.json({ error: "Online payments are not enabled for this brand" }, { status: 403 });
  }

  // ── 3. Fetch Stripe credentials from payment_settings ─────────────────────
  const { rows: psRows } = await pool.query<{ stripe_secret_key: string | null }>(
    "SELECT * FROM get_payment_settings($1)",
    [order.brand_id]
  );
  const psData = psRows[0];
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
  await pool.query(
    "UPDATE wholesale_orders SET checkout_session_id = $2, updated_at = NOW() WHERE id = $1",
    [orderId, session.id]
  );

  return NextResponse.json({ checkoutUrl: session.url });
}
