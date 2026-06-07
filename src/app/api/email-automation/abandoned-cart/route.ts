import { NextRequest, NextResponse } from "next/server";
import {
  getAbandonedCarts,
  sendAbandonedCartEmail,
  type AbandonedCart,
} from "@/actions/email-automation/abandoned-cart";

const BRAND_IDS = [
  { id: "64294306-5f42-463d-a5e8-2ad6c81a96de", name: "Tuxedo Corn" },
  { id: "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28", name: "Indian River Direct" },
];

async function processAbandonedCartsForBrand(brandId: string, brandName: string): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0, failed = 0, skipped = 0;
  void brandName;

  // 1+2. Detection and enrollment are gone with the abandoned_carts
  // table. Skipped silently.
  // 3. Fetch active carts ready for next email
  const result = await getAbandonedCarts(brandId);
  if (!result.success) {
    return { sent, failed, skipped };
  }
  const activeCarts: AbandonedCart[] = result.carts;

  // 4. Send emails
  for (const cart of activeCarts) {
    const nextStep = cart.sequence_step + 1;
    if (nextStep > 3) { skipped++; continue; }
    const r = await sendAbandonedCartEmail(cart, nextStep, brandId);
    if (r.success) {
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
