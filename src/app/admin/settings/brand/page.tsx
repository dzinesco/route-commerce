import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getBrandSettings } from "@/actions/brand-settings";
import BrandSettingsForm from "@/components/admin/BrandSettingsForm";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";

export default async function BrandSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    redirect("/admin");
  }

  const isPlatformAdmin = adminUser.role === "platform_admin";
  const brandId = adminUser.brand_id ?? "";

  // Platform admins: fetch all brands for the picker
  const brands = isPlatformAdmin
    ? (await supabase.from("brands").select("id, name").order("name")).data ?? []
    : [];

  const effectiveBrandId = brandId || (brands[0]?.id ?? "");

  // Get brand name for display
  const brandName =
    brands.find((b) => b.id === effectiveBrandId)?.name ??
    (await supabase.from("brands").select("name").eq("id", effectiveBrandId).single()).data?.name ??
    "Unknown Brand";

  const result = await getBrandSettings(effectiveBrandId);
  const settings = result.success ? result.settings : null;

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <a href="/admin" className="hover:text-stone-800 transition-colors">Admin</a>
          <span>/</span>
          <span className="text-stone-800">Brand Settings</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 border border-emerald-200">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.592 9.592c1.106.105 1.35.374 1.591.659l4.317 4.317c.221.241.375.574.375.896v.318c0 .621-.504 1.125-1.125 1.125H5.25A2.25 2.25 0 013 16.5v-4.318c0-.597-.237-1.17-.659-1.591l-9.592-9.592A2.25 2.25 0 012.25 5.25m5.318 4.5v4.318l3.591 3.591M5.25 7.5a2.25 2.25 0 012.25-2.25h4.318m0 0L9 10.5m5.25-2.25v4.318m0 0L14.25 12m5.25-2.25H9.75" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-stone-950">Brand Settings</h1>
          </div>
          <p className="mt-2 text-stone-500">
            Company information, logos, and default signatures used across the platform.
          </p>
        </div>

        <div className="card p-6 shadow-xl">
          <BrandSettingsForm
            settings={settings}
            brandId={effectiveBrandId}
            brandName={brandName}
            brands={brands}
            isPlatformAdmin={isPlatformAdmin}
          />
        </div>
      </div>
    </main>
  );
}