"use server";

import { getAdminUser } from "@/lib/admin-permissions";

/**
 * The new schema does not have a `welcome_sequence` table. The legacy
 * "enroll a contact in a multi-step onboarding email sequence" feature
 * has been retired; the mailer functions below still build and send
 * Resend messages, but the persistence layer is gone. The functions
 * now return empty data and no-op on updates.
 */

export type WelcomeSequenceEntry = {
  id: string;
  brand_id: string;
  contact_id: string | null;
  contact_email: string;
  contact_name: string | null;
  brand_name: string | null;
  locale: string;
  sequence_step: number;
  last_email_sent_at: string | null;
  next_email_at: string | null;
  status: string;
  created_at: string;
};

export type GetWelcomeSequenceResult = {
  success: true;
  entries: WelcomeSequenceEntry[];
  stats: { total: number; completed: number; active: number; unsubscribed: number };
} | { success: false; error: string };

// ── Welcome email content (EN + ES) ──────────────────────────────────────────

type WelcomeEmailContent = {
  subject: string;
  heading: string;
  body: string;
  cta_text: string;
  cta_url: string;
};

const WELCOME_EMAILS: Record<string, Record<number, WelcomeEmailContent>> = {
  en: {
    1: {
      subject: "Welcome to {brand} — here's what to expect",
      heading: "You're in!",
      body: "Thanks for subscribing to {brand}'s wholesale updates. Here's what you can expect:\n\n• New product announcements before anyone else\n• Exclusive wholesale pricing\n• Seasonal availability alerts\n• Quick reorder from your saved preferences",
      cta_text: "Explore wholesale catalog",
      cta_url: "/wholesale",
    },
    2: {
      subject: "How wholesale ordering works with {brand}",
      heading: "Ordering is simple",
      body: "Here's how our wholesale process works:\n\n1. Browse the catalog and add items to your cart\n2. Checkout and pay online, or request an invoice\n3. Choose your pickup date at checkout\n4. We'll have your order ready when you arrive\n\nNo account required to browse — sign up only when you're ready to order.",
      cta_text: "See current availability",
      cta_url: "/wholesale/portal",
    },
    3: {
      subject: "Your first order is waiting — {brand} wholesale",
      heading: "Ready to try us out?",
      body: "If you've been thinking about placing your first wholesale order with {brand}, now's a great time.\n\nOur current seasonal selection includes produce from our farm and partner growers, sourced for freshness and quality.\n\nQuestions? Reply to this email — we read every message.",
      cta_text: "Start my first order",
      cta_url: "/wholesale/register",
    },
    4: {
      subject: "You're all set — wholesale updates from {brand}",
      heading: "You're all set",
      body: "You're now fully set up to receive wholesale updates from {brand}.\n\nWe'll send you occasional emails about new products, seasonal availability, and any special offers. No spam — just the useful stuff.\n\nYou can unsubscribe at any time.",
      cta_text: "Browse the catalog",
      cta_url: "/wholesale/portal",
    },
  },
  es: {
    1: {
      subject: "Bienvenido a {brand} — esto es lo que puedes esperar",
      heading: "¡Bienvenido!",
      body: "Gracias por suscribirte a las actualizaciones mayoristas de {brand}. Esto es lo que puedes esperar:\n\n• Anuncios de nuevos productos antes que nadie\n• Precios exclusivos al por mayor\n• Alertas de disponibilidad por temporada\n• Reorden rápido desde tus preferencias guardadas",
      cta_text: "Explorar catálogo mayorista",
      cta_url: "/wholesale",
    },
    2: {
      subject: "Cómo funciona el pedido al por mayor con {brand}",
      heading: "Ordenar es simple",
      body: "Así funciona nuestro proceso mayorista:\n\n1. Explora el catálogo y agrega artículos a tu carrito\n2. Paga en línea o solicita una factura\n3. Elige tu fecha de recogida al pagar\n4. Tendremos tu pedido listo cuando llegues\n\nNo necesitas cuenta para浏览 — regístrate solo cuando estés listo para ordenar.",
      cta_text: "Ver disponibilidad actual",
      cta_url: "/wholesale/portal",
    },
    3: {
      subject: "Tu primer pedido está esperando — {brand} mayorista",
      heading: "¿Listo para probarnos?",
      body: "Si has estado pensando en hacer tu primer pedido al por mayor con {brand}, ahora es un excelente momento.\n\nNuestra selección actual de temporada incluye productos de nuestra granja y productores asociados, seleccionados por su frescura y calidad.\n\n¿Preguntas? Responde a este correo — leemos cada mensaje.",
      cta_text: "Comenzar mi primer pedido",
      cta_url: "/wholesale/register",
    },
    4: {
      subject: "Todo listo — actualizaciones mayoristas de {brand}",
      heading: "Todo está listo",
      body: "Ahora estás completamente configurado para recibir actualizaciones mayoristas de {brand}.\n\nTe enviaremos correos ocasionales sobre nuevos productos, disponibilidad por temporada y ofertas especiales. Sin spam — solo cosas útiles.\n\nPuedes darte de baja en cualquier momento.",
      cta_text: "Explorar el catálogo",
      cta_url: "/wholesale/portal",
    },
  },
};

// ── Get all welcome sequence entries (admin view) ────────────────────────────

export async function getWelcomeSequence(brandId: string): Promise<GetWelcomeSequenceResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  // The welcome_sequence table has been retired; return an empty list
  // and zeroed stats. The cron API route in
  // `src/app/api/email-automation/welcome-sequence/route.ts` will see
  // an empty result and skip the per-brand work.
  void brandId;
  return {
    success: true,
    entries: [],
    stats: { total: 0, completed: 0, active: 0, unsubscribed: 0 },
  };
}

// ── Build welcome email HTML ───────────────────────────────────────────────────

function buildWelcomeEmail(params: {
  brandName: string;
  contactName: string | null;
  locale: string;
  step: number;
  ctaUrl: string;
}): { subject: string; html: string; text: string } {
  const { brandName, contactName, locale, step, ctaUrl } = params;
  const t = WELCOME_EMAILS[locale]?.[step] ?? WELCOME_EMAILS.en[step];
  const greeting = locale === "es"
    ? (contactName ? `Hola ${contactName}` : `Hola`)
    : (contactName ? `Hi ${contactName}` : `Hi there`);
  const fullCtaUrl = ctaUrl.startsWith("http") ? ctaUrl : `https://route-commerce-platform.vercel.app${ctaUrl}`;
  const footerText = locale === "es"
    ? "Te suscribiste a actualizaciones mayoristas de {brand}. Cancela la suscripción en cualquier momento."
    : "You subscribed to wholesale updates from {brand}. Unsubscribe at any time.";

  const subject = t.subject.replace("{brand}", brandName);
  const heading = t.heading;
  const body = t.body.replace(/{brand}/g, brandName);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1c1917;border-radius:16px;padding:28px 32px;margin-bottom:24px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#a8a29e">${locale === "es" ? "Bienvenido" : "Welcome"}</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">${heading}</h1>
    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.6)">${brandName}</p>
  </div>
  <div style="background:#18181b;border-radius:16px;padding:28px 32px;border:1px solid #27272a;margin-bottom:24px">
    <p style="margin:0 0 16px;font-size:14px;color:#fafafa">${greeting},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#a8a29e;line-height:1.7;white-space:pre-wrap">${body}</p>
    <a href="${fullCtaUrl}" style="display:inline-block;text-align:center;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;margin-top:8px">${t.cta_text}</a>
  </div>
  <div style="text-align:center;margin-top:24px">
    <p style="margin:0;font-size:12px;color:#52525b">${footerText.replace("{brand}", brandName)}</p>
  </div>
</div>
</body>
</html>`;

  const text = `[${brandName} - ${heading}]\n\n${greeting},\n\n${body}\n\n${t.cta_text}: ${fullCtaUrl}\n\n${footerText.replace("{brand}", brandName)}`;

  return { subject, html, text };
}

// ── Send one welcome email ─────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  entry: WelcomeSequenceEntry,
  step: number
): Promise<{ success: boolean; error?: string }> {
  const { brand_name, contact_name, locale, contact_email } = entry;
  const t = WELCOME_EMAILS[locale]?.[step] ?? WELCOME_EMAILS.en[step];
  const ctaUrl = t.cta_url;

  const { subject, html, text } = buildWelcomeEmail({
    brandName: brand_name ?? "Our Farm",
    contactName: contact_name,
    locale: locale ?? "en",
    step,
    ctaUrl,
  });

  const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
  if (!RESEND_API_KEY) return { success: false, error: "Resend not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL ?? "Route Commerce <no-reply@routecommerce.com>",
        to: [contact_email],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }

    // No DB to update — the welcome_sequence table is gone. Reporting
    // success here means the email was dispatched; the cron can move on.
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Manually resend a specific welcome email step ─────────────────────────────

export async function resendWelcomeEmail(
  entryId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  void entryId;
  void brandId;
  // The welcome_sequence table is gone — there is nothing to look up
  // and no draft email to redispatch from here. Manual resend is a
  // no-op until a new persistence layer is added.
  return { success: false, error: "Welcome sequence persistence has been retired" };
}
