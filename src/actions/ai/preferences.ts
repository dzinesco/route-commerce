"use server";

import { supabase } from "@/lib/supabase";

export type AIAuthConfig = {
  provider: string;
  api_key: string;
  organization_id: string;
  base_url: string;
  model: string;
  max_tokens: number;
};

export async function getAIPreferences(brandId: string): Promise<{
  api_key?: string;
  organization_id?: string;
  base_url?: string;
  model?: string;
  max_tokens?: number;
} | null> {
  const { data, error } = await supabase
    .from("brand_ai_settings")
    .select("api_key, organization_id, base_url, model, max_tokens")
    .eq("brand_id", brandId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function saveAIPreferences(
  brandId: string,
  config: AIAuthConfig
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("brand_ai_settings")
    .upsert({
      brand_id: brandId,
      provider: config.provider,
      api_key: config.api_key || null,
      organization_id: config.organization_id || null,
      base_url: config.base_url || null,
      model: config.model || "gpt-4o-mini",
      max_tokens: config.max_tokens || 4000,
      updated_at: new Date().toISOString(),
    });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function testAIConnection(config: AIAuthConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.api_key?.trim()) {
    return { ok: false, message: "API key is required" };
  }

  try {
    const baseUrl = config.base_url?.trim() || "https://api.openai.com/v1";
    const url = `${baseUrl.replace(/\/$/, "")}/models`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.api_key}`,
      },
    });

    if (response.ok) {
      return { ok: true, message: "Connection successful! Your API key is valid." };
    } else if (response.status === 401) {
      return { ok: false, message: "Invalid API key. Please check and try again." };
    } else {
      return { ok: false, message: `Error: ${response.status} ${response.statusText}` };
    }
  } catch {
    return { ok: false, message: "Could not connect. Check your network and API key." };
  }
}