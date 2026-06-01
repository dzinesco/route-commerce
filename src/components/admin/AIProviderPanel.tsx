"use client";

import { useState, useEffect } from "react";

type AIProvider = "openai" | "anthropic" | "google" | "xai" | "custom";

const PROVIDER_MODELS: Record<Exclude<AIProvider, "custom">, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241002", "claude-3-5-sonnet-20250611", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
  xai: ["grok-2", "grok-2-mini", "grok-1.5"],
};

const PROVIDERS: { id: AIProvider; name: string; icon: string; description: string; website: string }[] = [
  { id: "openai", name: "OpenAI", icon: "🤖", description: "GPT-4o, GPT-4o-mini, GPT-4 Turbo. Industry standard for general AI tasks.", website: "openai.com" },
  { id: "anthropic", name: "Anthropic Claude", icon: "🧠", description: "Claude 3.5 Sonnet, Claude 3 Opus. Best for long-form reasoning and analysis.", website: "anthropic.com" },
  { id: "google", name: "Google Gemini", icon: "🔶", description: "Gemini 2.0 Flash, Gemini 1.5 Pro. Fast, cost-effective, strong multimodal.", website: "ai.google" },
  { id: "xai", name: "xAI Grok", icon: "🌪️", description: "Grok-2, Grok-1.5. Real-time data, humor, unconventional reasoning.", website: "x.ai" },
  { id: "custom", name: "Custom / Other", icon: "🔧", description: "Connect any OpenAI-compatible API or custom LLM endpoint.", website: "" },
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
      <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-slate-200 rounded w-2/3 mb-6" />
        <div className="grid grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-zinc-950 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-zinc-900 shadow-black/20 ring-1 ring-violet-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex items-center gap-4">
        <span className="text-2xl">🤖</span>
        <div>
          <h2 className="text-base font-bold text-white">AI Provider</h2>
          <p className="text-xs text-violet-200 mt-0.5">Choose your AI model provider for all AI tools</p>
        </div>
        <span className="ml-auto text-xs text-violet-200 bg-zinc-900/20 rounded-full px-3 py-1">
          {PROVIDERS.find(p => p.id === provider)?.name}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Provider selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Select Provider
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id);
                  setModel(p.id === "custom" ? "gpt-4o-mini" : PROVIDER_MODELS[p.id as Exclude<AIProvider, "custom">]?.[0] ?? "gpt-4o-mini");
                }}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  provider === p.id
                    ? "border-violet-500 bg-violet-50 shadow-black/20"
                    : "border-zinc-800 hover:border-violet-200 hover:bg-zinc-800"
                }`}
              >
                <span className="text-2xl block mb-1">{p.icon}</span>
                <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                {p.website && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.website}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Credentials — only for non-custom */}
        {provider !== "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                API Key {provider === "anthropic" ? "(Anthropic)" : provider === "google" ? "(Google AI)" : provider === "xai" ? "(xAI)" : "(OpenAI)"}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === "anthropic" ? "sk-ant-..." : provider === "google" ? "AIza..." : provider === "xai" ? "xai-..." : "sk-..."}
                  className="w-full rounded-xl border border-zinc-600 px-4 py-2.5 text-sm pr-20 outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-zinc-400"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {provider === "openai" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Organization ID (optional)</label>
                <input
                  type="text"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  placeholder="org-..."
                  className="w-full rounded-xl border border-zinc-600 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Custom endpoint fields */}
        {provider === "custom" && (
          <div className="space-y-4 rounded-xl bg-slate-50 border border-zinc-800 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">🔧</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-300">Custom API Endpoint</p>
                <p className="text-xs text-zinc-500 mt-0.5">Connect any OpenAI-compatible API (Ollama, LM Studio, custom proxy, etc.)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-xl border border-zinc-600 px-4 py-2.5 text-sm pr-20 outline-none focus:border-violet-500"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-zinc-400">
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Base URL</label>
                <input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                  className="w-full rounded-xl border border-zinc-600 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Model selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Model
          </label>
          <div className="flex flex-wrap gap-2">
            {models.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  model === m
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            testResult.ok ? "bg-green-900/30 text-green-400 border border-green-200" : "bg-red-900/30 text-red-400 border border-red-200"
          }`}>
            <span>{testResult.ok ? "✓" : "✗"}</span>
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleTest}
            disabled={saving}
            className="rounded-xl border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
          >
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Provider Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}