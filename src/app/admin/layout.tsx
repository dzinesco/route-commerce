import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { getAdminUser } from "@/lib/admin-permissions";
import { redirect } from "next/navigation";
import "@/styles/admin-design-system.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return (
      <>
        <AdminSidebar userRole={null} />
        <div className="min-h-screen lg:pl-60 admin-section" style={{ backgroundColor: "var(--admin-bg)" }}>
        <AdminAccessDenied message="Your account does not have admin access." />
        </div>
      </>
    );
  }

  if (adminUser.must_change_password) {
    redirect("/change-password");
  }

  return (
    <>
      <AdminSidebar userRole={adminUser.role} />
      <div className="min-h-screen lg:pl-60 admin-section" style={{ backgroundColor: "var(--admin-bg)" }}>
        {children}
      </div>
    </>
  );
}