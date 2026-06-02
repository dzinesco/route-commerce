import TimeTrackingAdminPanel from "@/components/admin/TimeTrackingAdminPanel";
import { getAdminUser } from "@/lib/admin-permissions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/design-system";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";

export const dynamic = "force-dynamic";

export default async function AdminTimeTrackingPage() {
  const adminUser = await getAdminUser();
  
  // Dev session bypass for platform admin
  if (!adminUser) {
    const cookieStore = await cookies();
    const devSession = cookieStore.get("dev_session")?.value;
    if (devSession === "platform_admin" || devSession === "brand_admin") {
      // Allow access in dev mode
    } else {
      redirect("/login");
    }
  }

  const isPlatformAdmin = adminUser?.role === "platform_admin";
  const isTuxedoAdmin = adminUser?.role === "brand_admin" && adminUser?.brand_id === TUXEDO_BRAND_ID;
  const isIRDAdmin = adminUser?.role === "brand_admin" && adminUser?.brand_id === IRD_BRAND_ID;

  if (!isPlatformAdmin && !isTuxedoAdmin && !isIRDAdmin) {
    redirect("/admin/pickup");
  }

  const effectiveBrandId = adminUser?.brand_id ?? TUXEDO_BRAND_ID;

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <PageHeader
        title="Time Tracking"
        subtitle="Manage workers, tasks, and time logs"
        className="px-6 pt-6"
      />
      <div className="px-6 pb-8">
        <TimeTrackingAdminPanel brandId={effectiveBrandId} />
      </div>
    </div>
  );
}