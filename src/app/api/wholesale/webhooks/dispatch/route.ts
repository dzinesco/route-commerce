import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";

// POST /api/wholesale/webhooks/dispatch
// Processes pending webhook events from wholesale_sync_log and dispatches to configured URLs.
// Called by a cron job or manually after enqueue_wholesale_webhook has queued events.
export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Fetch pending webhooks
  const pendingRes = await pool.query<{
    id: string;
    brand_id: string;
    event_type: string;
    order_id: string | null;
    payload: Record<string, unknown> | null;
    attempts: number;
    url: string;
    secret: string;
  }>(
    "SELECT * FROM get_pending_webhooks($1)",
    [10]
  );

  if (pendingRes.rows.length === 0) {
    return NextResponse.json({ message: "No pending webhooks.", dispatched: 0 });
  }

  const pending = pendingRes.rows;
  let dispatched = 0;

  for (const webhook of pending) {
    const payload = webhook.payload ?? {};
    const payloadString = JSON.stringify(payload);

    // Build HMAC-SHA256 signature: HMAC(secret, payload_string)
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(payloadString)
      .digest("hex");

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": webhook.event_type,
        },
        body: payloadString,
      });

      const responseText = await res.text().catch(() => "");

      if (res.ok) {
        await markSent(webhook.id, `HTTP ${res.status}: ${responseText.slice(0, 200)}`);
        dispatched++;
      } else {
        await markFailed(webhook.id, `HTTP ${res.status}: ${responseText.slice(0, 200)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      await markFailed(webhook.id, msg);
    }
  }

  return NextResponse.json({ message: `Dispatched ${dispatched}/${pending.length} webhook(s).`, dispatched });
}

async function markSent(logId: string, response: string) {
  try {
    await pool.query(
      "SELECT mark_webhook_sent($1, $2)",
      [logId, response]
    );
  } catch {
    // best-effort
  }
}

async function markFailed(logId: string, response: string) {
  try {
    await pool.query(
      "SELECT mark_webhook_failed($1, $2)",
      [logId, response]
    );
  } catch {
    // best-effort
  }
}

export async function GET() {
  return NextResponse.json({
    description: "POST to process pending webhook events",
    events: ["order_created", "order_fulfilled", "deposit_recorded", "order_paid"],
  });
}
