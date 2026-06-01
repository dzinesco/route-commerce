import { getAdminUser } from "@/lib/admin-permissions";
import { getBrandSettings } from "@/actions/brand-settings";
import AbandonedCartDashboard from "@/components/admin/AbandonedCartDashboard";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";

export default async function AbandonedCartsPage() {
  const adminUser = await getAdminUser();
  const brandId = adminUser?.brand_id ?? TUXEDO_BRAND_ID;

  const settingsResult = await getBrandSettings(brandId);
  const brandName = settingsResult?.success ? (settingsResult.settings?.brand_name ?? "Farm") : "Farm";

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
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
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-950">Abandoned Cart Recovery</h1>
              <p className="mt-1 text-sm text-stone-500">{brandName} — 3-email sequence (1h, 24h, 48h)</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500">
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
