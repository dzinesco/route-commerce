import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getRouteTraceLotDetail, getLotOrders } from "@/actions/route-trace/lots";
import LotDetailPanel from "@/components/route-trace/LotDetailPanel";
import RouteTraceNav from "@/components/route-trace/RouteTraceNav";

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const enabled = await isFeatureEnabled(effectiveBrandId, "route_trace");
  if (!enabled) redirect("/admin/settings/apps?reason=route_trace");

  const [detailResult, ordersResult] = await Promise.all([
    getRouteTraceLotDetail(id),
    getLotOrders(id),
  ]);

  if (!detailResult.success || !detailResult.lot) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-red-200 bg-zinc-900 p-6 text-center">
            <p className="text-red-600">Lot not found</p>
            <a href="/admin/route-trace/lots" className="mt-3 inline-block text-sm text-blue-400 hover:underline">← Back to Lots</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <a href="/admin/route-trace/lots" className="text-sm text-zinc-500 hover:text-zinc-300">← Back to Lots</a>
        </div>
        <RouteTraceNav activeTab="lots" />
        <LotDetailPanel
          lot={detailResult.lot}
          brandId={effectiveBrandId}
          orders={ordersResult.success ? ordersResult.orders : []}
        />
      </div>
    </div>
  );
}