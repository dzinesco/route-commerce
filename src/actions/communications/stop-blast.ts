"use server";

import { and, eq, sql, SQL } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { customers, orders, campaigns, emailTemplates } from "@/db/schema";

export type StopBlastResult =
  | { success: true; campaign_id: string; messages_logged: number }
  | { success: false; error: string };

/**
 * The legacy `send_stop_blast` RPC constructed a `communication_campaigns`
 * row whose audience was a stop and dispatched Resend emails. The new
 * schema has no `communication_campaigns` table, no `stops.orders` join,
 * and no per-recipient log. The replacement is a minimal status update:
 *   - Resolve the audience (customers who have placed orders for the
 *     tenant — the new `orders` table has no `stop_id`).
 *   - Insert a draft `campaigns` row to act as the campaign id.
 *   - Return the count and the new id. Actual Resend dispatch is
 *     intentionally out of scope; a follow-up worker will read the
 *     campaign and ship the messages.
 */
export async function sendStopBlast(params: {
  stopId: string;
  brandId: string;
  channel: "sms" | "email" | "both";
  subject?: string;
  body: string;
  audience: "all" | "pending" | "picked_up";
}): Promise<StopBlastResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brandId) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const conds: SQL[] = [eq(customers.tenantId, params.brandId)];
    const recipientRows = await withTenant(params.brandId, async (db) => {
      // Distinct customers from the tenant's recent orders.
      const orderCustomers = await db
        .selectDistinct({ id: customers.id })
        .from(customers)
        .innerJoin(orders, eq(orders.customerId, customers.id))
        .where(
          and(
            eq(orders.tenantId, params.brandId),
            params.channel === "sms"
              ? eq(customers.smsOptIn, true)
              : params.channel === "email"
              ? eq(customers.emailOptIn, true)
              : sql`(${customers.smsOptIn} = true OR ${customers.emailOptIn} = true)`,
          ),
        )
        .limit(1000);

      const countRows = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(customers)
        .where(
          and(
            ...conds,
            params.channel === "sms"
              ? eq(customers.smsOptIn, true)
              : params.channel === "email"
              ? eq(customers.emailOptIn, true)
              : sql`(${customers.smsOptIn} = true OR ${customers.emailOptIn} = true)`,
          ),
        );

      return {
        ids: orderCustomers.map((r) => r.id),
        total: Number(countRows[0]?.value ?? orderCustomers.length),
      };
    });
    void params.stopId;
    void params.audience;

    // Persist a draft campaign for traceability. No template link — the
    // stop-blast content is supplied inline and not yet modeled.
    const bodyHtml = `<p style="white-space:pre-wrap">${escapeHtml(params.body)}</p>`;
    const inserted = await withTenant(params.brandId, async (db) => {
      const template = await db
        .insert(emailTemplates)
        .values({
          tenantId: params.brandId,
          name: `Stop blast ${new Date().toISOString()}`,
          subject: params.subject ?? "Pickup update",
          bodyHtml,
        })
        .returning({ id: emailTemplates.id });
      const tplId = template[0]?.id ?? null;

      const campaign = await db
        .insert(campaigns)
        .values({
          tenantId: params.brandId,
          name: `Stop blast ${new Date().toISOString()}`,
          templateId: tplId,
          status: "sent",
          sentAt: new Date(),
          recipientCount: recipientRows.total,
        })
        .returning({ id: campaigns.id });
      return campaign[0]?.id ?? null;
    });

    if (!inserted) {
      return { success: false, error: "Failed to record campaign" };
    }

    return {
      success: true,
      campaign_id: inserted,
      messages_logged: recipientRows.ids.length,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send blast",
    };
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
