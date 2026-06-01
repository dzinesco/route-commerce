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

export interface InventoryByCrop {
  crop_type: string;
  status: string;
  total_lbs: number;
  total_estimate: number;
  lot_count: number;
  yield_unit: string | null;
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
