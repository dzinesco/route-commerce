/**
 * Resend Email Service — Route Commerce / Tuxedo Corn
 *
 * Branded transactional email templates for Tuxedo Corn storefront.
 * All emails use the Olathe Sweet + Tuxedo Corn brand identity.
 *
 * Env vars required:
 *   RESEND_API_KEY        — Resend API key
 *   FROM_EMAIL            — e.g. "Tuxedo Corn <no-reply@tuxedocorn.com>"
 */

import { publicUrl, BUCKETS } from "@/lib/storage";

const FROM_EMAIL = process.env.FROM_EMAIL ?? "Tuxedo Corn <no-reply@tuxedocorn.com>";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const OLATHE_SWEET_LOGO = publicUrl(BUCKETS.BRAND_LOGOS, `${TUXEDO_BRAND_ID}/olathe-sweet-logo.png`);
const TUXEDO_LOGO = publicUrl(BUCKETS.BRAND_LOGOS, `${TUXEDO_BRAND_ID}/logo.png`);

// ─────────────────────────────────────────────────────────────────────────────
// Shared email send function
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<boolean> {
  if (!RESEND_API_KEY) {
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opts.from ?? FROM_EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? opts.subject,
      }),
    });

    if (!res.ok) {
      return false;
    }

    return res.ok;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Receipt — sent to customer after successful checkout
// ─────────────────────────────────────────────────────────────────────────────

export type OrderReceiptData = {
  customerName: string;
  customerEmail: string;
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  fulfillment: "pickup" | "ship";
  stopCity?: string;
  stopState?: string;
  stopDate?: string;
  stopTime?: string;
  stopLocation?: string;
  brandName?: string;
};

export async function sendOrderReceiptEmail(data: OrderReceiptData): Promise<boolean> {
  const pickupInfo = data.fulfillment === "pickup" && data.stopDate;
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; color: #1c1917; font-size: 14px;">
          ${item.name} <span style="color: #78716c;">× ${item.quantity}</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4; text-align: right; color: #1c1917; font-size: 14px; font-weight: 600;">
          $${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>`
    )
    .join("");

  const pickupBlock = pickupInfo
    ? `
    <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
      <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c;">Pickup Details</p>
      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1c1917;">${data.stopCity}, ${data.stopState}</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #57534e;">${data.stopDate}${data.stopTime ? ` · ${data.stopTime}` : ""}</p>
      ${data.stopLocation ? `<p style="margin: 4px 0 0; font-size: 13px; color: #78716c;">${data.stopLocation}</p>` : ""}
    </div>`
    : `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #166534;">Shipping to your door — cooler boxes ship after the season ends.</p>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed — Tuxedo Corn</title>
</head>
<body style="margin: 0; padding: 0; background: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="background: #1c1917; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <img src="${OLATHE_SWEET_LOGO}"
           alt="Olathe Sweet" style="height: 40px; width: auto; object-fit: contain; margin-bottom: 16px; filter: brightness(0) invert(1); opacity: 0.9;" />
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Order Confirmed</h1>
      <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.6);">Order #${data.orderId.slice(0, 8).toUpperCase()}</p>
    </div>

    <!-- Body -->
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e7e5e4;">
      <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1c1917;">Hi ${data.customerName.split(" ")[0]},</p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #57534e; line-height: 1.6;">
        Great news — your order is confirmed and we're getting it ready.
        ${pickupInfo ? "Your corn will be hand-picked fresh the morning of your stop." : "We'll ship your cooler boxes after the season ends."}
      </p>

      <!-- Order summary table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; border-bottom: 2px solid #e7e5e4;">Item</th>
            <th style="text-align: right; padding: 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; border-bottom: 2px solid #e7e5e4;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="border-top: 2px solid #e7e5e4; padding-top: 16px; margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; margin: 4px 0;">
          <span style="font-size: 14px; color: #57534e;">Subtotal</span>
          <span style="font-size: 14px; font-weight: 600; color: #1c1917;">$${data.subtotal.toFixed(2)}</span>
        </div>
        ${data.taxAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin: 4px 0;">
          <span style="font-size: 14px; color: #57534e;">Tax</span>
          <span style="font-size: 14px; font-weight: 600; color: #1c1917;">$${data.taxAmount.toFixed(2)}</span>
        </div>` : ""}
        <div style="display: flex; justify-content: space-between; margin: 8px 0 0; padding-top: 12px; border-top: 1px solid #e7e5e4;">
          <span style="font-size: 16px; font-weight: 800; color: #1c1917;">Total Paid</span>
          <span style="font-size: 16px; font-weight: 800; color: #1c1917;">$${data.total.toFixed(2)}</span>
        </div>
      </div>

      <!-- Pickup / Shipping details -->
      ${pickupBlock}

      <!-- Olathe Sweet callout -->
      <div style="background: #fafaf9; border-radius: 10px; padding: 16px 20px; margin-top: 24px; display: flex; align-items: center; gap: 12px;">
        <img src="${OLATHE_SWEET_LOGO}"
             alt="Olathe Sweet" style="height: 28px; width: auto; object-fit: contain; opacity: 0.7; flex-shrink: 0;" />
        <p style="margin: 0; font-size: 12px; color: #78716c; line-height: 1.5;">
          Grown in Olathe, Colorado — Non-GMO · Hand-Picked · Farm-Direct
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #a8a29e;">
        Questions? Reply to this email or contact us at <a href="mailto:hello@tuxedocorn.com" style="color: #78716c;">hello@tuxedocorn.com</a>
      </p>
      <p style="margin: 8px 0 0; font-size: 11px; color: #d6d3d1;">
        © ${new Date().getFullYear()} Tuxedo Corn · 59751 David Road, Olathe, CO 81425
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Order Confirmed — Tuxedo Corn (Order #${data.orderId.slice(0, 8).toUpperCase()})

Hi ${data.customerName.split(" ")[0]},

Your order is confirmed.${pickupInfo
      ? `\n\nPickup: ${data.stopCity}, ${data.stopState}\nDate: ${data.stopDate}${data.stopTime ? ` at ${data.stopTime}` : ""}\nLocation: ${data.stopLocation ?? ""}`
      : "\n\nShipping: Cooler boxes ship after the season ends."}

Items:
${data.items.map((i) => `  ${i.name} × ${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`).join("\n")}

Subtotal: $${data.subtotal.toFixed(2)}${data.taxAmount > 0 ? `\nTax: $${data.taxAmount.toFixed(2)}` : ""}
Total: $${data.total.toFixed(2)}

Grown in Olathe, Colorado — Non-GMO · Hand-Picked · Farm-Direct
Questions? Reply to this email or contact hello@tuxedocorn.com`;

  return sendEmail({
    to: data.customerEmail,
    subject: `Your Order is Confirmed — Tuxedo Corn #${data.orderId.slice(0, 8).toUpperCase()}`,
    html,
    text,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome Email — sent to new admin or wholesale users
// ─────────────────────────────────────────────────────────────────────────────

export type WelcomeEmailData = {
  to: string;
  name: string;
  role: "brand_admin" | "wholesale_buyer" | "store_employee";
  brandName?: string;
  tempPassword?: string;
  setupUrl?: string;
};

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const roleLabel =
    data.role === "brand_admin" ? "Admin"
      : data.role === "wholesale_buyer" ? "Wholesale Buyer"
      : "Store Employee";

  const brandBlock = data.brandName
    ? `<p style="margin: 4px 0 0; font-size: 14px; color: #57534e;">Brand: <strong>${data.brandName}</strong></p>`
    : "";

  const nextSteps = data.role === "brand_admin" ? `
    <div style="background: #fafaf9; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
      <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c;">Your first steps</p>
      <ol style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: #57534e; line-height: 2;">
        <li>Visit <strong>/admin/settings/brand</strong> to add your company info and logos</li>
        <li>Add your first product under <strong>Products</strong></li>
        <li>Create a stop under <strong>Tours & Stops</strong></li>
        <li>Configure payments under <strong>Settings → Payments</strong></li>
      </ol>
    </div>`
    : data.role === "wholesale_buyer" ? `
    <div style="background: #fafaf9; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
      <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c;">What you can do</p>
      <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: #57534e; line-height: 2;">
        <li>Browse and order products at your assigned wholesale pricing</li>
        <li>Track your order history and upcoming deliveries</li>
        <li>Manage billing with net-30 terms (if approved)</li>
      </ul>
    </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Tuxedo Corn</title>
</head>
<body style="margin: 0; padding: 0; background: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="background: #1c1917; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <img src="${TUXEDO_LOGO}"
           alt="Tuxedo Corn" style="height: 36px; width: auto; object-fit: contain; margin-bottom: 16px;" />
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Welcome, ${data.name.split(" ")[0]}</h1>
      <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.6);">Your ${roleLabel} account is ready</p>
      ${brandBlock}
    </div>

    <!-- Body -->
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e7e5e4;">
      <p style="margin: 0 0 16px; font-size: 14px; color: #57534e; line-height: 1.7;">
        Your account has been created on the Route Commerce platform and is now active for <strong>${data.brandName ?? "this brand"}</strong>.
      </p>
      ${nextSteps}
      <div style="margin-top: 24px; padding: 16px 20px; background: #f0fdf4; border-radius: 10px;">
        <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.6;">
          <strong>Need help?</strong> Reply to this email or reach us at <a href="mailto:hello@tuxedocorn.com" style="color: #15803d;">hello@tuxedocorn.com</a> — we respond same business day.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #a8a29e;">
        © ${new Date().getFullYear()} Tuxedo Corn · Route Commerce Platform
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Welcome to Tuxedo Corn, ${data.name.split(" ")[0]}

Your ${roleLabel} account is now active${data.brandName ? ` for ${data.brandName}` : ""}.

${data.role === "brand_admin" ? `
First steps:
1. Visit /admin/settings/brand — add company info and logos
2. Add your first product
3. Create a stop under Tours & Stops
4. Configure payments under Settings → Payments
` : data.role === "wholesale_buyer" ? `
You can now:
- Browse and order products at your wholesale pricing
- Track your order history and upcoming deliveries
- Manage billing with net-30 terms (if approved)
` : ""}

Need help? Reply to this email or contact hello@tuxedocorn.com
`;

  return sendEmail({
    to: data.to,
    subject: `Welcome to Tuxedo Corn — ${roleLabel} Account Ready`,
    html,
    text,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Password Reset Email — triggered by Supabase auth (custom template via Resend)
// Note: Supabase handles the reset flow by default; this can be used as a
// custom template if you configure Resend as the SMTP provider in Supabase.
// ─────────────────────────────────────────────────────────────────────────────

export type PasswordResetData = {
  to: string;
  name: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <div style="background: #1c1917; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <img src="${TUXEDO_LOGO}"
           alt="Tuxedo Corn" style="height: 32px; width: auto; object-fit: contain; margin-bottom: 16px;" />
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">Reset Your Password</h1>
    </div>
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e7e5e4;">
      <p style="margin: 0 0 16px; font-size: 14px; color: #57534e; line-height: 1.7;">
        Hi <strong>${data.name.split(" ")[0]}</strong>, we received a request to reset your password.
        Click the button below to set a new password. This link expires in 1 hour.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${data.resetUrl}"
           style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px;">
          Reset Password
        </a>
      </div>
      <p style="margin: 0; font-size: 13px; color: #a8a29e; text-align: center; line-height: 1.6;">
        If you didn't request this, you can safely ignore this email.<br />
        This link expires in 1 hour and can only be used once.
      </p>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #a8a29e;">
        © ${new Date().getFullYear()} Tuxedo Corn · Route Commerce Platform
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Reset Your Password — Tuxedo Corn

Hi ${data.name.split(" ")[0]},

We received a request to reset your password. Click the link below to set a new password:

${data.resetUrl}

This link expires in 1 hour and can only be used once.

If you didn't request this, you can safely ignore this email.`;

  return sendEmail({
    to: data.to,
    subject: "Reset Your Password — Tuxedo Corn",
    html,
    text,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Operational Alert — future-proof alert for low stock, system events, etc.
// ─────────────────────────────────────────────────────────────────────────────

export type OperationalAlertData = {
  to: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  brandName?: string;
  actionUrl?: string;
  actionLabel?: string;
};

export async function sendOperationalAlert(data: OperationalAlertData): Promise<boolean> {
  const severityConfig = {
    info:    { bg: "#1e3a5f", label: "Notice" },
    warning: { bg: "#b45309", label: "Warning" },
    critical: { bg: "#991b1b", label: "Critical" },
  };
  const cfg = severityConfig[data.severity] ?? severityConfig.info;

  const brandBadge = data.brandName
    ? `<span style="display: inline-block; background: rgba(255,255,255,0.15); padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px;">${data.brandName}</span>`
    : "";

  const actionBlock = (data.actionUrl && data.actionLabel)
    ? `<div style="text-align: center; margin: 28px 0 0;">
        <a href="${data.actionUrl}"
           style="display: inline-block; background: #ffffff; color: ${cfg.bg}; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
          ${data.actionLabel}
        </a>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="margin: 0; padding: 0; background: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <div style="background: ${cfg.bg}; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(255,255,255,0.7);">${cfg.label}</p>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${data.title}</h1>
      ${brandBadge}
    </div>
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e7e5e4;">
      <p style="margin: 0; font-size: 15px; color: #57534e; line-height: 1.7;">${data.message}</p>
      ${actionBlock}
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #a8a29e;">
        Route Commerce Platform · Powered by Tuxedo Corn
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `[${cfg.label.toUpperCase()}] ${data.title}

${data.message}

${data.actionUrl ? `${data.actionLabel}: ${data.actionUrl}` : ""}`;

  return sendEmail({
    to: data.to,
    subject: `[${cfg.label}] ${data.title}`,
    html,
    text,
  });
}