import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { getTimeTrackingSettings } from "@/actions/time-tracking";
import { checkAndNotifyOvertime } from "@/actions/time-tracking/notifications";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";

// ── Resend Email ───────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "Route Commerce <no-reply@routecommerce.com>";

interface ResendResponse {
  id: string;
  to: string[];
  created_at: string;
}

async function sendResendEmail(to: string[], subject: string, html: string, text: string): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    const data = (await res.json()) as ResendResponse;
    return { success: true, message_id: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Twilio SMS ────────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";

interface TwilioMessage {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

async function sendTwilioSms(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: "Twilio not configured (missing credentials)" };
  }
  try {
    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.message ?? res.statusText };
    }
    const data = (await res.json()) as TwilioMessage;
    return { success: data.status !== "failed", sid: data.sid, error: data.error_message };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Email template builder ────────────────────────────────────────────────────

function buildOvertimeAlertEmail(params: {
  brandName: string;
  workerName: string;
  triggerType: string;
  dailyHours: number;
  dailyThreshold: number;
  weeklyHours: number;
  weeklyThreshold: number;
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  const { brandName, workerName, triggerType, dailyHours, dailyThreshold, weeklyHours, weeklyThreshold, adminUrl } = params;

  const triggerLabel: Record<string, string> = {
    daily_approaching: "Daily Overtime Approaching",
    daily_reached: "Daily Overtime Threshold Reached",
    weekly_approaching: "Weekly Overtime Approaching",
    weekly_reached: "Weekly Overtime Threshold Reached",
  };

  const label = triggerLabel[triggerType] ?? triggerType;
  const isReached = triggerType.endsWith("_reached");

  const subject = `[Time Tracking Alert] ${brandName} — ${label}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1c1917;border-radius:16px;padding:28px 32px;margin-bottom:24px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#a8a29e">Time Tracking Alert</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">${label}</h1>
    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.6)">${brandName}</p>
  </div>
  <div style="background:#18181b;border-radius:16px;padding:28px 32px;border:1px solid #27272a">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#a8a29e">Worker</td><td style="padding:6px 0;color:#fafafa;font-weight:600;text-align:right">${workerName}</td></tr>
      <tr><td style="padding:6px 0;color:#a8a29e;border-top:1px solid #27272a">Alert</td><td style="padding:6px 0;color:#f87171;font-weight:600;text-align:right">${isReached ? "⚠️ REACHED" : "Approaching"}</td></tr>
      <tr><td style="padding:6px 0;color:#a8a29e;border-top:1px solid #27272a">Daily Hours</td><td style="padding:6px 0;color:#fafafa;font-weight:600;text-align:right">${dailyHours.toFixed(1)}h / ${dailyThreshold.toFixed(0)}h limit</td></tr>
      <tr><td style="padding:6px 0;color:#a8a29e;border-top:1px solid #27272a">Weekly Hours</td><td style="padding:6px 0;color:#fafafa;font-weight:600;text-align:right">${weeklyHours.toFixed(1)}h / ${weeklyThreshold.toFixed(0)}h limit</td></tr>
    </table>
    ${isReached ? `<div style="margin-top:20px;padding:16px;background:#7f1d1d;border-radius:10px;font-size:13px;color:#fca5a5">Worker has exceeded the overtime threshold. Review and confirm hours before payroll processing.</div>` : ""}
    <a href="${adminUrl}" style="display:inline-block;margin-top:20px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px">View in Time Tracking</a>
  </div>
  <div style="text-align:center;margin-top:24px">
    <p style="margin:0;font-size:12px;color:#52525b">Route Commerce Time Tracking · ${new Date().toLocaleDateString()}</p>
  </div>
</div>
</body>
</html>`;

  const text = `[TIME TRACKING ALERT] ${label} — ${brandName}

Worker: ${workerName}
Alert: ${isReached ? "THRESHOLD REACHED" : "Approaching"}
Daily: ${dailyHours.toFixed(1)}h / ${dailyThreshold.toFixed(0)}h
Weekly: ${weeklyHours.toFixed(1)}h / ${weeklyThreshold.toFixed(0)}h

View: ${adminUrl}`;

  return { subject, html, text };
}

function buildPeriodSummaryEmail(params: {
  brandName: string;
  totalHours: number;
  workerCount: number;
  periodStart: string;
  periodEnd: string;
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  const { brandName, totalHours, workerCount, periodStart, periodEnd, adminUrl } = params;
  const subject = `[Time Tracking] ${brandName} Pay Period Summary — ${periodStart} to ${periodEnd}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1c1917;border-radius:16px;padding:28px 32px;margin-bottom:24px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#a8a29e">Weekly Summary</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">${brandName} — Pay Period Report</h1>
    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.6)">${periodStart} → ${periodEnd}</p>
  </div>
  <div style="background:#18181b;border-radius:16px;padding:28px 32px;border:1px solid #27272a;text-align:center">
    <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#71717a">Total Hours This Period</p>
    <p style="margin:0;font-size:48px;font-weight:800;color:#fafafa">${totalHours.toFixed(1)}h</p>
    <p style="margin:8px 0 0;font-size:13px;color:#a8a29e">${workerCount} active worker${workerCount !== 1 ? "s" : ""}</p>
  </div>
  <a href="${adminUrl}" style="display:inline-block;margin-top:20px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px">View Full Report</a>
</div>
</body>
</html>`;

  const text = `[PAY PERIOD SUMMARY] ${brandName}\n\nPeriod: ${periodStart} → ${periodEnd}\nTotal Hours: ${totalHours.toFixed(1)}h\nActive Workers: ${workerCount}\n\nView: ${adminUrl}`;

  return { subject, html, text };
}

// ── Main dispatch handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { brandId, workerId, workerName, dailyHours, weeklyHours } = body as {
    brandId?: string;
    workerId?: string;
    workerName?: string;
    dailyHours?: number;
    weeklyHours?: number;
  };

  // Use provided brand or default to Tuxedo
  const effectiveBrandId = brandId ?? TUXEDO_BRAND_ID;

  // ── Trigger notification check ──────────────────────────────────────────

  if (workerId && workerName && typeof dailyHours === "number" && typeof weeklyHours === "number") {
    // Called after a clock-in/out event — check and log triggers
    const result = await checkAndNotifyOvertime(effectiveBrandId, workerId, workerName, dailyHours, weeklyHours);
    if (!result.sent) {
      return NextResponse.json({ sent: false, reason: result.message });
    }

    // Fetch settings to get recipients
    const settings = await getTimeTrackingSettings(effectiveBrandId);
    if (!settings) return NextResponse.json({ sent: false, reason: "Settings not found" });

    const emails = settings.notification_emails ?? [];
    const smsNumbers = settings.notification_sms_numbers ?? [];
    const brandName = settings.brand_name ?? "Farm";

    // ── Send emails ───────────────────────────────────────────────────────
    if (emails.length > 0) {
      const emailParams = buildOvertimeAlertEmail({
        brandName,
        workerName,
        triggerType: result.trigger_type ?? "daily_approaching",
        dailyHours,
        dailyThreshold: Number(settings.daily_overtime_threshold),
        weeklyHours,
        weeklyThreshold: Number(settings.weekly_overtime_threshold),
        adminUrl: `https://route-commerce-platform.vercel.app/admin/time-tracking`,
      });

      // Update log entry with email delivery attempt
      await sendResendEmail(emails, emailParams.subject, emailParams.html, emailParams.text);
    }

    // ── Send SMS ────────────────────────────────────────────────────────────
    if (smsNumbers.length > 0) {
      const smsBody = `[${brandName} Time Tracking] ALERT: ${workerName} — ${result.trigger_type?.replace("_", " ")}. Hours: ${dailyHours.toFixed(1)}d / ${weeklyHours.toFixed(1)}w. Check admin panel.`;
      for (const num of smsNumbers) {
        await sendTwilioSms(num, smsBody);
      }
    }

    return NextResponse.json({
      sent: true,
      trigger: result.trigger_type,
      emails_sent: emails,
      sms_sent: smsNumbers,
    });
  }

  // ── Period summary (no worker context) ───────────────────────────────────
  if (brandId === "summary") {
    const settings = await getTimeTrackingSettings(TUXEDO_BRAND_ID);
    if (!settings) return NextResponse.json({ error: "Settings not found" });

    const emails = settings.notification_emails ?? [];
    if (emails.length === 0) return NextResponse.json({ sent: false, reason: "no recipients" });

    const emailParams = buildPeriodSummaryEmail({
      brandName: settings.brand_name ?? "Farm",
      totalHours: 0, // caller should compute from logs
      workerCount: 0,
      periodStart: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
      periodEnd: new Date().toISOString().slice(0, 10),
      adminUrl: `https://route-commerce-platform.vercel.app/admin/time-tracking`,
    });

    const result = await sendResendEmail(emails, emailParams.subject, emailParams.html, emailParams.text);
    return NextResponse.json({ sent: result.success, message_id: result.message_id, error: result.error });
  }

  return NextResponse.json({ error: "Invalid request — pass workerId + dailyHours + weeklyHours or brandId=summary" }, { status: 400 });
}

// ── GET: health check ─────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    status: "ok",
    resend_configured: Boolean(RESEND_API_KEY),
    twilio_configured: Boolean(TWILIO_ACCOUNT_SID),
    twilio_number: TWILIO_PHONE_NUMBER ? "(set)" : "(not set)",
  });
}