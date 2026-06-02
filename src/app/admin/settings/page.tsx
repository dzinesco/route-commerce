import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminUsers, getBrands } from "@/actions/admin/users";
import { getPaymentSettings } from "@/actions/payments";
import SettingsClient from "@/components/admin/SettingsClient";

export const metadata = {
  title: "Settings - Route Commerce Admin",
  description: "Manage your brand settings, workers, tasks, and user permissions",
};

export default async function AdminSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const brandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [{ users, error }, { brands }] = await Promise.all([
    getAdminUsers(adminUser.role === "platform_admin" ? undefined : (adminUser.brand_id ?? undefined)),
    getBrands(),
  ]);

  // Fetch payment settings for the brand tab
  const paymentResult = await getPaymentSettings(brandId);
  const paymentSettings = paymentResult.success ? paymentResult.settings : null;

  return (
    <SettingsClient
      brandId={brandId}
      users={error ? [] : users}
      brands={brands}
      paymentSettings={paymentSettings}
      currentUser={{
        id: adminUser.id ?? adminUser.user_id,
        role: adminUser.role,
        can_manage_users: adminUser.can_manage_users,
      }}
    />
  );
}