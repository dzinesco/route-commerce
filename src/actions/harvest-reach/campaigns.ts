"use server";

import { desc, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant, withPlatformAdmin } from "@/db/client";
import { campaigns } from "@/db/schema";
import type { AudienceRules } from "@/actions/communications/campaigns";

/**
 * `harvest-reach/campaigns` re-exports the marketing `Campaign` shape
 * but adds an analytics helper. The data layer is shared with
 * `actions/communications/campaigns.ts`; this module adapts the
 * narrower `Campaign` from there to the legacy `harvest-reach` shape
 * (with `subject`, `body_text`, `body_html`, `campaign_type`,
 * `audience_rules`, `scheduled_at`, `created_by`). Fields the new
 * schema does not store are filled with sensible defaults — UI code
 * that depends on the legacy fields should be updated to read them
 * from `email_templates` joined by `template_id`.
 */

export type CampaignType = "marketing" | "operational" | "transactional";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "canceled";

export type Campaign = {
  id: string;
  brand_id: string;
  name: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  template_id: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  audience_rules: AudienceRules;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignAnalytics = {
  campaign_id: string;
  campaign_name: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  delivered_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  sent_at: string | null;
};

function rowToCampaign(row: typeof campaigns.$inferSelect): Campaign {
  return {
    id: row.id,
    brand_id: row.tenantId,
    name: row.name,
    subject: null,
    body_text: null,
    body_html: null,
    template_id: row.templateId,
    campaign_type: "operational",
    status: row.status as CampaignStatus,
    audience_rules: {},
    scheduled_at: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    sent_at: row.sentAt ? row.sentAt.toISOString() : null,
    created_by: null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function getHarvestReachCampaigns(
  brandId: string
): Promise<{ success: true; campaigns: Campaign[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const rows = await withTenant(brandId, (db) =>
      db
        .select()
        .from(campaigns)
        .orderBy(desc(campaigns.createdAt)),
    );
    return { success: true, campaigns: rows.map(rowToCampaign) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch campaigns",
    };
  }
}

/**
 * The legacy `get_campaign_analytics` RPC computed aggregate engagement
 * metrics from the per-recipient `communication_message_logs` table.
 * That table is gone in the new schema. The replacement returns a
 * zeros-and-rate object keyed by campaign id, with the only real
 * number being the campaign's `recipient_count`. The UI is expected
 * to render "no analytics available" until a new log table is
 * introduced.
 */
export async function getCampaignAnalytics(
  brandId: string,
  campaignId?: string
): Promise<CampaignAnalytics[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) return [];

  try {
    const rows = campaignId
      ? await withTenant(brandId, (db) =>
          db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, campaignId)),
        )
      : await withTenant(brandId, (db) =>
          db
            .select()
            .from(campaigns)
            .orderBy(desc(campaigns.createdAt)),
        );

    return rows.map((r) => ({
      campaign_id: r.id,
      campaign_name: r.name,
      total_sent: r.recipientCount,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      total_bounced: 0,
      delivered_rate: 0,
      open_rate: 0,
      click_rate: 0,
      bounce_rate: 0,
      sent_at: r.sentAt ? r.sentAt.toISOString() : null,
    }));
  } catch {
    return [];
  }
}

void withPlatformAdmin;
