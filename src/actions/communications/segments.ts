"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import type { AudienceRules } from "./campaigns";

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

export async function getCommunicationSegments(
  brandId: string
): Promise<ListSegmentsResult> {
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

export async function deleteSegment(
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