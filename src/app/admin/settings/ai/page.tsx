import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";

export default async function AISettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  redirect("/admin/settings#ai");
}