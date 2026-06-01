"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
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

// ──────────────────────────────────────────────────────────────
// getHarvestReachSegments
// ──────────────────────────────────────────────────────────────

export async function getHarvestReachSegments(
  brandId: string
): Promise<{ success: true; segments: Segment[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_segments`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch segments" };
  const data = await response.json();
  return { success: true, segments: data?.segments ?? [] };
}

// ──────────────────────────────────────────────────────────────
// upsertHarvestReachSegment
// ──────────────────────────────────────────────────────────────

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_communication_segment`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_id: params.id ?? null,
        p_brand_id: params.brand_id,
        p_name: params.name,
        p_description: params.description ?? null,
        p_rules: params.rules,
        p_created_by: adminUser.user_id,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to save segment" };
  const data = await response.json();
  return { success: true, segment: data };
}

// ──────────────────────────────────────────────────────────────
// deleteHarvestReachSegment
// ──────────────────────────────────────────────────────────────

export async function deleteHarvestReachSegment(
  segmentId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_communication_segment`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_segment_id: segmentId, p_brand_id: brandId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to delete segment" };
  return { success: true };
}

// ──────────────────────────────────────────────────────────────
// previewSegmentWithCustomers
// ──────────────────────────────────────────────────────────────

export async function previewSegmentWithCustomers(
  brandId: string,
  rules: SegmentRuleV2
): Promise<PreviewResult | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/preview_campaign_audience`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_audience_rules: rules,
      }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data as PreviewResult;
}