import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getRouteTraceStats,
  getRouteTraceLots,
  getHarvestLotsReadyToHaul,
  getFieldYieldSummary,
  getInventoryByCrop,
  getRecentLotEvents,
} from "@/actions/route-trace/lots";
import RouteTracePage from "@/components/route-trace/RouteTracePage";

export const metadata = {
  title: "Route Trace | Harvest Traceability Dashboard",
  description: "Track produce lots from field to delivery. Manage harvest events, hauling logistics, inventory by crop, and FSMA compliance reporting for fresh produce distribution.",
  keywords: ["route trace", "harvest traceability", "lot tracking", "farm to fork", "FSMA compliance", "food safety", "produce distribution", "haul tracking", "inventory management"],
  openGraph: {
    title: "Route Trace | Harvest Traceability",
    description: "Complete lot traceability from field to delivery with real-time tracking and FSMA compliance.",
    type: "website",
  },
};

// Route Trace icon component
const Icons = {
  routeTrace: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 5 5-9" />
      <circle cx="7" cy="16" r="1.5" fill="currentColor" />
      <circle cx="11" cy="8" r="1.5" fill="currentColor" />
      <circle cx="15" cy="13" r="1.5" fill="currentColor" />
      <circle cx="20" cy="4" r="1.5" fill="currentColor" />
    </svg>
  ),
};

export default async function RouteTraceDashboardPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const cookieStore = await cookies();
  const devSession = cookieStore.get("dev_session")?.value;
  const isDevMode = !!devSession;

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  // Bypass feature check in dev mode (dev_session cookie present)
  const enabled = isDevMode ? true : await isFeatureEnabled(effectiveBrandId, "route_trace");
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
    <main className="min-h-screen bg-[var(--admin-bg)] relative">
      {/* Subtle decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-50/30 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-gradient-to-tr from-amber-50/20 via-transparent to-transparent rounded-full blur-2xl" />
      </div>
      
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 mb-4 sm:mb-6">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                {Icons.routeTrace("h-5 w-5 sm:h-6 sm:w-6 text-white")}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--admin-text-primary)] tracking-tight">Route Trace</h1>
                <p className="text-xs sm:text-sm text-[var(--admin-text-muted)]">Field-to-delivery lot traceability</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
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
      </div>
    </main>
  );
}