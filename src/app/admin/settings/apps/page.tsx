import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";

export default async function AppsSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  // Redirect to unified settings page with Add-ons tab
  redirect("/admin/settings#addons");
}