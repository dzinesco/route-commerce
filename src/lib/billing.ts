// Route Commerce Platform — Billing Logic
// Central helpers for subscription creation, status sync, and feature management

import "server-only";

import { ADDONS, type PlanTierKey, type AddonKey } from "./pricing";

import { pool } from "@/lib/db";

// ── Subscription status types ──────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "unpaid";

export interface BrandSubscription {
  brand_id: string;
  stripe_subscription_id: string | null;
  stripe_subscription_status: SubscriptionStatus | null;
  stripe_current_period_end: string | null;
  stripe_customer_id: string | null;
  plan_tier: PlanTierKey;
}

// ── RPC call helper (raw SQL via pg pool) ─────────────────────────────────────

async function rpc<T = Record<string, unknown>>(
  fn: string,
  params: ReadonlyArray<unknown>
): Promise<T> {
  const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM ${fn}(${placeholders})`,
    params as unknown[]
  );
  return rows as unknown as T;
}

// ── Feature sync ─────────────────────────────────────────────────────────────

// When a subscription changes, sync the plan tier + all add-on feature flags
export async function syncSubscriptionFeatures(
  brandId: string,
  subscriptionItems: Array<{ priceId: string; enabled: boolean }>
): Promise<void> {
  // Determine plan tier from subscription items
  const priceToTier: Record<string, PlanTierKey> = {
    [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
    [process.env.STRIPE_PRICE_FARM ?? ""]: "farm",
    [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: "enterprise",
  };

  const priceToAddon: Record<string, AddonKey> = {
    [process.env.STRIPE_PRICE_HARVEST_REACH ?? ""]: "harvest_reach",
    [process.env.STRIPE_PRICE_WHOLESALE_PORTAL ?? ""]: "wholesale_portal",
    [process.env.STRIPE_PRICE_WATER_LOG ?? ""]: "water_log",
    [process.env.STRIPE_PRICE_AI_TOOLS ?? ""]: "ai_tools",
    [process.env.STRIPE_PRICE_SQUARE_SYNC ?? ""]: "square_sync",
    [process.env.STRIPE_PRICE_SMS_CAMPAIGNS ?? ""]: "sms_campaigns",
  };

  // Update plan tier
  const tierItem = subscriptionItems.find((item) => priceToTier[item.priceId]);
  if (tierItem) {
    const newTier = priceToTier[tierItem.priceId];
    if (newTier) {
      await rpc("update_brand_plan_tier", [brandId, newTier]);
    }
  }

  // Sync add-on features
  for (const [priceId, addonKey] of Object.entries(priceToAddon)) {
    if (!priceId) continue;
    const item = subscriptionItems.find((i) => i.priceId === priceId);
    const enabled = item?.enabled ?? false;
    await rpc("set_brand_feature", [brandId, addonKey, enabled]);
  }
}

// ── Subscription creation ─────────────────────────────────────────────────────

export async function createOrUpdateSubscription(
  brandId: string,
  priceKey: string,
  billingCycle: "monthly" | "annual"
): Promise<{ subscriptionId: string; clientSecret: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

  const Stripe = (await import("stripe")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

  // Get brand's Stripe customer
  const brandRows = await rpc<Array<BrandSubscription>>(
    "get_brand_subscription",
    [brandId]
  );
  const brandData = brandRows[0];
  const customerId = brandData?.stripe_customer_id;

  if (!customerId) throw new Error("No Stripe customer for brand. Complete Stripe setup first.");

  // Get price ID
  const priceId = getPriceId(priceKey, billingCycle);
  if (!priceId) throw new Error(`No price configured for ${priceKey} (${billingCycle})`);

  // Check if brand already has an active subscription — update it instead of creating new
  const existingSubId = brandData?.stripe_subscription_id;

  let subscription;
  if (existingSubId) {
    // Add or update the subscription item
    const existing = await stripe.subscriptions.retrieve(existingSubId);
    const existingItem = existing.items.data.find((item) => {
      const planPrices = [
        process.env.STRIPE_PRICE_STARTER ?? "",
        process.env.STRIPE_PRICE_FARM ?? "",
        process.env.STRIPE_PRICE_ENTERPRISE ?? "",
      ];
      return planPrices.includes(item.price.id);
    });

    if (existingItem) {
      subscription = await stripe.subscriptions.update(existingSubId, {
        items: [{ id: existingItem.id, price: priceId }],
        proration_behavior: "create_prorations",
      });
    } else {
      subscription = await stripe.subscriptions.update(existingSubId, {
        items: [{ price: priceId }],
      });
    }
  } else {
    subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { brand_id: brandId, price_key: priceKey, billing: billingCycle },
    });
  }

  // Save subscription ID to brand
  const subData = subscription as unknown as { id: string; status: string; current_period_end: number };
  await rpc("set_brand_subscription", [
    brandId,
    subData.id,
    subData.status,
    new Date(subData.current_period_end * 1000).toISOString(),
  ]);

  const latestInvoice = subscription.latest_invoice as { payment_intent?: { client_secret?: string } } | null;
  const invoiceOrNull = typeof subscription.latest_invoice !== "string" ? latestInvoice : null;
  const paymentIntent = invoiceOrNull?.payment_intent as { client_secret?: string } | undefined;
  const clientSecret = paymentIntent?.client_secret ?? null;

  return { subscriptionId: subscription.id, clientSecret: clientSecret ?? "" };
}

// ── Cancel subscription ──────────────────────────────────────────────────────

export async function cancelBrandSubscription(
  brandId: string,
  priceKey?: string
): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

  const brandRows = await rpc<BrandSubscription[]>("get_brand_subscription", [brandId]);
  const brand = brandRows[0];
  if (!brand?.stripe_subscription_id) throw new Error("No active subscription to cancel");

  const Stripe = (await import("stripe")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

  if (priceKey) {
    // Cancel only a specific add-on item, not the whole subscription
    const sub = await stripe.subscriptions.retrieve(brand.stripe_subscription_id);
    const targetPriceId = getPriceId(priceKey, "monthly");
    const item = sub.items.data.find((i) => i.price.id === targetPriceId);
    if (item) {
      await stripe.subscriptions.update(brand.stripe_subscription_id, {
        items: [{ id: item.id, deleted: true }],
        proration_behavior: "none",
      });
      // Disable the feature flag
      const addonKey = getAddonKeyFromPriceKey(priceKey);
      if (addonKey) {
        await rpc("set_brand_feature", [brandId, addonKey, false]);
      }
    }
  } else {
    // Cancel entire subscription
    await stripe.subscriptions.cancel(brand.stripe_subscription_id);
    await rpc("set_brand_subscription", [
      brandId,
      "",
      "canceled",
      null,
    ]);
    // Disable all add-on features
    for (const addonKey of Object.keys(ADDONS) as AddonKey[]) {
      await rpc("set_brand_feature", [brandId, addonKey, false]);
    }
  }
}

// ── Past due notification ─────────────────────────────────────────────────────

export async function sendPastDueNotification(brandId: string): Promise<void> {
  const brandRows = await rpc<Array<{ name: string }>>("get_brand_subscription", [brandId]);
  const brand = brandRows[0];
  const brandName = brand?.name ?? "your brand";

  const adminEmail = await getAdminEmail(brandId);

  await rpc("enqueue_notification", [
    brandId,
    adminEmail ?? "team@cielohermosa.com",
    `Payment Failed — ${brandName}`,
    `
      <h2>Payment Failed</h2>
      <p>We were unable to charge your card for the Cielo Hermosa platform subscription.</p>
      <p>Please update your payment method within 7 days to avoid service interruption.</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/settings/billing">Update Payment Method →</a></p>
    `,
    `Payment failed for ${brandName}. Please update your payment method at ${process.env.NEXT_PUBLIC_SITE_URL}/admin/settings/billing to avoid service interruption.`,
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPriceId(priceKey: string, billingCycle: "monthly" | "annual"): string | null {
  if (billingCycle === "annual") {
    return process.env[`STRIPE_PRICE_${priceKey.toUpperCase()}_ANNUAL`] ?? null;
  }
  return process.env[`STRIPE_PRICE_${priceKey.toUpperCase()}`] ?? null;
}

function getAddonKeyFromPriceKey(priceKey: string): AddonKey | null {
  const map: Record<string, AddonKey> = {
    harvest_reach: "harvest_reach",
    wholesale_portal: "wholesale_portal",
    water_log: "water_log",
    ai_tools: "ai_tools",
    square_sync: "square_sync",
    sms_campaigns: "sms_campaigns",
  };
  return map[priceKey] ?? null;
}

async function getAdminEmail(brandId: string): Promise<string | null> {
  try {
    const data = await rpc<{ notification_email?: string; from_email?: string }>(
      "get_wholesale_settings",
      [brandId]
    );
    const settings = Array.isArray(data) ? data[0] : data;
    return settings?.notification_email ?? settings?.from_email ?? null;
  } catch {
    return null;
  }
}

// ── Price ID resolution (for webhook) ────────────────────────────────────────

export function resolvePriceKeyFromPriceId(priceId: string): { type: "plan" | "addon"; key: string } | null {
  const planMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
    [process.env.STRIPE_PRICE_FARM ?? ""]: "farm",
    [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: "enterprise",
  };
  if (planMap[priceId]) return { type: "plan", key: planMap[priceId] };

  const addonMap: Record<string, AddonKey> = {
    [process.env.STRIPE_PRICE_HARVEST_REACH ?? ""]: "harvest_reach",
    [process.env.STRIPE_PRICE_WHOLESALE_PORTAL ?? ""]: "wholesale_portal",
    [process.env.STRIPE_PRICE_WATER_LOG ?? ""]: "water_log",
    [process.env.STRIPE_PRICE_AI_TOOLS ?? ""]: "ai_tools",
    [process.env.STRIPE_PRICE_SQUARE_SYNC ?? ""]: "square_sync",
    [process.env.STRIPE_PRICE_SMS_CAMPAIGNS ?? ""]: "sms_campaigns",
  };
  if (addonMap[priceId]) return { type: "addon", key: addonMap[priceId] };

  return null;
}
