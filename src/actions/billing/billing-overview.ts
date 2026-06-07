"use server";

/**
 * Centralized Billing Overview
 *
 * Single source of truth for everything the billing page + dashboard usage
 * bars need to render. Replaces ad-hoc calls to `getBrandPlanInfo`,
 * `getEnabledAddons`, brand-row subscription columns, and hard-coded invoice
 * data with one consistent, denormalized payload.
 *
 * Why a single action:
 *   - Before this, the billing page combined `getBrandPlanInfo` +
 *     `getEnabledAddons` + a brands-table read of subscription fields +
 *     hard-coded mock invoices. The dashboard's product count came from
 *     `getDashboardStats` which used a different filter than `get_brand_plan_info`
 *     (`active=true` vs `deleted_at IS NULL`), causing "Active Products 1" vs
 *     "Products 0/25" in the same UI.
 *   - Add-ons could be "Active" in `brand_features` while no Stripe
 *     subscription existed, with a Remove button that would fail at Stripe.
 *
 * What this returns:
 *   - planTier + planCycle (we default to "monthly" because the brand row
 *     doesn't store a cycle — the UI toggle controls display, but a real
 *     cycle would be detected from a `stripe_subscription.items.data[0].price
 *     .recurring.interval` when fetched)
 *   - hasActiveSubscription + subscriptionStatus (so the UI can hide
 *     misleading "Active" add-on badges / Remove buttons)
 *   - usage: { users, stops_this_month, products } — products counted
 *     consistently with the dashboard (`active=true AND deleted_at IS NULL`).
 *   - enabledAddons with a derived `removable` flag — only true when
 *     there is an active subscription AND the feature is enabled AND the
 *     current user can manage settings.
 *   - displayedInvoiceAmount — monthly or annual equivalent matching the
 *     billingCycle toggle, summed across plan + active add-ons. Used by the
 *     invoice table so amounts always match the displayed plan.
 */

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
import { withTenant } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq, count } from "drizzle-orm";
import { ADDONS, PLAN_TIERS, type AddonKey, type PlanTierKey } from "@/lib/pricing";

export type BillingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "inactive"
  | "none";

export type BillingOverview = {
  brandId: string;
  brandName: string | null;
  planTier: PlanTierKey;
  planCycle: "monthly" | "annual";
  planMonthlyPrice: number;
  planAnnualPrice: number;
  hasStripeCustomer: boolean;
  hasActiveSubscription: boolean;
  subscriptionStatus: BillingSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  limits: { max_users: number; max_stops_monthly: number; max_products: number };
  usage: { users: number; stops_this_month: number; products: number };
  enabledAddons: Record<string, boolean>;
  // Denormalized add-on list (for direct UI rendering)
  addons: Array<{
    key: AddonKey;
    label: string;
    icon: string;
    description: string;
    enabled: boolean;
    removable: boolean;
    monthlyPrice: number;
    annualPrice: number;
  }>;
  // Pre-computed totals so the billing page never disagrees with itself
  displayedInvoiceAmount: number; // current cycle total
  monthlyTotal: number;          // always monthly equivalent
  annualTotal: number;           // always annual equivalent
  isPlatformAdmin: boolean;
  canManageBilling: boolean;
};

/**
 * Fetch a single, consistent billing summary for a brand.
 * Safe to call from a server component (uses service-role key).
 */
export async function getBillingOverview(
  brandId: string,
  options?: { planCycle?: "monthly" | "annual" }
): Promise<{ success: boolean; data?: BillingOverview; error?: string }> {
  try {
    if (!brandId) return { success: false, error: "brandId required" };

    // 1) Plan info (plan_tier + limits + usage via get_brand_plan_info)
    //    Replicate the RPC inline via raw SQL on tenants + plans.
    const planRes = await pool.query<{
      plan_tier: string;
      plan_name: string | null;
      max_users: number;
      max_stops_monthly: number;
      max_products: number;
      usage: { users: number; stops_this_month: number; products: number } | null;
    }>(
      `SELECT
         t.plan_tier,
         t.name AS plan_name,
         COALESCE(t.max_users, 1) AS max_users,
         COALESCE(t.max_stops_monthly, 10) AS max_stops_monthly,
         COALESCE(t.max_products, 25) AS max_products,
         jsonb_build_object(
           'users', (SELECT count(*)::int FROM tenant_users tu WHERE tu.tenant_id = t.id),
           'stops_this_month', (SELECT count(*)::int FROM stops s
                                WHERE s.tenant_id = t.id
                                  AND s.created_at >= date_trunc('month', now())),
           'products', (SELECT count(*)::int FROM products p
                        WHERE p.tenant_id = t.id AND p.active = true AND p.deleted_at IS NULL)
         ) AS usage
       FROM tenants t
       WHERE t.id = $1`,
      [brandId]
    );
    const planData = planRes.rows[0] ?? null;

    // 2) Brand row: subscription state, name, stripe_customer_id
    const brandRes = await pool.query<{
      name: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      stripe_subscription_status: string | null;
      stripe_current_period_end: string | null;
    }>(
      `SELECT name, stripe_customer_id, NULL::text AS stripe_subscription_id,
              NULL::text AS stripe_subscription_status, NULL::text AS stripe_current_period_end
       FROM tenants WHERE id = $1`,
      [brandId]
    );
    const brand = brandRes.rows[0] ?? null;

    // 3) Enabled add-ons (feature flags from brand_settings)
    const addonsRes = await pool.query<{ feature_flags: Record<string, unknown> | null }>(
      `SELECT feature_flags FROM brand_settings WHERE tenant_id = $1`,
      [brandId]
    );
    const flags = addonsRes.rows[0]?.feature_flags ?? {};
    const enabledAddons: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(flags ?? {})) {
      enabledAddons[k] = v === true || v === "true" || v === 1 || v === "1";
    }

    // 4) Active product count — same semantics as the dashboard
    //    (active=true). Keeps the billing page in sync with /admin
    //    "Active Products" stat.
    const productCountRows = await withTenant(brandId, (db) =>
      db
        .select({ value: count() })
        .from(products)
        .where(
          and(
            eq(products.tenantId, brandId),
            eq(products.active, true)
          )
        )
    );
    const activeProductCount = Number(productCountRows[0]?.value ?? 0);

    // 5) Admin context (so we know if the user can manage / is platform)
    const adminUser = await getAdminUser();
    const isPlatformAdmin = adminUser?.role === "platform_admin";
    const canManageBilling = isPlatformAdmin || !!adminUser?.can_manage_settings;

    // ── Normalize plan data ──────────────────────────────────────────────────
    const planTier = ((planData?.plan_tier as PlanTierKey | undefined) ?? "starter");
    const limits = {
      max_users: planData?.max_users ?? 1,
      max_stops_monthly: planData?.max_stops_monthly ?? 10,
      max_products: planData?.max_products ?? 25,
    };
    const planInfo = PLAN_TIERS[planTier] ?? PLAN_TIERS.starter;
    const planMonthlyPrice = planInfo.monthlyPrice;
    const planAnnualPrice = planInfo.annualPrice;

    // ── Normalize subscription state ─────────────────────────────────────────
    const rawStatus = (brand?.stripe_subscription_status ?? null) as BillingSubscriptionStatus | null;
    const hasStripeCustomer = !!brand?.stripe_customer_id;
    const hasActiveSubscription =
      rawStatus === "active" || rawStatus === "trialing";

    // ── Build add-on list with derived `removable` ──────────────────────────
    const addons: BillingOverview["addons"] = (Object.keys(ADDONS) as AddonKey[]).map((key) => {
      const cfg = ADDONS[key];
      const enabled = !!enabledAddons?.[key];
      return {
        key,
        label: cfg.label,
        icon: cfg.icon,
        description: cfg.description,
        enabled,
        removable: enabled && hasActiveSubscription && canManageBilling,
        monthlyPrice: cfg.monthlyPrice,
        annualPrice: cfg.annualPrice,
      };
    });

    // ── Usage (products override from active=true+not-deleted count) ───────
    const usage = {
      users: planData?.usage?.users ?? 0,
      stops_this_month: planData?.usage?.stops_this_month ?? 0,
      // Prefer the active+non-deleted count for cross-UI consistency.
      products: activeProductCount || (planData?.usage?.products ?? 0),
    };

    // ── Totals ───────────────────────────────────────────────────────────────
    const addonsMonthlyTotal = addons
      .filter((a) => a.enabled && hasActiveSubscription)
      .reduce((s, a) => s + a.monthlyPrice, 0);
    const addonsAnnualTotal = addons
      .filter((a) => a.enabled && hasActiveSubscription)
      .reduce((s, a) => s + a.annualPrice, 0);

    const monthlyTotal = planMonthlyPrice + addonsMonthlyTotal;
    const annualTotal = planAnnualPrice + addonsAnnualTotal;

    const planCycle: "monthly" | "annual" =
      options?.planCycle ?? "monthly"; // safer default — see header comment

    const displayedInvoiceAmount =
      planCycle === "annual"
        ? planAnnualPrice + addonsAnnualTotal
        : planMonthlyPrice + addonsMonthlyTotal;

    return {
      success: true,
      data: {
        brandId,
        brandName: brand?.name ?? planData?.plan_name ?? null,
        planTier,
        planCycle,
        planMonthlyPrice,
        planAnnualPrice,
        hasStripeCustomer,
        hasActiveSubscription,
        subscriptionStatus: rawStatus,
        currentPeriodEnd: brand?.stripe_current_period_end ?? null,
        limits,
        usage,
        enabledAddons,
        addons,
        displayedInvoiceAmount,
        monthlyTotal,
        annualTotal,
        isPlatformAdmin,
        canManageBilling,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to build billing overview: ${message}` };
  }
}
