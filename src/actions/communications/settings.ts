"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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

export async function getCommunicationSettings(brandId: string): Promise<CommunicationSettings | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data?.settings ?? null;
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

  // Brand scoping: brand_admin can only modify their own brand's settings
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brand_id) {
    return { success: false, error: "Not authorized to modify this brand's communication settings" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_communication_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: params.brand_id,
        p_sender_email: params.sender_email ?? null,
        p_sender_name: params.sender_name ?? null,
        p_reply_to_email: params.reply_to_email ?? null,
        p_provider: params.provider ?? "resend",
        p_footer_html: params.footer_html ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.id) {
    return { success: false, error: data?.message ?? "Failed to save settings" };
  }

  return { success: true, settings: data };
}