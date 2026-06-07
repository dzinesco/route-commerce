"use server";

import { getAdminUser } from "@/lib/admin-permissions";

/**
 * The new schema does not have an `abandoned_carts` table. The legacy
 * "detect abandoned wholesale carts, enroll them, and run a 3-step
 * recovery email sequence" feature has been retired. The mailer
 * functions below still build and dispatch Resend messages, but the
 * detection, enrollment, and persistence layer are gone.
 */

export type AbandonedCart = {
  id: string;
  brand_id: string;
  customer_id: string | null;
  contact_email: string;
  contact_name: string | null;
  cart_snapshot: {
    items: { name: string; quantity: number; unit_price: number }[];
    subtotal: number;
    item_count: number;
  };
  brand_name: string | null;
  locale: string;
  sequence_step: number;
  last_email_sent_at: string | null;
  next_email_at: string | null;
  status: string;
  recovered_order_id: string | null;
  recovered_at: string | null;
  created_at: string;
};

export type GetAbandonedCartsResult = {
  success: true;
  carts: AbandonedCart[];
  stats: { total: number; recovered: number; active: number; expired: number };
} | { success: false; error: string };

// ── Sequence email intervals ───────────────────────────────────────────────────

const LOCALE_CART_SUBJECT: Record<string, Record<number, { subject: string; heading: string; body: string }>> = {
  en: {
    1: {
      subject: "Your cart is waiting — complete your order",
      heading: "Don't forget your order",
      body: "You left items in your cart. Complete your order before the pickup date fills up.",
    },
    2: {
      subject: "Still thinking it over? Your cart is still here",
      heading: "A little reminder",
      body: "Your wholesale order is still waiting. Lock in your pickup date before it books up.",
    },
    3: {
      subject: "Last chance — your cart expires soon",
      heading: "One more day to order",
      body: "This is your final reminder. After this, your cart will no longer be available.",
    },
  },
  es: {
    1: {
      subject: "Tu carrito te espera — completa tu pedido",
      heading: "No olvides tu pedido",
      body: "Dejaste artículos en tu carrito. Completa tu pedido antes de que se llene la fecha de recogida.",
    },
    2: {
      subject: "¿Aún lo estás pensando? Tu carrito sigue aquí",
      heading: "Un pequeño record",
      body: "Tu pedido al por mayor aún está esperando. Reserva tu fecha de recogida antes de que se llene.",
    },
    3: {
      subject: "Última oportunidad — tu carrito expira pronto",
      heading: "Un día más para ordenar",
      body: "Este es tu último recordatorio. Después de esto, tu carrito ya no estará disponible.",
    },
  },
};

// ── Get all carts (admin view) ─────────────────────────────────────────────────

export async function getAbandonedCarts(brandId: string): Promise<GetAbandonedCartsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  void brandId;
  // The abandoned_carts table has been retired. Return an empty list
  // and zeroed stats. The admin dashboard degrades to the empty state.
  return {
    success: true,
    carts: [],
    stats: { total: 0, recovered: 0, active: 0, expired: 0 },
  };
}

// ── Manually close an abandoned cart ──────────────────────────────────────────

export async function manuallyCloseAbandonedCart(
  cartId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  void cartId;
  void brandId;
  return { success: false, error: "Abandoned-cart persistence has been retired" };
}

// ── Build email HTML ───────────────────────────────────────────────────────────

function buildCartRecoveryEmail(params: {
  brandName: string;
  contactName: string | null;
  locale: string;
  step: number;
  cartSnapshot: AbandonedCart["cart_snapshot"];
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  const { brandName, contactName, locale, step, cartSnapshot, adminUrl } = params;
  const t = LOCALE_CART_SUBJECT[locale]?.[step] ?? LOCALE_CART_SUBJECT.en[step];
  const greeting = locale === "es"
    ? (contactName ? `Hola ${contactName}` : `Hola`)
    : (contactName ? `Hi ${contactName}` : `Hi there`);
  const ctaText = locale === "es" ? "Completar mi pedido" : "Complete my order";
  const footerText = locale === "es"
    ? "Este email fue enviado porque dejaste artículos en tu carrito."
    : "You received this email because you left items in your cart.";

  const itemsList = cartSnapshot.items
    .slice(0, 5)
    .map(
      item =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #27272a;color:#a8a29e">${item.name}</td><td style="padding:8px 0;border-bottom:1px solid #27272a;color:#fafafa;text-align:right">${item.quantity} × $${Number(item.unit_price).toFixed(2)}</td></tr>`
    )
    .join("");

  const subject = t.subject;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1c1917;border-radius:16px;padding:28px 32px;margin-bottom:24px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#a8a29e">${locale === "es" ? "Carrito abandonado" : "Abandoned Cart"}</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff">${t.heading}</h1>
    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.6)">${brandName}</p>
  </div>
  <div style="background:#18181b;border-radius:16px;padding:28px 32px;border:1px solid #27272a;margin-bottom:24px">
    <p style="margin:0 0 16px;font-size:14px;color:#fafafa">${greeting},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#a8a29e;line-height:1.6">${t.body}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
      ${itemsList}
      <tr><td style="padding:8px 0;color:#a8a29e">Total</td><td style="padding:8px 0;color:#fafafa;font-weight:700;text-align:right">$${Number(cartSnapshot.subtotal).toFixed(2)}</td></tr>
    </table>
    <a href="${adminUrl}" style="display:inline-block;width:100%;text-align:center;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px">${ctaText}</a>
  </div>
  <div style="text-align:center;margin-top:24px">
    <p style="margin:0;font-size:12px;color:#52525b">${footerText}</p>
  </div>
</div>
</body>
</html>`;

  const text = `[${brandName} - ${t.heading}]\n\n${greeting},\n\n${t.body}\n\nItems in cart (${cartSnapshot.item_count} items):\n${cartSnapshot.items.map(i => `- ${i.name}: ${i.quantity} × $${Number(i.unit_price).toFixed(2)}`).join("\n")}\nTotal: $${Number(cartSnapshot.subtotal).toFixed(2)}\n\nComplete your order: ${adminUrl}\n\n${footerText}`;

  return { subject, html, text };
}

// ── Internal: send one recovery email ─────────────────────────────────────────

export async function sendAbandonedCartEmail(
  cart: AbandonedCart,
  step: number,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUrl = `https://route-commerce-platform.vercel.app/admin/communications/abandoned-carts`;
  const { subject, html, text } = buildCartRecoveryEmail({
    brandName: cart.brand_name ?? "Our Farm",
    contactName: cart.contact_name,
    locale: cart.locale ?? "en",
    step,
    cartSnapshot: cart.cart_snapshot,
    adminUrl,
  });

  void brandId;
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
        to: [cart.contact_email],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Manually resend a specific email step ─────────────────────────────────────

export async function resendAbandonedCartEmail(
  cartId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  void cartId;
  void brandId;
  return { success: false, error: "Abandoned-cart persistence has been retired" };
}

// ── Mark cart as recovered when order is placed ────────────────────────────────

export async function markCartRecovered(cartId: string, orderId: string): Promise<void> {
  void cartId;
  void orderId;
  // No DB call — abandoned_carts persistence is gone.
}
