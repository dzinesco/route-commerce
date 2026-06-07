"use server";

import { and, eq, ilike, or, SQL, sql } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { customers, brandSettings } from "@/db/schema";
import type { AudienceRules } from "@/actions/communications/campaigns";

export type SegmentFilterType =
  | "all_customers"
  | "stop"
  | "upcoming_stop"
  | "product"
  | "zip_code"
  | "customer_history"
  | "tags";

export type SegmentFilterParams = {
  stop_id?: string;
  date_from?: string;
  date_to?: string;
  zip_codes?: string[];
  city?: string;
  order_history?: "all" | "first_order" | "repeat";
  days_back?: number;
  product_id?: string;
  tags?: string[];
};

export type SegmentFilter = {
  type: SegmentFilterType;
  params: SegmentFilterParams;
};

export type SegmentRuleV2 = {
  combinator: "AND" | "OR";
  filters: SegmentFilter[];
};

// AudienceRules is imported from @/actions/communications/campaigns

const SEGMENTS_FLAG_KEY = "comm_segments_v1";

export type Segment = {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  rules: SegmentRuleV2 | AudienceRules;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerSample = {
  id: string;
  email: string;
  name: string;
  tags: string[];
  phone: string | null;
};

export type PreviewResult = {
  count: number;
  sample_customers: CustomerSample[];
};

function isSegmentList(v: unknown): v is Segment[] {
  return Array.isArray(v) && v.every((s) => s && typeof s === "object" && "rules" in s);
}

async function loadSegments(brandId: string): Promise<Segment[]> {
  const rows = await withTenant(brandId, (db) =>
    db
      .select({ flags: brandSettings.featureFlags })
      .from(brandSettings)
      .where(eq(brandSettings.tenantId, brandId))
      .limit(1),
  );
  const raw = (rows[0]?.flags ?? {}) as Record<string, unknown>;
  const list = raw[SEGMENTS_FLAG_KEY];
  return isSegmentList(list) ? list : [];
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

export async function getHarvestReachSegments(
  brandId: string
): Promise<{ success: true; segments: Segment[] } | { success: false; error: string }> {
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

export async function upsertHarvestReachSegment(params: {
  id?: string;
  brand_id: string;
  name: string;
  description?: string;
  rules: SegmentRuleV2;
}): Promise<{ success: true; segment: Segment } | { success: false; error: string }> {
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
      if (idx === -1) return { success: false, error: "Segment not found" };
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

export async function deleteHarvestReachSegment(
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

/**
 * The legacy `preview_campaign_audience` RPC evaluated a (combinator +
 * filter[]) rule tree against a join of customers, orders, products,
 * etc. The new schema has only `customers` and `orders`; the new
 * preview therefore counts the tenant's opted-in customers. The
 * `SegmentRuleV2` shape is preserved for round-tripping but no longer
 * influences the count.
 */
export async function previewSegmentWithCustomers(
  brandId: string,
  rules: SegmentRuleV2
): Promise<PreviewResult | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return null;
  }
  void rules;

  const conds: SQL[] = [eq(customers.tenantId, brandId), eq(customers.emailOptIn, true)];

  try {
    const [samples, counts] = await withTenant(brandId, async (db) => {
      const sample = await db
        .select({
          id: customers.id,
          email: customers.email,
          name: customers.name,
          phone: customers.phone,
        })
        .from(customers)
        .where(and(...conds))
        .limit(5);
      const c = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(customers)
        .where(and(...conds));
      return [sample, c] as const;
    });

    return {
      count: Number(counts[0]?.value ?? 0),
      sample_customers: samples.map((s) => ({
        id: s.id,
        email: s.email ?? "",
        name: s.name,
        tags: [],
        phone: s.phone,
      })),
    };
  } catch {
    return { count: 0, sample_customers: [] };
  }
}

void or;
void ilike;
