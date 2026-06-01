import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getBrandPlanInfo, getEnabledAddons } from "@/actions/billing/stripe-portal";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import BillingClientPage from "./BillingClientPage";

type Props = {
  params: Promise<{ brandId?: string }>;
};

export default async function BillingPage({ params }: Props) {
  const { brandId: brandIdParam } = await params;
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;

  const effectiveBrandId = brandIdParam ?? adminUser.brand_id ?? "";
  const isPlatformAdmin = adminUser.role === "platform_admin";

  let resolvedBrandId = effectiveBrandId;
  if (isPlatformAdmin && !resolvedBrandId) {
    const { data: firstBrand } = await supabase
      .from("brands")
      .select("id")
      .limit(1)
      .single();
    if (firstBrand?.id) {
      resolvedBrandId = firstBrand.id;
    } else {
      return (
        <main className="min-h-screen bg-stone-100 px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
              <a href="/admin" className="hover:text-stone-800 transition-colors">Admin</a>
              <span>/</span>
              <span className="text-stone-800">Billing</span>
            </nav>
            <div className="card p-8 shadow-xl text-center">
              <h1 className="text-2xl font-bold text-stone-950">No Brands Found</h1>
              <p className="mt-2 text-stone-500">Create a brand in the database before accessing billing settings.</p>
              <a href="/admin" className="mt-4 inline-block rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-medium text-white transition-colors">
                Back to Admin
              </a>
            </div>
          </div>
        </main>
      );
    }
  }

  if (!resolvedBrandId) return <AdminAccessDenied />;

  const [planResult, addons] = await Promise.all([
    getBrandPlanInfo(resolvedBrandId),
    getEnabledAddons(resolvedBrandId),
  ]);

  const planData = (planResult.success && planResult.data && typeof planResult.data === "object")
    ? planResult.data as Record<string, any>
    : {} as Record<string, any>;

  const planTier = planData.plan_tier ?? "starter";

  const { data: brand } = await supabase
    .from("brands")
    .select("name, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_end")
    .eq("id", resolvedBrandId)
    .single();

  const hasStripeCustomer = !!brand?.stripe_customer_id;

  return (
    <main className="min-h-screen bg-stone-100">
      {/* Platform billing header */}
      <div className="bg-stone-200 border-b border-stone-300 px-6 py-3">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs text-stone-600">
            <span className="font-medium text-stone-700">Route Commerce Platform Billing</span>
            {" — "}Invoiced by Cielo Hermosa, LLC · Manage your platform subscription and add-ons.
            {" "}Questions? <a href="mailto:billing@cielohermosa.com" className="text-blue-600 hover:text-blue-700 underline transition-colors">billing@cielohermosa.com</a>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <a href="/admin" className="hover:text-stone-800 transition-colors">Admin</a>
          <span>/</span>
          <a href="/admin/settings" className="hover:text-stone-800 transition-colors">Settings</a>
          <span>/</span>
          <span className="text-stone-800">Billing</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-950">Billing &amp; Subscription</h1>
          <p className="mt-1 text-stone-500">
            Manage your Route Commerce subscription for {brand?.name ?? "your brand"}.
          </p>
        </div>

        <BillingClientPage
          brandId={resolvedBrandId}
          planTier={planTier}
          brandName={brand?.name ?? null}
          hasStripeCustomer={hasStripeCustomer}
          enabledAddons={addons}
          isPlatformAdmin={isPlatformAdmin}
          subscriptionStatus={brand?.stripe_subscription_status ?? null}
          currentPeriodEnd={brand?.stripe_current_period_end ?? null}
        />
      </div>
    </main>
  );
}