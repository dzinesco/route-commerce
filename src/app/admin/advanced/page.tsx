import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getBrands } from "@/actions/admin/users";
import { getStripeConnectStatus } from "@/actions/stripe-connect";
import AdvancedSettingsClient from "@/components/admin/AdvancedSettingsClient";
import { PageHeader } from "@/components/admin/design-system";

export const metadata = {
  title: "Advanced Settings - Route Commerce Admin",
  description: "Developer settings, API integrations, and advanced configurations",
};

export default async function AdvancedSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  // Only admins can access advanced settings
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    redirect("/admin");
  }

  const brandId = adminUser.brand_id ?? "";
  const { brands } = await getBrands();
  
  // Get Stripe Connect status
  const stripeConnect = brandId ? await getStripeConnectStatus(brandId) : null;

  return (
    <main className="min-h-screen bg-[var(--admin-bg)] px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          breadcrumb={[
            { label: "Admin", href: "/admin" },
            { label: "Settings", href: "/admin/settings" },
            { label: "Advanced" },
          ]}
          title="Advanced Settings"
          subtitle="Developer settings, APIs, and integrations"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
            </svg>
          }
        />
        <AdvancedSettingsClient
          brandId={brandId}
          brands={brands}
          stripeConnect={stripeConnect}
        />
      </div>
    </main>
  );
}