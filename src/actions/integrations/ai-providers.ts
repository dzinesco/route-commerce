"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
import { DEFAULT_MODELS, type AIProvider as AIProviderType } from "@/lib/ai-provider-models";

// ── Types ────────────────────────────────────────────────────────────────────────

export type AIProvider = AIProviderType;

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

// MiniMax (MiniMax) is OpenAI-compatible. Default to the global endpoint; allow
// override via MINIMAX_BASE_URL env var (e.g. https://api.minimaxi.com/v1 for CN).
const MINIMAX_DEFAULT_BASE_URL = "https://api.minimax.io/v1";

// ── Get AI provider settings ─────────────────────────────────────────────────────

export async function getAIProviderSettings(brandId: string): Promise<AIProviderSettings> {
  try {
    const res = await pool.query<{
      provider: string | null;
      api_key: string | null;
      org_id: string | null;
      model: string | null;
      custom_endpoint: string | null;
    }>(
      "SELECT * FROM get_ai_provider_settings($1)",
      [brandId]
    );
    const data = res.rows[0];
    if (!data) {
      return { provider: "openai", apiKey: "", model: "gpt-4o-mini" };
    }
    return {
      provider: (data.provider as AIProvider) ?? "openai",
      apiKey: data.api_key ?? "",
      orgId: data.org_id ?? undefined,
      model: data.model ?? "gpt-4o-mini",
      customEndpoint: data.custom_endpoint ?? undefined,
    };
  } catch {
    return { provider: "openai", apiKey: "", model: "gpt-4o-mini" };
  }
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

  const payload = {
    provider: merged.provider,
    api_key: merged.apiKey,
    org_id: merged.orgId ?? null,
    model: merged.model,
    custom_endpoint: merged.customEndpoint ?? null,
  };

  try {
    await pool.query(
      "SELECT set_ai_provider_settings($1, $2::jsonb)",
      [brandId, JSON.stringify(payload)]
    );
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save";
    return { success: false, error: msg };
  }
}

// ── Dynamic AI client factory ────────────────────────────────────────────────────

export async function getAIClient(brandId: string): Promise<{
  provider: AIProvider;
  model: string;
  client: unknown;
} | { provider: "openai"; model: string; client: null; error: string }> {
  const settings = await getAIProviderSettings(brandId);

  if (!settings.apiKey) {
    // Fall back to env var. Check the saved provider first, then universal env keys.
    const envKey =
      process.env.MINIMAX_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.XAI_API_KEY ||
      process.env.GOOGLE_API_KEY;
    if (!envKey) {
      return { provider: settings.provider || "openai", model: DEFAULT_MODELS[settings.provider as Exclude<AIProvider, "custom">] ?? "gpt-4o-mini", client: null, error: "No API key configured" };
    }
    // If the saved provider is minimax, use MiniMax even from env
    if (settings.provider === "minimax" || process.env.MINIMAX_API_KEY) {
      const { OpenAI } = await import("openai");
      const baseURL = process.env.MINIMAX_BASE_URL || MINIMAX_DEFAULT_BASE_URL;
      return {
        provider: "minimax",
        model: settings.model || DEFAULT_MODELS.minimax,
        client: new OpenAI({ apiKey: process.env.MINIMAX_API_KEY ?? envKey, baseURL }),
      };
    }
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
    case "minimax": {
      // MiniMax (MiniMax) is OpenAI-compatible — swap baseURL
      const { OpenAI } = await import("openai");
      const baseURL = process.env.MINIMAX_BASE_URL || MINIMAX_DEFAULT_BASE_URL;
      return {
        provider: "minimax",
        model: settings.model || DEFAULT_MODELS.minimax,
        client: new OpenAI({ apiKey: settings.apiKey, baseURL }),
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
  try {
    const res = await pool.query<CustomIntegration>(
      "SELECT * FROM get_custom_integrations($1)",
      [brandId]
    );
    return res.rows ?? [];
  } catch {
    return [];
  }
}

export async function upsertCustomIntegration(
  brandId: string,
  integration: CustomIntegration
): Promise<{ success: boolean; integrations?: CustomIntegration[]; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (adminUser.brand_id && adminUser.brand_id !== brandId) return { success: false, error: "Not authorized" };

  try {
    const res = await pool.query<CustomIntegration>(
      "SELECT * FROM upsert_custom_integration($1, $2::jsonb)",
      [brandId, JSON.stringify(integration)]
    );
    return { success: true, integrations: res.rows };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save";
    return { success: false, error: msg };
  }
}

export async function deleteCustomIntegration(
  brandId: string,
  integrationId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (adminUser.brand_id && adminUser.brand_id !== brandId) return { success: false, error: "Not authorized" };

  try {
    await pool.query(
      "SELECT delete_custom_integration($1, $2)",
      [brandId, integrationId]
    );
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete";
    return { success: false, error: msg };
  }
}