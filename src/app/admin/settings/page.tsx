import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminUsers, getBrands } from "@/actions/admin/users";
import TimeTrackingSettingsClient from "@/components/admin/TimeTrackingSettingsClient";
import UsersPage from "@/components/admin/UsersPage";
import SettingsSections from "@/components/admin/SettingsSections";
import IntegrationsInner from "@/components/admin/IntegrationsInner";

export default async function AdminSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const brandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [{ users, error }, { brands }] = await Promise.all([
    getAdminUsers(adminUser.role === "platform_admin" ? undefined : (adminUser.brand_id ?? undefined)),
    getBrands(),
  ]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Header */}
        <div>
          <nav className="flex items-center gap-2 text-xs text-stone-500 mb-3">
            <a href="/admin" className="hover:text-stone-600 transition-colors">Admin</a>
            <span>/</span>
            <span className="text-stone-600">Settings</span>
          </nav>
          <h1 className="text-3xl font-bold text-stone-950 tracking-tight">Settings</h1>
          <p className="mt-1.5 text-sm text-stone-500">Manage your brand, workers, tasks, users, and integrations.</p>
        </div>

        {/* Nav to anchor sections */}
        <div className="flex flex-wrap gap-3 border-b border-stone-200 pb-4">
          <a href="#general" className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors">General</a>
          <span className="text-stone-300">·</span>
          <a href="#workers" className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors">Workers & PINs</a>
          <span className="text-stone-300">·</span>
          <a href="#tasks" className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors">Tasks</a>
          <span className="text-stone-300">·</span>
          <a href="#users" className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors">Users & Permissions</a>
          <span className="text-stone-300">·</span>
          <a href="#integrations" className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors">Integrations</a>
        </div>

        {/* Section 1: General Settings */}
        <section id="general">
          <SettingsSections brandId={brandId} />
        </section>

        {/* Section 4: Users & Permissions */}
        <section id="users">
          <div className="border-t border-stone-200 pt-10">
            <h2 className="text-lg font-bold text-stone-950 mb-4">Users & Permissions</h2>
            <UsersPage
              initialUsers={error ? [] : users}
              brands={brands}
              currentUser={{
                id: adminUser.id ?? adminUser.user_id,
                role: adminUser.role,
                can_manage_users: adminUser.can_manage_users,
              }}
            />
          </div>
        </section>

        {/* Section 5: Integrations */}
        <section id="integrations">
          <div className="border-t border-stone-200 pt-10">
            <h2 className="text-lg font-bold text-stone-950 mb-4">Integrations & Exports</h2>
            <IntegrationsInner brandId={brandId} brands={brands} />

            {/* Time Tracking Exports */}
            <div className="mt-6 border-t border-stone-200 pt-6">
              <h3 className="text-base font-semibold text-stone-800 mb-4">Time Tracking Exports</h3>
              <TimeTrackingSettingsClient brandId={brandId} />
            </div>
            <p className="text-xs text-stone-500 mt-3">
              For more settings, see{" "}
              <a href="/admin/settings/ai" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">AI Tools</a>
              {" "}and{" "}
              <a href="/admin/settings/shipping" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Shipping</a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}