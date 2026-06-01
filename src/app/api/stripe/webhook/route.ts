import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendPastDueNotification } from "@/lib/billing";
import { svcHeaders } from "@/lib/svc-headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Feature flag key for each add-on Stripe price ID
const PRICE_TO_FEATURE: Record<string, string> = {
  [process.env.STRIPE_PRICE_HARVEST_REACH ?? ""]: "harvest_reach",
  [process.env.STRIPE_PRICE_WHOLESALE_PORTAL ?? ""]: "wholesale_portal",
  [process.env.STRIPE_PRICE_WATER_LOG ?? ""]: "water_log",
  [process.env.STRIPE_PRICE_AI_TOOLS ?? ""]: "ai_tools",
  [process.env.STRIPE_PRICE_SQUARE_SYNC ?? ""]: "square_sync",
  [process.env.STRIPE_PRICE_SMS_CAMPAIGNS ?? ""]: "sms_campaigns",
};

const PLAN_PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
  [process.env.STRIPE_PRICE_FARM ?? ""]: "farm",
  [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: "enterprise",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new NextResponse("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = Stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  // ── Subscription events ─────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session, req);
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionUpdated(subscription);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionDeleted(subscription);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    await handleInvoicePaid(invoice);
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    await handleInvoiceFailed(invoice);
  }

  return new NextResponse("OK", { status: 200 });
}

// ── Subscription handlers ──────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, req: NextRequest) {
  const brandId = session.metadata?.brand_id;
  if (!brandId || session.mode !== "subscription") return;

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) return;

  // Update brand subscription tracking
  await updateBrandSubscription(brandId, subscriptionId, "active");

  // Also handle wholesale deposit payments via same event
  const orderId = session.metadata?.order_id;
  const customerId = session.metadata?.customer_id;
  const paymentBrandId = session.metadata?.brand_id;

  if (orderId) {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    const amountPaid = session.amount_total ? session.amount_total / 100 : 0;
    await recordPayment(orderId, amountPaid, paymentIntentId);

    if (customerId && paymentBrandId) {
      await enqueueDepositNotification(orderId, customerId, paymentBrandId, amountPaid);
      await enqueueWholesaleWebhookForDepositRecorded(orderId, amountPaid, paymentBrandId);
      await maybeFireOrderPaidWebhook(orderId, paymentBrandId);
      fetch(`${req.nextUrl.origin}/api/wholesale/notifications/send`, { method: "POST" }).catch(() => {});
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const brandId = subscription.metadata?.brand_id;
  if (!brandId) {
    // Try to find brand via customer
    const brand = await findBrandByStripeCustomer(subscription.customer as string);
    if (brand) {
      await updateBrandSubscription(brand.id, subscription.id, subscription.status);
    }
    return;
  }

  await updateBrandSubscription(brandId, subscription.id, subscription.status);
  await syncAddonFeatures(subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const brandId = subscription.metadata?.brand_id;
  if (!brandId) {
    const brand = await findBrandByStripeCustomer(subscription.customer as string);
    if (brand) {
      await clearBrandSubscription(brand.id);
      await disableAllAddons(brand.id);
    }
    return;
  }

  await clearBrandSubscription(brandId);
  await disableAllAddons(brandId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Update period end on successful payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionId = (invoice as any).subscription as string | null;
  if (!subscriptionId) return;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const brand = await findBrandByStripeCustomer(customerId);
  if (!brand) return;

  const periodEnd = new Date((invoice.lines.data[0]?.period?.end ?? 0) * 1000);
  await updateBrandPeriodEnd(brand.id, periodEnd);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const brand = await findBrandByStripeCustomer(customerId);
  if (!brand) return;

  // Update subscription status to past_due
  const subscriptionId = (invoice as any).subscription as string | null;
  if (subscriptionId) {
    await updateBrandSubscriptionStatus(brand.id, subscriptionId, "past_due");
  }

  // Send past due notification email to brand admin
  await sendPastDueNotification(brand.id);
}

// ── Feature sync helpers ───────────────────────────────────────────────────────

async function syncAddonFeatures(subscription: Stripe.Subscription) {
  const brandId = subscription.metadata?.brand_id;
  if (!brandId) return;

  // Get the price IDs in this subscription
  const activePriceIds = subscription.items.data.map(item => item.price.id);

  // Enable/disable add-ons based on what's in the subscription
  for (const [priceId, featureKey] of Object.entries(PRICE_TO_FEATURE)) {
    if (!priceId) continue;
    const isActive = activePriceIds.includes(priceId);
    await setBrandFeature(brandId, featureKey, isActive);
  }

  // Handle plan tier change
  for (const [priceId, tier] of Object.entries(PLAN_PRICE_TO_TIER)) {
    if (!priceId) continue;
    if (activePriceIds.includes(priceId)) {
      await updatePlanTier(brandId, tier);
    }
  }
}

async function setBrandFeature(brandId: string, featureKey: string, enabled: boolean) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_brand_feature`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_feature_key: featureKey, p_enabled: enabled }),
    }
  );
}

async function updatePlanTier(brandId: string, planTier: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_brand_plan_tier`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_plan_tier: planTier }),
    }
  );
}

// ── DB update helpers ──────────────────────────────────────────────────────────

async function updateBrandSubscription(brandId: string, subscriptionId: string, status: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_brand_subscription`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_subscription_id: subscriptionId,
        p_status: status,
        p_current_period_end: null,
      }),
    }
  );
}

async function updateBrandPeriodEnd(brandId: string, periodEnd: Date) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_brand_subscription`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_subscription_id: null,
        p_status: null,
        p_current_period_end: periodEnd.toISOString(),
      }),
    }
  );
}

async function clearBrandSubscription(brandId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_brand_subscription`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_subscription_id: "",
        p_status: "canceled",
        p_current_period_end: null,
      }),
    }
  );
}

async function updateBrandSubscriptionStatus(brandId: string, subscriptionId: string, status: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_brand_subscription`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_subscription_id: subscriptionId,
        p_status: status,
        p_current_period_end: null,
      }),
    }
  );
}

async function disableAllAddons(brandId: string) {
  const ADDON_KEYS = ["harvest_reach", "wholesale_portal", "water_log", "ai_tools", "square_sync", "sms_campaigns"];
  for (const key of ADDON_KEYS) {
    await setBrandFeature(brandId, key, false);
  }
}

async function findBrandByStripeCustomer(customerId: string): Promise<{ id: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/brands?stripe_customer_id=eq.${customerId}&select=id&limit=1`,
    { ...svcHeaders(supabaseKey) }
  );
  if (!res.ok) return null;
  const brands = await res.json() as Array<{ id: string }>;
  return brands[0] ?? null;
}

// ── Wholesale payment helpers (existing) ───────────────────────────────────────

async function recordPayment(orderId: string, amount: number, paymentIntentId: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/record_wholesale_payment`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        p_order_id: orderId,
        p_amount: amount,
        p_stripe_payment_intent_id: paymentIntentId,
      }),
    }
  );
}

async function enqueueDepositNotification(orderId: string, customerId: string, brandId: string, amount: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const orderRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_orders`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );
  if (!orderRes.ok) return;
  const orders = await orderRes.json() as Array<{ id: string; invoice_number: string | null; company_name: string; subtotal: number }>;
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const custRes = await fetch(
    `${supabaseUrl}/rest/v1/wholesale_customers?id=eq.${customerId}&select=email,company_name`,
    { ...svcHeaders(supabaseKey) }
  );
  if (!custRes.ok) return;
  const customers = await custRes.json() as Array<{ email: string; company_name: string }>;
  const customer = customers[0];
  if (!customer?.email) return;

  const adminEmail = await getAdminEmail(brandId);

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_notification`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_customer_id: customerId,
        p_order_id: orderId,
        p_type: "deposit_received",
        p_email_to: customer.email,
        p_email_cc: adminEmail ?? null,
        p_subject: `Deposit Received — Order ${order.invoice_number ?? orderId.slice(0, 8)}`,
        p_body_html: `<h2>Deposit Received</h2><p>Hi ${customer.company_name},</p><p>We have received your payment of <strong>$${amount.toFixed(2)}</strong> toward order <strong>${order.invoice_number ?? orderId.slice(0, 8)}</strong>.</p>`,
        p_body_text: `Deposit of $${amount.toFixed(2)} received for order ${order.invoice_number ?? orderId.slice(0, 8)}. Thank you!`,
      }),
    }
  );

  if (adminEmail) {
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_notification`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_brand_id: brandId,
          p_customer_id: customerId,
          p_order_id: orderId,
          p_type: "deposit_received",
          p_email_to: adminEmail,
          p_subject: `[Admin] Deposit Received — Order ${order.invoice_number ?? orderId.slice(0, 8)}`,
          p_body_html: `<h2>Deposit Received</h2><p>A payment of <strong>$${amount.toFixed(2)}</strong> has been received from <strong>${customer.company_name}</strong> for order <strong>${order.invoice_number ?? orderId.slice(0, 8)}</strong>.</p>`,
          p_body_text: `Deposit of $${amount.toFixed(2)} received from ${customer.company_name} for order ${order.invoice_number ?? orderId.slice(0, 8)}.`,
        }),
      }
    );
  }
}

async function enqueueWholesaleWebhookForDepositRecorded(orderId: string, amount: number, brandId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_webhook`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_event_type: "deposit_recorded",
      p_order_id: orderId,
      p_brand_id: brandId,
      p_payload: { order_id: orderId, amount, source: "stripe_checkout" },
    }),
  }).catch(() => { /* webhook enqueue failed silently */ });
}

async function maybeFireOrderPaidWebhook(orderId: string, brandId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/wholesale_orders?id=eq.${orderId}&select=balance_due,invoice_number`,
    { ...svcHeaders(supabaseKey) }
  );
  if (!res.ok) return;
  const orders = await res.json() as Array<{ balance_due: number; invoice_number: string | null }>;
  const order = orders[0];
  if (!order) return;

  if (Number(order.balance_due) <= 0) {
    await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_webhook`, {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_event_type: "order_paid",
        p_order_id: orderId,
        p_brand_id: brandId,
        p_payload: { order_id: orderId, brand_id: brandId, invoice_number: order.invoice_number },
      }),
    }).catch(() => { /* webhook enqueue failed silently */ });
  }
}

async function getAdminEmail(brandId: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data?.notification_email ?? data?.from_email ?? data?.invoice_business_email ?? null;
}