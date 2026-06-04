import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getBillingOverview } from "@/actions/billing/billing-overview";
import DashboardClient from "@/components/admin/DashboardClient";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export default async function AdminPage() {
  const adminUser = await getAdminUser();
  const isStoreEmployee = adminUser?.role === "store_employee";

  const isWaterLogVisible =
    adminUser?.role === "platform_admin" ||
    (adminUser?.role === "brand_admin" &&
      adminUser?.brand_id === TUXEDO_BRAND_ID &&
      adminUser?.can_manage_water_log);

  let enabledAddons: Record<string, boolean> = {};
  let planTier = "starter";
  let usage = { users: 0, stops_this_month: 0, products: 0 };
  let limits = { max_users: 1, max_stops_monthly: 10, max_products: 25 };
  let brandDisplayName = "Admin";

  // Resolve active brand via the canonical resolver (URL > cookie > legacy brand_id
  // > first of brand_ids). For platform_admin in dev mode this is null, so we
  // fall back to the first brand in the brands table to keep the dashboard's
  // "Active Products" stat in sync with the billing page.
  let dashboardBrandId: string | null = adminUser ? await getActiveBrandId(adminUser) : null;
  if (!dashboardBrandId && adminUser?.role === "platform_admin") {
    const { data: firstBrand } = await supabase
      .from("brands")
      .select("id")
      .limit(1)
      .single();
    if (firstBrand?.id) {
      dashboardBrandId = firstBrand.id;
    }
  }

  if (dashboardBrandId) {
    // Use the centralized billing overview so the dashboard's "Active Products"
    // stat agrees with the plan usage in /admin/settings/billing. Previously
    // these were derived from two different queries with different filters
    // (active=true vs deleted_at IS NULL), causing the "1 vs 0/25" mismatch.
    const overviewRes = await getBillingOverview(dashboardBrandId);
    if (overviewRes.success && overviewRes.data) {
      const o = overviewRes.data;
      planTier = o.planTier;
      usage = o.usage;
      limits = o.limits;
      if (o.brandName) brandDisplayName = o.brandName;
      enabledAddons = o.enabledAddons;
    } else {
      // Fallback to per-feature flag check (matches prior behavior)
      for (const key of [
        "harvest_reach",
        "wholesale_portal",
        "water_log",
        "ai_tools",
        "sms_campaigns",
        "square_sync",
        "route_trace",
      ] as const) {
        enabledAddons[key] = await isFeatureEnabled(dashboardBrandId, key);
      }
    }
  }

  if (isStoreEmployee) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Driver Pickup</h1>
          <p className="mt-3 text-sm text-stone-600">
            Use the buttons below to look up orders, record pickups, and manage fulfillment.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Link
              href="/admin/pickup"
              className="block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-950">Pickup Lookup</h2>
                  <p className="mt-0.5 text-sm text-stone-500">Scan QR or search orders</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/wholesale"
              className="block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-950">Wholesale Portal</h2>
                  <p className="mt-0.5 text-sm text-stone-500">Approved buyer orders</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <DashboardClient
      brandId={adminUser?.brand_id ?? null}
      brandName={brandDisplayName}
      planTier={planTier}
      isWaterLogVisible={isWaterLogVisible}
      enabledAddons={enabledAddons}
      usage={usage}
      limits={limits}
    />
  );
}
