"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { brandSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * The new schema does not have a `communication_settings` table. The
 * fields below are now read from `brand_settings.feature_flags` JSONB
 * (the same field that stores add-on toggles). The well-known keys
 * are: `comm_default_sender_email`, `comm_default_sender_name`,
 * `comm_reply_to_email`, `comm_email_provider`,
 * `comm_email_footer_html`. Missing keys fall back to sensible
 * defaults derived from the brand row.
 */
export type CommunicationSettings = {
  id: string;
  brand_id: string;
  default_sender_email: string | null;
  default_sender_name: string | null;
  reply_to_email: string | null;
  email_provider: string;
  email_footer_html: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertSettingsResult = {
  success: true;
  settings: CommunicationSettings;
} | {
  success: false;
  error: string;
};

function readFlag(
  flags: Record<string, unknown> | null,
  key: string
): string | null {
  if (!flags) return null;
  const v = flags[key];
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return null;
  return String(v);
}

export async function getCommunicationSettings(brandId: string): Promise<CommunicationSettings | null> {
  try {
    const rows = await withTenant(brandId, (db) =>
      db
        .select({
          tenantId: brandSettings.tenantId,
          featureFlags: brandSettings.featureFlags,
          updatedAt: brandSettings.updatedAt,
        })
        .from(brandSettings)
        .where(eq(brandSettings.tenantId, brandId))
        .limit(1),
    );

    const row = rows[0];
    if (!row) return null;

    const flags = (row.featureFlags ?? {}) as Record<string, unknown>;

    return {
      id: row.tenantId,
      brand_id: row.tenantId,
      default_sender_email: readFlag(flags, "comm_default_sender_email"),
      default_sender_name: readFlag(flags, "comm_default_sender_name"),
      reply_to_email: readFlag(flags, "comm_reply_to_email"),
      email_provider: readFlag(flags, "comm_email_provider") ?? "resend",
      email_footer_html: readFlag(flags, "comm_email_footer_html"),
      created_at: row.updatedAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function upsertCommunicationSettings(params: {
  brand_id: string;
  sender_email?: string;
  sender_name?: string;
  reply_to_email?: string;
  provider?: string;
  footer_html?: string;
}): Promise<UpsertSettingsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brand_id) {
    return { success: false, error: "Not authorized to modify this brand's communication settings" };
  }

  try {
    const updated = await withTenant(params.brand_id, async (db) => {
      const existing = await db
        .select({ flags: brandSettings.featureFlags })
        .from(brandSettings)
        .where(eq(brandSettings.tenantId, params.brand_id))
        .limit(1);
      const baseFlags = (existing[0]?.flags ?? {}) as Record<string, unknown>;
      const nextFlags: Record<string, unknown> = {
        ...baseFlags,
        comm_default_sender_email: params.sender_email ?? null,
        comm_default_sender_name: params.sender_name ?? null,
        comm_reply_to_email: params.reply_to_email ?? null,
        comm_email_provider: params.provider ?? "resend",
        comm_email_footer_html: params.footer_html ?? null,
      };

      const result = await db
        .update(brandSettings)
        .set({ featureFlags: nextFlags, updatedAt: new Date() })
        .where(eq(brandSettings.tenantId, params.brand_id))
        .returning({
          tenantId: brandSettings.tenantId,
          updatedAt: brandSettings.updatedAt,
        });
      return result[0] ?? null;
    });

    if (!updated) {
      return { success: false, error: "Brand settings not found" };
    }

    const settings: CommunicationSettings = {
      id: updated.tenantId,
      brand_id: updated.tenantId,
      default_sender_email: params.sender_email ?? null,
      default_sender_name: params.sender_name ?? null,
      reply_to_email: params.reply_to_email ?? null,
      email_provider: params.provider ?? "resend",
      email_footer_html: params.footer_html ?? null,
      created_at: updated.updatedAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    };

    return { success: true, settings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save settings",
    };
  }
}
