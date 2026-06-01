import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import LotCreateForm from "@/components/route-trace/LotCreateForm";
import RouteTraceNav from "@/components/route-trace/RouteTraceNav";

export default async function NewLotPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const enabled = await isFeatureEnabled(effectiveBrandId, "route_trace");
  if (!enabled) redirect("/admin/settings/apps?reason=route_trace");

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <a href="/admin/route-trace/lots" className="text-sm text-zinc-500 hover:text-zinc-300">← Back to Lots</a>
        </div>
        <RouteTraceNav activeTab="lots" />
        <LotCreateForm brandId={effectiveBrandId} />
      </div>
    </div>
  );
}