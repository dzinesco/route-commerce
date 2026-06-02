import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { getAdminUser } from "@/lib/admin-permissions";
import { redirect } from "next/navigation";
import "@/styles/admin-design-system.css";
import { ToastProvider } from "@/components/admin/Toast";
import { ToastContainer } from "@/components/admin/ToastContainer";

// Toast provider wrapper component
function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let adminUser = null;
  let authError: string | null = null;

  // Robust auth with try-catch to prevent crashes
  try {
    adminUser = await getAdminUser();
  } catch (error) {
    console.error("Admin auth error:", error);
    authError = "Failed to verify authentication. Please try again.";
  }

  // Auth verification failed
  if (authError) {
    return (
      <ToastProviderWrapper>
        <AdminSidebar userRole={null} />
        <div className="min-h-screen lg:pl-60 admin-section" style={{ backgroundColor: "var(--admin-bg)" }}>
          <AdminAccessDenied message={authError} />
        </div>
      </ToastProviderWrapper>
    );
  }

  // Not authenticated
  if (!adminUser) {
    return (
      <ToastProviderWrapper>
        <AdminSidebar userRole={null} />
        <div className="min-h-screen lg:pl-60 admin-section" style={{ backgroundColor: "var(--admin-bg)" }}>
          <AdminAccessDenied message="Your account does not have admin access." />
        </div>
      </ToastProviderWrapper>
    );
  }

  // Must change password
  if (adminUser.must_change_password) {
    redirect("/change-password");
  }

  return (
    <ToastProviderWrapper>
      <AdminSidebar userRole={adminUser.role} />
      <div className="min-h-screen lg:pl-60 admin-section" style={{ backgroundColor: "var(--admin-bg)" }}>
        {children}
      </div>
    </ToastProviderWrapper>
  );
}