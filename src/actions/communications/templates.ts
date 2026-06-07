"use server";

import { and, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { withTenant, withPlatformAdmin } from "@/db/client";
import { emailTemplates } from "@/db/schema";

export type TemplateType = "email_template" | "sms_template" | "internal_note";
export type CampaignType = "marketing" | "operational" | "transactional";

/**
 * The new `email_templates` table stores `name`, `subject`, and
 * `body_html`. Legacy `communication_templates` rows also tracked
 * `body_text`, `template_type`, `campaign_type`, and `created_by`.
 * The fields below mirror the new columns. `body_text` is
 * intentionally absent — clients that need a plain-text version can
 * strip HTML. `template_type` and `campaign_type` are not stored; the
 * UI surfaces "email" as the only type until further schema work.
 */
export type Template = {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string;
  template_type: TemplateType;
  campaign_type: CampaignType | null;
  created_at: string;
  updated_at: string;
};

export type UpsertTemplateResult = {
  success: true;
  template: Template;
} | {
  success: false;
  error: string;
};

function rowToTemplate(row: typeof emailTemplates.$inferSelect): Template {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    name: row.name,
    subject: row.subject,
    body_text: stripHtml(row.bodyHtml),
    body_html: row.bodyHtml,
    template_type: "email_template",
    campaign_type: null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getCommunicationTemplates(brandId?: string): Promise<{ success: true; templates: Template[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, error: "Brand access required" };
  }

  if (adminUser.role === "brand_admin" && activeBrandId && activeBrandId !== adminUser.brand_id) {
    return { success: true, templates: [] };
  }

  try {
    const rows = activeBrandId
      ? await withTenant(activeBrandId, (db) =>
          db
            .select()
            .from(emailTemplates)
            .orderBy(emailTemplates.updatedAt),
        )
      : await withPlatformAdmin((db) =>
          db
            .select()
            .from(emailTemplates)
            .orderBy(emailTemplates.updatedAt),
        );

    return { success: true, templates: rows.map(rowToTemplate) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch templates",
    };
  }
}

export async function upsertTemplate(params: {
  id?: string;
  brand_id: string;
  name: string;
  subject: string;
  body_text: string;
  body_html?: string;
  template_type: TemplateType;
  campaign_type?: CampaignType;
}): Promise<UpsertTemplateResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const bodyHtml =
    params.body_html && params.body_html.length > 0
      ? params.body_html
      : `<p style="white-space:pre-wrap">${escapeHtml(params.body_text)}</p>`;

  try {
    const row = params.id
      ? await withTenant(params.brand_id, async (db) => {
          const updated = await db
            .update(emailTemplates)
            .set({
              name: params.name,
              subject: params.subject,
              bodyHtml,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(emailTemplates.id, params.id!),
                eq(emailTemplates.tenantId, params.brand_id),
              ),
            )
            .returning();
          return updated[0] ?? null;
        })
      : await withTenant(params.brand_id, async (db) => {
          const inserted = await db
            .insert(emailTemplates)
            .values({
              tenantId: params.brand_id,
              name: params.name,
              subject: params.subject,
              bodyHtml,
            })
            .returning();
          return inserted[0] ?? null;
        });

    if (!row) return { success: false, error: "Failed to save template" };
    return { success: true, template: rowToTemplate(row) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save template",
    };
  }
}

export async function getTemplateById(templateId: string): Promise<Template | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  const activeBrandId = await getActiveBrandId(adminUser);

  try {
    const row = activeBrandId
      ? await withTenant(activeBrandId, (db) =>
          db
            .select()
            .from(emailTemplates)
            .where(
              and(
                eq(emailTemplates.id, templateId),
                eq(emailTemplates.tenantId, activeBrandId),
              ),
            )
            .limit(1)
            .then((r) => r[0] ?? null),
        )
      : await withPlatformAdmin((db) =>
          db
            .select()
            .from(emailTemplates)
            .where(eq(emailTemplates.id, templateId))
            .limit(1)
            .then((r) => r[0] ?? null),
        );

    if (!row) return null;

    if (adminUser.role === "brand_admin" && row.tenantId !== adminUser.brand_id) {
      return null;
    }

    return rowToTemplate(row);
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
