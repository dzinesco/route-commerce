import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminLookupPage from "@/components/route-trace/AdminLookupPage";
import RouteTraceNav from "@/components/route-trace/RouteTraceNav";

export default async function LookupPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const enabled = await isFeatureEnabled(effectiveBrandId, "route_trace");
  if (!enabled) redirect("/admin/settings/apps?reason=route_trace");

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-100">Lookup</h1>
          <p className="mt-1 text-sm text-zinc-500">Find lots by lot number or crop type</p>
        </div>
        <RouteTraceNav activeTab="lookup" />
        <AdminLookupPage brandId={effectiveBrandId} />
      </div>
    </div>
  );
}