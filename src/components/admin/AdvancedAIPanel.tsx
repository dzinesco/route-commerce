"use client";

import { useState, useEffect, useCallback } from "react";

// Types
type AIProvider = "openai" | "anthropic" | "google" | "xai" | "custom";

interface AISettings {
  provider: AIProvider;
  apiKey: string;
  orgId: string;
  model: string;
  customEndpoint: string;
}

interface TestResult {
  ok: boolean;
  message: string;
}

// Provider configuration
const PROVIDERS = [
  {
    id: "openai" as AIProvider,
    name: "OpenAI",
    color: "bg-emerald-500",
    placeholder: "sk-...",
    website: "openai.com",
    description: "GPT-4o, GPT-4 Turbo. Industry standard.",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    hasOrgId: true,
  },
  {
    id: "anthropic" as AIProvider,
    name: "Anthropic",
    color: "bg-amber-500",
    placeholder: "sk-ant-...",
    website: "anthropic.com",
    description: "Claude 3.5 Sonnet, Claude 3 Opus. Best for reasoning.",
    models: ["claude-3-5-sonnet-20241002", "claude-3-5-sonnet-20250611", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
    hasOrgId: false,
  },
  {
    id: "google" as AIProvider,
    name: "Google",
    color: "bg-blue-500",
    placeholder: "AIza...",
    website: "ai.google",
    description: "Gemini 2.0 Flash, 1.5 Pro. Fast, cost-effective.",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
    hasOrgId: false,
  },
  {
    id: "xai" as AIProvider,
    name: "xAI",
    color: "bg-orange-500",
    placeholder: "xai-...",
    website: "x.ai",
    description: "Grok-2, Grok-1.5. Real-time data, humor.",
    models: ["grok-2", "grok-2-mini", "grok-1.5"],
    hasOrgId: false,
  },
  {
    id: "custom" as AIProvider,
    name: "Custom",
    color: "bg-stone-500",
    placeholder: "sk-...",
    website: "",
    description: "Any OpenAI-compatible API endpoint.",
    models: ["gpt-4o-mini"],
    hasOrgId: false,
  },
] as const;

// Estimated costs per 1M tokens (for display only)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "claude-3-5-sonnet-20241002": { input: 3.00, output: 15.00 },
  "claude-3-5-sonnet-20250611": { input: 3.00, output: 15.00 },
  "claude-3-opus-20240229": { input: 15.00, output: 75.00 },
  "claude-3-haiku-20240307": { input: 0.80, output: 4.00 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
};

// Icons
const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
  </svg>
);

const RobotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" y1="16" x2="8" y2="16"/>
    <line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);

const BrainIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-2.5 2.5M4.5 8a2.5 2.5 0 015 0v8a2.5 2.5 0 01-5 0M14.5 8a2.5 2.5 0 015 0v8a2.5 2.5 0 01-5 0M9.5 16a2.5 2.5 0 015 0"/>
    <path d="M12 4.5v15"/>
  </svg>
);

const CircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

const TornadoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H3M21 4v16M3 8l3 3 3-3 3 3 3-3 3 3M3 16l3 3 3-3 3 3 3-3 3 3"/>
  </svg>
);

const WrenchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/>
    <rect x="4" y="8" width="16" height="12" rx="2"/>
    <path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
  </svg>
);

const PROVIDER_ICONS: Record<AIProvider, React.ReactNode> = {
  openai: <RobotIcon className="h-5 w-5" />,
  anthropic: <BrainIcon className="h-5 w-5" />,
  google: <CircleIcon className="h-5 w-5" />,
  xai: <TornadoIcon className="h-5 w-5" />,
  custom: <WrenchIcon className="h-5 w-5" />,
};

type Props = {
  brandId: string;
};

export default function AdvancedAIPanel({ brandId }: Props) {
  // Settings state
  const [settings, setSettings] = useState<AISettings>({
    provider: "openai",
    apiKey: "",
    orgId: "",
    model: "gpt-4o-mini",
    customEndpoint: "",
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`/api/integrations/ai-provider?brandId=${encodeURIComponent(brandId)}`);
        if (res.ok) {
          const data = await res.json();
          setSettings({
            provider: data.provider ?? "openai",
            apiKey: data.apiKey ?? "",
            orgId: data.orgId ?? "",
            model: data.model ?? "gpt-4o-mini",
            customEndpoint: data.customEndpoint ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to load AI settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [brandId]);

  // Track changes
  const handleChange = useCallback((field: keyof AISettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setResult(null);
  }, []);

  // Select provider
  const handleSelectProvider = useCallback((provider: AIProvider) => {
    const providerConfig = PROVIDERS.find((p) => p.id === provider);
    const defaultModel = providerConfig?.models[0] ?? "gpt-4o-mini";
    setSettings((prev) => ({
      ...prev,
      provider,
      model: defaultModel,
    }));
    setHasChanges(true);
    setResult(null);
  }, []);

  // Save settings
  const handleSave = useCallback(async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/integrations/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          ...settings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setResult({ ok: true, message: "AI provider settings saved successfully" });
      setHasChanges(false);
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }, [brandId, settings]);

  // Test connection
  const handleTest = useCallback(async () => {
    if (!settings.apiKey?.trim()) {
      setResult({ ok: false, message: "API key is required to test connection" });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/integrations/ai-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connection failed");
      setResult({ ok: true, message: data.message ?? "Connection successful" });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  }, [brandId, settings.apiKey]);

  // Get current provider config
  const currentProvider = PROVIDERS.find((p) => p.id === settings.provider) ?? PROVIDERS[0];
  const modelCosts = MODEL_COSTS[settings.model];

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 animate-pulse">
          <div className="h-4 bg-amber-100 rounded w-1/3 mb-2" />
          <div className="h-3 bg-amber-100 rounded w-2/3" />
        </div>
        <div className="rounded-xl border border-[var(--admin-border)] bg-white p-6 animate-pulse">
          <div className="h-6 bg-stone-200 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-stone-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Security Warning Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
            <ShieldIcon className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">API Key Security</h4>
            <ul className="mt-1.5 text-xs text-amber-700 space-y-1">
              <li>• <strong>Never share keys</strong> — Don&apos;t paste in Slack, email, or screenshots.</li>
              <li>• <strong>Usage costs add up fast</strong> — AI APIs charge per token. A busy month can hit $50-$200+.</li>
              <li>• <strong>Set budgets now</strong> — Use provider dashboard limits. Start with $10-$25/mo cap.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Provider Selection Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
              <SparkleIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--admin-text-primary)]">AI Provider</h3>
              <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Choose your AI model provider for all AI tools</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSelectProvider(provider.id)}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  settings.provider === provider.id
                    ? "border-violet-500 bg-violet-50"
                    : "border-[var(--admin-border)] hover:border-violet-200 hover:bg-stone-50"
                }`}
              >
                <div className={`flex h-10 w-10 mx-auto items-center justify-center rounded-xl mb-2 ${provider.color}`}>
                  <span className="text-white">{PROVIDER_ICONS[provider.id]}</span>
                </div>
                <p className="text-xs font-semibold text-[var(--admin-text-primary)]">{provider.name}</p>
                {provider.website && (
                  <p className="text-[10px] text-[var(--admin-text-muted)] mt-0.5">{provider.website}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Credentials Card */}
      {settings.provider !== "custom" ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Credentials</h3>
              <span className="text-xs text-[var(--admin-text-muted)]">{currentProvider.website}</span>
            </div>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
                API Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => handleChange("apiKey", e.target.value)}
                  placeholder={currentProvider.placeholder}
                  className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-stone-400">
                Get your API key from {currentProvider.website}
              </p>
            </div>

            {/* Organization ID (OpenAI only) */}
            {currentProvider.hasOrgId && (
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
                  Organization ID <span className="text-stone-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={settings.orgId}
                  onChange={(e) => handleChange("orgId", e.target.value)}
                  placeholder="org-..."
                  className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Custom Endpoint Card */
        <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-violet-200">
            <div className="flex items-center gap-3">
              <WrenchIcon className="h-5 w-5 text-violet-600" />
              <div>
                <p className="text-sm font-semibold text-violet-800">Custom API Endpoint</p>
                <p className="text-xs text-violet-600 mt-0.5">Connect any OpenAI-compatible API</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
                API Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => handleChange("apiKey", e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showApiKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
                Base URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.customEndpoint}
                onChange={(e) => handleChange("customEndpoint", e.target.value)}
                placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
              <p className="mt-1 text-[10px] text-stone-500">
                Examples: OpenAI proxy, Ollama (localhost:11434), LM Studio
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Model Selection Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Model</h3>
            {modelCosts && (
              <div className="text-right">
                <span className="text-[10px] text-[var(--admin-text-muted)]">Est. cost per 1M tokens:</span>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-stone-500">In: ${modelCosts.input}</span>
                  <span className="text-stone-500">Out: ${modelCosts.output}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {currentProvider.models.map((model) => (
              <button
                key={model}
                onClick={() => handleChange("model", model)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  settings.model === model
                    ? "bg-violet-600 text-white"
                    : "bg-stone-100 text-[var(--admin-text-secondary)] hover:bg-stone-200"
                }`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Features Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">AI Features</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "Campaign Writer", desc: "Generate email content", icon: <BotIcon className="h-4 w-4" /> },
              { name: "Product Writer", desc: "Product descriptions", icon: <SparkleIcon className="h-4 w-4" /> },
              { name: "Report Explainer", desc: "AI summaries", icon: <BotIcon className="h-4 w-4" /> },
              { name: "Pricing Advisor", desc: "Smart pricing", icon: <SparkleIcon className="h-4 w-4" /> },
            ].map((feature) => (
              <div key={feature.name} className="bg-stone-50 rounded-lg p-3 flex items-center gap-2">
                <div className="text-emerald-600">{feature.icon}</div>
                <div>
                  <p className="text-sm font-medium text-[var(--admin-text-primary)]">{feature.name}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
          result.ok
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {result.ok ? <CheckIcon className="h-4 w-4 flex-shrink-0" /> : <AlertIcon className="h-4 w-4 flex-shrink-0" />}
          {result.message}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing || saving}
          className="rounded-lg border border-[var(--admin-border)] px-5 py-2.5 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50 disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || testing}
          className="flex-1 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : hasChanges ? "Save Provider Settings" : "Saved"}
        </button>
      </div>
    </div>
  );
}