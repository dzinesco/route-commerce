import { NextResponse } from "next/server";
import crypto from "crypto";
import { svcHeaders } from "@/lib/svc-headers";

// POST /api/wholesale/webhooks/dispatch
// Processes pending webhook events from wholesale_sync_log and dispatches to configured URLs.
// Called by a cron job or manually after enqueue_wholesale_webhook has queued events.
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Fetch pending webhooks
  const pendingRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_pending_webhooks`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(serviceRoleKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_limit: 10 }),
    }
  );

  if (!pendingRes.ok) {
    return NextResponse.json({ error: "Failed to fetch pending webhooks" }, { status: 500 });
  }

  const pending = await pendingRes.json() as Array<{
    id: string;
    brand_id: string;
    event_type: string;
    order_id: string | null;
    payload: Record<string, unknown> | null;
    attempts: number;
    url: string;
    secret: string;
  }>;

  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: "No pending webhooks.", dispatched: 0 });
  }

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
        await markSent(webhook.id, serviceRoleKey, supabaseUrl, `HTTP ${res.status}: ${responseText.slice(0, 200)}`);
        dispatched++;
      } else {
        await markFailed(webhook.id, serviceRoleKey, supabaseUrl, `HTTP ${res.status}: ${responseText.slice(0, 200)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      await markFailed(webhook.id, serviceRoleKey, supabaseUrl, msg);
    }
  }

  return NextResponse.json({ message: `Dispatched ${dispatched}/${pending.length} webhook(s).`, dispatched });
}

async function markSent(logId: string, key: string, url: string, response: string) {
  await fetch(
    `${url}/rest/v1/rpc/mark_webhook_sent`,
    {
      method: "POST",
      headers: { ...svcHeaders(key), "Content-Type": "application/json" },
      body: JSON.stringify({ p_log_id: logId, p_response: response }),
    }
  );
}

async function markFailed(logId: string, key: string, url: string, response: string) {
  await fetch(
    `${url}/rest/v1/rpc/mark_webhook_failed`,
    {
      method: "POST",
      headers: { ...svcHeaders(key), "Content-Type": "application/json" },
      body: JSON.stringify({ p_log_id: logId, p_response: response }),
    }
  );
}

export async function GET() {
  return NextResponse.json({
    description: "POST to process pending webhook events",
    events: ["order_created", "order_fulfilled", "deposit_recorded", "order_paid"],
  });
}
