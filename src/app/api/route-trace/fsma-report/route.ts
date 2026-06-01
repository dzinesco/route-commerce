import { svcHeaders } from "@/lib/svc-headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PAT = process.env.SUPABASE_PAT!;

type LotRow = {
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
};

type EventRow = {
  lot_id: string;
  event_type: string;
  event_time: string;
  location: string | null;
  notes: string | null;
  bin_id: string | null;
  created_by_name: string | null;
};

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!brandId || !startDate || !endDate) {
    return new Response("Missing brandId, startDate, or endDate", { status: 400 });
  }

  const lotsRaw = await adminFetchJson("get_lots_for_period", {
    p_brand_id: brandId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  const lots: LotRow[] = (lotsRaw ?? []) as LotRow[];
  if (!lots || lots.length === 0) {
    return new Response("No lots found for this period", { status: 404 });
  }

  const lotIds = lots.map((l) => l.lot_id);
  const eventsRaw = await adminFetchJson("get_events_for_lots", { p_lot_ids: lotIds });
  const allEvents: EventRow[] = (eventsRaw ?? []) as EventRow[];

  const eventsByLot: Record<string, EventRow[]> = {};
  for (const evt of allEvents) {
    if (!eventsByLot[evt.lot_id]) eventsByLot[evt.lot_id] = [];
    eventsByLot[evt.lot_id].push(evt);
  }

  const lines: string[] = [];

  lines.push("FSMA FOOD SAFETY MODERNIZATION ACT — Produce Traceability Report");
  lines.push(`Brand ID,${brandId}`);
  lines.push(`Report Period,${startDate} to ${endDate}`);
  lines.push(`Generated,${new Date().toLocaleString("en-US")}`);
  lines.push(`Total Lots,${lots.length}`);
  lines.push("");

  const totalQty = lots.reduce((s, l) => s + (l.quantity_lbs ?? 0), 0);
  const totalUsed = lots.reduce((s, l) => s + (l.quantity_used_lbs ?? 0), 0);
  const crops = [...new Set(lots.map((l) => l.crop_type))];
  const units = [...new Set(lots.map((l) => l.yield_unit ?? "lbs"))];
  const primaryUnit = units.length === 1 ? units[0] : "lbs";
  lines.push("SUMMARY");
  lines.push(`Total Lots Harvested,${lots.length}`);
  lines.push(`Total Weight (${primaryUnit}),${totalQty.toLocaleString()}`);
  lines.push(`Total Used (${primaryUnit}),${totalUsed.toLocaleString()}`);
  lines.push(`Remaining (${primaryUnit}),${(totalQty - totalUsed).toLocaleString()}`);
  lines.push(`Crop Types,"${crops.join(", ")}"`);
  lines.push(`Yield Unit,"${units.join(", ")}"`);
  lines.push(`Date Range,${startDate} to ${endDate}`);
  lines.push("");

  lines.push("ONE-UP / ONE-DOWN TRACEABILITY");
  lines.push("Lot Number,Crop,Variety,Harvest Date,Field,Block,Worker,Packer,Qty (lbs),Used (lbs),Remaining (lbs),Yield Est. (lbs),Yield Unit,Yield Variance %,Bin ID,Status,Event,Event Time,Location,Bin ID,Notes,Recorded By");

  for (const lot of lots) {
    const evts = eventsByLot[lot.lot_id] ?? [];
    const remaining = (lot.quantity_lbs ?? 0) - (lot.quantity_used_lbs ?? 0);
    if (evts.length === 0) {
      const yieldVariance = (lot.yield_estimate_lbs && lot.yield_estimate_lbs > 0)
        ? (((lot.quantity_lbs ?? 0) - lot.yield_estimate_lbs) / lot.yield_estimate_lbs * 100).toFixed(1)
        : "";
      lines.push(esc([
        lot.lot_number, lot.crop_type, lot.variety ?? "", lot.harvest_date ?? "",
        lot.field_location ?? "", lot.field_block ?? "", lot.worker_name ?? "",
        lot.packer_name ?? "", String(lot.quantity_lbs ?? ""),
        String(lot.quantity_used_lbs ?? ""), String(Math.max(0, remaining)),
        String(lot.yield_estimate_lbs ?? ""), lot.yield_unit ?? "",
        yieldVariance,
        lot.bin_id ?? "", lot.status ?? "",
        "—", "—", "—", "—", "—", "—",
      ]));
    } else {
      for (let i = 0; i < evts.length; i++) {
        const evt = evts[i];
        const evtTime = new Date(evt.event_time).toLocaleString("en-US", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        });
        const yieldVariance = (lot.yield_estimate_lbs && lot.yield_estimate_lbs > 0)
          ? (((lot.quantity_lbs ?? 0) - lot.yield_estimate_lbs) / lot.yield_estimate_lbs * 100).toFixed(1)
          : "";
        lines.push(esc([
          i === 0 ? lot.lot_number : "",
          i === 0 ? lot.crop_type : "",
          i === 0 ? (lot.variety ?? "") : "",
          i === 0 ? (lot.harvest_date ?? "") : "",
          i === 0 ? (lot.field_location ?? "") : "",
          i === 0 ? (lot.field_block ?? "") : "",
          i === 0 ? (lot.worker_name ?? "") : "",
          i === 0 ? (lot.packer_name ?? "") : "",
          i === 0 ? String(lot.quantity_lbs ?? "") : "",
          i === 0 ? String(lot.quantity_used_lbs ?? "") : "",
          i === 0 ? String(Math.max(0, remaining)) : "",
          i === 0 ? String(lot.yield_estimate_lbs ?? "") : "",
          i === 0 ? (lot.yield_unit ?? "") : "",
          i === 0 ? yieldVariance : "",
          i === 0 ? (lot.bin_id ?? "") : "",
          i === 0 ? (lot.status ?? "") : "",
          evt.event_type ?? "",
          evtTime,
          evt.location ?? "",
          evt.bin_id ?? "",
          (evt.notes ?? "").replace(/"/g, '""'),
          evt.created_by_name ?? "",
        ]));
      }
    }
  }

  lines.push("");
  lines.push("END OF REPORT");
  lines.push("Powered by Route Commerce — routecommerce.com");

  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="fsma-report-${startDate}-to-${endDate}.csv"`,
    },
  });
}

function esc(values: string[]): string {
  return values.map((v) => `"${v.replace(/"/g, '""')}"`).join(",");
}