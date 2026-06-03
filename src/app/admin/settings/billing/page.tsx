import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getBillingOverview } from "@/actions/billing/billing-overview";
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
        <main className="min-h-screen bg-[var(--admin-bg)] px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <nav className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] mb-6">
              <a href="/admin" className="hover:text-[var(--admin-text-primary)] transition-colors">Admin</a>
              <span>/</span>
              <span className="text-[var(--admin-text-primary)]">Billing</span>
            </nav>
            <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-8 text-center">
              <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">No Brands Found</h1>
              <p className="mt-2 text-[var(--admin-text-muted)]">Create a brand in the database before accessing billing settings.</p>
              <a href="/admin" className="mt-4 inline-block rounded-xl bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] px-6 py-3 text-sm font-medium text-white transition-colors">
                Back to Admin
              </a>
            </div>
          </div>
        </main>
      );
    }
  }

  if (!resolvedBrandId) return <AdminAccessDenied />;

  // Single source of truth for everything the billing client needs.
  const overviewRes = await getBillingOverview(resolvedBrandId);
  if (!overviewRes.success || !overviewRes.data) {
    return (
      <main className="min-h-screen bg-[var(--admin-bg)] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-8 text-center">
            <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Billing Unavailable</h1>
            <p className="mt-2 text-[var(--admin-text-muted)]">{overviewRes.error ?? "Could not load billing information."}</p>
            <a href="/admin" className="mt-4 inline-block rounded-xl bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] px-6 py-3 text-sm font-medium text-white transition-colors">
              Back to Admin
            </a>
          </div>
        </div>
      </main>
    );
  }

  const overview = overviewRes.data;

  return (
    <main className="min-h-screen bg-[var(--admin-bg)]">
      {/* Platform billing header */}
      <div className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border)] px-6 py-3">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs text-[var(--admin-text-muted)]">
            <span className="font-medium text-[var(--admin-text-primary)]">Route Commerce Platform Billing</span>
            {" — "}Invoiced by Cielo Hermosa, LLC · Manage your platform subscription and add-ons.
            {" "}Questions? <a href="mailto:billing@cielohermosa.com" className="text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] underline transition-colors">billing@cielohermosa.com</a>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] mb-6">
          <a href="/admin" className="hover:text-[var(--admin-text-primary)] transition-colors">Admin</a>
          <span>/</span>
          <a href="/admin/settings" className="hover:text-[var(--admin-text-primary)] transition-colors">Settings</a>
          <span>/</span>
          <span className="text-[var(--admin-text-primary)]">Billing</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--admin-text-primary)]">Billing &amp; Subscription</h1>
          <p className="mt-1 text-[var(--admin-text-muted)]">
            Manage your Route Commerce subscription for {overview.brandName ?? "your brand"}.
          </p>
        </div>

        <BillingClientPage overview={overview} />
      </div>
    </main>
  );
}
