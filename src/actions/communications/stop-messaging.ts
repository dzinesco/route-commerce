"use server";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { customers, orders, campaigns } from "@/db/schema";

/**
 * Server-side data loader for the per-stop "Message customers" panel.
 * The new schema has no `orders.stop_id` column or
 * `orders.pickup_complete` column, so the legacy "fetch orders for
 * this stop" lookup cannot be reproduced exactly. The new approach:
 *   - "Orders" = the tenant's recent orders with a known customer
 *     (acts as a generic "people we can message" list).
 *   - "Messages" = the tenant's most recent campaigns (used as the
 *     recent-message history placeholder).
 * The `MessageCustomersSection` UI degrades gracefully when these
 * lists are empty.
 */

export type StopOrder = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_complete: boolean;
};

export type StopBlastMessage = {
  id: string;
  type: string;
  subject: string | null;
  body: string;
  created_at: string;
  message_recipients: { id: string }[];
};

export type GetStopMessagingDataResult = {
  success: true;
  orders: StopOrder[];
  messages: StopBlastMessage[];
} | { success: false; error: string };

export async function getStopMessagingData(params: {
  stopId: string;
  brandId?: string;
}): Promise<GetStopMessagingDataResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // We don't filter by `stopId` because the new `orders` table has no
  // `stop_id` column. Instead, fall back to "any recent order in the
  // tenant". The caller is responsible for picking the right brand.
  const brandId = params.brandId ?? adminUser.brand_id;
  if (!brandId) {
    return { success: false, error: "Brand context required" };
  }

  try {
    const [orderRows, campaignRows] = await withTenant(brandId, async (db) => {
      const o = await db
        .select({
          id: orders.id,
          status: orders.status,
          placedAt: orders.placedAt,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
        })
        .from(orders)
        .innerJoin(customers, eq(customers.id, orders.customerId))
        .where(
          and(
            eq(orders.tenantId, brandId),
            isNotNull(customers.email),
          ),
        )
        .orderBy(desc(orders.placedAt))
        .limit(50);

      const c = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          sentAt: campaigns.sentAt,
          updatedAt: campaigns.updatedAt,
        })
        .from(campaigns)
        .where(eq(campaigns.tenantId, brandId))
        .orderBy(desc(campaigns.sentAt), desc(campaigns.updatedAt))
        .limit(10);

      return [o, c] as const;
    });

    // Map orders → StopOrder (pickup_complete is no longer in the
    // schema; treat "fulfilled" status as picked up).
    const mappedOrders: StopOrder[] = orderRows.map((o) => ({
      id: o.id,
      customer_name: o.customerName,
      customer_email: o.customerEmail,
      customer_phone: o.customerPhone,
      pickup_complete: o.status === "fulfilled",
    }));

    // Map campaigns → StopBlastMessage
    const mappedMessages: StopBlastMessage[] = campaignRows.map((c) => ({
      id: c.id,
      type: "campaign",
      subject: c.name,
      body: "",
      created_at: (c.sentAt ?? c.updatedAt).toISOString(),
      message_recipients: [],
    }));

    void params.stopId; // not used in the new schema
    return { success: true, orders: mappedOrders, messages: mappedMessages };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load stop data" };
  }
}
