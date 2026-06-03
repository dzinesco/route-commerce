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
import { svcHeaders } from "@/lib/svc-headers";
import { ADDONS, PLAN_TIERS, type AddonKey, type PlanTierKey } from "@/lib/pricing";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const planRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_brand_plan_info`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_brand_id: brandId }),
      }
    );
    const planData = planRes.ok ? await planRes.json() : null;

    // 2) Brand row: subscription state, name, stripe_customer_id
    const brandRes = await fetch(
      `${supabaseUrl}/rest/v1/brands?id=eq.${brandId}&select=name,stripe_customer_id,stripe_subscription_id,stripe_subscription_status,stripe_current_period_end`,
      { headers: svcHeaders(supabaseKey) }
    );
    const brandRows = brandRes.ok ? await brandRes.json() : [];
    const brand = Array.isArray(brandRows) ? brandRows[0] : null;

    // 3) Enabled add-ons (feature flags)
    const addonsRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_brand_features`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_brand_id: brandId }),
      }
    );
    const enabledAddons = addonsRes.ok ? await addonsRes.json() : {};

    // 4) Active product count — same semantics as the dashboard
    //    (active=true AND deleted_at IS NULL). Keeps the billing page in
    //    sync with /admin "Active Products" stat.
    const productRes = await fetch(
      `${supabaseUrl}/rest/v1/products?select=id&brand_id=eq.${brandId}&active=eq.true&deleted_at=is.null&limit=1000`,
      { headers: { ...svcHeaders(supabaseKey), Prefer: "count=exact" } }
    );
    const productCountHeader = productRes.headers.get("Content-Range");
    let activeProductCount = 0;
    if (productCountHeader && productCountHeader.includes("/")) {
      const total = productCountHeader.split("/").pop();
      activeProductCount = parseInt(total ?? "0", 10) || 0;
    }

    // 5) Admin context (so we know if the user can manage / is platform)
    const adminUser = await getAdminUser();
    const isPlatformAdmin = adminUser?.role === "platform_admin";
    const canManageBilling = isPlatformAdmin || !!adminUser?.can_manage_settings;

    // ── Normalize plan data ──────────────────────────────────────────────────
    const planTier = (planData?.plan_tier ?? "starter") as PlanTierKey;
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
        brandName: brand?.name ?? planData?.brand_name ?? null,
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
        enabledAddons: (enabledAddons ?? {}) as Record<string, boolean>,
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
