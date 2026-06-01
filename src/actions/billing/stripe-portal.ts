"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export async function getStripeBillingPortalUrl(brandId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Stripe not configured" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Get stripe_customer_id from brands table
  const custRes = await fetch(
    `${supabaseUrl}/rest/v1/brands?id=eq.${brandId}&select=stripe_customer_id`,
    { headers: svcHeaders(supabaseKey) }
  );
  const custData = await custRes.json();
  const stripeCustomerId = custData?.[0]?.stripe_customer_id;

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_brand_plan_tier`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_plan_tier: planTier }),
    }
  );

  if (!res.ok) return { success: false, error: "Failed to update plan tier" };
  return { success: true };
}

export async function updateBrandStripeCustomerId(brandId: string, stripeCustomerId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_brand_stripe_customer_id`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_stripe_customer_id: stripeCustomerId }),
    }
  );

  if (!res.ok) return { success: false, error: "Failed to update Stripe customer ID" };
  return { success: true };
}

export async function getBrandPlanInfo(brandId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_brand_plan_info`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!res.ok) return { success: false, error: "Failed to fetch plan info" };
  const data = await res.json();
  if (!Array.isArray(data) && typeof data !== "object") return { success: false, error: "Invalid plan info response" };
  return { success: true, data };
}

export async function getEnabledAddons(brandId: string): Promise<Record<string, boolean>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_brand_features`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  // get_brand_features returns JSONB — a single object, not an array
  if (!res.ok) return {};
  const data = await res.json();
  if (typeof data !== "object" || data === null) return {};
  return data as Record<string, boolean>;
}

export async function getRecentWholesaleOrders(brandId: string, limit = 20): Promise<any[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_orders`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.slice(0, limit);
}