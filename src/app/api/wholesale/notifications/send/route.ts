import { NextResponse } from "next/server";
import { markWholesaleNotificationSent } from "@/actions/wholesale";
import { pool } from "@/lib/db";
import type { NotificationRecipient } from "@/actions/wholesale";

// POST /api/wholesale/notifications/send
// Processes pending customer notifications and dispatches copies to all active
// notification_recipients for each brand.
// Falls back to notification_email / from_email if no active recipients are configured.

export async function POST() {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return NextResponse.json(
      { message: "RESEND_API_KEY not configured — notifications are queued but not sent.", queued: 0, sent: 0 },
      { status: 200 }
    );
  }

  const pendingRes = await pool.query<{
    id: string;
    type: string;
    email_to: string;
    email_cc: string | null;
    subject: string;
    body_html: string | null;
    body_text: string | null;
    brand_id: string;
    order_id: string | null;
    customer_id: string;
    invoice_business_email: string | null;
  }>(
    "SELECT * FROM get_wholesale_pending_notifications($1, $2)",
    [null, 20]
  );

  if (pendingRes.rows.length === 0) {
    return NextResponse.json({ message: "No pending notifications.", queued: 0, sent: 0 });
  }

  const notifications = pendingRes.rows;

  // Prefetch settings for each unique brand so we can resolve notification_recipients
  const brandIds = [...new Set(notifications.map(n => n.brand_id))];
  const brandSettingsMap: Record<string, {
    notification_recipients: NotificationRecipient[];
    notification_email: string | null;
    from_email: string | null;
    invoice_business_email: string | null;
  }> = {};

  await Promise.all(brandIds.map(async (bid) => {
    const r = await pool.query<{
      notification_recipients: NotificationRecipient[];
      notification_email: string | null;
      from_email: string | null;
      invoice_business_email: string | null;
    }>(
      "SELECT * FROM get_wholesale_settings($1)",
      [bid]
    );
    if (r.rows.length > 0) {
      const data = r.rows[0];
      brandSettingsMap[bid] = {
        notification_recipients: data?.notification_recipients ?? [],
        notification_email: data?.notification_email ?? null,
        from_email: data?.from_email ?? null,
        invoice_business_email: data?.invoice_business_email ?? null,
      };
    }
  }));

  let sent = 0;
  let failed = 0;

  for (const n of notifications) {
    if (!n.email_to) {
      await markWholesaleNotificationSent(n.id, "No email_to address");
      failed++;
      continue;
    }

    const settings = brandSettingsMap[n.brand_id];
    const activeRecipients = (settings?.notification_recipients ?? [])
      .filter(r => r.active);

    // ── Fallback admin email if no active recipients ───────────────────────────
    const fallbackAdminEmail =
      settings?.notification_email
      ?? settings?.from_email
      ?? settings?.invoice_business_email
      ?? null;

    const fromEmail = n.invoice_business_email ?? "wholesale@routecommerce.com";

    // ── Send to customer ───────────────────────────────────────────────────────
    const customerOk = await sendOneEmail(resendApiKey, fromEmail, n.email_to, n.email_cc ?? undefined, n.subject, n.body_html, n.body_text);
    if (customerOk) {
      await markWholesaleNotificationSent(n.id);
      sent++;
    } else {
      await markWholesaleNotificationSent(n.id, "Resend error");
      failed++;
      continue;
    }

    // ── Send to notification recipients ───────────────────────────────────────
    const recipients = activeRecipients.length > 0
      ? activeRecipients
      : fallbackAdminEmail ? [{ email: fallbackAdminEmail, name: undefined, active: true }] : [];

    for (const recipient of recipients) {
      // Skip the customer email if they happen to also be a recipient (dedup)
      if (recipient.email === n.email_to) continue;

      const toAddress = recipient.name
        ? `"${recipient.name}" <${recipient.email}>`
        : recipient.email;

      const ok = await sendOneEmail(resendApiKey, fromEmail, toAddress, undefined, n.subject, n.body_html, n.body_text);

      // Log a separate notification entry for audit trail
      await pool.query(
        "SELECT enqueue_wholesale_notification($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          n.brand_id,
          n.customer_id,
          n.order_id ?? null,
          n.type,
          recipient.email,
          null,
          n.subject,
          n.body_html,
          n.body_text,
        ]
      );

      if (ok) sent++; else failed++;
    }
  }

  await triggerPickupReminder();

  return NextResponse.json({
    message: `Processed ${notifications.length} notification(s).`,
    sent,
    failed,
  });
}

async function sendOneEmail(
  apiKey: string,
  from: string,
  to: string,
  cc: string | undefined,
  subject: string,
  html: string | null,
  text: string | null
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, cc: cc ?? undefined, subject, html: html ?? undefined, text: text ?? undefined }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function triggerPickupReminder() {
  // Use the same Next.js server — the route is at /api/wholesale/notifications/pickup-reminder
  // The pickup-reminder route is also exposed as a cron in vercel.json.
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
    if (!baseUrl) return;
    await fetch(`${baseUrl}/api/wholesale/notifications/pickup-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {}
}

export async function GET() {
  const resendApiKey = process.env.RESEND_API_KEY;
  return NextResponse.json({
    email_provider: resendApiKey ? "resend" : "not_configured",
  });
}
