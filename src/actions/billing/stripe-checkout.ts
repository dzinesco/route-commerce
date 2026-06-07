"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

// ── Price ID config ────────────────────────────────────────────────────────────
// Maps plan/addon keys to Stripe price IDs via environment variables

const PRICE_KEYS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  farm: process.env.STRIPE_PRICE_FARM,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  harvest_reach: process.env.STRIPE_PRICE_HARVEST_REACH,
  wholesale_portal: process.env.STRIPE_PRICE_WHOLESALE_PORTAL,
  water_log: process.env.STRIPE_PRICE_WATER_LOG,
  ai_tools: process.env.STRIPE_PRICE_AI_TOOLS,
  square_sync: process.env.STRIPE_PRICE_SQUARE_SYNC,
  sms_campaigns: process.env.STRIPE_PRICE_SMS_CAMPAIGNS,
};

function getPriceId(key: string): string | null {
  return PRICE_KEYS[key] ?? null;
}

// ── Checkout session creation ─────────────────────────────────────────────────

export async function createStripeCheckoutSession(
  brandId: string,
  priceKey: string,
  successPath: string,
  cancelPath: string,
  annual = false
): Promise<{ success: boolean; url?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Stripe not configured" };

  const priceId = getPriceId(priceKey);
  if (!priceId) return { success: false, error: `No Stripe price configured for "${priceKey}". Set ${priceKey.toUpperCase()}_PRICE in your environment.` };

  // Get brand's Stripe customer ID
  const custRes = await pool.query<{ stripe_customer_id: string | null; name: string }>(
    "SELECT stripe_customer_id, name FROM tenants WHERE id = $1 LIMIT 1",
    [brandId]
  );
  const brand = custRes.rows[0];
  if (!brand?.stripe_customer_id) {
    return { success: false, error: "No Stripe customer found. Complete Stripe setup in Payments settings first." };
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Build recurring interval
  const recurring = annual ? { interval: "year" } : { interval: "month" };

  const session = await stripe.checkout.sessions.create({
    customer: brand.stripe_customer_id!,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${siteUrl}${cancelPath}?status=cancelled`,
    metadata: { brand_id: brandId, price_key: priceKey, billing: annual ? "annual" : "monthly" },
    subscription_data: {
      metadata: { brand_id: brandId, price_key: priceKey },
    },
  });

  return { success: true, url: session.url ?? undefined };
}

export async function createPlanUpgradeCheckout(
  brandId: string,
  planTier: string,
  billingPeriod?: "monthly" | "annual"
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!["starter", "farm", "enterprise"].includes(planTier)) {
    return { success: false, error: "Invalid plan tier" };
  }
  const annual = billingPeriod === "annual";
  return createStripeCheckoutSession(
    brandId,
    planTier,
    "/admin/settings/billing",
    "/admin/settings/billing",
    annual
  );
}

export async function createAddonCheckoutSession(
  brandId: string,
  addonKey: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  return createStripeCheckoutSession(
    brandId,
    addonKey,
    "/admin/settings/billing",
    "/admin/settings/billing"
  );
}

export async function cancelAddonSubscription(
  brandId: string,
  addonKey: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Stripe not configured" };

  // Get active subscription for this brand
  const subRes = await pool.query<{ stripe_subscription_id: string | null }>(
    "SELECT stripe_subscription_id FROM subscriptions WHERE tenant_id = $1 LIMIT 1",
    [brandId]
  );
  if (subRes.rows.length === 0) {
    return { success: false, error: "No active subscription found" };
  }
  const subData = subRes.rows[0];
  if (!subData?.stripe_subscription_id) {
    return { success: false, error: "No active subscription found" };
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

  // Retrieve subscription and find the item for this add-on
  const subscription = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);
  const targetPriceId = getPriceId(addonKey);

  const itemToDelete = subscription.items.data.find(
    (item) => item.price.id === targetPriceId
  );

  if (!itemToDelete) {
    return { success: false, error: "Add-on subscription item not found in Stripe" };
  }

  await stripe.subscriptions.update(subData.stripe_subscription_id, {
    items: [{ id: itemToDelete.id, deleted: true }],
    proration_behavior: "none",
  });

  // Disable the feature flag locally
  try {
    await pool.query(
      "SELECT set_brand_feature($1, $2, $3)",
      [brandId, addonKey, false]
    );
  } catch {
    // best-effort: webhook reconciliation will eventually fix the flag
  }

  return { success: true };
}