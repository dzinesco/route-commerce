import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import WholesaleClient from "./WholesaleClient";

export default async function WholesalePage() {
  const cookieStore = await cookies();
  const devSession = cookieStore.get("dev_session")?.value;
  const isDevMode =
    devSession === "platform_admin" ||
    devSession === "brand_admin" ||
    devSession === "store_employee";

  if (!isDevMode) {
    const adminUser = await getAdminUser();
    if (!adminUser) redirect("/login");
    const activeBrandId = await getActiveBrandId(adminUser);
    return <WholesaleClient brandId={activeBrandId ?? ""} />;
  }

  // Dev mode: platform_admin sees all brands, use first brand as default
  const brandId = devSession === "platform_admin" ? "" : (cookieStore.get("dev_brand_id")?.value ?? "64294306-5f42-463d-a5e8-2ad6c81a96de");
  return <WholesaleClient brandId={brandId} />;
}