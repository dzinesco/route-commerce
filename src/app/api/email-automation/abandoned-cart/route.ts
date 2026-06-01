import { NextRequest, NextResponse } from "next/server";
import { svcHeaders } from "@/lib/svc-headers";
import { sendAbandonedCartEmail, type AbandonedCart } from "@/actions/email-automation/abandoned-cart";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BRAND_IDS = [
  { id: "64294306-5f42-463d-a5e8-2ad6c81a96de", name: "Tuxedo Corn" },
  { id: "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28", name: "Indian River Direct" },
];

const EMAIL_INTERVALS_HOURS = [1, 24, 48] as const;

async function processAbandonedCartsForBrand(brandId: string, brandName: string): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0, failed = 0, skipped = 0;

  // 1. Detect newly abandoned wholesale carts
  const detectRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/detect_abandoned_wholesale_carts`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );
  if (!detectRes.ok) {
    return { sent: 0, failed: 0, skipped: 0 };
  }
  const detected: Array<{ order_id: string; customer_id: string; contact_email: string; contact_name: string; cart_snapshot: unknown }> = await detectRes.json();

  // 2. Enroll new abandoned carts
  for (const row of detected) {
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/enroll_abandoned_cart`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_brand_id: brandId,
          p_customer_id: row.customer_id,
          p_contact_email: row.contact_email,
          p_contact_name: row.contact_name,
          p_cart_snapshot: row.cart_snapshot,
          p_brand_name: brandName,
          p_locale: "en",
          p_next_email_at: new Date(Date.now() + EMAIL_INTERVALS_HOURS[0] * 3600000).toISOString(),
        }),
      }
    );
  }

  // 3. Fetch active carts ready for next email
  const activeRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_active_abandoned_carts`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );
  if (!activeRes.ok) {
    return { sent, failed, skipped };
  }
  const activeData = await activeRes.json();
  const row = Array.isArray(activeData) ? activeData[0] : activeData;
  const activeCarts: AbandonedCart[] = row?.carts ?? [];

  // 4. Send emails
  for (const cart of activeCarts) {
    const nextStep = cart.sequence_step + 1;
    if (nextStep > 3) { skipped++; continue; }
    const result = await sendAbandonedCartEmail(cart, nextStep, brandId);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, skipped };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfiguration: CRON_SECRET not set" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { sent: number; failed: number; skipped: number }> = {};

  for (const brand of BRAND_IDS) {
    try {
      results[brand.name] = await processAbandonedCartsForBrand(brand.id, brand.name);
    } catch {
      results[brand.name] = { sent: 0, failed: 0, skipped: 0 };
    }
  }

  const total = Object.values(results).reduce((acc, r) => ({ sent: acc.sent + r.sent, failed: acc.failed + r.failed, skipped: acc.skipped + r.skipped }), { sent: 0, failed: 0, skipped: 0 });

  return NextResponse.json({ ok: true, results, ...total });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    path: "/api/email-automation/abandoned-cart",
    brands: BRAND_IDS.map(b => ({ id: b.id, name: b.name })),
    resend_configured: Boolean(process.env.RESEND_API_KEY),
    cron_secret_configured: Boolean(process.env.CRON_SECRET),
  });
}
