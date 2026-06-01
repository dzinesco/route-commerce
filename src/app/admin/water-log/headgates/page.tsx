import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getWaterHeadgatesAdmin, regenerateHeadgateToken } from "@/actions/water-log/admin";
import HeadgatesManager from "./HeadgatesManager";

export const dynamic = "force-dynamic";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export default async function HeadgatesPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const isAuthorized =
    adminUser?.role === "platform_admin" ||
    (adminUser?.brand_id === TUXEDO_BRAND_ID && adminUser?.can_manage_water_log);

  if (!isAuthorized) redirect("/admin/water-log");

  const headgates = await getWaterHeadgatesAdmin(TUXEDO_BRAND_ID);

  return <HeadgatesManager initialHeadgates={headgates} brandId={TUXEDO_BRAND_ID} />;
}