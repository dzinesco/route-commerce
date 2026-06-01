"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getPaymentSettings } from "@/actions/payments";
import { svcHeaders } from "@/lib/svc-headers";

function getSquareBaseUrl(accessToken: string) {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

async function fetchSquarePayments(
  accessToken: string,
  locationId: string,
  since: string
) {
  const baseUrl = getSquareBaseUrl(accessToken);
  const response = await fetch(
    `${baseUrl}/v2/payments/list`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-16",
      },
      body: JSON.stringify({
        location_id: locationId,
        begin_time: since,
        order: "ASC",
        limit: 100,
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Square payments list failed: ${err}`);
  }
  return response.json();
}

async function fetchSquareOrder(accessToken: string, orderId: string) {
  const baseUrl = getSquareBaseUrl(accessToken);
  const response = await fetch(
    `${baseUrl}/v2/orders/${orderId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-16",
      },
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Square order fetch failed: ${err}`);
  }
  return response.json();
}

export type SyncResult = {
  success: boolean;
  synced: number;
  errors: string[];
};

export async function syncOrdersFromSquare(brandId: string): Promise<SyncResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, synced: 0, errors: ["Not authenticated"] };
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, synced: 0, errors: ["Not authorized"] };
  }

  const settingsResult = await getPaymentSettings(brandId);
  if (!settingsResult.success || !settingsResult.settings) {
    return { success: false, synced: 0, errors: ["Could not load payment settings"] };
  }
  const settings = settingsResult.settings;

  if (!settings.square_access_token || !settings.square_location_id) {
    return { success: false, synced: 0, errors: ["Square not connected or no location"] };
  }

  const errors: string[] = [];
  let synced = 0;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Determine sync start time — last sync or 30 days ago
  const since = settings.square_last_sync_at
    ? settings.square_last_sync_at
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const paymentsData = await fetchSquarePayments(
      settings.square_access_token,
      settings.square_location_id,
      since
    );

    for (const payment of paymentsData.payments ?? []) {
      try {
        // Skip if no order_id
        if (!payment.order_id) continue;
        // Skip if already completed/canceled
        if (!["COMPLETED", "APPROVED"].includes(payment.status ?? "")) continue;

        const orderData = await fetchSquareOrder(settings.square_access_token, payment.order_id);
        const order = orderData.order;

        // Build line items from Square order
        const lineItems = (order.line_items ?? []).map((li: {
          name: string;
          quantity: string;
          base_price_money: { amount: string; currency: string };
        }) => ({
          name: li.name,
          quantity: parseInt(li.quantity, 10),
          price: Number(li.base_price_money?.amount ?? 0) / 100,
        }));

        // Compute total
        const total = Number(order.total_money?.amount ?? payment.amount_money?.amount ?? 0) / 100;

        // Get customer info from payment
        const customerName = payment.customer_id ?? "Square Customer";
        const customerEmail = payment.receipt_number ?? "";

        // Use idempotency key to avoid duplicates
        const idempotencyKey = `square_${payment.id}`;

        const createRes = await fetch(
          `${supabaseUrl}/rest/v1/rpc/create_order_with_items`,
          {
            method: "POST",
            headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
            body: JSON.stringify({
              p_idempotency_key: idempotencyKey,
              p_customer_name: customerName,
              p_customer_email: customerEmail,
              p_customer_phone: "",
              p_stop_id: null, // Square orders don't have RC stop_id
              p_items: lineItems.map((li: { name: string; quantity: number; price: number }) => ({
                id: null, // product lookup not available in this flow
                quantity: li.quantity,
                fulfillment: "shipping",
              })),
              p_subtotal: total,
              p_payment_processor: "square",
              p_payment_status: "paid",
              p_payment_transaction_id: payment.id,
            }),
          }
        );

        if (createRes.ok || createRes.status === 409) {
          // 409 = already exists (idempotent)
          synced++;
        } else {
          const errText = await createRes.text();
          errors.push(`Payment ${payment.id}: ${errText.slice(0, 100)}`);
        }
      } catch (err) {
        errors.push(`Payment ${payment.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Sync error: ${String(err)}`);
  }

  return { success: errors.length === 0, synced, errors };
}