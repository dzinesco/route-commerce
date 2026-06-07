// Enhanced Stripe Billing - Full Subscription Management
// Supports plans, add-ons, upgrades, cancellations, and customer portal

import Stripe from "stripe";
import { pool } from "@/lib/db";

// Lazy-initialize Stripe client to avoid build-time errors when env vars aren't set
let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return _stripe;
}

// Export stripe proxy that lazily initializes
export const stripe = {
  get customers() { return getStripeClient().customers; },
  get subscriptions() { return getStripeClient().subscriptions; },
  get invoices() { return getStripeClient().invoices; },
  get checkout() { return getStripeClient().checkout; },
  get billingPortal() { return getStripeClient().billingPortal; },
  get paymentMethods() { return getStripeClient().paymentMethods; },
  get paymentIntents() { return getStripeClient().paymentIntents; },
  get refunds() { return getStripeClient().refunds; },
  get webhooks() { return getStripeClient().webhooks; },
};

// Plan tier configurations
export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "Perfect for small farms getting started",
    monthlyPrice: 4900, // $49.00 in cents
    annualPrice: 44100, // $441.00 (15% discount)
    features: [
      "Up to 25 products",
      "10 stops/month",
      "1 user",
      "Basic pickup management",
      "Email support",
    ],
    limits: {
      max_users: 1,
      max_stops_monthly: 10,
      max_products: 25,
    },
  },
  farm: {
    id: "farm",
    name: "Farm",
    description: "For growing farms with more needs",
    monthlyPrice: 14900, // $149.00
    annualPrice: 152280, // $1,522.80 (10% discount)
    features: [
      "Unlimited products",
      "Unlimited stops",
      "5 users",
      "Wholesale Portal",
      "Harvest Reach",
      "Priority support",
    ],
    limits: {
      max_users: 5,
      max_stops_monthly: -1, // unlimited
      max_products: -1,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solution for larger operations",
    monthlyPrice: 39900, // $399.00
    annualPrice: 0, // Custom pricing
    features: [
      "Everything in Farm",
      "AI Intelligence Pack",
      "SMS Campaigns",
      "Square Sync",
      "Water Log",
      "Unlimited users",
      "Unlimited brands",
      "Custom development",
      "Dedicated SLA",
    ],
    limits: {
      max_users: -1,
      max_stops_monthly: -1,
      max_products: -1,
    },
  },
} as const;

// Add-ons configuration
export const ADDONS = {
  wholesale_portal: {
    id: "wholesale_portal",
    name: "Wholesale Portal",
    description: "Full wholesale customer portal with ordering",
    monthlyPrice: 9900, // $99.00
  },
  harvest_reach: {
    id: "harvest_reach",
    name: "Harvest Reach",
    description: "Email and SMS marketing campaigns",
    monthlyPrice: 7900, // $79.00
  },
  ai_tools: {
    id: "ai_tools",
    name: "AI Intelligence Pack",
    description: "AI-powered insights and automation",
    monthlyPrice: 5900, // $59.00
  },
  water_log: {
    id: "water_log",
    name: "Water Log",
    description: "Track irrigation and water usage",
    monthlyPrice: 3900, // $39.00
  },
  square_sync: {
    id: "square_sync",
    name: "Square Sync",
    description: "Sync inventory with Square POS",
    monthlyPrice: 3900, // $39.00
  },
  sms_campaigns: {
    id: "sms_campaigns",
    name: "SMS Campaigns",
    description: "SMS marketing via Twilio",
    monthlyPrice: 2900, // $29.00
  },
} as const;

// Stripe Price IDs (configurable via environment)
const PRICE_IDS = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "price_starter_monthly",
  starter_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || "price_starter_annual",
  farm_monthly: process.env.STRIPE_PRICE_FARM_MONTHLY || "price_farm_monthly",
  farm_annual: process.env.STRIPE_PRICE_FARM_ANNUAL || "price_farm_annual",
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_enterprise_monthly",
  wholesale_portal: process.env.STRIPE_PRICE_WHOLESALE_PORTAL || "price_wholesale_portal",
  harvest_reach: process.env.STRIPE_PRICE_HARVEST_REACH || "price_harvest_reach",
  ai_tools: process.env.STRIPE_PRICE_AI_TOOLS || "price_ai_tools",
  water_log: process.env.STRIPE_PRICE_WATER_LOG || "price_water_log",
  square_sync: process.env.STRIPE_PRICE_SQUARE_SYNC || "price_square_sync",
  sms_campaigns: process.env.STRIPE_PRICE_SMS_CAMPAIGNS || "price_sms_campaigns",
};

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

export interface CreateSubscriptionOptions {
  brandId: string;
  brandName: string;
  email: string;
  plan: keyof typeof PLANS;
  interval: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export async function createSubscription(options: CreateSubscriptionOptions) {
  const { brandId, brandName, email, plan, interval, successUrl, cancelUrl, metadata } = options;
  
  // Get or create Stripe customer
  let customerId = await getOrCreateCustomer(brandId, brandName, email);
  
  // Get price ID for selected plan
  const priceId = interval === "annual" 
    ? PRICE_IDS[`${plan}_annual` as keyof typeof PRICE_IDS]
    : PRICE_IDS[`${plan}_monthly` as keyof typeof PRICE_IDS];
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        brand_id: brandId,
        brand_name: brandName,
        plan_tier: plan,
        interval,
      },
      trial_period_days: 14, // 14-day trial for new subscriptions
    },
    metadata: {
      brand_id: brandId,
      ...metadata,
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });
  
  return session;
}

export async function createAddonSubscription(options: {
  customerId: string;
  addon: keyof typeof ADDONS;
  brandId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { customerId, addon, brandId, successUrl, cancelUrl } = options;
  
  const priceId = PRICE_IDS[addon as keyof typeof PRICE_IDS];
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        brand_id: brandId,
        addon_key: addon,
        addon_name: ADDONS[addon].name,
      },
    },
    metadata: {
      brand_id: brandId,
      addon_key: addon,
      type: "addon",
    },
  });
  
  return session;
}

// ============================================
// CUSTOMER PORTAL
// ============================================

export async function createCustomerPortalSession(options: {
  customerId: string;
  returnUrl: string;
}) {
  const { customerId, returnUrl } = options;
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return session;
}

// ============================================
// SUBSCRIPTION UPDATES
// ============================================

export async function cancelSubscription(subscriptionId: string, immediate: boolean = false) {
  if (immediate) {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
  
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function reactivateSubscription(subscriptionId: string) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export async function changePlan(subscriptionId: string, newPlan: keyof typeof PLANS, interval: "monthly" | "annual") {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Get new price ID
  const priceId = interval === "annual"
    ? PRICE_IDS[`${newPlan}_annual` as keyof typeof PRICE_IDS]
    : PRICE_IDS[`${newPlan}_monthly` as keyof typeof PRICE_IDS];
  
  // Prorate the change
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: "create_prorations",
  });
}

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

export async function getOrCreateCustomer(brandId: string, name: string, email: string) {
  // Check if customer exists for this brand
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      brand_id: brandId,
    },
  });
  
  return customer.id;
}

export async function getCustomer(customerId: string) {
  return await stripe.customers.retrieve(customerId);
}

export async function updateCustomer(customerId: string, data: Partial<Stripe.CustomerUpdateParams>) {
  return await stripe.customers.update(customerId, data);
}

// ============================================
// PAYMENT METHODS
// ============================================

export async function listPaymentMethods(customerId: string) {
  return await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
}

export async function attachPaymentMethod(paymentMethodId: string, customerId: string) {
  return await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  return await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

// ============================================
// INVOICES
// ============================================

export async function listInvoices(customerId: string, limit: number = 24) {
  return await stripe.invoices.list({
    customer: customerId,
    limit,
  });
}

export async function getInvoice(invoiceId: string) {
  return await stripe.invoices.retrieve(invoiceId);
}

export async function getUpcomingInvoice(customerId: string) {
  // Use Stripe's upcoming invoice preview endpoint
  return await stripe.invoices.createPreview({
    customer: customerId,
  });
}

// ============================================
// PAYMENTS & REFUNDS
// ============================================

export async function createPaymentIntent(options: {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}) {
  return await stripe.paymentIntents.create({
    amount: options.amount,
    currency: options.currency || "usd",
    customer: options.customerId,
    metadata: options.metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

export async function createRefund(paymentIntentId: string, amount?: number, reason?: string) {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
    reason: reason as Stripe.RefundCreateParams.Reason || "requested_by_customer",
  });
}

// ============================================
// WEBHOOK PROCESSING
// ============================================

export async function processWebhook(payload: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      case "customer.updated":
        await handleCustomerUpdated(event.data.object);
        break;
    }
    
    return { received: true };
  } catch (error) {
    console.error("Webhook processing error:", error);
    throw error;
  }
}

// Webhook handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { brand_id, type } = session.metadata || {};
  
  if (type === "addon") {
    // Handle addon checkout
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await enableAddonFeature(brand_id, subscription.metadata.addon_key);
  } else {
    // Handle plan checkout
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await updateBrandSubscription(
      brand_id,
      subscription.id,
      subscription.status,
      subscription.metadata.plan_tier,
      (subscription as unknown as { current_period_end: number | null }).current_period_end
    );
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { brand_id, plan_tier } = subscription.metadata as { brand_id?: string; plan_tier?: string };
  
  await updateBrandSubscription(
    brand_id,
    subscription.id,
    subscription.status,
    plan_tier,
    (subscription as unknown as { current_period_end: number | null }).current_period_end
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { brand_id, plan_tier, addon_key } = subscription.metadata as { brand_id?: string; plan_tier?: string; addon_key?: string };
  
  if (addon_key) {
    // Add-on subscription
    if (subscription.status === "active") {
      await enableAddonFeature(brand_id, addon_key);
    } else {
      await disableAddonFeature(brand_id, addon_key);
    }
  } else {
    // Plan subscription
    await updateBrandSubscription(
      brand_id,
      subscription.id,
      subscription.status,
      plan_tier,
      (subscription as unknown as { current_period_end: number | null }).current_period_end
    );
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { brand_id } = subscription.metadata as { brand_id?: string };
  
  // Downgrade to free tier or cancel
  await updateBrandSubscription(
    brand_id,
    null,
    "cancelled",
    undefined,
    null
  );
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Log successful payment
  console.log(`Payment succeeded for customer: ${invoice.customer}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Notify brand about failed payment
  console.log(`Payment failed for customer: ${invoice.customer}`);
  
  // You could trigger an email notification here
  // await sendPaymentFailedNotification(invoice.customer as string);
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  // Sync customer data with our database
  console.log(`Customer updated: ${customer.id}`);
}

// ============================================
// DATABASE HELPERS
// ============================================

async function updateBrandSubscription(
  brandId: string | undefined,
  subscriptionId: string | null,
  status: string,
  planTier: string | undefined,
  periodEnd: number | null
) {
  if (!brandId) return;

  try {
    await pool.query(
      "SELECT set_brand_subscription($1, $2, $3, $4, $5)",
      [
        brandId,
        subscriptionId,
        status,
        planTier ?? null,
        periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      ]
    );
  } catch (error) {
    console.error("Failed to update brand subscription:", error);
  }
}

async function enableAddonFeature(brandId: string | undefined, addonKey: string | undefined) {
  if (!brandId || !addonKey) return;

  try {
    await pool.query(
      "SELECT set_brand_feature($1, $2, $3)",
      [brandId, addonKey, true]
    );
  } catch (error) {
    console.error("Failed to enable addon feature:", error);
  }
}

async function disableAddonFeature(brandId: string | undefined, addonKey: string | undefined) {
  if (!brandId || !addonKey) return;

  try {
    await pool.query(
      "SELECT set_brand_feature($1, $2, $3)",
      [brandId, addonKey, false]
    );
  } catch (error) {
    console.error("Failed to disable addon feature:", error);
  }
}

// ============================================
// USAGE BILLING
// ============================================

export async function createUsageRecord(options: {
  subscriptionItemId: string;
  quantity: number;
  timestamp?: number;
  idempotencyKey?: string;
}) {
  // Use the metering endpoint for usage-based billing
  return await fetch(
    `https://api.stripe.com/v1/billing/meter_events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        event_name: "usage",
        payload: JSON.stringify({
          subscription_item_id: options.subscriptionItemId,
          quantity: options.quantity.toString(),
          timestamp: (options.timestamp || Math.floor(Date.now() / 1000)).toString(),
        }),
      }),
    }
  );
}

export async function getUsageSummary(subscriptionItemId: string) {
  // List subscription items with usage summaries
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionItemId.split("_")[0]
  );
  const item = subscription.items.data.find(i => i.id === subscriptionItemId);
  return item || null;
}

// ============================================
// EXPORT STRIPE INSTANCE AND HELPERS
// ============================================

export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

export async function listSubscriptions(customerId: string) {
  return await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
}