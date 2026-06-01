import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { svcHeaders } from "@/lib/svc-headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse("Server misconfiguration", { status: 500 });
  }

  // ── Token-gated download (customer portal) ──────────────────────────────────
  if (token) {
    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/wholesale_orders?id=eq.${orderId}&invoice_token=eq.${token}&select=id,invoice_number,brand_id`,
      { headers: svcHeaders(supabaseKey) }
    );
    if (!orderRes.ok || orderRes.status === 204) {
      return new NextResponse("Not found", { status: 404 });
    }
    const tokenOrders = await orderRes.json();
    if (!tokenOrders || tokenOrders.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  // ── Fetch full order + settings ────────────────────────────────────────────
  // Use the RPC for brand-scoped fetch (works for both token + admin paths)
  let brandId = "00000000-0000-0000-0000-000000000000";

  // First try direct order lookup to get brand_id
  const directRes = await fetch(
    `${supabaseUrl}/rest/v1/wholesale_orders?id=eq.${orderId}&select=id,brand_id,customer_id`,
    { headers: svcHeaders(supabaseKey) }
  );
  if (directRes.ok) {
    const direct = await directRes.json();
    if (direct && direct.length > 0) {
      brandId = direct[0].brand_id;
    }
  }

  const orderRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_orders`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!orderRes.ok) {
    return new NextResponse("Failed to fetch order", { status: 500 });
  }

  type OrderRow = {
    id: string;
    invoice_number: string | null;
    company_name: string;
    contact_name: string | null;
    customer_email: string;
    customer_phone: string | null;
    anticipated_pickup_date: string | null;
    subtotal: number;
    deposit_paid: number;
    balance_due: number;
    items: Array<{ product_name: string; quantity: number; unit_price: number; line_total: number }>;
    created_at: string;
    brand_id: string;
  };

  const allOrders = await orderRes.json() as OrderRow[];
  const order = allOrders.find(o => o.id === orderId);
  if (!order) {
    return new NextResponse("Order not found", { status: 404 });
  }

  // Fetch settings for brand header
  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: order.brand_id }),
    }
  );

  const settingsData = await settingsRes.json();
  const settings = settingsData ?? {};

  const pdfBytes = await buildInvoicePdf(order, settings);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.invoice_number ?? orderId.slice(0, 8)}.pdf"`,
    },
  });
}

async function buildInvoicePdf(
  order: {
    invoice_number: string | null;
    company_name: string;
    contact_name: string | null;
    customer_email: string;
    customer_phone: string | null;
    anticipated_pickup_date: string | null;
    subtotal: number;
    deposit_paid: number;
    balance_due: number;
    items: Array<{ product_name: string; quantity: number; unit_price: number; line_total: number }>;
    created_at: string;
  },
  settings: {
    invoice_business_name?: string;
    invoice_business_address?: string;
    invoice_business_phone?: string;
    invoice_business_email?: string;
    invoice_business_website?: string;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width } = page.getSize();
  const margin = 50;
  const rightEdge = width - margin;
  let y = page.getSize().height - margin;

  const col = {
    product: margin,
    qty: 370,
    price: 440,
    total: 510,
  };

  function drawText(
    text: string,
    x: number,
    font: typeof helveticaBold,
    size: number,
    color = rgb(0, 0, 0)
  ) {
    page.drawText(text, { x, y, font, size, color });
    y -= size * 1.5;
  }

  function measureWidth(text: string, font: typeof helvetica, size: number) {
    return font.widthOfTextAtSize(text, size);
  }

  function rightAlign(text: string, font: typeof helvetica, size: number, atX: number) {
    const w = measureWidth(text, font, size);
    return atX - w;
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const businessName = settings.invoice_business_name || "Wholesale Portal";
  drawText(businessName, margin, helveticaBold, 18);

  y -= 4;
  if (settings.invoice_business_address) {
    for (const line of settings.invoice_business_address.split("\n")) {
      drawText(line, margin, helvetica, 9);
    }
  }
  if (settings.invoice_business_phone) {
    drawText(settings.invoice_business_phone, margin, helvetica, 9);
  }
  if (settings.invoice_business_email) {
    drawText(settings.invoice_business_email, margin, helvetica, 9);
  }
  if (settings.invoice_business_website) {
    drawText(settings.invoice_business_website, margin, helvetica, 9);
  }

  y -= 12;

  // ── Invoice meta block (right side) ─────────────────────────────────────
  const invoiceNum = order.invoice_number ?? "—";
  const invoiceDate = new Date(order.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const rightX = 370;
  let ry = page.getSize().height - margin;

  page.drawText(`Invoice:`, { x: rightX, y: ry, font: helveticaBold, size: 10 });
  page.drawText(invoiceNum, { x: rightX + 65, y: ry, font: helvetica, size: 10 });
  ry -= 15;
  page.drawText(`Date:`, { x: rightX, y: ry, font: helveticaBold, size: 10 });
  page.drawText(invoiceDate, { x: rightX + 65, y: ry, font: helvetica, size: 10 });
  ry -= 15;
  if (order.anticipated_pickup_date) {
    page.drawText(`Pickup:`, { x: rightX, y: ry, font: helveticaBold, size: 10 });
    page.drawText(order.anticipated_pickup_date, { x: rightX + 65, y: ry, font: helvetica, size: 10 });
  }

  y = ry - 10;

  // ── Divider ──────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margin, y }, end: { x: rightEdge, y },
    thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
  });
  y -= 20;

  // ── Bill To ──────────────────────────────────────────────────────────────
  drawText("Bill To:", margin, helveticaBold, 10);
  y += 4;
  drawText(order.company_name, margin, helvetica, 10);
  if (order.contact_name) {
    drawText(order.contact_name, margin, helvetica, 10);
  }
  drawText(order.customer_email, margin, helvetica, 10);
  if (order.customer_phone) {
    drawText(order.customer_phone, margin, helvetica, 10);
  }

  y -= 15;

  // ── Column headers ────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margin, y }, end: { x: rightEdge, y },
    thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
  });
  y -= 4;
  page.drawText("Product", { x: col.product, y, font: helveticaBold, size: 9 });
  page.drawText("Qty", { x: col.qty, y, font: helveticaBold, size: 9 });
  page.drawText("Unit Price", { x: col.price, y, font: helveticaBold, size: 9 });
  page.drawText("Total", { x: col.total, y, font: helveticaBold, size: 9 });
  y -= 18;
  page.drawLine({
    start: { x: margin, y }, end: { x: rightEdge, y },
    thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
  });
  y -= 8;

  // ── Line items ───────────────────────────────────────────────────────────
  for (const item of order.items) {
    const lineTotal = Number(item.line_total) || 0;
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const name = (item.product_name ?? "Product").substring(0, 42);

    page.drawText(name, { x: col.product, y, font: helvetica, size: 9 });
    page.drawText(qty.toString(), { x: col.qty, y, font: helvetica, size: 9 });
    page.drawText(`$${unitPrice.toFixed(2)}`, { x: col.price, y, font: helvetica, size: 9 });
    page.drawText(`$${lineTotal.toFixed(2)}`, { x: col.total, y, font: helvetica, size: 9 });
    y -= 16;
  }

  y -= 8;
  page.drawLine({
    start: { x: margin, y }, end: { x: rightEdge, y },
    thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
  });

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = Number(order.subtotal) || 0;
  const depositPaid = Number(order.deposit_paid) || 0;
  const balanceDue = Number(order.balance_due) || 0;

  y -= 16;
  const labelX = 370;
  const valueX = 510;

  function drawRightLabel(label: string, value: string, font: typeof helvetica, size: number, isBold = false) {
    page.drawText(label, { x: labelX, y, font: isBold ? helveticaBold : font, size });
    const vw = measureWidth(value, font, size);
    page.drawText(value, { x: valueX - vw, y, font: isBold ? helveticaBold : font, size });
    y -= size * 1.8;
  }

  drawRightLabel("Subtotal:", `$${subtotal.toFixed(2)}`, helvetica, 10);
  drawRightLabel("Deposit Paid:", `$${depositPaid.toFixed(2)}`, helvetica, 10);
  y -= 4;
  drawRightLabel("Balance Due:", `$${balanceDue.toFixed(2)}`, helveticaBold, 11, true);

  y -= 15;
  page.drawLine({
    start: { x: margin, y }, end: { x: rightEdge, y },
    thickness: 0.5, color: rgb(0.85, 0.85, 0.85),
  });

  // ── Footer ──────────────────────────────────────────────────────────────
  y -= 20;
  const footerLines = [
    "Thank you for your wholesale order.",
    "Questions? Contact us at the email on file.",
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
  ];
  for (const line of footerLines) {
    page.drawText(line, { x: margin, y, font: helvetica, size: 8, color: rgb(0.45, 0.45, 0.45) });
    y -= 12;
  }

  return pdfDoc.save();
}