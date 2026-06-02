import { getAdminUser } from "@/lib/admin-permissions";
import { getBrandSettings } from "@/actions/brand-settings";
import WelcomeSequenceDashboard from "@/components/admin/WelcomeSequenceDashboard";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export default async function WelcomeSequencePage() {
  const adminUser = await getAdminUser();
  const brandId = adminUser?.brand_id ?? TUXEDO_BRAND_ID;

  const settingsResult = await getBrandSettings(brandId);
  const brandName = settingsResult?.success ? (settingsResult.settings?.brand_name ?? "Farm") : "Farm";

  return (
    <main className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--admin-bg)" }}>
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
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-950">Welcome Email Sequence</h1>
              <p className="mt-1 text-sm text-stone-500">{brandName} — 4-email onboarding series</p>
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
