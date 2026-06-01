"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import type { AudienceRules } from "@/actions/communications/campaigns";

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

// ──────────────────────────────────────────────────────────────
// getHarvestReachCampaigns
// ──────────────────────────────────────────────────────────────

export async function getHarvestReachCampaigns(
  brandId: string
): Promise<{ success: true; campaigns: Campaign[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_campaigns`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch campaigns" };
  const data = await response.json();
  return { success: true, campaigns: data?.campaigns ?? [] };
}

// ──────────────────────────────────────────────────────────────
// getCampaignAnalytics
// ──────────────────────────────────────────────────────────────

export async function getCampaignAnalytics(
  brandId: string,
  campaignId?: string
): Promise<CampaignAnalytics[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_campaign_analytics`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_campaign_id: campaignId ?? null,
      }),
    }
  );

  if (!response.ok) return [];
  return (await response.json()) as CampaignAnalytics[];
}