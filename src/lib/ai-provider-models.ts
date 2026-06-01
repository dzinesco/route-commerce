// AI provider model definitions — shared between client and server

export type AIProvider = "openai" | "anthropic" | "google" | "xai" | "custom";

export const PROVIDER_MODELS: Record<Exclude<AIProvider, "custom">, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241002", "claude-3-5-sonnet-20250611", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
  xai: ["grok-2", "grok-2-mini", "grok-1.5"],
};

export function getModelsForProvider(provider: Exclude<AIProvider, "custom">): string[] {
  return PROVIDER_MODELS[provider] ?? [];
}