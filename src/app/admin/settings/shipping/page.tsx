import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getShippingSettings } from "@/actions/shipping/settings";
import ShippingSettingsForm from "@/components/admin/ShippingSettingsForm";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";

export default async function ShippingSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;
  if (!adminUser.can_manage_orders || adminUser.role === "store_employee") {
    redirect("/admin/pickup");
  }

  const isPlatformAdmin = adminUser.role === "platform_admin";
  const brandId = adminUser.brand_id ?? "";

  // Platform admins: fetch all brands for the picker
  const brands = isPlatformAdmin
    ? (await supabase.from("brands").select("id, name").order("name")).data ?? []
    : [];

  const effectiveBrandId = brandId || (brands[0]?.id ?? "");

  const result = await getShippingSettings(effectiveBrandId);
  const settings = result.success ? result.settings : null;

  return (
    <main className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-2xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: "var(--admin-text-muted)" }}>
          <a href="/admin" className="hover:text-[var(--admin-text-primary)] transition-colors">Admin</a>
          <span>/</span>
          <span style={{ color: "var(--admin-text-primary)" }}>Shipping</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--admin-accent)", color: "white" }}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25m-2.25 0h2.25m0 0v-.375c0-.621-.504-1.125-1.125-1.125H15m-1.5-3l1.5 0l.75 0v-.375c0-.621-.504-1.125-1.125-1.125H15m0 0v-.375c0-.621-.504-1.125-1.125-1.125H12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--admin-text-primary)" }}>Shipping Settings</h1>
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--admin-text-muted)" }}>
            Configure FedEx integration for shipping fresh produce — sweet corn, onions, and more.
          </p>
        </div>

        <div className="rounded-2xl border p-6 shadow-lg" style={{ backgroundColor: "white", borderColor: "var(--admin-border)" }}>
          <ShippingSettingsForm
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