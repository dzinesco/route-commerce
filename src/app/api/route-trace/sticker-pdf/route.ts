import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { svcHeaders } from "@/lib/svc-headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PAT = process.env.SUPABASE_PAT!;

async function getLotDetail(lotId: string) {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lotId = searchParams.get("lotId");
  const type = searchParams.get("type") ?? "field";
  const size = searchParams.get("size") ?? "4x2";
  const copies = Math.min(Math.max(parseInt(searchParams.get("copies") ?? "1"), 1), 10);

  if (!lotId) return new Response("Missing lotId", { status: 400 });

  const lot = await getLotDetail(lotId);
  if (!lot) return new Response("Lot not found", { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const traceUrl = `${baseUrl}/trace/${lot.lot_number}`;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0, 0, 0);
  const WHITE = rgb(1, 1, 1);

  // Thermal label sizes: 4x2" = 288×144 pts, 4x3" = 288×216 pts
  const LABEL_W = 288;
  const LABEL_H = size === "4x3" ? 216 : 144;

  // QR at maximum: fills right column top-to-bottom
  const QR_SIZE = size === "4x3" ? 136 : 116;
  const GAP = 18;

  // QR generation
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(traceUrl, {
      width: QR_SIZE * 3,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch (e) {
    // QR generation failed silently
  }

  for (let i = 0; i < copies; i++) {
    const page = pdfDoc.addPage([LABEL_W, LABEL_H * 2 + GAP]);
    const y = LABEL_H * 2 + GAP - (i + 1) * LABEL_H;

    // White background for pure black-on-white thermal printing
    page.drawRectangle({ x: 0, y, width: LABEL_W, height: LABEL_H, color: WHITE });

    const LEFT = 10;
    const RIGHT_X = LABEL_W - QR_SIZE - 6;
    const TOP = y + LABEL_H - 8;
    const QR_Y = y + 6;

    function drawLine(text: string, x: number, yPos: number, sz: number, isBold = false) {
      const f = isBold ? fontBold : font;
      page.drawText(text, { x, y: yPos, size: sz, font: f, color: BLACK });
    }

    function yPos(row: number, baseSize: number) {
      return TOP - row * (baseSize + 2);
    }

    const dataSize = size === "4x3" ? 8.5 : 7;
    const rowH = dataSize + 3;

    // ─── Brand header ───────────────────────────────────────────
    drawLine("ROUTE TRACE", LEFT, yPos(0, 6), 6, true);

    // ─── Lot number — dominant ───────────────────────────────────
    const lotNumSize = size === "4x3" ? 28 : 22;
    drawLine(lot.lot_number, LEFT, yPos(1, lotNumSize), lotNumSize, true);

    // ─── Crop + variety ─────────────────────────────────────────
    const cropSize = size === "4x3" ? 12 : 10;
    drawLine(lot.crop_type, LEFT, yPos(2, cropSize), cropSize, true);
    if (lot.variety) {
      drawLine(lot.variety, LEFT, yPos(2.7, cropSize - 1), cropSize - 1);
    }

    // ─── Left column data ───────────────────────────────────────
    let row = 3;

    if (type === "field") {
      if (lot.quantity_lbs) {
        drawLine(`${Number(lot.quantity_lbs).toLocaleString()} ${lot.yield_unit ?? "lbs"}`, LEFT, yPos(row, 11), 11, true); row += 1;
      }
      if (lot.harvest_date) { drawLine(`Harvested: ${lot.harvest_date}`, LEFT, yPos(row, dataSize), dataSize); row += 1; }
      if (lot.field_location) { drawLine(`Field: ${lot.field_location}`, LEFT, yPos(row, dataSize), dataSize); row += 1; }
      if (lot.field_block) { drawLine(`Block: ${lot.field_block}`, LEFT, yPos(row, dataSize), dataSize); row += 1; }
      if (lot.worker_name) { drawLine(`Worker: ${lot.worker_name}`, LEFT, yPos(row, dataSize), dataSize); row += 1; }
      if (lot.yield_estimate_lbs) {
        drawLine(`Est: ${Number(lot.yield_estimate_lbs).toLocaleString()} ${lot.yield_unit ?? "lbs"}`, LEFT, yPos(row, dataSize), dataSize); row += 1;
      }
    } else {
      if (lot.quantity_lbs) {
        drawLine(`${Number(lot.quantity_lbs).toLocaleString()} ${lot.yield_unit ?? "lbs"}`, LEFT, yPos(row, 13), 13, true); row += 1;
      }
      if (lot.harvest_date) { drawLine(`Packed: ${lot.harvest_date}`, LEFT, yPos(row, dataSize), dataSize); row += 1; }
      if (lot.field_location) { drawLine(`From: ${lot.field_location}`, LEFT, yPos(row, dataSize), dataSize); row += 1; }
      if (lot.worker_name) { drawLine(`Worker: ${lot.worker_name}`, LEFT, yPos(row, dataSize), dataSize); row += 1; }
      if (lot.destination_stop_id) {
        drawLine(`Dest: #${lot.destination_stop_id.slice(0, 8)}`, LEFT, yPos(row, dataSize), dataSize); row += 1;
      }
    }

    // ─── Right column — bin / container / pallets ──────────────
    let ryR = TOP;
    if (lot.bin_id) { drawLine(`BIN ${lot.bin_id}`, RIGHT_X, ryR, dataSize, true); ryR -= rowH; }
    if (lot.container_id) { drawLine(`CONT ${lot.container_id}`, RIGHT_X, ryR, dataSize, true); ryR -= rowH; }
    if (lot.pallets) { drawLine(`${lot.pallets} PLT`, RIGHT_X, ryR, dataSize, true); ryR -= rowH; }
    if (lot.field_block && type === "shed") {
      drawLine(`Block: ${lot.field_block}`, RIGHT_X, ryR, dataSize); ryR -= rowH;
    }

    // ─── QR code — right column, full height ────────────────────
    if (qrDataUrl) {
      try {
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
        const qrImg = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImg, {
          x: RIGHT_X,
          y: QR_Y,
          width: QR_SIZE,
          height: QR_SIZE,
        });
      } catch (_) {}
    }

    // Small URL label under QR
    page.drawText("/trace", { x: RIGHT_X, y: y + 2, size: 5, font, color: BLACK });
  }

  const pdfBytes = await pdfDoc.save();
  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${lot.lot_number}-${type}-${size}.pdf"`,
    },
  });
}