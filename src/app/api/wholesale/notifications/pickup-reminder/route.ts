import { NextResponse } from "next/server";
import { svcHeaders } from "@/lib/svc-headers";

// POST /api/wholesale/notifications/pickup-reminder
// Scans for fulfilled orders past their anticipated pickup date that haven't been
// picked up, and enqueues unclaimed_pickup notifications for each.
// Designed to be called daily via cron or from the notification send loop.

export const dynamic = "force-dynamic";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Find orders: fulfilled status, past anticipated pickup date, not yet picked up
  const ordersRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_overdue_orders`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({}),
    }
  );

  if (!ordersRes.ok) {
    return NextResponse.json({ error: "Failed to fetch overdue orders" }, { status: 500 });
  }

  const overdueOrders = await ordersRes.json() as Array<{
    id: string;
    brand_id: string;
    customer_id: string;
    invoice_number: string | null;
    anticipated_pickup_date: string;
    pickup_location: string | null;
    customer_email: string;
    notification_email: string | null;
    from_email: string | null;
    invoice_business_email: string | null;
  }>;

  if (overdueOrders.length === 0) {
    return NextResponse.json({ message: "No overdue orders found.", enqueued: 0 });
  }

  let enqueued = 0;
  let skipped = 0;

  for (const order of overdueOrders) {
    if (!order.customer_email) {
      skipped++;
      continue;
    }

    const adminEmail =
      order.notification_email ?? order.from_email ?? order.invoice_business_email;

    const enqueueRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_notification`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_brand_id: order.brand_id,
          p_customer_id: order.customer_id,
          p_order_id: order.id,
          p_type: "unclaimed_pickup",
          p_email_to: order.customer_email,
          p_email_cc: adminEmail,
          p_subject: `Overdue Pickup — Order ${order.invoice_number ?? order.id.slice(0, 8)}`,
          p_body_html: `
            <h2>Order Overdue for Pickup</h2>
            <p>Your order <strong>${order.invoice_number ?? order.id.slice(0, 8)}</strong> was due for pickup on <strong>${order.anticipated_pickup_date}</strong> and has not yet been picked up.</p>
            ${order.pickup_location ? `<p><strong>Pickup location:</strong> ${order.pickup_location}</p>` : ""}
            <p>Please arrange pickup as soon as possible. Contact us if you have any questions.</p>
          `,
          p_body_text: `Order ${order.invoice_number ?? order.id.slice(0, 8)} was due for pickup on ${order.anticipated_pickup_date} and has not been picked up.${order.pickup_location ? ` Pickup location: ${order.pickup_location}.` : ""} Please arrange pickup or contact us with any questions.`,
        }),
      }
    );

    if (enqueueRes.ok) {
      enqueued++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({
    message: `Pickup reminder scan complete.`,
    overdue_count: overdueOrders.length,
    enqueued,
    skipped,
  });
}
