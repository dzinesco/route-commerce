import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import RouteTracePage from "@/components/route-trace/RouteTracePage";
import {
  getRouteTraceStats,
  getRouteTraceLots,
  getHarvestLotsReadyToHaul,
  getFieldYieldSummary,
  getInventoryByCrop,
  getRecentLotEvents,
} from "@/actions/route-trace/lots";

export const metadata = {
  title: "Route Trace Settings",
  description: "Configure Route Trace traceability workflow settings, defaults, and add-on features for your produce distribution operation.",
  keywords: ["route trace settings", "traceability configuration", "FSMA settings", "traceability defaults"],
};

export default async function RouteTraceSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const enabled = await isFeatureEnabled(effectiveBrandId, "route_trace");
  if (!enabled) redirect("/admin/settings/apps?reason=route_trace");

  const [statsResult, lotsResult, haulingResult, yieldResult, invResult, eventsResult] = await Promise.all([
    getRouteTraceStats(effectiveBrandId),
    getRouteTraceLots(effectiveBrandId),
    getHarvestLotsReadyToHaul(effectiveBrandId),
    getFieldYieldSummary(effectiveBrandId),
    getInventoryByCrop(effectiveBrandId),
    getRecentLotEvents(effectiveBrandId, 10),
  ]);

  const stats = statsResult.success ? statsResult.stats : {
    active_count: 0, in_transit_count: 0, at_shed_count: 0, total_lots_today: 0, total_harvested_today: 0, total_lots: 0,
  };
  const recentLots = lotsResult.success ? lotsResult.lots.slice(0, 8) : [];
  const allLots = lotsResult.success ? lotsResult.lots : [];
  const haulingLots = haulingResult.success ? haulingResult.lots : [];
  const fieldYield = yieldResult.success ? yieldResult.summary : [];
  const inventoryByCrop = invResult.success ? invResult.inventory : [];
  const recentActivity = eventsResult.success ? eventsResult.events : [];

  return (
    <RouteTracePage
      stats={stats}
      recentLots={recentLots}
      haulingLots={haulingLots}
      fieldYield={fieldYield}
      inventoryByCrop={inventoryByCrop}
      recentActivity={recentActivity}
      brandId={effectiveBrandId}
      lots={allLots}
    />
  );
}