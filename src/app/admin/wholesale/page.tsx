import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import WholesaleClient from "./WholesaleClient";

export default async function WholesalePage() {
  const cookieStore = await cookies();
  const devSession = cookieStore.get("dev_session")?.value;
  const isDevMode =
    devSession === "platform_admin" ||
    devSession === "brand_admin" ||
    devSession === "store_employee";

  if (!isDevMode) {
    const { getAdminUser } = await import("@/lib/admin-permissions");
    const adminUser = await getAdminUser();
    if (!adminUser) redirect("/login");
    return <WholesaleClient brandId={adminUser.brand_id ?? ""} />;
  }

  // Dev mode: platform_admin sees all brands, use first brand as default
  const brandId = devSession === "platform_admin" ? "" : (cookieStore.get("dev_brand_id")?.value ?? "64294306-5f42-463d-a5e8-2ad6c81a96de");
  return <WholesaleClient brandId={brandId} />;
}