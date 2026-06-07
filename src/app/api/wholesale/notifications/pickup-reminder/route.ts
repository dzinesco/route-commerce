import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// POST /api/wholesale/notifications/pickup-reminder
// Scans for fulfilled orders past their anticipated pickup date that haven't been
// picked up, and enqueues unclaimed_pickup notifications for each.
// Designed to be called daily via cron or from the notification send loop.

export const dynamic = "force-dynamic";

export async function POST() {
  // Find orders: fulfilled status, past anticipated pickup date, not yet picked up
  const ordersRes = await pool.query<{
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
  }>(
    "SELECT * FROM get_wholesale_overdue_orders()"
  );

  if (ordersRes.rows.length === 0) {
    return NextResponse.json({ message: "No overdue orders found.", enqueued: 0 });
  }

  const overdueOrders = ordersRes.rows;

  let enqueued = 0;
  let skipped = 0;

  for (const order of overdueOrders) {
    if (!order.customer_email) {
      skipped++;
      continue;
    }

    const adminEmail =
      order.notification_email ?? order.from_email ?? order.invoice_business_email;

    try {
      await pool.query(
        "SELECT enqueue_wholesale_notification($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          order.brand_id,
          order.customer_id,
          order.id,
          "unclaimed_pickup",
          order.customer_email,
          adminEmail,
          `Overdue Pickup — Order ${order.invoice_number ?? order.id.slice(0, 8)}`,
          `
            <h2>Order Overdue for Pickup</h2>
            <p>Your order <strong>${order.invoice_number ?? order.id.slice(0, 8)}</strong> was due for pickup on <strong>${order.anticipated_pickup_date}</strong> and has not yet been picked up.</p>
            ${order.pickup_location ? `<p><strong>Pickup location:</strong> ${order.pickup_location}</p>` : ""}
            <p>Please arrange pickup as soon as possible. Contact us if you have any questions.</p>
          `,
          `Order ${order.invoice_number ?? order.id.slice(0, 8)} was due for pickup on ${order.anticipated_pickup_date} and has not been picked up.${order.pickup_location ? ` Pickup location: ${order.pickup_location}.` : ""} Please arrange pickup or contact us with any questions.`,
        ]
      );
      enqueued++;
    } catch {
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
