import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { listBrandsForAdmin } from "@/actions/brands";
import { redirect } from "next/navigation";
import "@/styles/admin-design-system.css";
import { ToastProvider } from "@/components/admin/Toast";
import { ToastContainer } from "@/components/admin/ToastContainer";

// Admin layout calls getAdminUser() which reads cookies(). Without this,
// Next.js tries to prerender the entire /admin/* tree statically and the
// first page that hits cookies() aborts the build with DYNAMIC_SERVER_USAGE.
export const dynamic = "force-dynamic";

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

  // Resolve the active brand (URL > cookie > legacy > first of brand_ids).
  // Wrapped in try/catch so a transient brand-resolution failure can't
  // crash the whole admin shell — we fall back to null (no active brand).
  let activeBrandId: string | null = null;
  try {
    activeBrandId = await getActiveBrandId(adminUser);
  } catch (err) {
    console.error("[admin/layout] getActiveBrandId failed:", err);
  }

  // Fetch accessible brands for the sidebar BrandSelector. Wrapped in
  // try/catch so the sidebar renders empty rather than crashing the page
  // if the brands query fails.
  let brands: Awaited<ReturnType<typeof listBrandsForAdmin>> = [];
  try {
    brands = await listBrandsForAdmin();
  } catch (err) {
    console.error("[admin/layout] listBrandsForAdmin failed:", err);
  }

  return (
    <ToastProviderWrapper>
      <AdminSidebar
        userRole={adminUser.role}
        brandIds={adminUser.brand_ids}
        activeBrandId={activeBrandId}
        brands={brands}
      />
      <div className="min-h-screen lg:pl-60 admin-section" style={{ backgroundColor: "var(--admin-bg)" }}>
        {children}
      </div>
    </ToastProviderWrapper>
  );
}
