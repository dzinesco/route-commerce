import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminUsers } from "@/actions/admin/users";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import AdminMeClient from "./AdminMeClient";
import { redirect } from "next/navigation";

export default async function AdminMePage() {
  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  // Fetch the current user's full admin row for display_name, phone_number, etc.
  const { users } = await getAdminUsers(adminUser.brand_id ?? undefined);
  const myUser = users.find((u) => u.user_id === adminUser.user_id);

  if (!myUser) return <AdminAccessDenied message="Your admin account record was not found." />;

  return <AdminMeClient currentUser={myUser} />;
}
