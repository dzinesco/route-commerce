"use server";

import { eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { brandSettings } from "@/db/schema";
import type { AudienceRules } from "./campaigns";

/**
 * The new schema does not have a `communication_segments` table.
 * Segments are stored as JSON inside `brand_settings.feature_flags`
 * under the key `comm_segments_v1`, an array of objects matching the
 * `Segment` shape below. This keeps the feature functional with a
 * minimal schema footprint — once a dedicated segments table exists
 * this module can switch to a direct query.
 */

const SEGMENTS_FLAG_KEY = "comm_segments_v1";

export type Segment = {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  rules: AudienceRules;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ListSegmentsResult =
  | { success: true; segments: Segment[] }
  | { success: false; error: string };

export type UpsertSegmentResult =
  | { success: true; segment: Segment }
  | { success: false; error: string };

function readSegments(flags: Record<string, unknown> | null): Segment[] {
  if (!flags) return [];
  const raw = flags[SEGMENTS_FLAG_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isSegment);
}

function isSegment(v: unknown): v is Segment {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.brand_id === "string" &&
    typeof s.name === "string" &&
    typeof s.rules === "object" &&
    s.rules !== null
  );
}

async function loadSegments(brandId: string): Promise<Segment[]> {
  const rows = await withTenant(brandId, (db) =>
    db
      .select({ flags: brandSettings.featureFlags })
      .from(brandSettings)
      .where(eq(brandSettings.tenantId, brandId))
      .limit(1),
  );
  return readSegments((rows[0]?.flags ?? null) as Record<string, unknown> | null);
}

async function saveSegments(brandId: string, segments: Segment[]): Promise<void> {
  await withTenant(brandId, async (db) => {
    const existing = await db
      .select({ flags: brandSettings.featureFlags })
      .from(brandSettings)
      .where(eq(brandSettings.tenantId, brandId))
      .limit(1);
    const baseFlags = (existing[0]?.flags ?? {}) as Record<string, unknown>;
    const nextFlags: Record<string, unknown> = {
      ...baseFlags,
      [SEGMENTS_FLAG_KEY]: segments,
    };
    await db
      .update(brandSettings)
      .set({ featureFlags: nextFlags, updatedAt: new Date() })
      .where(eq(brandSettings.tenantId, brandId));
  });
}

export async function getCommunicationSegments(
  brandId: string
): Promise<ListSegmentsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const segments = await loadSegments(brandId);
    return { success: true, segments };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch segments",
    };
  }
}

export async function upsertSegment(params: {
  id?: string;
  brand_id: string;
  name: string;
  description?: string;
  rules: AudienceRules;
}): Promise<UpsertSegmentResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brand_id) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const segments = await loadSegments(params.brand_id);
    const now = new Date().toISOString();
    let saved: Segment;
    if (params.id) {
      const idx = segments.findIndex((s) => s.id === params.id);
      if (idx === -1) {
        return { success: false, error: "Segment not found" };
      }
      saved = {
        ...segments[idx],
        name: params.name,
        description: params.description ?? null,
        rules: params.rules,
        updated_at: now,
      };
      segments[idx] = saved;
    } else {
      saved = {
        id: crypto.randomUUID(),
        brand_id: params.brand_id,
        name: params.name,
        description: params.description ?? null,
        rules: params.rules,
        created_by: adminUser.id,
        created_at: now,
        updated_at: now,
      };
      segments.push(saved);
    }
    await saveSegments(params.brand_id, segments);
    return { success: true, segment: saved };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save segment",
    };
  }
}

export async function deleteSegment(
  segmentId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const segments = await loadSegments(brandId);
    const filtered = segments.filter((s) => s.id !== segmentId);
    if (filtered.length === segments.length) {
      return { success: false, error: "Segment not found" };
    }
    await saveSegments(brandId, filtered);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete segment",
    };
  }
}
