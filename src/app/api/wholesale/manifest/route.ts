import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_orders) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orders, brandId } = body as {
    orders: Array<{
      id: string;
      invoice_number: string | null;
      company_name: string;
      contact_name: string | null;
      anticipated_pickup_date: string | null;
      items: Array<{ product_name: string; quantity: number; unit_type: string; line_total: number }>;
      subtotal: number;
    }>;
    brandId?: string;
  };

  const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
  if (adminUser.role === "brand_admin" && brandId && adminUser.brand_id !== brandId) {
    return NextResponse.json({ error: "Not authorized for this brand" }, { status: 403 });
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "No orders provided" }, { status: 400 });
  }

  // Build HTML manifest for print
  const rows = orders.map((o, i) => {
    const itemsHtml = o.items.map(item => `
      <tr>
        <td style="padding:4px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:4px;border-bottom:1px solid #e5e7eb;">${o.invoice_number ?? o.id.slice(0, 8)}</td>
        <td style="padding:4px;border-bottom:1px solid #e5e7eb;">${o.company_name}</td>
        <td style="padding:4px;border-bottom:1px solid #e5e7eb;">${item.product_name ?? ""}</td>
        <td style="padding:4px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity} ${item.unit_type ?? ""}</td>
        <td style="padding:4px;border-bottom:1px solid #e5e7eb;text-align:right;">$${(typeof item.line_total === "number" ? item.line_total : parseFloat(item.line_total as string) || 0).toFixed(2)}</td>
        <td style="padding:4px;border-bottom:1px solid #e5e7eb;">${o.anticipated_pickup_date ?? "—"}</td>
      </tr>
    `).join("");

    return itemsHtml;
  }).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Load Manifest</title>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; margin: 24px; color: #1f2937; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f3f4f6; padding: 6px 4px; text-align: left; border: 1px solid #d1d5db; }
    td { padding: 4px; }
    .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Load Manifest</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; ${orders.length} order(s)</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Invoice</th>
        <th>Customer</th>
        <th>Product</th>
        <th style="text-align:right;">Qty</th>
        <th style="text-align:right;">Total</th>
        <th>Pickup Date</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map((o, i) => {
        const itemsHtml = o.items.map(item => `
          <tr>
            <td style="padding:4px;">${i + 1}</td>
            <td style="padding:4px;">${o.invoice_number ?? o.id.slice(0, 8)}</td>
            <td style="padding:4px;">${o.company_name}</td>
            <td style="padding:4px;">${item.product_name ?? ""}</td>
            <td style="padding:4px;text-align:right;">${item.quantity} ${item.unit_type ?? ""}</td>
            <td style="padding:4px;text-align:right;">$${(typeof item.line_total === "number" ? item.line_total : parseFloat(item.line_total as string) || 0).toFixed(2)}</td>
            <td style="padding:4px;">${o.anticipated_pickup_date ?? "—"}</td>
          </tr>
        `).join("");
        return itemsHtml;
      }).join("")}
    </tbody>
  </table>
  <div class="footer">
    Route Commerce Wholesale Portal — Load Manifest
  </div>
  <script>window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": "inline; filename=manifest.html",
    },
  });
}