// AI provider model definitions — shared between client and server

export type AIProvider = "openai" | "anthropic" | "google" | "xai" | "minimax" | "custom";

export const PROVIDER_MODELS: Record<Exclude<AIProvider, "custom">, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  // Note: claude-3-5-sonnet-* model IDs have been retired by Anthropic.
  // Current IDs are claude-sonnet-4-5, claude-sonnet-4-*, claude-opus-4-*, etc.
  // See https://docs.anthropic.com/en/docs/about-claude/models/overview
  anthropic: [
    "claude-sonnet-4-5",
    "claude-sonnet-4-20250514",
    "claude-opus-4-1",
    "claude-opus-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
  xai: ["grok-2", "grok-2-mini", "grok-1.5"],
  minimax: [
    "MiniMax-M3",
    "MiniMax-M3-highspeed",
    "MiniMax-M2.5",
    "MiniMax-M2.5-highspeed",
    "MiniMax-M2.7",
    "MiniMax-M2.1",
    "MiniMax-M2",
  ],
};

export const DEFAULT_MODELS: Record<Exclude<AIProvider, "custom">, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  google: "gemini-2.0-flash",
  xai: "grok-2",
  minimax: "MiniMax-M3",
};

export function getModelsForProvider(provider: Exclude<AIProvider, "custom">): string[] {
  return PROVIDER_MODELS[provider] ?? [];
}