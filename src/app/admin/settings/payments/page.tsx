import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getPaymentSettings } from "@/actions/payments";
import PaymentSettingsForm from "@/components/admin/PaymentSettingsForm";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";

export default async function PaymentSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;
  if (!adminUser.can_manage_orders || adminUser.role === "store_employee") redirect("/admin/pickup");

  const isPlatformAdmin = adminUser.role === "platform_admin";
  const brandId = adminUser.brand_id ?? "";

  // Platform admins: fetch all brands for the picker
  const brands = isPlatformAdmin
    ? (await supabase.from("brands").select("id, name").order("name")).data ?? []
    : [];

  const effectiveBrandId = brandId || (brands[0]?.id ?? "");

  const result = await getPaymentSettings(effectiveBrandId);
  const settings = result.success ? result.settings : null;

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <a href="/admin" className="hover:text-stone-800 transition-colors">Admin</a>
          <span>/</span>
          <span className="text-stone-800">Payments</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-200 border border-stone-300">
              <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m3.75 0h3m3.75 0h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m3.75 0h3m-3.75 0h3m-3.75 0h3" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-stone-950">Payment Settings</h1>
          </div>
          <p className="mt-2 text-stone-500">
            Configure your payment provider for checkout processing.
          </p>
        </div>

        <div className="card p-6 shadow-xl">
          <PaymentSettingsForm
            settings={settings}
            brandId={effectiveBrandId}
            brands={brands}
            isPlatformAdmin={isPlatformAdmin}
          />
        </div>
      </div>
    </main>
  );
}
