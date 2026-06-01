"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type StopBlastResult =
  | { success: true; campaign_id: string; messages_logged: number }
  | { success: false; error: string };

export async function sendStopBlast(params: {
  stopId: string;
  brandId: string;
  channel: "sms" | "email" | "both";
  subject?: string;
  body: string;
  audience: "all" | "pending" | "picked_up";
}): Promise<StopBlastResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brandId) {
    return { success: false, error: "Not authorized" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/send_stop_blast`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_stop_id: params.stopId,
        p_brand_id: params.brandId,
        p_channel: params.channel,
        p_subject: params.subject ?? null,
        p_body: params.body,
        p_audience: params.audience,
        p_created_by: adminUser.user_id,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    return { success: false, error: err?.message ?? "Failed to send blast" };
  }

  const data = await response.json();
  return {
    success: true,
    campaign_id: data.campaign_id,
    messages_logged: data.messages_logged,
  };
}
