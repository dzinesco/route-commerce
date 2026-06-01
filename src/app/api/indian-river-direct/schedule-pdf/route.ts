import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const brandSlug = "indian-river-direct";

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("slug", brandSlug)
    .single();

  if (!brand?.id) {
    return new NextResponse("Brand not found", { status: 404 });
  }

  const { data: stops } = await supabase
    .from("stops")
    .select("*")
    .eq("brand_id", brand.id)
    .eq("active", true)
    .order("date", { ascending: true });

  const { data: settings } = await supabase
    .from("brand_settings")
    .select("logo_url, email, phone, schedule_pdf_notes")
    .eq("brand_id", brand.id)
    .single();

  const pdfBytes = await buildProfessionalSchedulePdf({
    brandName: brand.name,
    stops: stops ?? [],
    logoUrl: settings?.logo_url ?? null,
    contactEmail: settings?.email ?? null,
    contactPhone: settings?.phone ?? null,
    footerNotes: settings?.schedule_pdf_notes ?? null,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${brand.name.replace(/\s+/g, "-")}-Schedule.pdf"`,
    },
  });
}

async function buildProfessionalSchedulePdf({
  brandName,
  stops,
  logoUrl,
  contactEmail,
  contactPhone,
  footerNotes,
}: {
  brandName: string;
  stops: Array<{ city: string; state: string; date: string; time: string; location: string }>;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  footerNotes: string | null;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 50;

  const helvetica = await page.doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await page.doc.embedFont(StandardFonts.HelveticaBold);

  const colWidths = [130, 80, 80, 210];
  const headers = ["City / State", "Date", "Time", "Location"];

  let y = height - margin;

  // ── Header block ─────────────────────────────────────────────────────────
  page.drawText(brandName, { x: margin, y, font: helveticaBold, size: 18, color: rgb(0.1, 0.1, 0.1) });
  y -= 10;

  page.drawText("Stop Schedule", { x: margin, y, font: helvetica, size: 11, color: rgb(0.4, 0.4, 0.4) });
  y -= 8;

  const stopLabel = stops.length === 0
    ? "No upcoming stops"
    : stops.length === 1
    ? "1 upcoming stop"
    : `${stops.length} upcoming stops`;
  page.drawText(stopLabel, { x: margin, y, font: helvetica, size: 9, color: rgb(0.5, 0.5, 0.5) });
  y -= 18;

  // ── Logo (top-right) ────────────────────────────────────────────────────
  if (logoUrl) {
    try {
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
        const ext = logoUrl.split(".").pop()?.toLowerCase() ?? "";
        const embedFn = ext === "png" ? pdfDoc.embedPng : pdfDoc.embedJpg;
        const logoImage = await embedFn(logoBuffer);
        const logoH = 36;
        const logoW = Math.min(120, logoImage.width * (logoH / logoImage.height));
        page.drawImage(logoImage, {
          x: width - margin - logoW,
          y: height - margin - logoH,
          width: logoW,
          height: logoH,
        });
      }
    } catch {
      // logo fetch failed — skip
    }
  }

  // ── Divider ─────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
  y -= 14;

  // ── Table headers ────────────────────────────────────────────────────────
  let x = margin;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], { x, y, font: helveticaBold, size: 9, color: rgb(0.3, 0.3, 0.3) });
    x += colWidths[i];
  }
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) });
  y -= 16;

  // ── Stop rows ───────────────────────────────────────────────────────────
  if (stops.length === 0) {
    page.drawText("No upcoming stops scheduled.", { x: margin, y, font: helvetica, size: 10, color: rgb(0.5, 0.5, 0.5) });
    y -= 20;
  } else {
    for (const stop of stops) {
      x = margin;
      const cols = [stop.city + ", " + stop.state, stop.date, stop.time, stop.location];
      for (let i = 0; i < cols.length; i++) {
        page.drawText(cols[i], { x, y, font: helvetica, size: 9, color: rgb(0.15, 0.15, 0.15) });
        x += colWidths[i];
      }
      y -= 20;

      if (y < margin + 40) {
        const newPage = pdfDoc.addPage([612, 792]);
        y = newPage.getSize().height - margin;
      }
    }
  }

  // ── Bottom divider ───────────────────────────────────────────────────────
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 14;

  // ── Footer notes ────────────────────────────────────────────────────────
  if (footerNotes) {
    page.drawText(footerNotes, { x: margin, y, font: helvetica, size: 8, color: rgb(0.45, 0.45, 0.45) });
    y -= 14;
  }

  // ── Contact line ───────────────────────────────────────────────────────
  const contactParts = [];
  if (contactEmail) contactParts.push(contactEmail);
  if (contactPhone) contactParts.push(contactPhone);
  if (contactParts.length > 0) {
    page.drawText(contactParts.join("  |  "), { x: margin, y, font: helvetica, size: 8, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }

  // ── Generated date ──────────────────────────────────────────────────────
  page.drawText(`Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, {
    x: width - margin - 160,
    y: 16,
    font: helvetica,
    size: 8,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}