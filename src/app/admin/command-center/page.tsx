import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import CommandCenterDashboard from "@/components/admin/CommandCenterDashboard";
import { redirect } from "next/navigation";

export default async function CommandCenterPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;
  if (adminUser.role !== "platform_admin") return <AdminAccessDenied message="Platform admin access required." />;

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-[1600px]">
        <CommandCenterDashboard />
      </div>
    </main>
  );
}