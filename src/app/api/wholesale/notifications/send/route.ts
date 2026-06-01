import { NextResponse } from "next/server";
import { getWholesalePendingNotifications, markWholesaleNotificationSent } from "@/actions/wholesale";
import { svcHeaders } from "@/lib/svc-headers";
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const pendingRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_pending_notifications`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: null, p_limit: 20 }),
    }
  );

  if (!pendingRes.ok) {
    return NextResponse.json({ error: "Failed to fetch pending notifications" }, { status: 500 });
  }

  const notifications = await pendingRes.json() as Array<{
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
  }>;

  if (notifications.length === 0) {
    return NextResponse.json({ message: "No pending notifications.", queued: 0, sent: 0 });
  }

  // Prefetch settings for each unique brand so we can resolve notification_recipients
  const brandIds = [...new Set(notifications.map(n => n.brand_id))];
  const brandSettingsMap: Record<string, {
    notification_recipients: NotificationRecipient[];
    notification_email: string | null;
    from_email: string | null;
    invoice_business_email: string | null;
  }> = {};

  await Promise.all(brandIds.map(async (bid) => {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/get_wholesale_settings`, {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: bid }),
    });
    if (r.ok) {
      const data = await r.json();
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
      await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_notification`, {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_brand_id: n.brand_id,
          p_customer_id: n.customer_id,
          p_order_id: n.order_id ?? null,
          p_type: n.type,
          p_email_to: recipient.email,
          p_email_cc: null,
          p_subject: n.subject,
          p_body_html: n.body_html,
          p_body_text: n.body_text,
        }),
      });

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
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL!}/api/wholesale/notifications/pickup-reminder`, {
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
