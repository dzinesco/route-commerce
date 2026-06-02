/**
 * Route Trace data fetching utilities
 * Shared data fetching for all route-trace pages
 */

import {
  getRouteTraceStats,
  getRouteTraceLots,
  getHarvestLotsReadyToHaul,
  getFieldYieldSummary,
  getInventoryByCrop,
  getRecentLotEvents,
  type RouteTraceStats,
  type HaulingLot,
  type FieldYieldSummary,
  type InventoryByCrop,
  type RecentLotEvent,
} from "@/actions/route-trace/lots";

export type RouteTraceData = {
  stats: RouteTraceStats;
  lots: HaulingLot[];
  haulingLots: HaulingLot[];
  fieldYield: FieldYieldSummary[];
  inventoryByCrop: InventoryByCrop[];
  recentActivity: RecentLotEvent[];
};

/**
 * Fetch all route-trace data for a brand
 */
export async function fetchRouteTraceData(
  brandId: string
): Promise<RouteTraceData> {
  const [statsResult, lotsResult, haulingResult, yieldResult, invResult, eventsResult] = await Promise.all([
    getRouteTraceStats(brandId),
    getRouteTraceLots(brandId),
    getHarvestLotsReadyToHaul(brandId),
    getFieldYieldSummary(brandId),
    getInventoryByCrop(brandId),
    getRecentLotEvents(brandId, 10),
  ]);

  return {
    stats: statsResult.success ? statsResult.stats : {
      active_count: 0,
      in_transit_count: 0,
      at_shed_count: 0,
      total_lots_today: 0,
      total_harvested_today: 0,
      total_lots: 0,
    },
    lots: lotsResult.success ? lotsResult.lots : [],
    haulingLots: haulingResult.success ? haulingResult.lots : [],
    fieldYield: yieldResult.success ? yieldResult.summary : [],
    inventoryByCrop: invResult.success ? invResult.inventory : [],
    recentActivity: eventsResult.success ? eventsResult.events : [],
  };
}