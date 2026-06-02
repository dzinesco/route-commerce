import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import SettingsClient from "@/components/admin/SettingsClient";

export const metadata = {
  title: "Settings - Route Commerce Admin",
  description: "Manage your brand settings, workers, tasks, and user permissions",
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const params = await searchParams;
  const isPlatformAdmin = adminUser.role === "platform_admin";

  // Platform admin can select a brand via query param, otherwise use their assigned brand
  let brandId = adminUser.brand_id ?? "";
  if (isPlatformAdmin && params.brand) {
    brandId = params.brand;
  } else if (!brandId) {
    brandId = "64294306-5f42-463d-a5e8-2ad6c81a96de";
  }

  return <SettingsClient brandId={brandId} />;
}