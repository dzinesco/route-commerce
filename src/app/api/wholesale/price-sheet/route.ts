/**
 * Wholesale price-sheet sender.
 *
 * TODO(migration): wholesale_customers and the
 * `enqueue_wholesale_notification` SECURITY DEFINER RPC live in the
 * legacy schema. Reads are converted to `pool.query`; the
 * `enqueue_wholesale_notification` RPC is still in the database
 * (supabase/migrations/054) and is called via `pool.query` rather
 * than the Supabase REST gateway. When wholesale is reactivated,
 * move the tables into `db/schema/wholesale.ts` and switch reads to
 * typed Drizzle.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWholesaleSettings, getWholesaleProducts } from "@/actions/wholesale";
import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/wholesale/price-sheet
// Generates an HTML price sheet and enqueues it as a price_sheet notification
// for one or more wholesale customers.

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_settings && !adminUser.can_manage_products) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { customerIds, brandId, subject, customNote } = body as {
    customerIds: string[];
    brandId: string;
    subject?: string;
    customNote?: string;
  };

  const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
  if (!effectiveBrandId) {
    return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
  }
  try { assertBrandAccess(adminUser, effectiveBrandId); } catch {
    return NextResponse.json({ error: "Not authorized for this brand" }, { status: 403 });
  }

  if (!customerIds?.length || !effectiveBrandId) {
    return NextResponse.json({ error: "customerIds array and brandId are required" }, { status: 400 });
  }

  // Fetch brand settings for branding + pickup location
  const settings = await getWholesaleSettings(effectiveBrandId);
  if (!settings) {
    return NextResponse.json({ error: "Brand settings not found" }, { status: 404 });
  }

  // Fetch products for this brand
  const products = await getWholesaleProducts(effectiveBrandId);
  if (products.length === 0) {
    return NextResponse.json({ error: "No products found for this brand" }, { status: 404 });
  }

  const brandName = settings.invoice_business_name ?? "Wholesale";
  const pickupLocation = settings.pickup_location;
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });
  const emailSubject = subject?.trim() || `${brandName} Wholesale Price Sheet — ${generatedDate}`;
  const hasCustomNote = Boolean(customNote?.trim());

  // Build product rows HTML
  const productRows = products
    .filter(p => p.availability === "available")
    .map(p => {
      const tiersHtml = p.price_tiers
        .map(t => {
          const max = t.max_qty === 0 ? "+" : `-${t.max_qty}`;
          return `${t.min_qty}${max}: $${Number(t.price).toFixed(2)}`;
        })
        .join("&nbsp;|&nbsp;");

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 12px; font-weight: 500; color: #1e293b;">${p.name}</td>
          <td style="padding: 10px 12px; color: #64748b; font-size: 13px;">${p.description ?? "—"}</td>
          <td style="padding: 10px 12px; color: #64748b; font-size: 13px; text-align: center;">${p.unit_type}</td>
          <td style="padding: 10px 12px; color: #1e293b; font-size: 13px; text-align: right; font-family: monospace;">${tiersHtml}</td>
        </tr>`;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${brandName} Wholesale Price Sheet</title>
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 700px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: #1e293b; padding: 28px 36px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">${brandName}</h1>
      <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">Wholesale Price Sheet &mdash; ${generatedDate}</p>
      ${pickupLocation ? `<p style="margin: 8px 0 0; color: #94a3b8; font-size: 13px;"><strong>Pickup:</strong> ${pickupLocation}</p>` : ""}
    </div>

    <!-- Intro -->
    <div style="padding: 20px 36px 0; border-bottom: 1px solid #f1f5f9;">
${hasCustomNote ? `      <p style="margin: 0 0 12px; color: #1e293b; font-size: 14px; font-weight: 600; line-height: 1.5;">${customNote!.trim()}</p>` : ""}
      <p style="margin: ${hasCustomNote ? "0 0 12px" : "0 0 12px"}; color: #475569; font-size: 14px; line-height: 1.5;">
        Thank you for your wholesale account. Below is our current product availability and wholesale pricing.
        Prices shown are per unit. Contact us if you have questions about placing an order.
      </p>
    </div>

    <!-- Product Table -->
    <div style="padding: 20px 36px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 8px 12px; text-align: left; color: #475569; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Product</th>
            <th style="padding: 8px 12px; text-align: left; color: #475569; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Description</th>
            <th style="padding: 8px 12px; text-align: center; color: #475569; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Unit</th>
            <th style="padding: 8px 12px; text-align: right; color: #475569; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Price Tiers</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 36px; background: #f8fafc; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
        Prices subject to change. This price sheet was generated on ${generatedDate}. Contact your wholesale representative with any questions.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `${brandName} Wholesale Price Sheet — ${generatedDate}\n${"=".repeat(50)}\n${hasCustomNote ? `\n${customNote!.trim()}\n\n` : ""}${products.filter(p => p.availability === "available").map(p => {
    const tiers = p.price_tiers.map(t => `${t.min_qty}${t.max_qty === 0 ? "+" : `-${t.max_qty}`}: $${Number(t.price).toFixed(2)}`).join(", ");
    return `${p.name} (${p.unit_type})\n  ${tiers}`;
  }).join("\n\n")}\n\nGenerated ${generatedDate}. Prices subject to change.`;

  let enqueued = 0;
  let failed = 0;

  for (const customerId of customerIds) {
    // Fetch customer email via raw SQL
    const { rows: customers } = await pool.query<{
      id: string;
      email: string | null;
      company_name: string | null;
      brand_id: string | null;
    }>(
      `SELECT id::text AS id, email, company_name, brand_id::text AS brand_id
       FROM wholesale_customers
       WHERE id = $1
       LIMIT 1`,
      [customerId]
    );
    const customer = customers[0];
    if (!customer?.email) { failed++; continue; }

    try {
      await pool.query(
        "SELECT enqueue_wholesale_notification($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          effectiveBrandId,
          customerId,
          null,
          "price_sheet",
          customer.email,
          settings.notification_email ?? null,
          emailSubject,
          html,
          text,
        ]
      );
      enqueued++;
    } catch {
      failed++;
    }
  }

  // Fire-and-forget trigger to process the queue
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (req.nextUrl ? `${req.nextUrl.protocol}//${req.nextUrl.host}` : "http://localhost:3000");
  fetch(`${baseUrl}/api/wholesale/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});

  return NextResponse.json({ enqueued, failed, total: customerIds.length });
}
