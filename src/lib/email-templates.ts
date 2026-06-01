// Professional pre-built email template library
// Variables: {{first_name}}, {{company_name}}, {{stop_name}},
//           {{pickup_date}}, {{order_total}}, {{balance_due}}, {{due_date}},
//           {{item_summary}}, {{custom_message}}

export type EmailTemplate = {
  id: string;
  name: string;
  description: string;
  subject: string;
  body_text: string;
  body_html: string;
};

export const BUILT_IN_TEMPLATES: EmailTemplate[] = [
  {
    id: "order_confirmation",
    name: "Order Confirmation",
    description: "Professional order confirmation with item summary and pickup details",
    subject: "Your Order is Confirmed – {{company_name}}",
    body_text: `Dear {{first_name}},

Your order has been confirmed and is being prepared for pickup.

{{item_summary}}

Pickup Date: {{pickup_date}}
Location: {{stop_name}}

Thank you for choosing {{company_name}}. We'll see you soon!

– The {{company_name}} Team`,
    body_html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #1e3a5f; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
  .body { padding: 28px 32px; color: #334155; font-size: 15px; line-height: 1.6; }
  .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .info-grid { background: #f1f5f9; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .info-label { color: #64748b; }
  .info-value { font-weight: 600; text-align: right; }
  .items { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 14px; white-space: pre-wrap; }
  .message { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 13px; color: #64748b; text-align: center; }
  .cta { display: inline-block; background: #1e3a5f; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>Order Confirmed ✓</h1>
    <p>Thank you for your order with {{company_name}}</p>
  </div>
  <div class="body">
    <div class="greeting">Hi {{first_name}},</div>
    <p>Great news — your order is confirmed and we're getting it ready for you!</p>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Pickup Date</span><span class="info-value">{{pickup_date}}</span></div>
      <div class="info-row"><span class="info-label">Location</span><span class="info-value">{{stop_name}}</span></div>
      <div class="info-row"><span class="info-label">Order Total</span><span class="info-value">{{order_total}}</span></div>
    </div>
    {{#if item_summary}}
    <div class="items">{{item_summary}}</div>
    {{/if}}
    {{#if custom_message}}
    <div class="message">{{custom_message}}</div>
    {{/if}}
    <p>We'll send you a reminder as your pickup date approaches. See you soon!</p>
    <p style="margin-top:24px">— The {{company_name}} Team</p>
  </div>
  <div class="footer">© {{company_name}} · Questions? Reply to this email</div>
</div>
</body>
</html>`,
  },
  {
    id: "pickup_reminder",
    name: "Pickup Reminder",
    description: "Friendly reminder before pickup date with key details",
    subject: "Reminder: Your pickup is {{pickup_date}} – {{company_name}}",
    body_text: `Hi {{first_name}},

This is a friendly reminder that your order is scheduled for pickup:

📅 Date: {{pickup_date}}
📍 Location: {{stop_name}}
💰 Balance Due: {{balance_due}}

{{#if custom_message}}
{{custom_message}}
{{/if}}

See you soon!

{{company_name}} Team`,
    body_html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #0369a1; color: #fff; padding: 28px 32px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
  .body { padding: 28px 32px; color: #334155; font-size: 15px; line-height: 1.6; }
  .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .reminder-box { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
  .reminder-box .date { font-size: 24px; font-weight: 800; color: #0369a1; }
  .reminder-box .location { font-size: 14px; color: #64748b; margin-top: 4px; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #64748b; }
  .info-value { font-weight: 600; text-align: right; }
  .balance { background: #fff7ed; border-radius: 10px; padding: 16px 20px; margin: 16px 0; text-align: center; }
  .balance .amount { font-size: 28px; font-weight: 800; color: #ea580c; }
  .balance .label { font-size: 12px; color: #64748b; margin-top: 2px; }
  .message { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 13px; color: #64748b; text-align: center; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>⏰ Pickup Reminder</h1>
    <p>Your order is waiting for you!</p>
  </div>
  <div class="body">
    <div class="greeting">Hi {{first_name}},</div>
    <p>Just a quick reminder — your order is scheduled for pickup soon!</p>
    <div class="reminder-box">
      <div class="date">{{pickup_date}}</div>
      <div class="location">{{stop_name}}</div>
    </div>
    <div class="info-row"><span class="info-label">Company</span><span class="info-value">{{company_name}}</span></div>
    {{#if balance_due}}
    <div class="balance">
      <div class="amount">{{balance_due}}</div>
      <div class="label">Balance Due at Pickup</div>
    </div>
    {{/if}}
    {{#if custom_message}}
    <div class="message">{{custom_message}}</div>
    {{/if}}
    <p style="margin-top:24px">See you soon!<br>— {{company_name}} Team</p>
  </div>
  <div class="footer">© {{company_name}} · Questions? Reply to this email</div>
</div>
</body>
</html>`,
  },
  {
    id: "promotional",
    name: "Promotional / Newsletter",
    description: "Marketing newsletter with headline, body, and call to action",
    subject: "{{custom_subject}}",
    body_text: `{{first_name}},

{{custom_message}}

{{#if cta_text}}
{{cta_text}}: {{cta_url}}
{{/if}}

Thanks for being a valued customer!

{{company_name}} Team`,
    body_html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #7c3aed; color: #fff; padding: 32px; text-align: center; }
  .header .tag { background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .header h1 { margin: 0; font-size: 26px; font-weight: 800; line-height: 1.2; }
  .body { padding: 28px 32px; color: #334155; font-size: 15px; line-height: 1.7; }
  .body p { margin: 0 0 16px; }
  .divider { border: none; border-top: 2px solid #f1f5f9; margin: 24px 0; }
  .cta-wrap { text-align: center; margin: 28px 0; }
  .cta { display: inline-block; background: #7c3aed; color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; }
  .cta:hover { background: #6d28d9; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 13px; color: #64748b; text-align: center; }
  @media (max-width: 480px) {
    .header, .body { padding: 20px; }
    .header h1 { font-size: 22px; }
  }
</style></head>
<body>
<div class="container">
  <div class="header">
    {{#if tag}}
    <div class="tag">{{tag}}</div>
    {{/if}}
    <h1>{{headline}}</h1>
  </div>
  <div class="body">
    <p>Hi {{first_name}},</p>
    <p>{{custom_message}}</p>
    {{#if cta_text}}
    <div class="cta-wrap">
      <a href="{{cta_url}}" class="cta">{{cta_text}}</a>
    </div>
    {{/if}}
    <hr class="divider">
    <p style="font-size:13px; color:#94a3b8">You're receiving this because you're a {{company_name}} customer.</p>
  </div>
  <div class="footer">© {{company_name}} · <a href="{{unsubscribe_url}}" style="color:#64748b">Unsubscribe</a></div>
</div>
</body>
</html>`,
  },
  {
    id: "thank_you",
    name: "Thank You / Follow-Up",
    description: "Post-pickup thank you with follow-up call to action",
    subject: "Thanks for picking up with {{company_name}}!",
    body_text: `Dear {{first_name}},

Thank you for picking up your order from {{stop_name}}!

We hope everything was exactly as you expected. If you have any questions or feedback, please don't hesitate to reach out.

{{#if custom_message}}
{{custom_message}}
{{/if}}

We appreciate your business and look forward to seeing you again soon!

Warm regards,
{{company_name}} Team`,
    body_html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #15803d; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
  .body { padding: 28px 32px; color: #334155; font-size: 15px; line-height: 1.6; }
  .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .highlight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
  .highlight p { margin: 0; font-size: 14px; color: #166534; }
  .message-box { background: #f8fafc; border-left: 4px solid #64748b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 13px; color: #64748b; text-align: center; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>Thank You! 🙏</h1>
    <p>Your pickup from {{stop_name}} is complete</p>
  </div>
  <div class="body">
    <div class="greeting">Dear {{first_name}},</div>
    <p>Thank you for picking up your order with us. We hope everything was exactly as you expected!</p>
    <div class="highlight">
      <p>Questions or feedback? Reply to this email — we read every message.</p>
    </div>
    {{#if custom_message}}
    <div class="message-box">{{custom_message}}</div>
    {{/if}}
    <p style="margin-top:24px">We appreciate your business and look forward to seeing you again!<br><br>Warm regards,<br><strong>{{company_name}} Team</strong></p>
  </div>
  <div class="footer">© {{company_name}}</div>
</div>
</body>
</html>`,
  },
  {
    id: "deposit_request",
    name: "Deposit Request",
    description: "Professional deposit request for wholesale customers",
    subject: "Deposit Required – {{company_name}} Order",
    body_text: `Dear {{first_name}},

Your order with {{company_name}} is almost ready! To confirm and schedule production, we need a deposit to get started.

Order Total: {{order_total}}
Deposit Required: {{balance_due}}
Due By: {{due_date}}

{{#if custom_message}}
{{custom_message}}
{{/if}}

To pay your deposit, simply reply to this email or contact us directly.

Thank you,
{{company_name}} Team`,
    body_html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #b45309; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
  .body { padding: 28px 32px; color: #334155; font-size: 15px; line-height: 1.6; }
  .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .amount-box { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
  .amount-box .deposit { font-size: 36px; font-weight: 800; color: #b45309; }
  .amount-box .label { font-size: 13px; color: #92400e; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .amount-box .total { font-size: 14px; color: #64748b; margin-top: 8px; }
  .due-date { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 20px; margin: 16px 0; text-align: center; font-size: 14px; color: #991b1b; font-weight: 600; }
  .message { background: #f8fafc; border-left: 4px solid #64748b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 13px; color: #64748b; text-align: center; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>Deposit Required</h1>
    <p>Confirm your order with {{company_name}}</p>
  </div>
  <div class="body">
    <div class="greeting">Hi {{first_name}},</div>
    <p>Your order is in the queue! To confirm and schedule production, we need a deposit to get things started.</p>
    <div class="amount-box">
      <div class="deposit">{{balance_due}}</div>
      <div class="label">Deposit Required</div>
      <div class="total">Order Total: {{order_total}}</div>
    </div>
    {{#if due_date}}
    <div class="due-date">⏰ Please pay by {{due_date}}</div>
    {{/if}}
    {{#if custom_message}}
    <div class="message">{{custom_message}}</div>
    {{/if}}
    <p style="margin-top:24px">To pay your deposit, simply reply to this email or contact us directly. We accept cash, check, and wire transfer.<br><br>Thank you,<br><strong>{{company_name}} Team</strong></p>
  </div>
  <div class="footer">© {{company_name}} · Questions? Reply to this email</div>
</div>
</body>
</html>`,
  },
];

// Render a template with given variables (simple mustache-like substitution)
export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body_text: string; body_html: string } {
  function sub(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
  }

  return {
    subject: sub(template.subject),
    body_text: sub(template.body_text),
    body_html: sub(template.body_html),
  };
}

// Variables available in the template editor
export const TEMPLATE_VARIABLES = [
  { key: "first_name", label: "First Name", example: "Jane" },
  { key: "company_name", label: "Company Name", example: "Route Commerce" },
  { key: "stop_name", label: "Stop Name", example: "Tuxedo Warehouse" },
  { key: "pickup_date", label: "Pickup Date", example: "May 15, 2026" },
  { key: "order_total", label: "Order Total", example: "$450.00" },
  { key: "balance_due", label: "Balance Due", example: "$225.00" },
  { key: "due_date", label: "Due Date", example: "May 10, 2026" },
  { key: "item_summary", label: "Item Summary", example: "10× Tuxedo Set, 5× Shirt" },
  { key: "custom_message", label: "Custom Message", example: "See you at the stop!" },
  { key: "cta_text", label: "CTA Button Text", example: "Shop Now" },
  { key: "cta_url", label: "CTA URL", example: "https://..." },
  { key: "tag", label: "Newsletter Tag", example: "New Arrivals" },
  { key: "headline", label: "Headline", example: "Spring Collection is Here!" },
  { key: "unsubscribe_url", label: "Unsubscribe URL", example: "https://..." },
] as const;
