import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { svcHeaders } from "@/lib/svc-headers";

// Resend webhook events: email.delivered, email.opened, email.clicked,
// email.bounced, email.failed, email.unsubscribed
type ResendEvent = {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string;
    subject?: string;
    created_at: string;
    delivered_at?: string;
    opened_at?: string;
    clicked_at?: string;
    bounced_at?: string;
    bounce_reason?: string;
  };
};

function verifyResendSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-resend-signature") ?? "";
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (webhookSecret) {
    const valid = verifyResendSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = event;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Look up by customer_email + subject (event_id is not populated by send_campaign)
  // Filter to recent logs (last 7 days) to avoid stale matches
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const findRes = await fetch(
    `${supabaseUrl}/rest/v1/communication_message_logs?` +
      `customer_email=eq.${encodeURIComponent(data.to)}` +
      `&subject=eq.${encodeURIComponent(data.subject ?? "")}` +
      `&delivery_method=eq.email` +
      `&created_at=gt.${sevenDaysAgo.toISOString()}` +
      `&order=created_at.desc` +
      `&limit=5&select=id,brand_id`,
    {
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    }
  );

  if (!findRes.ok) {
    return NextResponse.json({ error: "Failed to look up message" }, { status: 500 });
  }

  const logs: { id: string; brand_id: string }[] = await findRes.json();
  if (logs.length === 0) {
    // No matching log found — silently acknowledge to avoid Resend retries
    return NextResponse.json({ ok: true });
  }

  // Update the most recent matching log
  const log = logs[0];
  const updates: Record<string, string | undefined> = {};

  switch (type) {
    case "email.delivered":
      updates.delivered_at = data.delivered_at ?? new Date().toISOString();
      updates.status = "delivered";
      break;
    case "email.opened":
      updates.opened_at = data.opened_at ?? new Date().toISOString();
      break;
    case "email.clicked":
      updates.clicked_at = data.clicked_at ?? new Date().toISOString();
      break;
    case "email.bounced":
    case "email.failed":
      updates.bounced_at = data.bounced_at ?? new Date().toISOString();
      updates.bounce_reason = data.bounce_reason ?? undefined;
      updates.status = "bounced";
      break;
    case "email.unsubscribed":
      updates.status = "unsubscribed";
      break;
    default:
      return NextResponse.json({ ok: true });
  }

  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/communication_message_logs?id=eq.${log.id}`,
    {
      method: "PATCH",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(updates),
    }
  );

  if (!patchRes.ok) {
    return NextResponse.json({ error: "Failed to update log" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}