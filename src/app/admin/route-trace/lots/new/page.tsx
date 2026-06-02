import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import LotCreateForm from "@/components/route-trace/LotCreateForm";
import RouteTraceNav from "@/components/route-trace/RouteTraceNav";

export const metadata = {
  title: "Create New Lot | Route Trace",
  description: "Create a new harvest lot for traceability tracking. Record crop type, field location, worker, quantity, and harvest date.",
  keywords: ["create lot", "new lot", "harvest entry", "lot creation", "traceability", "harvest tracking"],
};

export default async function NewLotPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const cookieStore = await cookies();
  const devSession = cookieStore.get("dev_session")?.value;
  const isDevMode = !!devSession;

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const enabled = isDevMode ? true : await isFeatureEnabled(effectiveBrandId, "route_trace");
  if (!enabled) redirect("/admin/settings/apps?reason=route_trace");

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <a href="/admin/route-trace/lots" className="text-sm text-stone-500 hover:text-stone-700">← Back to Lots</a>
        </div>
        <RouteTraceNav activeTab="lots" />
        <LotCreateForm brandId={effectiveBrandId} />
      </div>
    </div>
  );
}