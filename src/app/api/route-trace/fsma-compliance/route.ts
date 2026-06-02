import { svcHeaders } from "@/lib/svc-headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PAT = process.env.SUPABASE_PAT!;

interface LotRow {
  lot_id: string;
  lot_number: string;
  crop_type: string;
  variety: string | null;
  harvest_date: string;
  field_location: string | null;
  field_block: string | null;
  worker_name: string | null;
  packer_name: string | null;
  quantity_lbs: number | null;
  quantity_used_lbs: number | null;
  yield_estimate_lbs: number | null;
  yield_unit: string | null;
  bin_id: string | null;
  status: string;
}

interface EventRow {
  lot_id: string;
  event_type: string;
  event_time: string;
  location: string | null;
  notes: string | null;
  bin_id: string | null;
  created_by_name: string | null;
}

async function adminFetchJson(endpoint: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${endpoint}`, {
    method: "POST",
    headers: {
      ...svcHeaders(SUPABASE_PAT),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

function assessCompliance(lot: LotRow, eventCount: number): {
  compliance_status: "compliant" | "non_compliant" | "pending";
  issues: string[];
} {
  const issues: string[] = [];

  // Check for required traceability fields
  if (!lot.harvest_date) {
    issues.push("Missing harvest date");
  }
  if (!lot.field_location) {
    issues.push("Missing field location");
  }
  if (!lot.quantity_lbs || lot.quantity_lbs <= 0) {
    issues.push("Missing quantity");
  }

  // Check traceability chain
  if (eventCount === 0) {
    issues.push("No trace events");
  }

  // Check for worker/packer info
  if (!lot.worker_name && !lot.packer_name) {
    issues.push("No worker/packer info");
  }

  // Check yield variance
  if (lot.yield_estimate_lbs && lot.yield_estimate_lbs > 0 && lot.quantity_lbs) {
    const variance = Math.abs((lot.quantity_lbs - lot.yield_estimate_lbs) / lot.yield_estimate_lbs);
    if (variance > 0.2) {
      issues.push("High yield variance");
    }
  }

  // Determine compliance status
  let compliance_status: "compliant" | "non_compliant" | "pending";
  if (issues.length === 0) {
    compliance_status = "compliant";
  } else if (issues.some(i => i === "No trace events" || i === "Missing harvest date")) {
    compliance_status = "non_compliant";
  } else {
    compliance_status = "pending";
  }

  return { compliance_status, issues };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!brandId || !startDate || !endDate) {
    return new Response(JSON.stringify({ error: "Missing brandId, startDate, or endDate" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch all lots for the brand
  const allLots = await adminFetchJson("get_harvest_lots", {
    p_brand_id: brandId,
    p_status: null,
  });

  const lots: LotRow[] = (allLots ?? []) as LotRow[];

  // Filter by date range
  const filteredLots = lots.filter((lot) => {
    const harvestDate = lot.harvest_date;
    if (!harvestDate) return false;
    return harvestDate >= startDate && harvestDate <= endDate;
  });

  if (filteredLots.length === 0) {
    return new Response(
      JSON.stringify({
        lots: [],
        summary: {
          total_lots: 0,
          compliant: 0,
          non_compliant: 0,
          pending: 0,
          total_weight: 0,
          used_weight: 0,
          remaining_weight: 0,
          crops: [],
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch events for all lots
  const lotIds = filteredLots.map((l) => l.lot_id);
  const eventsRaw = await adminFetchJson("get_events_for_lots", { p_lot_ids: lotIds });
  const allEvents: EventRow[] = (eventsRaw ?? []) as EventRow[];

  // Group events by lot
  const eventsByLot: Record<string, EventRow[]> = {};
  for (const evt of allEvents) {
    if (!eventsByLot[evt.lot_id]) eventsByLot[evt.lot_id] = [];
    eventsByLot[evt.lot_id].push(evt);
  }

  // Process each lot for compliance
  const complianceLots = filteredLots.map((lot) => {
    const events = eventsByLot[lot.lot_id] ?? [];
    const { compliance_status, issues } = assessCompliance(lot, events.length);

    return {
      lot_id: lot.lot_id,
      lot_number: lot.lot_number,
      crop_type: lot.crop_type,
      variety: lot.variety,
      harvest_date: lot.harvest_date,
      field_location: lot.field_location,
      field_block: lot.field_block,
      worker_name: lot.worker_name,
      packer_name: lot.packer_name,
      quantity_lbs: lot.quantity_lbs,
      quantity_used_lbs: lot.quantity_used_lbs,
      yield_estimate_lbs: lot.yield_estimate_lbs,
      yield_unit: lot.yield_unit,
      bin_id: lot.bin_id,
      status: lot.status,
      event_count: events.length,
      has_traceability: events.length > 0,
      compliance_status,
      issues,
    };
  });

  // Calculate summary
  const summary = {
    total_lots: complianceLots.length,
    compliant: complianceLots.filter((l) => l.compliance_status === "compliant").length,
    non_compliant: complianceLots.filter((l) => l.compliance_status === "non_compliant").length,
    pending: complianceLots.filter((l) => l.compliance_status === "pending").length,
    total_weight: filteredLots.reduce((s, l) => s + (l.quantity_lbs ?? 0), 0),
    used_weight: filteredLots.reduce((s, l) => s + (l.quantity_used_lbs ?? 0), 0),
    remaining_weight: filteredLots.reduce(
      (s, l) => s + Math.max(0, (l.quantity_lbs ?? 0) - (l.quantity_used_lbs ?? 0)),
      0
    ),
    crops: [...new Set(filteredLots.map((l) => l.crop_type))],
  };

  return new Response(
    JSON.stringify({
      lots: complianceLots,
      summary,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}