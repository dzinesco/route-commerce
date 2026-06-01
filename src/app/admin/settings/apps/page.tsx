import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { ADDON_CATALOG, isFeatureEnabled } from "@/lib/feature-flags";
import BrandFeatureCards from "@/components/admin/BrandFeatureCards";

export default async function AppsSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    redirect("/admin");
  }

  const brandId = adminUser.brand_id ?? "";

  const enabledFeatures: Record<string, boolean> = {};
  for (const key of Object.keys(ADDON_CATALOG) as (keyof typeof ADDON_CATALOG)[]) {
    enabledFeatures[key] = await isFeatureEnabled(brandId, key);
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <a href="/admin" className="hover:text-stone-800 transition-colors">Admin</a>
          <span>/</span>
          <span className="text-stone-800">Add-ons</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-200 border border-stone-300">
              <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.337-1.219 23.75 23.75 0 00-5.337-1.219 23.848 23.848 0 005.337 1.219zM10.5 2.25a2.25 2.25 0 013.165 1.453 2.25 2.25 0 00-1.453 3.165m-6.197 6.197A3.5 3.5 0 017.5 12.75v1.5a3.5 3.5 0 001.5 2.625h1.5a3.5 3.5 0 001.5-2.625V13.5m-6.197 6.197a3.5 3.5 0 001.5 2.625m0 0v1.5a3.5 3.5 0 01-1.5 2.625H5.25m0 0H3.75a2.25 2.25 0 00-2.25 2.25v1.5a2.25 2.25 0 002.25 2.25h1.5m0 0A3.5 3.5 0 0112.75 19.5v1.5a3.5 3.5 0 01-3.5 3.5H8.25m0 0H6.75" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-stone-950">Add-ons</h1>
          </div>
          <p className="mt-2 text-stone-500">
            Enable or disable add-on features for your brand. Changes take effect immediately.
          </p>
        </div>

        <BrandFeatureCards brandId={brandId} initialEnabledFeatures={enabledFeatures} />
      </div>
    </main>
  );
}