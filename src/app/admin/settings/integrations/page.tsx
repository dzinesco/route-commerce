import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import IntegrationsClientPage from "./IntegrationsClientPage";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";

export const metadata = {
  title: "Integrations - Route Commerce Admin",
  description: "Configure integrations for AI, email, SMS, and payments",
};

export default async function IntegrationsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;

  const isPlatformAdmin = adminUser.role === "platform_admin";
  const brandId = adminUser.brand_id ?? "";

  // Platform admins: fetch all brands for the picker
  const brands = isPlatformAdmin
    ? (await supabase.from("brands").select("id, name").order("name")).data ?? []
    : [];

  return (
    <main className="min-h-screen bg-[var(--admin-bg)]">
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] mb-6">
          <a href="/admin" className="hover:text-[var(--admin-text-primary)] transition-colors">Admin</a>
          <span>/</span>
          <a href="/admin/settings" className="hover:text-[var(--admin-text-primary)] transition-colors">Settings</a>
          <span>/</span>
          <span className="text-[var(--admin-text-primary)]">Integrations</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent)] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--admin-text-primary)]">Integrations</h1>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Connect AI, email, SMS, and payment providers to power your operations.
              </p>
            </div>
          </div>
        </div>

        <IntegrationsClientPage
          brandId={brandId}
          brands={brands}
          isPlatformAdmin={isPlatformAdmin}
        />
      </div>
    </main>
  );
}