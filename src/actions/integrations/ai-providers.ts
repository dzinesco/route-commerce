"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

// ── Types ────────────────────────────────────────────────────────────────────────

export type AIProvider = "openai" | "anthropic" | "google" | "xai" | "custom";

export type AIProviderSettings = {
  provider: AIProvider;
  apiKey: string;
  orgId?: string;
  model: string;
  customEndpoint?: string;
};

export type CustomIntegration = {
  id: string;
  name: string;
  type: "ai_provider" | "payment_processor" | "other";
  enabled: boolean;
  credentials: Record<string, string>;
  syncOptions: string[];
  testEndpoint?: string;
};

// ── Get AI provider settings ─────────────────────────────────────────────────────

export async function getAIProviderSettings(brandId: string): Promise<AIProviderSettings> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_ai_provider_settings`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) {
    return { provider: "openai", apiKey: "", model: "gpt-4o-mini" };
  }

  const data = await response.json();
  return {
    provider: (data.provider as AIProvider) ?? "openai",
    apiKey: data.api_key ?? "",
    orgId: data.org_id,
    model: data.model ?? "gpt-4o-mini",
    customEndpoint: data.custom_endpoint,
  };
}

// ── Save AI provider settings ───────────────────────────────────────────────────

export async function setAIProviderSettings(
  brandId: string,
  settings: Partial<AIProviderSettings>
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (adminUser.brand_id && adminUser.brand_id !== brandId) return { success: false, error: "Not authorized" };

  const current = await getAIProviderSettings(brandId);
  const merged = { ...current, ...settings };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const payload = {
    provider: merged.provider,
    api_key: merged.apiKey,
    org_id: merged.orgId ?? null,
    model: merged.model,
    custom_endpoint: merged.customEndpoint ?? null,
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_ai_provider_settings`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId, p_settings: payload }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data) {
    return { success: false, error: data?.message ?? "Failed to save" };
  }

  return { success: true };
}

// ── Dynamic AI client factory ────────────────────────────────────────────────────

export async function getAIClient(brandId: string): Promise<{
  provider: AIProvider;
  model: string;
  client: unknown;
} | { provider: "openai"; model: string; client: null; error: string }> {
  const settings = await getAIProviderSettings(brandId);

  if (!settings.apiKey) {
    // Fall back to env var
    const envKey = process.env.OPENAI_API_KEY;
    if (!envKey) return { provider: "openai", model: "gpt-4o-mini", client: null, error: "No API key configured" };
    const { OpenAI } = await import("openai");
    return {
      provider: "openai",
      model: settings.model || "gpt-4o-mini",
      client: new OpenAI({ apiKey: envKey }),
    };
  }

  switch (settings.provider) {
    case "anthropic": {
      const { Anthropic } = await import("@anthropic-ai/sdk");
      return {
        provider: "anthropic",
        model: settings.model || "claude-3-5-sonnet-20241002",
        client: new Anthropic({ apiKey: settings.apiKey }),
      };
    }
    case "google": {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      return {
        provider: "google",
        model: settings.model || "gemini-2.0-flash",
        client: new GoogleGenerativeAI(settings.apiKey),
      };
    }
    case "xai": {
      const { OpenAI: XAIOpenAI } = await import("openai");
      return {
        provider: "xai",
        model: settings.model || "grok-2",
        client: new XAIOpenAI({ apiKey: settings.apiKey, baseURL: "https://api.x.ai/v1" }),
      };
    }
    case "custom": {
      if (!settings.customEndpoint) {
        // @ts-expect-error - intentionally returning extra property for error signaling
        return { provider: "custom", model: settings.model, client: null, error: "Custom endpoint required" };
      }
      const { OpenAI } = await import("openai");
      return {
        provider: "custom",
        model: settings.model || "gpt-4o-mini",
        client: new OpenAI({ apiKey: settings.apiKey, baseURL: settings.customEndpoint }),
      };
    }
    case "openai":
    default: {
      const { OpenAI } = await import("openai");
      return {
        provider: "openai",
        model: settings.model || "gpt-4o-mini",
        client: new OpenAI({ apiKey: settings.apiKey }),
      };
    }
  }
}

// ── Custom integrations ─────────────────────────────────────────────────────────

export async function getCustomIntegrations(brandId: string): Promise<CustomIntegration[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_custom_integrations`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data ?? [];
}

export async function upsertCustomIntegration(
  brandId: string,
  integration: CustomIntegration
): Promise<{ success: boolean; integrations?: CustomIntegration[]; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (adminUser.brand_id && adminUser.brand_id !== brandId) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_custom_integration`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId, p_integration: integration }),
    }
  );

  const data = await response.json();
  if (!response.ok) return { success: false, error: data?.message ?? "Failed to save" };

  return { success: true, integrations: data };
}

export async function deleteCustomIntegration(
  brandId: string,
  integrationId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (adminUser.brand_id && adminUser.brand_id !== brandId) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_custom_integration`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId, p_integration_id: integrationId }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    return { success: false, error: data?.message ?? "Failed to delete" };
  }

  return { success: true };
}