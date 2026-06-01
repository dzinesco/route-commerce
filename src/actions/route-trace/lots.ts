"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PAT = process.env.SUPABASE_PAT!;

async function adminFetch(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${endpoint}`, {
    ...options,
    headers: {
      ...svcHeaders(SUPABASE_PAT),
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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

export async function getRouteTraceLots(brandId: string, status?: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const data = await adminFetch("get_harvest_lots", {
      method: "POST",
      body: JSON.stringify({ p_brand_id: effectiveBrandId, p_status: status ?? null }),
    });
    return { success: true, lots: data };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function getRouteTraceLotDetail(lotId: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };

  try {
    const data = await adminFetch("get_harvest_lot_detail", {
      method: "POST",
      body: JSON.stringify({ p_lot_id: lotId }),
    });
    if (!data || data.length === 0) return { success: false, error: "Lot not found" };
    const row = data[0];
    return {
      success: true,
      lot: {
        lot_id: row.lot_id,
        lot_number: row.lot_number,
        crop_type: row.crop_type,
        variety: row.variety ?? null,
        harvest_date: row.harvest_date,
        field_location: row.field_location,
        worker_name: row.worker_name,
        packer_name: row.packer_name ?? null,
        quantity_lbs: row.quantity_lbs,
        quantity_used_lbs: row.quantity_used_lbs ?? null,
        status: row.status,
        notes: row.notes,
        source_stop_id: row.source_stop_id,
        destination_stop_id: row.destination_stop_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        bin_id: row.bin_id ?? null,
        container_id: row.container_id ?? null,
        field_block: row.field_block ?? null,
        pallets: row.pallets ?? null,
        yield_estimate_lbs: row.yield_estimate_lbs ?? null,
        yield_unit: row.yield_unit ?? null,
        events: row.events ?? [],
      },
    };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
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
  data: CreateLotData
) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const result = await adminFetch("create_harvest_lot", {
      method: "POST",
      body: JSON.stringify({
        p_brand_id: effectiveBrandId,
        p_crop_type: data.crop_type,
        p_variety: data.variety ?? null,
        p_harvest_date: data.harvest_date,
        p_field_location: data.field_location ?? null,
        p_worker_name: data.worker_name ?? null,
        p_packer_name: data.packer_name ?? null,
        p_quantity_lbs: data.quantity_lbs ?? null,
        p_notes: data.notes ?? null,
        p_destination_stop_id: data.destination_stop_id ?? null,
        p_admin_id: adminUser.id ?? null,
        p_bin_id: data.bin_id ?? null,
        p_container_id: data.container_id ?? null,
        p_field_block: data.field_block ?? null,
        p_yield_estimate_lbs: data.yield_estimate_lbs ?? null,
        p_yield_unit: data.yield_unit ?? null,
        p_pallets: data.pallets ?? null,
      }),
    });
    return { success: true, lot: result };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function updateHarvestLotStatus(
  lotId: string,
  status: string,
  location?: string,
  notes?: string,
  binId?: string
) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };

  try {
    const result = await adminFetch("update_harvest_lot_status", {
      method: "POST",
      body: JSON.stringify({
        p_lot_id: lotId,
        p_status: status,
        p_location: location ?? null,
        p_notes: notes ?? null,
        p_admin_id: adminUser.id ?? null,
        ...(binId ? { p_bin_id: binId } : {}),
      }),
    });
    return { success: true, lot: result };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function getRouteTraceStats(brandId: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const data = await adminFetch("get_route_trace_stats", {
      method: "POST",
      body: JSON.stringify({ p_brand_id: effectiveBrandId }),
    });
    if (!data || data.length === 0) {
      return { success: true, stats: { active_count: 0, in_transit_count: 0, at_shed_count: 0, total_lots_today: 0, total_harvested_today: 0 } };
    }
    return { success: true, stats: data[0] };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function searchHarvestLots(brandId: string, query: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const data = await adminFetch("search_harvest_lots", {
      method: "POST",
      body: JSON.stringify({ p_brand_id: effectiveBrandId, p_query: query }),
    });
    return { success: true, lots: data };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function getTraceChain(lotId: string) {
  try {
    const data = await adminFetch("get_trace_chain", {
      method: "POST",
      body: JSON.stringify({ p_lot_id: lotId }),
    });
    return { success: true, chain: data };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function getHarvestLotsReadyToHaul(brandId: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const data = await adminFetch("get_harvest_lots_ready_to_haul", {
      method: "POST",
      body: JSON.stringify({ p_brand_id: effectiveBrandId }),
    });
    return { success: true, lots: data };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function getFieldYieldSummary(brandId: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const data = await adminFetch("get_field_yield_summary", {
      method: "POST",
      body: JSON.stringify({ p_brand_id: effectiveBrandId }),
    });
    return { success: true, summary: data };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function getLotOrders(lotId: string): Promise<{ success: true; orders: LotOrder[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };

  try {
    const data = await adminFetch("get_lot_orders", {
      method: "POST",
      body: JSON.stringify({ p_lot_id: lotId }),
    });
    return { success: true, orders: data ?? [] };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export interface InventoryByCrop {
  crop_type: string;
  status: string;
  total_lbs: number;
  total_estimate: number;
  lot_count: number;
  yield_unit: string | null;
}

export async function getInventoryByCrop(brandId: string): Promise<{ success: true; inventory: InventoryByCrop[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const data = await adminFetch("get_inventory_by_crop", {
      method: "POST",
      body: JSON.stringify({ p_brand_id: effectiveBrandId }),
    });
    return { success: true, inventory: data ?? [] };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function markLotUsedInOrder(
  lotId: string,
  orderId: string,
  quantityToAdd?: number,
  notes?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };

  try {
    await adminFetch("mark_lot_used_in_order", {
      method: "POST",
      body: JSON.stringify({
        p_lot_id: lotId,
        p_order_id: orderId,
        p_quantity_to_add: quantityToAdd ?? null,
        p_notes: notes ?? null,
        p_admin_id: adminUser.id ?? null,
      }),
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}

export async function getRecentLotEvents(
  brandId: string,
  limit = 10
): Promise<{ success: true; events: RecentLotEvent[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Unauthorized" };
  const effectiveBrandId = brandId ?? adminUser.brand_id ?? undefined;
  if (!effectiveBrandId) return { success: false, error: "No brand" };

  try {
    const data = await adminFetch("get_recent_lot_events", {
      method: "POST",
      body: JSON.stringify({ p_brand_id: effectiveBrandId, p_limit: limit }),
    });
    return { success: true, events: data ?? [] };
  } catch (e: unknown) {
    return { success: false, error: String(e) };
  }
}