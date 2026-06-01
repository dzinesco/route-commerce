import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import WaterAdminClient from "@/components/water/WaterAdminClient";

export const dynamic = "force-dynamic";

export default async function WaterAdminPage() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("wl_admin_session")?.value;
  if (!adminSession) {
    redirect("/water/admin/login");
  }

  return <WaterAdminClient />;
}