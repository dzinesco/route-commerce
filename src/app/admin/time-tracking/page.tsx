import TimeTrackingAdminPanel from "@/components/admin/TimeTrackingAdminPanel";
import { getAdminUser } from "@/lib/admin-permissions";
import { redirect } from "next/navigation";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";

export const dynamic = "force-dynamic";

export default async function AdminTimeTrackingPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const isPlatformAdmin = adminUser.role === "platform_admin";
  const isTuxedoAdmin = adminUser.role === "brand_admin" && adminUser.brand_id === TUXEDO_BRAND_ID;
  const isIRDAdmin = adminUser.role === "brand_admin" && adminUser.brand_id === IRD_BRAND_ID;

  if (!isPlatformAdmin && !isTuxedoAdmin && !isIRDAdmin) {
    redirect("/admin/pickup");
  }

  const effectiveBrandId = adminUser.brand_id ?? TUXEDO_BRAND_ID;

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <TimeTrackingAdminPanel brandId={effectiveBrandId} />
      </div>
    </main>
  );
}