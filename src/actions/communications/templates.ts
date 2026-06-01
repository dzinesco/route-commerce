"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import type { AudienceRules } from "./campaigns";

export type TemplateType = "email_template" | "sms_template" | "internal_note";
export type CampaignType = "marketing" | "operational" | "transactional";

export type Template = {
  id: string;
  brand_id: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  template_type: TemplateType;
  campaign_type: CampaignType | null;
  created_by: string | null;
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

export async function getCommunicationTemplates(brandId?: string): Promise<{ success: true; templates: Template[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const effectiveBrandId = brandId ?? adminUser.brand_id ?? null;

  // Brand scoping: brand_admin can only see their own brand's templates
  if (adminUser.role === "brand_admin" && effectiveBrandId && effectiveBrandId !== adminUser.brand_id) {
    return { success: true, templates: [] };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_templates`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: effectiveBrandId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch templates" };
  const data = await response.json();
  return { success: true, templates: data?.templates ?? [] };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_communication_template`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_id: params.id ?? null,
        p_brand_id: params.brand_id,
        p_name: params.name,
        p_subject: params.subject,
        p_body_text: params.body_text,
        p_body_html: params.body_html ?? null,
        p_template_type: params.template_type,
        p_campaign_type: params.campaign_type ?? null,
        p_created_by: adminUser.user_id,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.id) {
    return { success: false, error: data?.message ?? "Failed to save template" };
  }

  return { success: true, template: data };
}

export async function getTemplateById(templateId: string): Promise<Template | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_templates`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: adminUser.brand_id ?? null }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  const templates: Template[] = data?.templates ?? [];
  const template = templates.find((t) => t.id === templateId) ?? null;

  // Brand scoping: brand_admin can only see their own brand's templates
  if (template && adminUser.role === "brand_admin" && template.brand_id !== adminUser.brand_id) {
    return null;
  }

  return template;
}