"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { svcHeaders } from "@/lib/svc-headers";
import type { AudienceRules } from "./campaigns";

export type AudiencePreviewResult = {
  count: number;
  sample_customers: { id: string; email: string; name: string }[];
};

export async function previewCampaignAudience(
  brandId: string,
  audienceRules: AudienceRules
): Promise<AudiencePreviewResult | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  // Brand scoping: brand_admin can only preview their own brand
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
        p_audience_rules: audienceRules ?? {},
      }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data as AudiencePreviewResult;
}

export type MessageLogEntry = {
  id: string;
  brand_id: string;
  campaign_id: string | null;
  customer_id: string | null;
  customer_email: string | null;
  delivery_method: string;
  subject: string | null;
  body_preview: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  event_type: string | null;
  event_id: string | null;
  created_at: string;
  // Analytics columns (populated by Resend webhook)
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
};

export type GetMessageLogsResult = {
  success: true;
  logs: MessageLogEntry[];
} | {
  success: false;
  error: string;
};

export async function getMessageLogs(params: {
  brandId: string;
  campaignId?: string;
  status?: string;
  limit?: number;
}): Promise<GetMessageLogsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // Brand scoping: brand_admin can only view their own brand's logs
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brandId) {
    return { success: false, error: "Not authorized to view these logs" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_message_logs`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_campaign_id: params.campaignId ?? null,
        p_status: params.status ?? null,
        p_limit: params.limit ?? 100,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch logs" };
  const data = await response.json();
  return { success: true, logs: data?.logs ?? [] };
}

export type SendCampaignResult = {
  success: true;
  messages_logged: number;
} | {
  success: false;
  error: string;
};

export async function sendCampaign(campaignId: string, brandId?: string): Promise<SendCampaignResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // Resolve brand from campaign or parameter (URL > cookie > legacy > first of brand_ids)
  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, error: "Brand access required" };
  }
  const effectiveBrandId = activeBrandId;

  // Brand scoping: brand_admin can only send their own brand's campaigns
  if (adminUser.role === "brand_admin" && effectiveBrandId && !adminUser.brand_ids.includes(effectiveBrandId)) {
    return { success: false, error: "Not authorized to send this brand's campaigns" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/send_campaign`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_campaign_id: campaignId, p_brand_id: effectiveBrandId }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to send campaign" };
  }

  return { success: true, messages_logged: data.messages_logged ?? 0 };
}