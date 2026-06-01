import WaterLogAdminPanel from "@/components/admin/WaterLogAdminPanel";
import { getAdminUser } from "@/lib/admin-permissions";
import { getWaterIrrigators, getWaterHeadgatesAdmin, getWaterEntries } from "@/actions/water-log/admin";
import { redirect } from "next/navigation";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export const dynamic = "force-dynamic";

export default async function AdminWaterLogPage() {
  const adminUser = await getAdminUser();

  const isAuthorized =
    adminUser?.role === "platform_admin" ||
    (adminUser?.role === "brand_admin" &&
      adminUser?.brand_id === TUXEDO_BRAND_ID &&
      adminUser?.can_manage_water_log);

  if (!isAuthorized) {
    redirect("/admin/pickup");
  }

  const brandId = TUXEDO_BRAND_ID;

  const [users, headgates, entries] = await Promise.all([
    getWaterIrrigators(brandId),
    getWaterHeadgatesAdmin(brandId),
    getWaterEntries(brandId, 50),
  ]);

  return (
    <WaterLogAdminPanel
      initialUsers={users}
      initialHeadgates={headgates}
      initialEntries={entries}
      brandId={brandId}
      canManage={isAuthorized}
    />
  );
}