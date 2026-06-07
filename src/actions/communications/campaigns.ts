"use server";

import { and, desc, eq, SQL } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { withTenant, withPlatformAdmin } from "@/db/client";
import { campaigns, emailTemplates } from "@/db/schema";

export type CampaignType = "marketing" | "operational" | "transactional";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "canceled";

export type AudienceRules = {
  target?: "stop" | "zip_code" | "customer_history" | "product" | "customer_ids" | "all_customers";
  stop_id?: string;
  date_from?: string;
  date_to?: string;
  zip_codes?: string[];
  city?: string;
  order_history?: "all" | "first_order" | "repeat";
  days_back?: number;
  product_id?: string;
  customer_ids?: string[];
};

/**
 * The denormalized Campaign shape consumed by the admin UI. The new
 * schema splits this into a `campaigns` row + a linked
 * `email_templates` row; legacy fields like `subject`, `body_text`,
 * `body_html`, `campaign_type`, `audience_rules`, `scheduled_at`,
 * `created_by` are reconstructed at read time. Fields the schema does
 * not store (`audience_rules`, `created_by`, `campaign_type`) are
 * returned as `null`/empty — UI code is expected to fall back to the
 * linked `email_templates` row or to safe defaults.
 */
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

export type UpsertCampaignResult = {
  success: true;
  campaign: Campaign;
} | {
  success: false;
  error: string;
};

export type ListCampaignsResult = {
  success: true;
  campaigns: Campaign[];
} | {
  success: false;
  error: string;
};

type CampaignRow = typeof campaigns.$inferSelect;
type TemplateRow = typeof emailTemplates.$inferSelect;

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowToCampaign(c: CampaignRow, t?: TemplateRow | null): Campaign {
  return {
    id: c.id,
    brand_id: c.tenantId,
    name: c.name,
    subject: t?.subject ?? null,
    body_text: stripHtml(t?.bodyHtml ?? null),
    body_html: t?.bodyHtml ?? null,
    template_id: c.templateId,
    campaign_type: "operational",
    status: c.status as CampaignStatus,
    audience_rules: {},
    scheduled_at: c.scheduledFor ? c.scheduledFor.toISOString() : null,
    sent_at: c.sentAt ? c.sentAt.toISOString() : null,
    created_by: null,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export async function getCommunicationCampaigns(brandId?: string): Promise<ListCampaignsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, error: "Brand access required" };
  }

  try {
    const rows = activeBrandId
      ? await withTenant(activeBrandId, (db) =>
          db
            .select({
              campaign: campaigns,
              template: emailTemplates,
            })
            .from(campaigns)
            .leftJoin(emailTemplates, eq(emailTemplates.id, campaigns.templateId))
            .orderBy(desc(campaigns.createdAt)),
        )
      : await withPlatformAdmin((db) =>
          db
            .select({
              campaign: campaigns,
              template: emailTemplates,
            })
            .from(campaigns)
            .leftJoin(emailTemplates, eq(emailTemplates.id, campaigns.templateId))
            .orderBy(desc(campaigns.createdAt)),
        );

    return {
      success: true,
      campaigns: rows.map((r) => rowToCampaign(r.campaign, r.template)),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch campaigns",
    };
  }
}

/**
 * The `subject`/`body_html`/`body_text` arguments are persisted on a
 * linked `email_templates` row: if `template_id` is supplied, that row
 * is updated; otherwise a new template is created and the campaign
 * links to it. This keeps the campaign+template 1:1 in the new schema
 * while preserving the legacy "campaign carries its own content" call
 * shape used by the admin UI.
 */
export async function upsertCampaign(params: {
  id?: string;
  brand_id: string;
  name: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  template_id?: string;
  campaign_type: CampaignType;
  status?: CampaignStatus;
  audience_rules?: AudienceRules;
  scheduled_at?: string;
}): Promise<UpsertCampaignResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brand_id) {
    return { success: false, error: "Not authorized to operate on this brand's campaigns" };
  }

  try {
    const scheduled = params.scheduled_at ? new Date(params.scheduled_at) : null;
    const status: CampaignStatus = params.status ?? "draft";
    const subject = params.subject ?? "";
    const bodyHtml = params.body_html ?? (params.body_text ? `<p style="white-space:pre-wrap">${escapeHtml(params.body_text)}</p>` : "<p></p>");

    const { row, template } = await withTenant(params.brand_id, async (db) => {
      // Resolve / create the linked email_templates row.
      let templateId: string | null = params.template_id ?? null;
      let templateRow: TemplateRow | null = null;

      if (templateId) {
        const existing = await db
          .select()
          .from(emailTemplates)
          .where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.tenantId, params.brand_id)))
          .limit(1);
        if (existing[0]) {
          const updated = await db
            .update(emailTemplates)
            .set({ name: params.name, subject, bodyHtml, updatedAt: new Date() })
            .where(eq(emailTemplates.id, templateId))
            .returning();
          templateRow = updated[0] ?? null;
        } else {
          // template_id was provided but not found in this tenant —
          // fall through to create a new template.
          templateId = null;
        }
      }

      if (!templateId) {
        const inserted = await db
          .insert(emailTemplates)
          .values({
            tenantId: params.brand_id,
            name: params.name,
            subject,
            bodyHtml,
          })
          .returning();
        templateId = inserted[0]?.id ?? null;
        templateRow = inserted[0] ?? null;
      }

      // Upsert the campaign row.
      let campaignRow: CampaignRow;
      if (params.id) {
        const updated = await db
          .update(campaigns)
          .set({
            name: params.name,
            templateId,
            status,
            scheduledFor: scheduled,
            updatedAt: new Date(),
          })
          .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, params.brand_id)))
          .returning();
        if (!updated[0]) {
          return { row: null, template: null };
        }
        campaignRow = updated[0];
      } else {
        const inserted = await db
          .insert(campaigns)
          .values({
            tenantId: params.brand_id,
            name: params.name,
            templateId,
            status,
            scheduledFor: scheduled,
          })
          .returning();
        campaignRow = inserted[0];
      }

      return { row: campaignRow, template: templateRow };
    });

    if (!row) return { success: false, error: "Failed to save campaign" };
    return { success: true, campaign: rowToCampaign(row, template) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save campaign",
    };
  }
}

export async function deleteCampaign(campaignId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const activeBrandId = await getActiveBrandId(adminUser, brandId);

  if (adminUser.role === "brand_admin" && activeBrandId && adminUser.brand_id !== activeBrandId) {
    return { success: false, error: "Not authorized to delete this brand's campaigns" };
  }

  try {
    if (activeBrandId) {
      await withTenant(activeBrandId, (db) =>
        db.delete(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, activeBrandId))),
      );
    } else {
      await withPlatformAdmin((db) => db.delete(campaigns).where(eq(campaigns.id, campaignId)));
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete campaign",
    };
  }
}

export async function getCampaignById(campaignId: string, brandId?: string): Promise<Campaign | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  const activeBrandId = await getActiveBrandId(adminUser, brandId);

  try {
    const result = activeBrandId
      ? await withTenant(activeBrandId, (db) =>
          db
            .select({ campaign: campaigns, template: emailTemplates })
            .from(campaigns)
            .leftJoin(emailTemplates, eq(emailTemplates.id, campaigns.templateId))
            .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, activeBrandId)))
            .limit(1)
            .then((r) => r[0] ?? null),
        )
      : await withPlatformAdmin((db) =>
          db
            .select({ campaign: campaigns, template: emailTemplates })
            .from(campaigns)
            .leftJoin(emailTemplates, eq(emailTemplates.id, campaigns.templateId))
            .where(eq(campaigns.id, campaignId))
            .limit(1)
            .then((r) => r[0] ?? null),
        );

    if (!result) return null;

    if (adminUser.role === "brand_admin" && result.campaign.tenantId !== adminUser.brand_id) {
      return null;
    }

    return rowToCampaign(result.campaign, result.template);
  } catch {
    return null;
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

void SQL;
