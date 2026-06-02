import type { Metadata } from "next";
import { getAdminUser } from "@/lib/admin-permissions";
import { getBrandSettings } from "@/actions/brand-settings";
import AbandonedCartDashboard from "@/components/admin/AbandonedCartDashboard";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";

export const metadata: Metadata = {
  title: "Abandoned Cart Recovery - Harvest Reach",
  description: "Recover abandoned carts with automated email sequences.",
};

export default async function AbandonedCartsPage() {
  const adminUser = await getAdminUser();
  const brandId = adminUser?.brand_id ?? TUXEDO_BRAND_ID;

  const settingsResult = await getBrandSettings(brandId);
  const brandName = settingsResult?.success ? (settingsResult.settings?.brand_name ?? "Farm") : "Farm";

  return (
    <main className="min-h-screen px-4 sm:px-6 md:px-8 py-6 sm:py-8" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <nav className="flex items-center gap-2 text-xs text-stone-500 mb-4">
            <a href="/admin" className="hover:text-stone-600 transition-colors">Admin</a>
            <span>/</span>
            <a href="/admin/communications" className="hover:text-stone-600 transition-colors">Communications</a>
            <span>/</span>
            <span className="text-stone-600">Abandoned Cart Recovery</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Abandoned Cart Recovery</h1>
                <p className="text-sm text-stone-500">{brandName} — 3-email sequence (1h, 24h, 48h)</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Recovered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                Expired
              </span>
            </div>
          </div>
        </div>

        <AbandonedCartDashboard brandId={brandId} />
      </div>
    </main>
  );
}