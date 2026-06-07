import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getAdminUser } from "@/lib/admin-permissions";
import { formatDate } from "@/lib/format-date";
import { pool } from "@/lib/db";

type OrderRow = {
  id: string;
  invoice_number: string | null;
  company_name: string;
  contact_name: string | null;
  email: string;
  anticipated_pickup_date: string | null;
  subtotal: number;
  deposit_paid: number;
  balance_due: number;
  items: Array<{ product_name: string; quantity: number; unit_price: number; line_total: number }>;
  created_at: string;
  brand_id: string;
};

type InvoiceSettings = {
  invoice_business_name?: string;
  invoice_business_address?: string;
  invoice_business_phone?: string;
  invoice_business_email?: string;
  invoice_business_website?: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  // ── Token-based customer download ────────────────────────────────────────────
  if (token) {
    // Look up order by ID + token. The invoice_token is checked server-side.
    const tokenRes = await pool.query<{ brand_id: string }>(
      "SELECT brand_id FROM wholesale_orders WHERE id = $1 AND invoice_token = $2 LIMIT 1",
      [orderId, token]
    );

    if (tokenRes.rows.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Proceed to generate PDF — order token is verified
    const brandId = tokenRes.rows[0].brand_id;

    // Fetch full order data for PDF
    const fullRes = await pool.query<OrderRow>(
      "SELECT * FROM get_wholesale_orders($1)",
      [brandId]
    );

    const allOrders = fullRes.rows;
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Fetch brand-specific settings for invoice header
    const settingsRes = await pool.query<InvoiceSettings>(
      "SELECT * FROM get_wholesale_settings($1)",
      [brandId]
    );

    const settings = settingsRes.rows[0] ?? {};

    const pdfBytes = await buildInvoicePdf(order, settings);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${order.invoice_number ?? orderId.slice(0, 8)}.pdf"`,
      },
    });
  }

  // ── Admin / no-token path — requires admin auth + brand scoping ─────────────
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!adminUser.can_manage_orders && !adminUser.can_manage_reports) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Fetch the order directly by ID with brand scoping
  const orderRes = await pool.query<OrderRow>(
    "SELECT * FROM get_wholesale_orders($1)",
    [adminUser.brand_id ?? null]
  );

  const orders = orderRes.rows;
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return new NextResponse("Order not found", { status: 404 });
  }

  const settingsRes = await pool.query<InvoiceSettings>(
    "SELECT * FROM get_wholesale_settings($1)",
    [order.brand_id]
  );

  const settings = settingsRes.rows[0] ?? {};

  const pdfBytes = await buildInvoicePdf(order, settings);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${order.invoice_number ?? orderId.slice(0, 8)}.pdf"`,
    },
  });
}

async function buildInvoicePdf(order: OrderRow, settings: InvoiceSettings) {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const text = (font: typeof helvetica, size: number, content: string, x: number, lineHeight?: number) => {
    page.drawText(content, { x, y, font, size });
    y -= (lineHeight ?? size * 1.4);
  };

  const drawLine = () => {
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 10;
  };

  const businessName = settings.invoice_business_name || "Wholesale Portal";
  const businessAddress = settings.invoice_business_address;
  const businessPhone = settings.invoice_business_phone;
  const businessEmail = settings.invoice_business_email;
  const businessWebsite = settings.invoice_business_website;

  // Header
  text(helveticaBold, 18, businessName, margin);
  y -= 8;

  if (businessAddress) {
    const lines = businessAddress.split("\n");
    for (const line of lines) {
      text(helvetica, 9, line, margin);
    }
  }
  if (businessPhone) text(helvetica, 9, businessPhone, margin);
  if (businessEmail) text(helvetica, 9, businessEmail, margin);
  if (businessWebsite) text(helvetica, 9, businessWebsite, margin);

  y -= 4;
  text(helvetica, 10, `Invoice: ${order.invoice_number ?? ""}`, margin);
  text(helvetica, 10, `Date: ${formatDate(new Date(order.created_at))}`, margin);
  if (order.anticipated_pickup_date) {
    text(helvetica, 10, `Pickup: ${order.anticipated_pickup_date}`, margin);
  }

  y -= 10;
  drawLine();

  // Bill To
  text(helveticaBold, 11, "Bill To:", margin);
  text(helvetica, 10, order.company_name, margin);
  if (order.contact_name) text(helvetica, 10, order.contact_name, margin);
  text(helvetica, 10, order.email, margin);

  y -= 10;
  drawLine();

  // Column headers
  const colX = { product: margin, qty: 340, price: 400, total: 480 };
  text(helveticaBold, 9, "Product", colX.product);
  text(helveticaBold, 9, "Qty", colX.qty);
  text(helveticaBold, 9, "Price", colX.price);
  text(helveticaBold, 9, "Total", colX.total);
  y += 4;
  drawLine();

  // Line items
  for (const item of order.items) {
    const lineTotal = typeof item.line_total === "number" ? item.line_total : parseFloat(item.line_total) || 0;
    const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity) || 0;
    const unitPrice = typeof item.unit_price === "number" ? item.unit_price : parseFloat(item.unit_price) || 0;

    text(helvetica, 9, (item.product_name ?? "Product").slice(0, 40), colX.product);
    text(helvetica, 9, qty.toString(), colX.qty);
    text(helvetica, 9, `$${unitPrice.toFixed(2)}`, colX.price);
    text(helvetica, 9, `$${lineTotal.toFixed(2)}`, colX.total);
    y -= 18;
  }

  y -= 5;
  drawLine();

  // Totals
  const subtotal = typeof order.subtotal === "number" ? order.subtotal : parseFloat(order.subtotal) || 0;
  const depositPaid = typeof order.deposit_paid === "number" ? order.deposit_paid : parseFloat(order.deposit_paid) || 0;
  const balanceDue = typeof order.balance_due === "number" ? order.balance_due : parseFloat(order.balance_due) || 0;

  y -= 8;
  text(helvetica, 10, "Subtotal:", 340);
  text(helvetica, 10, `$${subtotal.toFixed(2)}`, 480);
  y -= 16;
  text(helvetica, 10, "Deposit Paid:", 340);
  text(helvetica, 10, `$${depositPaid.toFixed(2)}`, 480);
  y -= 16;

  page.drawText("Balance Due:", { x: 340, y, font: helveticaBold, size: 11 });
  page.drawText(`$${balanceDue.toFixed(2)}`, { x: 480, y, font: helveticaBold, size: 11 });
  y -= 30;

  drawLine();

  // Footer
  text(helvetica, 8, "Thank you for your wholesale order.", margin);
  y -= 6;
  text(helvetica, 8, "Questions? Contact us at the email on file.", margin);

  return pdfDoc.save();
}