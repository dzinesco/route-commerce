"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export async function getStripeBillingPortalUrl(brandId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Stripe not configured" };

  // Get stripe_customer_id from tenants table
  const custRes = await pool.query<{ stripe_customer_id: string | null }>(
    "SELECT stripe_customer_id FROM tenants WHERE id = $1 LIMIT 1",
    [brandId]
  );
  const stripeCustomerId = custRes.rows[0]?.stripe_customer_id;

  if (!stripeCustomerId) {
    return { success: false, error: "No Stripe customer found. Complete Stripe setup in Payments settings first." };
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/settings/billing`,
  });

  return { success: true, url: session.url };
}

export async function updateBrandPlanTier(brandId: string, planTier: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }
  if (!["starter", "farm", "enterprise"].includes(planTier)) {
    return { success: false, error: "Invalid plan tier" };
  }

  try {
    await pool.query(
      "SELECT update_brand_plan_tier($1, $2)",
      [brandId, planTier]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update plan tier" };
  }
}

export async function updateBrandStripeCustomerId(brandId: string, stripeCustomerId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  try {
    await pool.query(
      "SELECT update_brand_stripe_customer_id($1, $2)",
      [brandId, stripeCustomerId]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update Stripe customer ID" };
  }
}

export async function getBrandPlanInfo(brandId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  // Replicate get_brand_plan_info via a JOIN on tenants + plans
  const res = await pool.query<{
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

  const data = res.rows[0];
  if (!data) return { success: false, error: "Brand not found" };
  return { success: true, data };
}

export async function getEnabledAddons(brandId: string): Promise<Record<string, boolean>> {
  // get_brand_features returns JSONB — a single object, not an array
  const res = await pool.query<{ feature_flags: Record<string, unknown> | null }>(
    "SELECT feature_flags FROM brand_settings WHERE tenant_id = $1 LIMIT 1",
    [brandId]
  );
  const flags = res.rows[0]?.feature_flags ?? {};
  if (!flags || typeof flags !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(flags)) {
    out[k] = v === true || v === "true" || v === 1 || v === "1";
  }
  return out;
}

export async function getRecentWholesaleOrders(brandId: string, limit = 20): Promise<any[]> {
  try {
    const res = await pool.query(
      "SELECT * FROM get_wholesale_orders($1)",
      [brandId]
    );
    const data = res.rows;
    if (!Array.isArray(data)) return [];
    return data.slice(0, limit);
  } catch {
    return [];
  }
}
