import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { ADDON_CATALOG, isFeatureEnabled } from "@/lib/feature-flags";
import BrandFeatureCards from "@/components/admin/BrandFeatureCards";
import { AdminPageHeader } from "@/components/admin/design-system";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AppsSettingsPage({ searchParams }: Props) {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    redirect("/admin");
  }

  const params = await searchParams;
  const reason = params.reason;
  
  const brandId = adminUser.brand_id ?? "";

  const enabledFeatures: Record<string, boolean> = {};
  for (const key of Object.keys(ADDON_CATALOG) as (keyof typeof ADDON_CATALOG)[]) {
    enabledFeatures[key] = await isFeatureEnabled(brandId, key);
  }

  const featureNames: Record<string, string> = {
    route_trace: "Route Trace",
    wholesale_portal: "Wholesale Portal",
    harvest_reach: "Harvest Reach",
    water_log: "Water Log",
    ai_tools: "AI Tools",
    sms_campaigns: "SMS Campaigns",
    square_sync: "Square Sync",
  };

  return (
    <main className="min-h-screen admin-section px-6 py-10" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-5xl">
        {/* Header with icon */}
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <svg className="h-6 w-6" style={{ color: '#059669' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09.542.56.94 1.11.94h2.64c.55 0 1.02-.398 1.11-.94l.213-1.999c.018-.158.04-.315.062-.472a.563.563 0 00-.122-.519l-.79-2.758A.562.562 0 0014.56 0H9.44a.563.563 0 00-.424.264l-.79 2.758a.563.563 0 00-.122.519c.022.157.044.314.062.472l.213 1.999z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
            </svg>
          </div>
          <AdminPageHeader
            breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Settings" }, { label: "Add-ons" }]}
            title="Add-ons"
            description="Enable features to extend your platform capabilities"
          />
        </div>

        {/* Reason banner */}
        {reason && featureNames[reason] && (
          <div 
            className="mb-6 rounded-xl p-4"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                }}
              >
                <svg className="h-5 w-5" style={{ color: '#059669' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-stone-950">
                  {featureNames[reason]} is not enabled
                </h2>
                <p className="text-sm text-stone-500">
                  Enable the {featureNames[reason]} add-on below to access this feature.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feature cards */}
        <BrandFeatureCards brandId={brandId} initialEnabledFeatures={enabledFeatures} />
      </div>
    </main>
  );
}