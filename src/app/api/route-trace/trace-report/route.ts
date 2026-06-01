import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { svcHeaders } from "@/lib/svc-headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PAT = process.env.SUPABASE_PAT!;

async function getLotWithChain(lotId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_harvest_lot_detail`, {
    method: "POST",
    headers: {
      ...svcHeaders(SUPABASE_PAT),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_lot_id: lotId }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] ?? null;
}

async function getLotOrders(lotId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_lot_orders`, {
    method: "POST",
    headers: {
      ...svcHeaders(SUPABASE_PAT),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_lot_id: lotId }),
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lotId = searchParams.get("lotId");
  const format = searchParams.get("format") ?? "csv";

  if (!lotId) return new Response("Missing lotId", { status: 400 });

  const lot = await getLotWithChain(lotId);
  if (!lot) return new Response("Lot not found", { status: 404 });

  const orders = await getLotOrders(lotId);

  if (format === "csv") {
    const lines: string[] = [];

    lines.push("ROUTE TRACE — Lot Traceability Report");
    lines.push("");
    lines.push("1. LOT INFORMATION");
    lines.push(`Lot Number,${lot.lot_number}`);
    lines.push(`Crop Type,${lot.crop_type}`);
    if (lot.variety) lines.push(`Variety,${lot.variety}`);
    lines.push(`Harvest Date,${lot.harvest_date}`);
    if (lot.field_location) lines.push(`Field / Location,${lot.field_location}`);
    if (lot.field_block) lines.push(`Field Block,${lot.field_block}`);
    if (lot.worker_name) lines.push(`Worker,${lot.worker_name}`);
    if (lot.packer_name) lines.push(`Packer,${lot.packer_name}`);
    if (lot.quantity_lbs != null) lines.push(`Quantity (${lot.yield_unit ?? "lbs"}),${lot.quantity_lbs}`);
    if (lot.yield_estimate_lbs != null) lines.push(`Yield Estimate (${lot.yield_unit ?? "lbs"}),${lot.yield_estimate_lbs}`);
    if (lot.bin_id) lines.push(`Bin ID,${lot.bin_id}`);
    if (lot.container_id) lines.push(`Container ID,${lot.container_id}`);
    if (lot.pallets != null) lines.push(`Pallets,${lot.pallets}`);
    lines.push(`Current Status,${lot.status}`);
    if (lot.yield_unit && lot.yield_unit !== "lbs") lines.push(`Yield Unit,${lot.yield_unit}`);
    if (lot.notes) lines.push(`Notes,"${lot.notes.replace(/"/g, '""')}"`);
    lines.push("");

    lines.push("2. TRACE TIMELINE (FSMA One-Up/One-Down)");
    lines.push("Event,Timestamp,Location,Bin ID,Notes,Recorded By");
    for (const evt of (lot.events ?? [])) {
      const ts = new Date(evt.event_time).toLocaleString("en-US", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
      lines.push(`${evt.event_type},${ts},${evt.location ?? ""},${evt.bin_id ?? ""},${(evt.notes ?? "").replace(/"/g, '""')},${evt.created_by_name ?? ""}`);
    }
    lines.push("");

    lines.push("3. ORDER FULFILLMENT");
    if (orders.length > 0) {
      lines.push("Order ID,Customer,Stop,Date,Qty (lbs),Fulfillment");
      for (const o of orders) {
        lines.push(`${o.id},${(o.customer_name ?? "").replace(/"/g, '""')},${(o.stop_name ?? "").replace(/"/g, '""')},${o.order_date},${o.item_quantity ?? ""},${o.fulfillment ?? ""}`);
      }
    } else {
      lines.push("No orders assigned.");
    }
    lines.push("");

    lines.push("4. COMPLIANCE SUMMARY");
    lines.push(`Total Events,${lot.events?.length ?? 0}`);
    lines.push(`Harvested By,${lot.worker_name ?? "Unknown"}`);
    lines.push(`Packed By,${lot.packer_name ?? "N/A"}`);
    lines.push(`Destination Stop,${lot.destination_stop_id ? `#${lot.destination_stop_id.slice(0, 8)}` : "N/A"}`);
    lines.push(`Report Generated,${new Date().toLocaleString("en-US")}`);
    lines.push("");
    lines.push("Powered by Route Commerce — routecommerce.com");

    const csv = lines.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${lot.lot_number}-trace-report.csv"`,
      },
    });
  }

  // PDF report
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0, 0, 0);
  const WHITE = rgb(1, 1, 1);
  const GREEN = rgb(0.133, 0.553, 0.133);
  const page = pdfDoc.addPage([612, 792]); // letter

  const L = 40;
  let y = 752;

  function heading(text: string, sz = 14) {
    page.drawText(text, { x: L, y, size: sz, font: fontBold, color: BLACK });
    y -= sz + 6;
  }
  function row(label: string, value: string, sz = 10) {
    page.drawText(label + ":", { x: L, y, size: sz, font, color: BLACK });
    page.drawText(value, { x: L + 140, y, size: sz, font: fontBold, color: BLACK });
    y -= sz + 4;
  }
  function sectionHeader(text: string) {
    page.drawRectangle({ x: L, y: y - 2, width: 532, height: 12, color: rgb(0.133, 0.133, 0.133) });
    page.drawText(text, { x: L + 4, y: y - 9, size: 9, font: fontBold, color: WHITE });
    y -= 20;
  }

  // Header
  page.drawRectangle({ x: 0, y: 754, width: 612, height: 38, color: rgb(0.133, 0.4, 0.2) });
  page.drawText("ROUTE TRACE", { x: L, y: 760, size: 20, font: fontBold, color: WHITE });
  page.drawText("Lot Traceability Report", { x: L + 160, y: 764, size: 10, font, color: WHITE });
  page.drawText(lot.lot_number, { x: L + 320, y: 758, size: 16, font: fontBold, color: WHITE });
  y = 738;

  // Section 1: Lot Info
  sectionHeader("1. LOT INFORMATION");
  row("Crop Type", lot.crop_type, 12);
  if (lot.variety) row("Variety", lot.variety);
  row("Harvest Date", lot.harvest_date);
  if (lot.field_location) row("Field / Location", lot.field_location);
  if (lot.field_block) row("Field Block", lot.field_block);
  if (lot.worker_name) row("Worker", lot.worker_name);
  if (lot.packer_name) row("Packer", lot.packer_name);
  if (lot.quantity_lbs != null) row(`Quantity (${lot.yield_unit ?? "lbs"})`, lot.quantity_lbs.toLocaleString());
  if (lot.yield_estimate_lbs != null) row(`Yield Estimate (${lot.yield_unit ?? "lbs"})`, lot.yield_estimate_lbs.toLocaleString());
  if (lot.bin_id) row("Bin ID", lot.bin_id);
  if (lot.container_id) row("Container ID", lot.container_id);
  if (lot.pallets != null) row("Pallets", String(lot.pallets));
  row("Status", lot.status?.replace("_", " ").toUpperCase() ?? "");
  y -= 10;

  // Section 2: Trace Timeline
  sectionHeader("2. TRACE TIMELINE — FSMA One-Up / One-Down");
  for (const evt of (lot.events ?? [])) {
    const ts = new Date(evt.event_time).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
    const label = `${evt.event_type?.replace("_", " ").toUpperCase() ?? ""} — ${ts}`;
    page.drawText(label, { x: L, y, size: 9, font: fontBold, color: BLACK });
    y -= 10;
    if (evt.location) { page.drawText(`  Location: ${evt.location}`, { x: L, y, size: 8, font, color: BLACK }); y -= 9; }
    if (evt.bin_id) { page.drawText(`  Bin: ${evt.bin_id}`, { x: L, y, size: 8, font, color: BLACK }); y -= 9; }
    if (evt.created_by_name) { page.drawText(`  By: ${evt.created_by_name}`, { x: L, y, size: 8, font, color: BLACK }); y -= 9; }
    if (evt.notes) { page.drawText(`  Note: ${evt.notes}`, { x: L, y, size: 8, font, color: BLACK }); y -= 9; }
    y -= 4;
    if (y < 80) {
      const np = pdfDoc.addPage([612, 792]);
      y = 752;
    }
  }
  y -= 6;

  // Section 3: Orders
  if (orders.length > 0) {
    sectionHeader("3. ORDER FULFILLMENT");
    for (const o of orders) {
      page.drawText(`${o.customer_name}  |  ${o.stop_name}  |  ${o.order_date}  |  ${o.item_quantity?.toLocaleString() ?? "—"} lbs  |  ${o.fulfillment ?? ""}`, {
        x: L, y, size: 9, font, color: BLACK,
      });
      y -= 11;
    }
    y -= 6;
  }

  // Compliance footer
  page.drawRectangle({ x: L, y: Math.max(y - 24, 40), width: 532, height: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 14;
  page.drawText("Report Generated by Route Commerce — routecommerce.com", { x: L, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${lot.lot_number}-trace-report.pdf"`,
    },
  });
}