"use server";

import { and, eq, sql, SQL } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { withTenant, withPlatformAdmin } from "@/db/client";
import { campaigns, customers } from "@/db/schema";
import type { AudienceRules } from "./campaigns";

export type AudiencePreviewResult = {
  count: number;
  sample_customers: { id: string; email: string; name: string }[];
};

/**
 * The new schema does not store `audience_rules` on campaigns. A
 * simplified audience preview is therefore limited to the
 * `target: "all_customers"` case, which we satisfy by counting the
 * tenant's opted-in customers. Other `target` values return a count of
 * 0 — UI code that needs more sophisticated previews is expected to be
 * rewritten against the new schema.
 */
export async function previewCampaignAudience(
  brandId: string,
  audienceRules: AudienceRules
): Promise<AudiencePreviewResult | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return null;
  }

  if (audienceRules?.target && audienceRules.target !== "all_customers") {
    return { count: 0, sample_customers: [] };
  }

  try {
    const rows = await withTenant(brandId, (db) =>
      db
        .select({
          id: customers.id,
          email: customers.email,
          name: customers.name,
        })
        .from(customers)
        .where(and(eq(customers.tenantId, brandId), eq(customers.emailOptIn, true)))
        .limit(5),
    );

    const countRows = await withTenant(brandId, (db) =>
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(customers)
        .where(and(eq(customers.tenantId, brandId), eq(customers.emailOptIn, true))),
    );

    return {
      count: Number(countRows[0]?.value ?? rows.length),
      sample_customers: rows.map((r) => ({
        id: r.id,
        email: r.email ?? "",
        name: r.name,
      })),
    };
  } catch {
    return { count: 0, sample_customers: [] };
  }
}

export type MessageLogEntry = {
  id: string;
  brand_id: string;
  campaign_id: string | null;
  customer_id: string | null;
  customer_email: string | null;
  delivery_method: string;
  subject: string | null;
  body_preview: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  event_type: string | null;
  event_id: string | null;
  created_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
};

export type GetMessageLogsResult = {
  success: true;
  logs: MessageLogEntry[];
} | {
  success: false;
  error: string;
};

/**
 * The new schema does not have a `communication_message_logs` table —
 * the legacy per-recipient delivery log has been dropped. The Resend
 * webhook (`src/app/api/resend/webhook/route.ts`) is now a no-op until
 * a replacement log table is introduced. Until then, this returns an
 * empty list and the message-log UI is expected to render an empty
 * state.
 */
export async function getMessageLogs(params: {
  brandId: string;
  campaignId?: string;
  status?: string;
  limit?: number;
}): Promise<GetMessageLogsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brandId) {
    return { success: false, error: "Not authorized to view these logs" };
  }

  void params;
  return { success: true, logs: [] };
}

export type SendCampaignResult = {
  success: true;
  messages_logged: number;
} | {
  success: false;
  error: string;
};

/**
 * The legacy `send_campaign` RPC did the heavy lifting: audience
 * resolution, Resend dispatch, and per-recipient log inserts. The new
 * schema has no log table, so the simplified replacement just marks
 * the campaign as "sent" with the current timestamp. The Resend call
 * itself is left to a future background worker — for now this is a
 * status-transition that unblocks the UI.
 */
export async function sendCampaign(campaignId: string, brandId?: string): Promise<SendCampaignResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, error: "Brand access required" };
  }

  if (adminUser.role === "brand_admin" && activeBrandId && !adminUser.brand_ids.includes(activeBrandId)) {
    return { success: false, error: "Not authorized to send this brand's campaigns" };
  }

  const conds: SQL[] = [eq(campaigns.id, campaignId)];
  if (activeBrandId) conds.push(eq(campaigns.tenantId, activeBrandId));

  try {
    const updated = activeBrandId
      ? await withTenant(activeBrandId, (db) =>
          db
            .update(campaigns)
            .set({ status: "sent", sentAt: new Date() })
            .where(and(...conds))
            .returning({ id: campaigns.id, recipientCount: campaigns.recipientCount }),
        )
      : await withPlatformAdmin((db) =>
          db
            .update(campaigns)
            .set({ status: "sent", sentAt: new Date() })
            .where(and(...conds))
            .returning({ id: campaigns.id, recipientCount: campaigns.recipientCount }),
        );

    if (updated.length === 0) {
      return { success: false, error: "Campaign not found" };
    }

    return { success: true, messages_logged: updated[0].recipientCount };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send campaign",
    };
  }
}
