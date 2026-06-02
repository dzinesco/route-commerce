import type { Metadata } from "next";
import { getAdminUser } from "@/lib/admin-permissions";
import { getBrandSettings } from "@/actions/brand-settings";
import WelcomeSequenceDashboard from "@/components/admin/WelcomeSequenceDashboard";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export const metadata: Metadata = {
  title: "Welcome Sequence - Harvest Reach",
  description: "Configure the automated welcome email sequence for new subscribers.",
};

export default async function WelcomeSequencePage() {
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
            <span className="text-stone-600">Welcome Sequence</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Welcome Email Sequence</h1>
                <p className="text-sm text-stone-500">{brandName} — 4-email onboarding series</p>
              </div>
            </div>
            <div className="text-xs text-stone-400">
              Auto-enrolls new subscribers (email opt-in)
            </div>
          </div>
        </div>

        <WelcomeSequenceDashboard brandId={brandId} />
      </div>
    </main>
  );
}