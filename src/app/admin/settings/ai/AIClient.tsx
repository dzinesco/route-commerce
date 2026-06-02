"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/design-system";
import { setAIProviderSettings } from "@/actions/integrations/ai-providers";

// ── Header Icon Component ─────────────────────────────────────────────────────

function AIHeaderIcon() {
  return (
    <div 
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(202, 117, 67, 0.15) 0%, rgba(202, 117, 67, 0.08) 100%)',
        border: '1px solid rgba(202, 117, 67, 0.2)',
      }}
    >
      <svg className="h-6 w-6" style={{ color: '#8c4c27' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    </div>
  );
}

// ── Tool Card Component ───────────────────────────────────────────────────────

type ToolCardProps = {
  tool: AITool;
  isConnected: boolean;
  onOpen: (tool: AITool) => void;
};

function ToolCard({ tool, isConnected, onOpen }: ToolCardProps) {
  const isReady = tool.status === "available" && isConnected;
  
  return (
    <AdminCard className="p-5">
      <div className="flex items-start gap-4">
        <span className="text-2xl">{tool.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-semibold" style={{ color: 'var(--admin-text-primary)' }}>{tool.title}</h3>
            {tool.badge && (
              <span 
                className="text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{ 
                  background: 'rgba(202, 117, 67, 0.1)', 
                  color: '#8c4c27',
                  border: '1px solid rgba(202, 117, 67, 0.2)',
                }}
              >
                {tool.badge}
              </span>
            )}
            {tool.status === "available" && (
              <span 
                className="text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{ 
                  background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.04)', 
                  color: isConnected ? '#047857' : 'rgba(0, 0, 0, 0.4)',
                  border: isConnected ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                {isConnected ? "Ready" : "Disabled"}
              </span>
            )}
            {tool.status === "experimental" && (
              <span 
                className="text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{ 
                  background: 'rgba(171, 162, 120, 0.15)', 
                  color: '#92781e',
                  border: '1px solid rgba(171, 162, 120, 0.2)',
                }}
              >
                Experimental
              </span>
            )}
            {tool.status === "coming_soon" && (
              <span 
                className="text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{ 
                  background: 'rgba(0, 0, 0, 0.04)', 
                  color: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                Coming Soon
              </span>
            )}
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{tool.module}</span>
          <p className="mt-2 text-sm" style={{ color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}>{tool.description}</p>
        </div>
      </div>
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--admin-border-light)' }}>
        {tool.status === "available" && (
          <button
            onClick={() => isConnected && onOpen(tool)}
            disabled={!isConnected}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: isConnected 
                ? 'linear-gradient(135deg, #ca7543 0%, #d4865a 100%)' 
                : 'rgba(0, 0, 0, 0.04)',
              color: isConnected ? 'white' : 'rgba(0, 0, 0, 0.4)',
              boxShadow: isConnected ? '0 2px 8px rgba(202, 117, 67, 0.25)' : 'none',
            }}
            title={!isConnected ? "Add your OpenAI API key in Settings to enable" : "Open tool"}
          >
            Open Tool
          </button>
        )}
        {tool.status === "coming_soon" && (
          <button disabled className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold cursor-not-allowed"
            style={{ 
              background: 'rgba(0, 0, 0, 0.04)', 
              color: 'rgba(0, 0, 0, 0.4)',
            }}>
            Coming Soon
          </button>
        )}
        {tool.status === "experimental" && (
          <button disabled className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold cursor-not-allowed"
            style={{ 
              background: 'rgba(171, 162, 120, 0.15)', 
              color: '#92781e',
            }}>
            Request Access
          </button>
        )}
      </div>
    </AdminCard>
  );
}

// ── Connection Status Banner ───────────────────────────────────────────────────

function ConnectionStatusBanner({ isConnected, availableCount, onConfigure }: { 
  isConnected: boolean; 
  availableCount: number;
  onConfigure: () => void;
}) {
  if (isConnected) {
    return (
      <AdminCard className="p-5 mb-6" style={{ 
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
      }}>
        <div className="flex items-center gap-4">
          <div 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(16, 185, 129, 0.15)' }}
          >
            <svg className="h-5 w-5" style={{ color: '#047857' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold" style={{ color: '#047857' }}>AI Connected</p>
            <p className="text-sm" style={{ color: '#059669' }}>{availableCount} tool{availableCount !== 1 ? "s" : ""} ready to use</p>
          </div>
          <span 
            className="text-xs font-medium rounded-full px-3 py-1"
            style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#047857',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            Active
          </span>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="p-5 mb-6" style={{ 
      background: 'rgba(171, 162, 120, 0.08)',
      border: '1px solid rgba(171, 162, 120, 0.2)',
    }}>
      <div className="flex items-center gap-4">
        <div 
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'rgba(171, 162, 120, 0.15)' }}
        >
          <svg className="h-5 w-5" style={{ color: '#92781e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold" style={{ color: '#92781e' }}>AI Not Configured</p>
          <p className="text-sm" style={{ color: '#a6953f' }}>Add your API key to enable AI tools.</p>
        </div>
        <button
          onClick={onConfigure}
          className="rounded-xl px-4 py-2 text-sm font-bold transition-all"
          style={{
            background: 'linear-gradient(135deg, #ca7543 0%, #d4865a 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(202, 117, 67, 0.25)',
          }}
        >
          Add API Key
        </button>
      </div>
    </AdminCard>
  );
}

type ToolStatus = "available" | "coming_soon" | "experimental";

type AITool = {
  id: string;
  title: string;
  description: string;
  icon: string;
  module: string;
  status: ToolStatus;
  badge?: string;
};

const AI_TOOLS: AITool[] = [
  {
    id: "campaign-writer",
    title: "Campaign Idea Generator",
    description: "Generate email campaign topics, angles, and subject lines based on your products, season, and customer segments.",
    icon: "📧",
    module: "Harvest Reach",
    status: "available",
    badge: "New",
  },
  {
    id: "product-writer",
    title: "Product Description Writer",
    description: "AI-assisted product descriptions, pricing analysis, and image alt-text generation for your catalog.",
    icon: "🛒",
    module: "Products",
    status: "available",
  },
  {
    id: "route-suggester",
    title: "Route Optimizer",
    description: "Get AI-powered suggestions for stop ordering, grouping, and delivery sequence to minimize drive time.",
    icon: "🗺️",
    module: "Stops & Routes",
    status: "available",
  },
  {
    id: "customer-insights",
    title: "Customer Insights",
    description: "Natural language queries across orders and customers. Ask 'Which customers haven't ordered in 30 days?' or 'What products are trending this month?'",
    icon: "🔍",
    module: "Reports",
    status: "available",
  },
  {
    id: "stop-blast-advisor",
    title: "Stop Blast Advisor",
    description: "AI suggestions for timing, content, and audience targeting for operational stop blast messages.",
    icon: "📢",
    module: "Harvest Reach",
    status: "available",
  },
  {
    id: "pricing-advisor",
    title: "Pricing Advisor",
    description: "Analyze demand, seasonality, and historical sales to suggest optimal product prices for your market.",
    icon: "💰",
    module: "Products",
    status: "available",
  },
  {
    id: "report-explainer",
    title: "Report Explainer",
    description: "Plain-English summaries of complex reports. Just ask 'why did sales drop this week?' and get an AI-generated breakdown.",
    icon: "📊",
    module: "Reports",
    status: "available",
  },
  {
    id: "demand-forecast",
    title: "Demand Forecasting",
    description: "Predict order volumes and popular products for upcoming stops based on historical trends and seasonal patterns.",
    icon: "📈",
    module: "Orders",
    status: "available",
  },
];

type Provider = "openai" | "anthropic" | "google" | "xai" | "custom";

type Props = {
  isConnected: boolean;
  brandId: string;
  brandName: string;
  provider?: Provider;
  model?: string;
  customEndpoint?: string;
};

// ── Provider Selector ─────────────────────────────────────────────────────────

type ProviderOption = {
  id: Provider;
  name: string;
  icon: string;
  description: string;
};

const PROVIDERS: ProviderOption[] = [
  { id: "openai", name: "OpenAI", icon: "💩", description: "GPT-4, GPT-4o, o1" },
  { id: "anthropic", name: "Anthropic", icon: "🧠", description: "Claude 3.5 Sonnet, Opus" },
  { id: "google", name: "Google", icon: "🔴", description: "Gemini 2.0 Flash, Pro" },
  { id: "xai", name: "xAI", icon: "⚡", description: "Grok-2, Grok-1.5" },
  { id: "custom", name: "Custom", icon: "🔧", description: "Bring your own endpoint" },
];

// ── Model Input ───────────────────────────────────────────────────────────────

function ModelInput({ 
  currentModel, 
  brandId,
  onChange 
}: { 
  currentModel: string;
  brandId: string;
  onChange: (model: string) => void;
}) {
  const [customModel, setCustomModel] = useState(currentModel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!customModel.trim()) return;
    setSaving(true);
    setError(null);
    
    const result = await setAIProviderSettings(brandId, { model: customModel.trim() });
    if (result.success) {
      onChange(customModel.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error ?? "Failed to save");
    }
    setSaving(false);
  };

  return (
    <AdminCard className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
          Model
        </h2>
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={customModel}
          onChange={(e) => setCustomModel(e.target.value)}
          placeholder="e.g., gpt-4o, claude-3-5-sonnet-20241002"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm"
          style={{
            border: '1px solid var(--admin-border)',
            backgroundColor: 'var(--admin-card-bg)',
            color: 'var(--admin-text-primary)',
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !customModel.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #ca7543 0%, #d4865a 100%)',
            boxShadow: '0 2px 8px rgba(202, 117, 67, 0.25)',
            opacity: (saving || !customModel.trim()) ? 0.5 : 1,
            cursor: (saving || !customModel.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? "..." : saved ? "✓" : "Save"}
        </button>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--admin-danger)' }}>
        ⚠️ Model ID must be exact — check the provider&apos;s documentation for the correct identifier.
      </p>
      {error && <p className="text-xs mt-2" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
    </AdminCard>
  );
}

// ── Provider Selector Component ─────────────────────────────────────────────

function ProviderSelector({ 
  currentProvider, 
  currentModel, 
  brandId,
  onSelect 
}: { 
  currentProvider: Provider;
  currentModel: string;
  brandId: string;
  onSelect: (provider: Provider) => void;
}) {
  const handleSelect = async (provider: Provider) => {
    onSelect(provider);
    await setAIProviderSettings(brandId, { provider });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💩</span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
          AI Provider
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleSelect(provider.id)}
            className="p-4 rounded-xl text-center transition-all"
            style={{
              background: currentProvider === provider.id 
                ? 'rgba(202, 117, 67, 0.1)' 
                : 'rgba(0, 0, 0, 0.02)',
              border: currentProvider === provider.id 
                ? '2px solid var(--admin-accent)' 
                : '1px solid var(--admin-border)',
            }}
          >
            <span className="text-3xl block mb-2">{provider.icon}</span>
            <span className="text-sm font-semibold block" style={{ color: 'var(--admin-text-primary)' }}>
              {provider.name}
            </span>
            <span className="text-xs block mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              {provider.description}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--admin-text-muted)' }}>
        Current model: <span className="font-medium" style={{ color: 'var(--admin-text-secondary)' }}>{currentModel}</span>
      </p>
    </div>
  );
}

// ── Form Input Styles (Shared) ────────────────────────────────────────────────

const inputBaseClass = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors";
const inputStyle = {
  border: '1px solid var(--admin-border)',
  backgroundColor: 'var(--admin-card-bg)',
  color: 'var(--admin-text-primary)',
};
const inputFocusStyle = {
  borderColor: 'var(--admin-accent)',
  boxShadow: '0 0 0 3px rgba(202, 117, 67, 0.1)',
};

const textareaStyle = { ...inputStyle };
const textareaFocusStyle = { ...inputFocusStyle };

const btnPrimaryClass = "rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all";
const btnPrimaryStyle = {
  background: 'linear-gradient(135deg, #ca7543 0%, #d4865a 100%)',
  boxShadow: '0 2px 8px rgba(202, 117, 67, 0.25)',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
  color: 'var(--admin-text-primary)',
};

// ── Campaign Writer Tool ──────────────────────────────────────────────────────

function CampaignWriterTool({ brandId, brandName }: { brandId: string; brandName: string }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ angle: string; subject: string; body: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/ai/campaign-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, brandId, brandName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setResults(data.ideas ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>What do you want to communicate?</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          placeholder="e.g., 'Remind customers about the new sweet corn season starting next week, emphasize freshness and local delivery'"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
          style={textareaStyle}
        />
      </div>
      <button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className={btnPrimaryClass}
        style={{
          ...btnPrimaryStyle,
          opacity: (loading || !topic.trim()) ? 0.5 : 1,
          cursor: (loading || !topic.trim()) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? "Generating..." : "Generate Campaign Ideas"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((idea, i) => (
            <AdminCard key={i} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-accent)' }}>Idea {i + 1}</p>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--admin-text-primary)' }}><span style={{ color: 'var(--admin-text-muted)' }}>Subject:</span> {idea.subject}</p>
              <p className="text-sm mt-2 whitespace-pre-line" style={{ color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>{idea.body}</p>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Writer Tool ────────────────────────────────────────────────────────

function ProductWriterTool({ brandId }: { brandId: string }) {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; description: string; altText: string; priceNote: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!productName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/product-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, price, unit, brandId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Product Name *</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Sweet Corn" className={inputBaseClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Category</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Vegetables" className={inputBaseClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Price</label>
          <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$4.50" className={inputBaseClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Unit</label>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="per dozen" className={inputBaseClass} style={inputStyle} />
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={loading || !productName.trim()}
        className={btnPrimaryClass}
        style={{
          ...btnPrimaryStyle,
          opacity: (loading || !productName.trim()) ? 0.5 : 1,
          cursor: (loading || !productName.trim()) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? "Generating..." : "Write Description"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {result && (
        <AdminCard className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Product Name</p>
            <p className="text-base font-semibold" style={{ color: 'var(--admin-text-primary)' }}>{result.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Description</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>{result.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Image Alt Text</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{result.altText}</p>
          </div>
          {result.priceNote && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Pricing Note</p>
              <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{result.priceNote}</p>
            </div>
          )}
        </AdminCard>
      )}
    </div>
  );
}

// ── Report Explainer Tool ──────────────────────────────────────────────────────

function ReportExplainerTool({ brandId }: { brandId: string }) {
  const [reportType, setReportType] = useState("orders-by-stop");
  const [dateRange, setDateRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string; keyInsights: string[]; suggestedActions: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reportTypes = [
    { value: "orders-by-stop", label: "Orders by Stop" },
    { value: "sales-by-product", label: "Sales by Product" },
    { value: "fulfillment", label: "Fulfillment" },
    { value: "pickup-status", label: "Pickup Status" },
    { value: "contact-growth", label: "Contact Growth" },
    { value: "campaigns", label: "Campaign Activity" },
  ];

  async function handleExplain() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/report-explainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, dateRange, brandId, reportData: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm rounded-lg p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', color: 'var(--admin-text-muted)' }}>
        The Report Explainer analyzes any report tab from the Reports dashboard. Switch to a report tab, copy the data, and paste it here for an AI-generated breakdown.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className={inputBaseClass}
            style={inputStyle}
          >
            {reportTypes.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Date Range</label>
          <input
            type="text"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            placeholder="e.g., Last 7 days, March 2026"
            className={inputBaseClass}
            style={inputStyle}
          />
        </div>
      </div>
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(171, 162, 120, 0.1)', border: '1px solid rgba(171, 162, 120, 0.2)', color: '#92781e' }}>
        AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={handleExplain}
        disabled={loading}
        className={btnPrimaryClass}
        style={{ ...btnPrimaryStyle, opacity: loading ? 0.5 : 1 }}
      >
        {loading ? "Analyzing..." : "Explain Report"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {result && (
        <div className="space-y-4">
          <AdminCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Summary</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>{result.summary}</p>
          </AdminCard>
          <AdminCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Key Insights</p>
            <ul className="space-y-2">
              {result.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                  <span style={{ color: 'var(--admin-accent)' }}>→</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </AdminCard>
          <AdminCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Suggested Actions</p>
            <ul className="space-y-2">
              {result.suggestedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                  <span style={{ color: 'var(--admin-success)' }}>✓</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </AdminCard>
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pricing Advisor Tool ────────────────────────────────────────────────────────

type PriceTier = { tier: string; price: string };
type SalesEntry = { date: string; units_sold: string; revenue: string };

function PricingAdvisorTool({ brandId }: { brandId: string }) {
  const [productName, setProductName] = useState("");
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([{ tier: "", price: "" }]);
  const [historicalSales, setHistoricalSales] = useState<SalesEntry[]>([{ date: "", units_sold: "", revenue: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    currentState: string;
    recommendations: Array<{
      productName: string;
      currentPrice: number;
      suggestedPrice: number;
      direction: string;
      reasoning: string;
      estimatedRevenueImpact: string;
    }>;
    opportunities: string[];
    warnings: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!productName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedTiers = priceTiers
        .filter((t) => t.tier.trim() && t.price.trim())
        .map((t) => ({ tier: t.tier.trim(), price: parseFloat(t.price) || 0 }));
      const parsedSales = historicalSales
        .filter((s) => s.date.trim())
        .map((s) => ({
          date: s.date.trim(),
          units_sold: parseInt(s.units_sold) || 0,
          revenue: parseFloat(s.revenue) || 0,
        }));

      const res = await fetch("/api/ai/pricing-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          productName,
          currentPriceTiers: parsedTiers,
          historicalSales: parsedSales,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function addTier() { setPriceTiers([...priceTiers, { tier: "", price: "" }]); }
  function removeTier(i: number) { setPriceTiers(priceTiers.filter((_, idx) => idx !== i)); }
  function updateTier(i: number, field: keyof PriceTier, val: string) {
    const updated = [...priceTiers]; updated[i] = { ...updated[i], [field]: val }; setPriceTiers(updated);
  }

  function addSale() { setHistoricalSales([...historicalSales, { date: "", units_sold: "", revenue: "" }]); }
  function removeSale(i: number) { setHistoricalSales(historicalSales.filter((_, idx) => idx !== i)); }
  function updateSale(i: number, field: keyof SalesEntry, val: string) {
    const updated = [...historicalSales]; updated[i] = { ...updated[i], [field]: val }; setHistoricalSales(updated);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm rounded-lg p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', color: 'var(--admin-text-muted)' }}>
        Enter a product name and optional price tiers or historical sales data for AI-powered pricing recommendations.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>Product Name *</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Sweet Corn"
          className={inputBaseClass}
          style={inputStyle}
        />
      </div>

      {/* Price Tiers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium" style={labelStyle}>Price Tiers</label>
          <button onClick={addTier} className="text-xs transition-colors" style={{ color: 'var(--admin-accent)' }}>+ Add Tier</button>
        </div>
        {priceTiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={tier.tier}
              onChange={(e) => updateTier(i, "tier", e.target.value)}
              placeholder="e.g., Wholesale"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
            />
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>$</span>
              <input
                type="text"
                value={tier.price}
                onChange={(e) => updateTier(i, "price", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg pl-7 pr-3 py-2 text-sm"
                style={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
              />
            </div>
            {priceTiers.length > 1 && (
              <button onClick={() => removeTier(i)} className="text-xs px-2 transition-colors" style={{ color: 'var(--admin-danger)' }}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Historical Sales */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium" style={labelStyle}>Historical Sales</label>
          <button onClick={addSale} className="text-xs transition-colors" style={{ color: 'var(--admin-accent)' }}>+ Add Row</button>
        </div>
        <AdminCard className="divide-y" style={{ border: '1px solid var(--admin-border)' }}>
          <div className="grid grid-cols-4 gap-2 px-3 py-2">
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date</span>
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Units Sold</span>
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Revenue</span>
            <span />
          </div>
          {historicalSales.map((sale, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 items-center">
              <input
                type="text"
                value={sale.date}
                onChange={(e) => updateSale(i, "date", e.target.value)}
                placeholder="2026-04-01"
                className="rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
              />
              <input
                type="text"
                value={sale.units_sold}
                onChange={(e) => updateSale(i, "units_sold", e.target.value)}
                placeholder="120"
                className="rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>$</span>
                <input
                  type="text"
                  value={sale.revenue}
                  onChange={(e) => updateSale(i, "revenue", e.target.value)}
                  placeholder="540"
                  className="w-full rounded-lg border pl-5 pr-2 py-1.5 text-xs"
                  style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
                />
              </div>
              {historicalSales.length > 1 && (
                <button onClick={() => removeSale(i)} className="text-xs justify-self-end transition-colors" style={{ color: 'var(--admin-danger)' }}>✕</button>
              )}
            </div>
          ))}
        </AdminCard>
      </div>
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(171, 162, 120, 0.1)', border: '1px solid rgba(171, 162, 120, 0.2)', color: '#92781e' }}>
        AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={handleAnalyze}
        disabled={loading || !productName.trim()}
        className={btnPrimaryClass}
        style={{
          ...btnPrimaryStyle,
          opacity: (loading || !productName.trim()) ? 0.5 : 1,
          cursor: (loading || !productName.trim()) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? "Analyzing..." : "Analyze Pricing"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {result && (
        <div className="space-y-4">
          <AdminCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Current State</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>{result.currentState}</p>
          </AdminCard>
          {result.recommendations.map((rec, i) => (
            <AdminCard key={i} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>{rec.productName}</p>
                <span 
                  className="text-xs font-bold rounded-full px-2 py-0.5"
                  style={{
                    background: rec.direction === "increase" ? 'rgba(16, 185, 129, 0.1)' : rec.direction === "decrease" ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                    color: rec.direction === "increase" ? '#047857' : rec.direction === "decrease" ? '#dc2626' : 'var(--admin-text-muted)',
                  }}
                >
                  {rec.direction}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm mb-2">
                <span style={{ color: 'var(--admin-text-muted)' }}>${rec.currentPrice}</span>
                <span style={{ color: 'var(--admin-text-muted)' }}>→</span>
                <span className="font-bold" style={{ color: 'var(--admin-accent)' }}>${rec.suggestedPrice}</span>
                <span className={`text-xs ml-auto ${rec.estimatedRevenueImpact.startsWith("+") ? 'text-green-600' : ''}`} style={{ color: rec.estimatedRevenueImpact.startsWith("+") ? '#059669' : 'var(--admin-text-muted)' }}>
                  {rec.estimatedRevenueImpact}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{rec.reasoning}</p>
            </AdminCard>
          ))}
          {result.opportunities.length > 0 && (
            <AdminCard className="p-5" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#047857' }}>Opportunities</p>
              <ul className="space-y-1">
                {result.opportunities.map((opp, i) => (
                  <li key={i} className="text-sm" style={{ color: '#059669' }}>• {opp}</li>
                ))}
              </ul>
            </AdminCard>
          )}
          {result.warnings.length > 0 && (
            <AdminCard className="p-5" style={{ backgroundColor: 'rgba(171, 162, 120, 0.08)', border: '1px solid rgba(171, 162, 120, 0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#92781e' }}>Warnings</p>
              <ul className="space-y-1">
                {result.warnings.map((warn, i) => (
                  <li key={i} className="text-sm" style={{ color: '#a6953f' }}>• {warn}</li>
                ))}
              </ul>
            </AdminCard>
          )}
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}

// ── Stop Blast Advisor Tool ────────────────────────────────────────────────────

function StopBlastAdvisorTool({ brandId }: { brandId: string }) {
  const [stopName, setStopName] = useState("");
  const [stopDate, setStopDate] = useState("");
  const [city, setCity] = useState("");
  const [customerCount, setCustomerCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    timingRecommendation: string;
    subjectLine: string;
    bodyPreview: string;
    audienceSize: string;
    audienceRecommendation: string;
    contentAngles: Array<{ angle: string; reasoning: string }>;
    warnings: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!stopName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/stop-blast-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          stopName,
          stopDate,
          city,
          recentOrders: [],
          customerCount: customerCount ? parseInt(customerCount) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm rounded-lg p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', color: 'var(--admin-text-muted)' }}>
        Enter details about the stop you want to send a blast for. The AI will suggest optimal timing, subject lines, content angles, and audience targeting.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Stop Name *</label>
          <input type="text" value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="Downtown Farmers Market" className={inputBaseClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Stop Date</label>
          <input type="text" value={stopDate} onChange={(e) => setStopDate(e.target.value)} placeholder="2026-06-15" className={inputBaseClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Greeley" className={inputBaseClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Customer Count</label>
          <input type="text" value={customerCount} onChange={(e) => setCustomerCount(e.target.value)} placeholder="42" className={inputBaseClass} style={inputStyle} />
        </div>
      </div>
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(171, 162, 120, 0.1)', border: '1px solid rgba(171, 162, 120, 0.2)', color: '#92781e' }}>
        AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={handleAnalyze}
        disabled={loading || !stopName.trim()}
        className={btnPrimaryClass}
        style={{
          ...btnPrimaryStyle,
          opacity: (loading || !stopName.trim()) ? 0.5 : 1,
          cursor: (loading || !stopName.trim()) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? "Analyzing..." : "Get Recommendations"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {result && (
        <div className="space-y-4">
          <AdminCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Timing</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{result.timingRecommendation}</p>
          </AdminCard>
          <AdminCard className="p-5" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#047857' }}>Recommended Subject Line</p>
            <p className="text-base font-semibold" style={{ color: 'var(--admin-text-primary)' }}>{result.subjectLine}</p>
            <button onClick={() => copyToClipboard(result.subjectLine)} className="mt-2 text-xs flex items-center gap-1 transition-colors" style={{ color: 'var(--admin-accent)' }}>
              Copy
            </button>
          </AdminCard>
          <AdminCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Body Preview</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>{result.bodyPreview}</p>
          </AdminCard>
          <AdminCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Audience</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{result.audienceRecommendation}</p>
            <span 
              className="inline-block mt-1 text-xs rounded-full px-2 py-0.5"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}
            >
              {result.audienceSize} recipients
            </span>
          </AdminCard>
          {result.contentAngles.map((a, i) => (
            <AdminCard key={i} className="p-4">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text-primary)' }}>{a.angle}</p>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{a.reasoning}</p>
            </AdminCard>
          ))}
          {result.warnings.length > 0 && (
            <AdminCard className="p-4" style={{ backgroundColor: 'rgba(171, 162, 120, 0.08)', border: '1px solid rgba(171, 162, 120, 0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#92781e' }}>Warnings</p>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs" style={{ color: '#a6953f' }}>• {w}</p>
              ))}
            </AdminCard>
          )}
        </div>
      )}
    </div>
  );
}

// ── Customer Insights Tool ────────────────────────────────────────────────────

function CustomerInsightsTool({ brandId }: { brandId: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    queryType: string;
    explanation: string;
    results: Record<string, unknown>[];
    count: number;
    nlQuery: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exampleQueries = [
    "Which customers haven't ordered in 45 days?",
    "What products are trending this month?",
    "Who are my top customers by revenue?",
    "Show recent orders from the last 7 days",
    "Which customers are at risk of churning?",
  ];

  async function handleAnalyze(nlQuery?: string) {
    const q = nlQuery ?? query;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/customer-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, nlQuery: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm rounded-lg p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', color: 'var(--admin-text-muted)' }}>
        Ask questions about your customers and orders in plain English. The AI will analyze and return actionable insights.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>Ask about your customers</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={2}
          placeholder="e.g., 'Which customers haven't ordered in 45 days?'"
          className={inputBaseClass}
          style={textareaStyle}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {exampleQueries.map((q) => (
          <button
            key={q}
            onClick={() => { setQuery(q); handleAnalyze(q); }}
            className="rounded-full px-3 py-1 text-xs transition-all"
            style={{ 
              backgroundColor: 'var(--admin-bg)', 
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            {q}
          </button>
        ))}
      </div>
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(171, 162, 120, 0.1)', border: '1px solid rgba(171, 162, 120, 0.2)', color: '#92781e' }}>
        AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={() => handleAnalyze()}
        disabled={loading || !query.trim()}
        className={btnPrimaryClass}
        style={{
          ...btnPrimaryStyle,
          opacity: (loading || !query.trim()) ? 0.5 : 1,
          cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {result && (
        <div className="space-y-4">
          <AdminCard className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Query Type</p>
            <span 
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}
            >
              {result.queryType?.replace("_", " ")}
            </span>
            <p className="text-sm mt-2" style={{ color: 'var(--admin-text-muted)' }}>{result.explanation}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>
              Results <span style={{ color: 'var(--admin-accent)' }}>({result.count} found)</span>
            </p>
            {result.results.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>No results found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {Object.keys(result.results[0] ?? {}).map((k) => (
                        <th key={k} className="text-left px-2 py-1.5 font-medium uppercase" style={{ color: 'var(--admin-text-muted)' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--admin-border-light)' }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1.5" style={{ color: 'var(--admin-text-secondary)' }}>{String(v ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </div>
      )}
    </div>
  );
}

// ── Route Optimizer Tool ──────────────────────────────────────────────────────

type StopEntry = { name: string; city: string; state: string; address: string; time_window: string };

function RouteOptimizerTool({ brandId }: { brandId: string }) {
  const [stops, setStops] = useState<StopEntry[]>([
    { name: "", city: "", state: "", address: "", time_window: "" },
    { name: "", city: "", state: "", address: "", time_window: "" },
  ]);
  const [startLocation, setStartLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    optimizedSequence: Array<{ position: number; stopName: string; city: string; state: string; reason: string }>;
    totalEstimatedDistance: string;
    totalEstimatedDriveTime: string;
    warnings: string[];
    suggestions: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addStop() {
    setStops([...stops, { name: "", city: "", state: "", address: "", time_window: "" }]);
  }

  function removeStop(index: number) {
    setStops(stops.filter((_, i) => i !== index));
  }

  function updateStop(index: number, field: keyof StopEntry, value: string) {
    const updated = [...stops];
    updated[index] = { ...updated[index], [field]: value };
    setStops(updated);
  }

  async function handleOptimize() {
    const validStops = stops.filter((s) => s.name.trim() && s.city.trim() && s.state.trim());
    if (validStops.length < 2) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/route-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, stops: validStops, startLocation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Optimization failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const validStops = stops.filter((s) => s.name.trim() && s.city.trim() && s.state.trim());

  return (
    <div className="space-y-4">
      <p className="text-sm rounded-lg p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', color: 'var(--admin-text-muted)' }}>
        Add your stops below. You need at least 2 stops to optimize a route.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>Start Location</label>
        <input
          type="text"
          value={startLocation}
          onChange={(e) => setStartLocation(e.target.value)}
          placeholder="Warehouse, Greeley CO"
          className={inputBaseClass}
          style={inputStyle}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium" style={labelStyle}>Stops</label>
          <button
            onClick={addStop}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--admin-accent)' }}
          >
            + Add Stop
          </button>
        </div>
        {stops.map((stop, i) => (
          <AdminCard key={i} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>Stop {i + 1}</span>
              {stops.length > 2 && (
                <button onClick={() => removeStop(i)} className="text-xs transition-colors" style={{ color: 'var(--admin-danger)' }}>
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Name *</label>
                <input
                  type="text"
                  value={stop.name}
                  onChange={(e) => updateStop(i, "name", e.target.value)}
                  placeholder="Farmers Market"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>City *</label>
                <input
                  type="text"
                  value={stop.city}
                  onChange={(e) => updateStop(i, "city", e.target.value)}
                  placeholder="Greeley"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>State *</label>
                <input
                  type="text"
                  value={stop.state}
                  onChange={(e) => updateStop(i, "state", e.target.value)}
                  placeholder="CO"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Address</label>
                <input
                  type="text"
                  value={stop.address}
                  onChange={(e) => updateStop(i, "address", e.target.value)}
                  placeholder="123 Main St"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Time Window</label>
              <input
                type="text"
                value={stop.time_window}
                onChange={(e) => updateStop(i, "time_window", e.target.value)}
                placeholder="8am–12pm"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
              />
            </div>
          </AdminCard>
        ))}
      </div>
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(171, 162, 120, 0.1)', border: '1px solid rgba(171, 162, 120, 0.2)', color: '#92781e' }}>
        AI-generated suggestions — review before use. Not a substitute for professional routing software.
      </div>
      <button
        onClick={handleOptimize}
        disabled={loading || validStops.length < 2}
        className={btnPrimaryClass}
        style={{
          ...btnPrimaryStyle,
          opacity: (loading || validStops.length < 2) ? 0.5 : 1,
          cursor: (loading || validStops.length < 2) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? "Optimizing..." : "Optimize Route"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <AdminCard className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Est. Distance</p>
              <p className="text-base font-bold" style={{ color: 'var(--admin-text-primary)' }}>{result.totalEstimatedDistance}</p>
            </AdminCard>
            <AdminCard className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Drive Time</p>
              <p className="text-base font-bold" style={{ color: 'var(--admin-text-primary)' }}>{result.totalEstimatedDriveTime}</p>
            </AdminCard>
          </div>
          <AdminCard className="p-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#047857' }}>Optimized Sequence</p>
            {result.optimizedSequence.map((s, i) => (
              <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: i < result.optimizedSequence.length - 1 ? '1px solid var(--admin-border-light)' : 'none' }}>
                <span 
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: 'var(--admin-accent)' }}
                >
                  {s.position}
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>{s.stopName}</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{s.city}, {s.state}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#047857' }}>{s.reason}</p>
                </div>
              </div>
            ))}
          </AdminCard>
          {result.suggestions.length > 0 && (
            <AdminCard className="p-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#047857' }}>Suggestions</p>
              {result.suggestions.map((s, i) => <p key={i} className="text-sm" style={{ color: '#059669' }}>✓ {s}</p>)}
            </AdminCard>
          )}
          {result.warnings.length > 0 && (
            <AdminCard className="p-4" style={{ backgroundColor: 'rgba(171, 162, 120, 0.08)', border: '1px solid rgba(171, 162, 120, 0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#92781e' }}>Warnings</p>
              {result.warnings.map((w, i) => <p key={i} className="text-sm" style={{ color: '#a6953f' }}>⚠ {w}</p>)}
            </AdminCard>
          )}
          <button 
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))} 
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}

// ── Demand Forecasting Tool ───────────────────────────────────────────────────

type ForecastEntry = { date: string; quantity_sold: string; stop: string };

function DemandForecastTool({ brandId }: { brandId: string }) {
  const [productName, setProductName] = useState("");
  const [stopName, setStopName] = useState("");
  const [historicalData, setHistoricalData] = useState<ForecastEntry[]>([
    { date: "", quantity_sold: "", stop: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    currentTrend: string;
    prediction: {
      nextStopVolume: number;
      nextWeekVolume: number;
      confidence: string;
      confidenceReason: string;
    };
    recommendedStock: { units: number; reasoning: string };
    seasonalFactors: string[];
    riskFlags: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!productName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedData = historicalData
        .filter((d) => d.date.trim())
        .map((d) => ({
          date: d.date.trim(),
          quantity_sold: parseInt(d.quantity_sold) || 0,
          stop: d.stop.trim(),
        }));

      const res = await fetch("/api/ai/demand-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, productName, stopName, historicalData: parsedData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function addRow() { setHistoricalData([...historicalData, { date: "", quantity_sold: "", stop: "" }]); }
  function removeRow(i: number) { setHistoricalData(historicalData.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: keyof ForecastEntry, val: string) {
    const updated = [...historicalData]; updated[i] = { ...updated[i], [field]: val }; setHistoricalData(updated);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm rounded-lg p-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', color: 'var(--admin-text-muted)' }}>
        Enter a product name for demand forecasting. Add historical sales rows to improve accuracy.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Product Name *</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Sweet Corn" className={inputBaseClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Stop Name</label>
          <input type="text" value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="Downtown Farmers Market" className={inputBaseClass} style={inputStyle} />
        </div>
      </div>

      {/* Historical Data */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium" style={labelStyle}>Historical Sales</label>
          <button onClick={addRow} className="text-xs transition-colors" style={{ color: 'var(--admin-accent)' }}>+ Add Row</button>
        </div>
        <AdminCard className="divide-y" style={{ border: '1px solid var(--admin-border)' }}>
          <div className="grid grid-cols-4 gap-2 px-3 py-2">
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date</span>
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Units Sold</span>
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Stop</span>
            <span />
          </div>
          {historicalData.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 items-center">
              <input
                type="text"
                value={row.date}
                onChange={(e) => updateRow(i, "date", e.target.value)}
                placeholder="2026-04-01"
                className="rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
              />
              <input
                type="text"
                value={row.quantity_sold}
                onChange={(e) => updateRow(i, "quantity_sold", e.target.value)}
                placeholder="120"
                className="rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
              />
              <input
                type="text"
                value={row.stop}
                onChange={(e) => updateRow(i, "stop", e.target.value)}
                placeholder="Farmers Market"
                className="rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
              />
              {historicalData.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-xs justify-self-end transition-colors" style={{ color: 'var(--admin-danger)' }}>✕</button>
              )}
            </div>
          ))}
        </AdminCard>
      </div>
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'rgba(171, 162, 120, 0.1)', border: '1px solid rgba(171, 162, 120, 0.2)', color: '#92781e' }}>
        AI-generated forecasts — review before use. Not a substitute for professional supply chain planning.
      </div>
      <button
        onClick={handleAnalyze}
        disabled={loading || !productName.trim()}
        className={btnPrimaryClass}
        style={{
          ...btnPrimaryStyle,
          opacity: (loading || !productName.trim()) ? 0.5 : 1,
          cursor: (loading || !productName.trim()) ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? "Forecasting..." : "Generate Forecast"}
      </button>
      {error && <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>{error}</p>}
      {result && (
        <div className="space-y-4">
          <AdminCard className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Current Trend</p>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>{result.currentTrend}</p>
          </AdminCard>
          <div className="grid grid-cols-3 gap-3">
            <AdminCard className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Next Stop</p>
              <p className="text-xl font-bold" style={{ color: 'var(--admin-accent)' }}>{result.prediction.nextStopVolume}<span className="text-sm font-normal ml-1" style={{ color: 'var(--admin-text-muted)' }}>units</span></p>
            </AdminCard>
            <AdminCard className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Next Week</p>
              <p className="text-xl font-bold" style={{ color: 'var(--admin-accent)' }}>{result.prediction.nextWeekVolume}<span className="text-sm font-normal ml-1" style={{ color: 'var(--admin-text-muted)' }}>units</span></p>
            </AdminCard>
            <AdminCard className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>Confidence</p>
              <span 
                className="inline-block rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  background: result.prediction.confidence === "high" ? 'rgba(16, 185, 129, 0.1)' : result.prediction.confidence === "medium" ? 'rgba(171, 162, 120, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                  color: result.prediction.confidence === "high" ? '#047857' : result.prediction.confidence === "medium" ? '#92781e' : '#dc2626',
                }}
              >
                {result.prediction.confidence}
              </span>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>{result.prediction.confidenceReason}</p>
            </AdminCard>
          </div>
          <AdminCard className="p-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#047857' }}>Recommended Stock</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>{result.recommendedStock.units}<span className="text-sm font-normal ml-1" style={{ color: 'var(--admin-text-muted)' }}>units</span></p>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-secondary)' }}>{result.recommendedStock.reasoning}</p>
          </AdminCard>
          {result.seasonalFactors.length > 0 && (
            <AdminCard className="p-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#2563eb' }}>Seasonal Factors</p>
              {result.seasonalFactors.map((f, i) => <p key={i} className="text-sm" style={{ color: '#3b82f6' }}>☀ {f}</p>)}
            </AdminCard>
          )}
          {result.riskFlags.length > 0 && (
            <AdminCard className="p-4" style={{ backgroundColor: 'rgba(171, 162, 120, 0.08)', border: '1px solid rgba(171, 162, 120, 0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#92781e' }}>Risk Flags</p>
              {result.riskFlags.map((r, i) => <p key={i} className="text-sm" style={{ color: '#a6953f' }}>⚠ {r}</p>)}
            </AdminCard>
          )}
          <button 
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))} 
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

type ModalProps = {
  tool: AITool;
  brandId: string;
  brandName: string;
  onClose: () => void;
};

function ToolModal({ tool, brandId, brandName, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(60, 56, 37, 0.4)', backdropFilter: 'blur(4px)' }}>
      <AdminCard className="w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tool.icon}</span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--admin-text-primary)' }}>{tool.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 transition-colors" style={{ color: 'var(--admin-text-muted)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {tool.id === "campaign-writer" && <CampaignWriterTool brandId={brandId} brandName={brandName} />}
          {tool.id === "product-writer" && <ProductWriterTool brandId={brandId} />}
          {tool.id === "report-explainer" && <ReportExplainerTool brandId={brandId} />}
          {tool.id === "pricing-advisor" && <PricingAdvisorTool brandId={brandId} />}
          {tool.id === "stop-blast-advisor" && <StopBlastAdvisorTool brandId={brandId} />}
          {tool.id === "customer-insights" && <CustomerInsightsTool brandId={brandId} />}
          {tool.id === "route-suggester" && <RouteOptimizerTool brandId={brandId} />}
          {tool.id === "demand-forecast" && <DemandForecastTool brandId={brandId} />}
        </div>
      </AdminCard>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIsettingsClient({ 
  isConnected, 
  brandId, 
  brandName,
  provider = "openai",
  model = "gpt-4o-mini",
  customEndpoint 
}: Props) {
  const [activeTool, setActiveTool] = useState<AITool | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(provider);
  const [currentModel, setCurrentModel] = useState(model);

  const filteredTools = activeModule ? AI_TOOLS.filter((t) => t.module === activeModule) : AI_TOOLS;
  const modules = [...new Set(AI_TOOLS.map((t) => t.module))];

  const availableCount = AI_TOOLS.filter((t) => t.status === "available").length;

  return (
    <main className="admin-page">
      <div className="admin-container">
        {/* Header with icon */}
        <div className="flex items-center gap-4 mb-6">
          <AIHeaderIcon />
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>AI Tools</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              AI-assisted features across Harvest Reach, Products, Reports, and more.
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
          <a href="/admin" style={{ color: 'var(--admin-text-secondary)' }}>Admin</a>
          <span>/</span>
          <a href="/admin/settings" style={{ color: 'var(--admin-text-secondary)' }}>Settings</a>
          <span>/</span>
          <span style={{ color: 'var(--admin-text-secondary)' }}>AI Tools</span>
        </nav>

        {/* Connection Status Banner */}
        <ConnectionStatusBanner 
          isConnected={isConnected} 
          availableCount={availableCount}
          onConfigure={() => window.location.href = '/admin/settings#integrations'}
        />

        {/* Provider Selector */}
        <ProviderSelector
          currentProvider={selectedProvider}
          currentModel={currentModel}
          brandId={brandId}
          onSelect={setSelectedProvider}
        />

        {/* Model Input */}
        <ModelInput
          currentModel={currentModel}
          brandId={brandId}
          onChange={setCurrentModel}
        />

        {/* Module filter */}
        <div className="admin-filter-tabs mb-6">
          <button
            onClick={() => setActiveModule(null)}
            className={`admin-filter-tab ${activeModule === null ? 'admin-filter-tab--active' : ''}`}
          >
            All ({AI_TOOLS.length})
          </button>
          {modules.map((m) => {
            const count = AI_TOOLS.filter((t) => t.module === m).length;
            return (
              <button
                key={m}
                onClick={() => setActiveModule(activeModule === m ? null : m)}
                className={`admin-filter-tab ${activeModule === m ? 'admin-filter-tab--active' : ''}`}
              >
                {m} ({count})
              </button>
            );
          })}
        </div>

        {/* Tool Cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isConnected={isConnected}
              onOpen={setActiveTool}
            />
          ))}
        </div>

        {/* Info box */}
        <AdminCard className="mt-8 p-5" style={{ 
          background: 'rgba(202, 117, 67, 0.05)',
          border: '1px solid rgba(202, 117, 67, 0.15)',
        }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#8c4c27' }}>About AI in Route Commerce</h3>
          <p className="text-sm" style={{ color: '#a0694f', lineHeight: 1.6 }}>
            AI tools process your data locally — orders, products, stops, and contacts — and send requests to your configured AI provider.
            No data is stored or shared beyond the generation request. Experimental features may require additional setup.
          </p>
        </AdminCard>
      </div>

      {/* Tool Modal */}
      {activeTool && (
        <ToolModal
          tool={activeTool}
          brandId={brandId}
          brandName={brandName}
          onClose={() => setActiveTool(null)}
        />
      )}
    </main>
  );
}