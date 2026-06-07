"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId, assertBrandAccess } from "@/lib/brand-scope";

// TODO(migration): the `harvest_lots` / `harvest_lot_events` / `lot_orders`
// tables from the route-trace feature (defined across
// supabase/migrations/143_enable_route_trace.sql and friends) were retired
// from the SaaS rebuild — they don't exist in `db/schema/`. The functions
// below all return empty results so the public trace page and FSMA reports
// 404 gracefully. If route-trace comes back, re-introduce the tables in
// `db/schema/` and replace these stubs with real Drizzle queries.

export interface HarvestLot {
  id: string;
  brand_id: string;
  lot_number: string;
  crop_type: string;
  variety: string | null;
  harvest_date: string;
  field_location: string | null;
  worker_name: string | null;
  packer_name: string | null;
  quantity_lbs: number | null;
  quantity_used_lbs: number | null;
  status: "active" | "in_transit" | "at_shed" | "packed" | "delivered";
  notes: string | null;
  source_stop_id: string | null;
  destination_stop_id: string | null;
  created_at: string;
  updated_at: string;
  bin_id: string | null;
  container_id: string | null;
  field_block: string | null;
  pallets: number | null;
  yield_estimate_lbs: number | null;
  yield_unit: string | null;
}

export interface LotEvent {
  id: string;
  event_type: string;
  event_time: string;
  location: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  bin_id: string | null;
}

export interface LotDetail {
  lot_id: string;
  lot_number: string;
  crop_type: string;
  variety: string | null;
  harvest_date: string;
  field_location: string | null;
  worker_name: string | null;
  packer_name: string | null;
  quantity_lbs: number | null;
  quantity_used_lbs: number | null;
  status: string;
  notes: string | null;
  source_stop_id: string | null;
  destination_stop_id: string | null;
  created_at: string;
  updated_at: string;
  bin_id: string | null;
  container_id: string | null;
  field_block: string | null;
  pallets: number | null;
  yield_estimate_lbs: number | null;
  yield_unit: string | null;
  events: LotEvent[];
}

export interface RouteTraceStats {
  active_count: number;
  in_transit_count: number;
  at_shed_count: number;
  total_lots_today: number;
  total_harvested_today: number;
  total_lots: number;
}

export interface RecentLotEvent {
  event_id: string;
  event_type: string;
  event_time: string;
  location: string | null;
  bin_id: string | null;
  notes: string | null;
  created_by_name: string | null;
  lot_id: string;
  lot_number: string;
  crop_type: string;
  status: string;
}

export interface LotOrder {
  id: string;
  customer_name: string;
  order_date: string;
  stop_name: string;
  item_quantity: number | null;
  item_notes: string | null;
  fulfillment: string | null;
  lot_quantity_used: number | null;
}

export interface TraceChain {
  lot: HarvestLot;
  events: LotEvent[];
  orders: Array<{ id: string; customer_name: string; order_date: string; stop_name: string }>;
}

export interface HaulingLot {
  lot_id: string;
  lot_number: string;
  crop_type: string;
  harvest_date: string;
  status: string;
  field_location: string | null;
  worker_name: string | null;
  quantity_lbs: number | null;
  yield_unit: string | null;
  bin_id: string | null;
  container_id: string | null;
  field_block: string | null;
  pallets: number | null;
  destination_stop_id: string | null;
  destination_stop_name: string | null;
  destination_stop_time: string | null;
}

export interface FieldYieldSummary {
  field_location: string;
  field_block: string;
  total_yield_estimate: number;
  total_quantity_lbs: number;
  active_lots: number;
  yield_unit: string | null;
}

// Discriminated unions so TypeScript narrows correctly for consumer patterns:
// - `result.success ? result.X : defaultValue` (X is defined on success)
// - `if (result.success && result.X) { ... } else { result.error }` (error readable in else)
type LotsResult =
  | { success: true; lots: HaulingLot[]; error: null }
  | { success: false; lots: null; error: string };
type HarvestLotsResult =
  | { success: true; lots: HarvestLot[]; error: null }
  | { success: false; lots: null; error: string };
type StatsResult =
  | { success: true; stats: RouteTraceStats; error: null }
  | { success: false; stats: null; error: string };
type LotDetailResult =
  | { success: true; lot: LotDetail; error: null }
  | { success: false; lot: null; error: string };
type CreatedLotResult =
  | { success: true; lot: HarvestLot; error: null }
  | { success: false; lot: null; error: string };
type UpdatedLotResult =
  | { success: true; lot: HarvestLot | null; error: null }
  | { success: false; lot: null; error: string };
type InventoryResult =
  | { success: true; inventory: InventoryByCrop[]; error: null }
  | { success: false; inventory: null; error: string };
type YieldResult =
  | { success: true; summary: FieldYieldSummary[]; error: null }
  | { success: false; summary: null; error: string };
type EventsResult =
  | { success: true; events: RecentLotEvent[]; error: null }
  | { success: false; events: null; error: string };
type OrdersResult =
  | { success: true; orders: LotOrder[]; error: null }
  | { success: false; orders: null; error: string };
type ChainResult =
  | { success: true; chain: TraceChain; error: null }
  | { success: false; chain: null; error: string };

async function assertCanAccessBrand(brandId: string): Promise<
  { ok: true; adminUser: NonNullable<Awaited<ReturnType<typeof getAdminUser>>> } | { ok: false; error: string }
> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { ok: false, error: "Unauthorized" };
  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { ok: false, error: "Brand access required" };
  }
  if (activeBrandId) {
    try {
      assertBrandAccess(adminUser, activeBrandId);
    } catch {
      return { ok: false, error: "Brand access denied" };
    }
  }
  return { ok: true, adminUser };
}

export async function getRouteTraceLots(brandId: string, _status?: string): Promise<LotsResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, lots: null, error: auth.error };
  return { success: true, lots: [], error: null };
}

export async function getRouteTraceLotDetail(_lotId: string): Promise<LotDetailResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, lot: null, error: "Unauthorized" };
  return { success: false, lot: null, error: "Route-trace feature not configured" };
}

export interface CreateLotData {
  crop_type: string;
  variety?: string;
  harvest_date: string;
  field_location?: string;
  worker_name?: string;
  packer_name?: string;
  quantity_lbs?: number;
  notes?: string;
  destination_stop_id?: string;
  bin_id?: string;
  container_id?: string;
  field_block?: string;
  yield_estimate_lbs?: number;
  yield_unit?: string;
  pallets?: number;
}

export async function createHarvestLot(
  brandId: string,
  _data: CreateLotData
): Promise<CreatedLotResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, lot: null, error: auth.error };
  return { success: false, lot: null, error: "Route-trace feature not configured" };
}

export async function updateHarvestLotStatus(
  _lotId: string,
  _status: string,
  _location?: string,
  _notes?: string,
  _binId?: string
): Promise<UpdatedLotResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, lot: null, error: "Unauthorized" };
  return { success: false, lot: null, error: "Route-trace feature not configured" };
}

export async function getRouteTraceStats(brandId: string): Promise<StatsResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, stats: null, error: auth.error };
  return {
    success: true,
    stats: {
      active_count: 0,
      in_transit_count: 0,
      at_shed_count: 0,
      total_lots_today: 0,
      total_harvested_today: 0,
      total_lots: 0,
    },
    error: null,
  };
}

export async function searchHarvestLots(brandId: string, _query: string): Promise<HarvestLotsResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, lots: null, error: auth.error };
  return { success: true, lots: [], error: null };
}

export async function getTraceChain(_lotId: string): Promise<ChainResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, chain: null, error: "Unauthorized" };
  return { success: false, chain: null, error: "Route-trace feature not configured" };
}

export async function getHarvestLotsReadyToHaul(brandId: string): Promise<LotsResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, lots: null, error: auth.error };
  return { success: true, lots: [], error: null };
}

export async function getFieldYieldSummary(brandId: string): Promise<YieldResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, summary: null, error: auth.error };
  return { success: true, summary: [], error: null };
}

export async function getLotOrders(_lotId: string): Promise<OrdersResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, orders: null, error: "Unauthorized" };
  return { success: true, orders: [], error: null };
}

export interface InventoryByCrop {
  crop_type: string;
  status: string;
  total_lbs: number;
  total_estimate: number;
  lot_count: number;
  yield_unit: string | null;
}

export async function getInventoryByCrop(brandId: string): Promise<InventoryResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, inventory: null, error: auth.error };
  return { success: true, inventory: [], error: null };
}

export async function markLotUsedInOrder(
  _lotId: string,
  _orderId: string,
  _quantityToAdd?: number,
  _notes?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  return { success: false, error: "Route-trace feature not configured" };
}

export async function getRecentLotEvents(
  brandId: string,
  _limit = 10
): Promise<EventsResult> {
  const auth = await assertCanAccessBrand(brandId);
  if (!auth.ok) return { success: false, events: null, error: auth.error };
  return { success: true, events: [], error: null };
}

/**
 * Look up a harvest lot by its public-facing lot number (e.g. "FL-2026-001").
 * Returns the lot's UUID or `null` if no such lot exists.
 *
 * NOTE: the `harvest_lots` table is not in the new Drizzle schema (it's a
 * niche traceability feature that was retired from the SaaS rebuild). This
 * stub returns `null` so the public trace page gracefully 404s. If the
 * feature comes back, re-introduce the table in `db/schema/` and replace
 * this with a real Drizzle query.
 */
export async function getLotIdByNumber(_lotNumber: string): Promise<string | null> {
  return null;
}
