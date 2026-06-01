"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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

export async function getCommunicationCampaigns(brandId?: string): Promise<ListCampaignsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const effectiveBrandId = brandId ?? adminUser.brand_id ?? null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_campaigns`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: effectiveBrandId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch campaigns" };
  const data = await response.json();
  return { success: true, campaigns: data?.campaigns ?? [] };
}

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

  // Brand scoping: brand_admin can only modify their own brand's campaigns
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brand_id) {
    return { success: false, error: "Not authorized to operate on this brand's campaigns" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_communication_campaign`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_id: params.id ?? null,
        p_brand_id: params.brand_id,
        p_name: params.name,
        p_subject: params.subject ?? null,
        p_body_text: params.body_text ?? null,
        p_body_html: params.body_html ?? null,
        p_template_id: params.template_id ?? null,
        p_campaign_type: params.campaign_type,
        p_status: params.status ?? "draft",
        p_audience_rules: params.audience_rules ?? {},
        p_scheduled_at: params.scheduled_at ?? null,
        p_created_by: adminUser.user_id,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.id) {
    return { success: false, error: data?.message ?? "Failed to save campaign" };
  }

  return { success: true, campaign: data };
}

export async function deleteCampaign(campaignId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // Brand scoping: brand_admin can only delete their own brand's campaigns
  if (adminUser.role === "brand_admin" && brandId && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized to delete this brand's campaigns" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_communication_campaign`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_campaign_id: campaignId, p_brand_id: adminUser.brand_id ?? null }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to delete campaign" };
  return { success: true };
}

export async function getCampaignById(campaignId: string, brandId?: string): Promise<Campaign | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_campaign_by_id`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_campaign_id: campaignId, p_brand_id: brandId ?? adminUser.brand_id ?? null }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  const campaign = data?.campaign ?? null;

  // Client-side brand validation
  if (campaign && adminUser.role === "brand_admin" && campaign.brand_id !== adminUser.brand_id) {
    return null;
  }

  return campaign;
}