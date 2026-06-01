import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getRouteTraceLots } from "@/actions/route-trace/lots";
import RouteTraceNav from "@/components/route-trace/RouteTraceNav";
import LotListTable from "@/components/route-trace/LotListTable";
import Link from "next/link";

export default async function LotsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const enabled = await isFeatureEnabled(effectiveBrandId, "route_trace");
  if (!enabled) redirect("/admin/settings/apps?reason=route_trace");

  const result = await getRouteTraceLots(effectiveBrandId);
  const lots = result.success ? result.lots : [];

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Lots</h1>
            <p className="mt-1 text-sm text-zinc-500">{lots.length} lot{lots.length !== 1 ? "s" : ""} total</p>
          </div>
          <Link
            href="/admin/route-trace/lots/new"
            className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            + New Lot
          </Link>
        </div>
        <RouteTraceNav activeTab="lots" />
        <LotListTable initialLots={lots} brandId={effectiveBrandId} />
      </div>
    </div>
  );
}