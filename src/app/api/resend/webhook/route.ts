import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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

  // The new schema does not have a `communication_message_logs` table
  // — the per-recipient delivery log has been retired. We still
  // acknowledge the event so Resend does not retry, but there is
  // nothing to update. When a new log table is added, this is the
  // place to look up by `customer_email + subject` (the event_id is
  // never populated by `send_campaign`) and write delivered/opened/
  // clicked/bounced timestamps.
  void event;

  return NextResponse.json({ ok: true });
}
