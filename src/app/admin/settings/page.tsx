import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminUsers, getBrands } from "@/actions/admin/users";
import SettingsClient from "@/components/admin/SettingsClient";

export default async function AdminSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const brandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [{ users, error }, { brands }] = await Promise.all([
    getAdminUsers(adminUser.role === "platform_admin" ? undefined : (adminUser.brand_id ?? undefined)),
    getBrands(),
  ]);

  // Breadcrumb nav (for page context)
  const breadcrumb = (
    <nav className="flex items-center gap-2 text-xs text-stone-500 mb-3">
      <a href="/admin" className="hover:text-stone-600 transition-colors">Admin</a>
      <span>/</span>
      <span className="text-stone-600">Settings</span>
    </nav>
  );

  return (
    <main>
      {breadcrumb}
      <SettingsClient
        brandId={brandId}
        users={error ? [] : users}
        brands={brands}
        currentUser={{
          id: adminUser.id ?? adminUser.user_id,
          role: adminUser.role,
          can_manage_users: adminUser.can_manage_users,
        }}
      />
    </main>
  );
}