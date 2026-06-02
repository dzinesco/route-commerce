"use client";

import { useState, useEffect } from "react";

type AIProvider = "openai" | "anthropic" | "google" | "xai" | "custom";

const PROVIDER_MODELS: Record<Exclude<AIProvider, "custom">, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241002", "claude-3-5-sonnet-20250611", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
  xai: ["grok-2", "grok-2-mini", "grok-1.5"],
};

// Icons
const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
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

const PROVIDERS: { id: AIProvider; name: string; icon: React.ReactNode; description: string; website: string; color: string }[] = [
  { id: "openai", name: "OpenAI", icon: <RobotIcon className="h-5 w-5" />, description: "GPT-4o, GPT-4o-mini, GPT-4 Turbo. Industry standard.", website: "openai.com", color: "bg-emerald-500" },
  { id: "anthropic", name: "Anthropic", icon: <BrainIcon className="h-5 w-5" />, description: "Claude 3.5 Sonnet, Claude 3 Opus. Best for reasoning.", website: "anthropic.com", color: "bg-amber-500" },
  { id: "google", name: "Google", icon: <CircleIcon className="h-5 w-5" />, description: "Gemini 2.0 Flash, 1.5 Pro. Fast, cost-effective.", website: "ai.google", color: "bg-blue-500" },
  { id: "xai", name: "xAI", icon: <TornadoIcon className="h-5 w-5" />, description: "Grok-2, Grok-1.5. Real-time data, humor.", website: "x.ai", color: "bg-orange-500" },
  { id: "custom", name: "Custom", icon: <WrenchIcon className="h-5 w-5" />, description: "Any OpenAI-compatible API endpoint.", website: "", color: "bg-stone-500" },
];

type Props = {
  brandId: string;
};

export default function AIProviderPanel({ brandId }: Props) {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [orgId, setOrgId] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/integrations/ai-provider?brandId=${brandId}`);
        if (res.ok) {
          const data = await res.json();
          setProvider(data.provider ?? "openai");
          setApiKey(data.apiKey ?? "");
          setOrgId(data.orgId ?? "");
          setModel(data.model ?? "gpt-4o-mini");
          setCustomEndpoint(data.customEndpoint ?? "");
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [brandId]);

  async function handleSave() {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, provider, apiKey, orgId, model, customEndpoint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setTestResult({ ok: true, message: "AI provider settings saved" });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : "Save failed" });
    }
    setSaving(false);
  }

  async function handleTest() {
    setTestResult(null);
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/ai-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connection failed");
      setTestResult({ ok: true, message: data.message ?? "Connection successful" });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : "Test failed" });
    }
    setSaving(false);
  }

  const models = provider === "custom" ? ["gpt-4o-mini"] : (PROVIDER_MODELS[provider] ?? []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border)] bg-white p-6 animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-stone-200 rounded w-2/3 mb-6" />
        <div className="grid grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-stone-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id);
                  setModel(p.id === "custom" ? "gpt-4o-mini" : PROVIDER_MODELS[p.id as Exclude<AIProvider, "custom">]?.[0] ?? "gpt-4o-mini");
                }}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  provider === p.id
                    ? "border-violet-500 bg-violet-50"
                    : "border-[var(--admin-border)] hover:border-violet-200 hover:bg-stone-50"
                }`}
              >
                <div className={`flex h-10 w-10 mx-auto items-center justify-center rounded-xl mb-2 ${p.color}`}>
                  <span className="text-white">{p.icon}</span>
                </div>
                <p className="text-xs font-semibold text-[var(--admin-text-primary)]">{p.name}</p>
                {p.website && (
                  <p className="text-[10px] text-[var(--admin-text-muted)] mt-0.5">{p.website}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Credentials Card */}
      {provider !== "custom" && (
        <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Credentials</h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === "anthropic" ? "sk-ant-..." : provider === "google" ? "AIza..." : provider === "xai" ? "xai-..." : "sk-..."}
                  className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {provider === "openai" && (
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
                  Organization ID (optional)
                </label>
                <input
                  type="text"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  placeholder="org-..."
                  className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Endpoint Card */}
      {provider === "custom" && (
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
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Base URL</label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Model Selection Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Model</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {models.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  model === m
                    ? "bg-violet-600 text-white"
                    : "bg-stone-100 text-[var(--admin-text-secondary)] hover:bg-stone-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
          testResult.ok
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {testResult.ok ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
          {testResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={saving}
          className="rounded-lg border border-[var(--admin-border)] px-5 py-2.5 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50 disabled:opacity-50"
        >
          Test Connection
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Provider Settings"}
        </button>
      </div>
    </div>
  );
}