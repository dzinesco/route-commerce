"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getBrandSettings } from "@/actions/brand-settings";

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

type Props = {
  isConnected: boolean;
  brandId: string;
  brandName: string;
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
        <label className="block text-sm font-medium text-stone-700 mb-1">What do you want to communicate?</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          placeholder="e.g., 'Remind customers about the new sweet corn season starting next week, emphasize freshness and local delivery'"
          className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
      </div>
      <button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generating..." : "Generate Campaign Ideas"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((idea, i) => (
            <div key={i} className="rounded-xl border border-stone-300 p-4 bg-white">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Idea {i + 1}</p>
              <p className="text-sm font-medium text-stone-950 mb-1"><span className="text-stone-400">Subject:</span> {idea.subject}</p>
              <p className="text-sm text-stone-500 mt-2 whitespace-pre-line">{idea.body}</p>
            </div>
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
          <label className="block text-sm font-medium text-stone-700 mb-1">Product Name *</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Sweet Corn" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Vegetables" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Price</label>
          <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$4.50" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="per dozen" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={loading || !productName.trim()}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generating..." : "Write Description"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="rounded-xl border border-stone-300 p-5 bg-white space-y-4">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Product Name</p>
            <p className="text-base font-semibold text-stone-950">{result.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{result.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Image Alt Text</p>
            <p className="text-sm text-stone-500">{result.altText}</p>
          </div>
          {result.priceNote && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Pricing Note</p>
              <p className="text-sm text-stone-500">{result.priceNote}</p>
            </div>
          )}
        </div>
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
      <p className="text-sm text-stone-500 bg-white rounded-lg p-3">
        The Report Explainer analyzes any report tab from the Reports dashboard. Switch to a report tab, copy the data, and paste it here for an AI-generated breakdown.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          >
            {reportTypes.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Date Range</label>
          <input
            type="text"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            placeholder="e.g., Last 7 days, March 2026"
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        ⚠️ AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={handleExplain}
        disabled={loading}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Explain Report"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-300 p-5 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Summary</p>
            <p className="text-sm text-stone-700 leading-relaxed">{result.summary}</p>
          </div>
          <div className="rounded-xl border border-stone-300 p-5 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Key Insights</p>
            <ul className="space-y-2">
              {result.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="text-emerald-600 mt-0.5">→</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-stone-300 p-5 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Suggested Actions</p>
            <ul className="space-y-2">
              {result.suggestedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1"
          >
            📋 Copy to clipboard
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

  // Price tier helpers
  function addTier() { setPriceTiers([...priceTiers, { tier: "", price: "" }]); }
  function removeTier(i: number) { setPriceTiers(priceTiers.filter((_, idx) => idx !== i)); }
  function updateTier(i: number, field: keyof PriceTier, val: string) {
    const updated = [...priceTiers]; updated[i] = { ...updated[i], [field]: val }; setPriceTiers(updated);
  }

  // Sales entry helpers
  function addSale() { setHistoricalSales([...historicalSales, { date: "", units_sold: "", revenue: "" }]); }
  function removeSale(i: number) { setHistoricalSales(historicalSales.filter((_, idx) => idx !== i)); }
  function updateSale(i: number, field: keyof SalesEntry, val: string) {
    const updated = [...historicalSales]; updated[i] = { ...updated[i], [field]: val }; setHistoricalSales(updated);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500 bg-white rounded-lg p-3">
        Enter a product name and optional price tiers or historical sales data for AI-powered pricing recommendations.
      </p>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Product Name *</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Sweet Corn"
          className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      {/* Price Tiers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">Price Tiers</label>
          <button onClick={addTier} className="text-xs text-emerald-700 hover:text-emerald-600">+ Add Tier</button>
        </div>
        {priceTiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={tier.tier}
              onChange={(e) => updateTier(i, "tier", e.target.value)}
              placeholder="e.g., Wholesale"
              className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-stone-50"
            />
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input
                type="text"
                value={tier.price}
                onChange={(e) => updateTier(i, "price", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-stone-200 pl-7 pr-3 py-2 text-sm outline-none focus:border-emerald-500 bg-stone-50"
              />
            </div>
            {priceTiers.length > 1 && (
              <button onClick={() => removeTier(i)} className="text-red-700 hover:text-red-600 text-xs px-2">✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Historical Sales */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">Historical Sales</label>
          <button onClick={addSale} className="text-xs text-emerald-700 hover:text-emerald-600">+ Add Row</button>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-200">
          <div className="grid grid-cols-4 gap-2 px-3 py-2">
            <span className="text-xs text-stone-400 font-medium">Date</span>
            <span className="text-xs text-stone-400 font-medium">Units Sold</span>
            <span className="text-xs text-stone-400 font-medium">Revenue</span>
            <span />
          </div>
          {historicalSales.map((sale, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 items-center">
              <input
                type="text"
                value={sale.date}
                onChange={(e) => updateSale(i, "date", e.target.value)}
                placeholder="2026-04-01"
                className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 bg-stone-50"
              />
              <input
                type="text"
                value={sale.units_sold}
                onChange={(e) => updateSale(i, "units_sold", e.target.value)}
                placeholder="120"
                className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 bg-stone-50"
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                <input
                  type="text"
                  value={sale.revenue}
                  onChange={(e) => updateSale(i, "revenue", e.target.value)}
                  placeholder="540"
                  className="w-full rounded-lg border border-stone-200 pl-5 pr-2 py-1.5 text-xs outline-none focus:border-emerald-500 bg-stone-50"
                />
              </div>
              {historicalSales.length > 1 && (
                <button onClick={() => removeSale(i)} className="text-red-700 hover:text-red-600 text-xs justify-self-end">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        ⚠️ AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={handleAnalyze}
        disabled={loading || !productName.trim()}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Analyze Pricing"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-300 p-5 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Current State</p>
            <p className="text-sm text-stone-700 leading-relaxed">{result.currentState}</p>
          </div>
          {result.recommendations.map((rec, i) => (
            <div key={i} className="rounded-xl border border-stone-300 p-5 bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-stone-950">{rec.productName}</p>
                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                  rec.direction === "increase" ? "bg-green-50 text-green-700" :
                  rec.direction === "decrease" ? "bg-red-50 text-red-700" :
                  "bg-stone-50 text-stone-500"
                }`}>
                  {rec.direction}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm mb-2">
                <span className="text-stone-500">${rec.currentPrice}</span>
                <span className="text-stone-500">→</span>
                <span className="font-bold text-emerald-700">${rec.suggestedPrice}</span>
                <span className={`text-xs ml-auto ${rec.estimatedRevenueImpact.startsWith("+") ? "text-green-700" : "text-stone-400"}`}>
                  {rec.estimatedRevenueImpact}
                </span>
              </div>
              <p className="text-sm text-stone-500">{rec.reasoning}</p>
            </div>
          ))}
          {result.opportunities.length > 0 && (
            <div className="rounded-xl border border-green-200 p-5 bg-green-50">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Opportunities</p>
              <ul className="space-y-1">
                {result.opportunities.map((opp, i) => (
                  <li key={i} className="text-sm text-green-600">• {opp}</li>
                ))}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 p-5 bg-amber-50">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Warnings</p>
              <ul className="space-y-1">
                {result.warnings.map((warn, i) => (
                  <li key={i} className="text-sm text-amber-600">• {warn}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1"
          >
            📋 Copy to clipboard
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
      <p className="text-sm text-stone-500 bg-white rounded-lg p-3">
        Enter details about the stop you want to send a blast for. The AI will suggest optimal timing, subject lines, content angles, and audience targeting.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Stop Name *</label>
          <input type="text" value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="Downtown Farmers Market" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Stop Date</label>
          <input type="text" value={stopDate} onChange={(e) => setStopDate(e.target.value)} placeholder="2026-06-15" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Greeley" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Customer Count</label>
          <input type="text" value={customerCount} onChange={(e) => setCustomerCount(e.target.value)} placeholder="42" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        ⚠️ AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={handleAnalyze}
        disabled={loading || !stopName.trim()}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Get Recommendations"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-300 p-5 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Timing</p>
            <p className="text-sm text-stone-700">{result.timingRecommendation}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 p-5 bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Recommended Subject Line</p>
            <p className="text-base font-semibold text-stone-950">{result.subjectLine}</p>
            <button onClick={() => copyToClipboard(result.subjectLine)} className="mt-2 text-xs text-emerald-700 hover:text-emerald-600 flex items-center gap-1">
              📋 Copy
            </button>
          </div>
          <div className="rounded-xl border border-stone-300 p-5 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Body Preview</p>
            <p className="text-sm text-stone-700 leading-relaxed">{result.bodyPreview}</p>
          </div>
          <div className="rounded-xl border border-stone-300 p-5 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Audience</p>
            <p className="text-sm text-stone-700">{result.audienceRecommendation}</p>
            <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{result.audienceSize} recipients</span>
          </div>
          {result.contentAngles.map((a, i) => (
            <div key={i} className="rounded-xl border border-stone-300 p-4 bg-white">
              <p className="text-sm font-semibold text-stone-950 mb-1">📣 {a.angle}</p>
              <p className="text-xs text-stone-400">{a.reasoning}</p>
            </div>
          ))}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Warnings</p>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600">• {w}</p>
              ))}
            </div>
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
      <p className="text-sm text-stone-500 bg-white rounded-lg p-3">
        Ask questions about your customers and orders in plain English. The AI will analyze and return actionable insights.
      </p>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Ask about your customers</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={2}
          placeholder="e.g., 'Which customers haven't ordered in 45 days?'"
          className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {exampleQueries.map((q) => (
          <button
            key={q}
            onClick={() => { setQuery(q); handleAnalyze(q); }}
            className="rounded-full bg-stone-50 px-3 py-1 text-xs text-stone-500 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        ⚠️ AI-generated suggestions — review before use. Not a substitute for business judgment.
      </div>
      <button
        onClick={() => handleAnalyze()}
        disabled={loading || !query.trim()}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-300 p-4 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Query Type</p>
            <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-xs font-medium">{result.queryType?.replace("_", " ")}</span>
            <p className="text-sm text-stone-500 mt-2">{result.explanation}</p>
          </div>
          <div className="rounded-xl border border-stone-300 p-4 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Results <span className="text-emerald-700">({result.count} found)</span>
            </p>
            {result.results.length === 0 ? (
              <p className="text-sm text-stone-400">No results found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stone-300">
                      {Object.keys(result.results[0] ?? {}).map((k) => (
                        <th key={k} className="text-left px-2 py-1.5 font-medium text-stone-400 uppercase">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, i) => (
                      <tr key={i} className="border-b border-stone-300">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1.5 text-stone-700">{String(v ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
      <p className="text-sm text-stone-500 bg-white rounded-lg p-3">
        Add your stops below. You need at least 2 stops to optimize a route.
      </p>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Start Location</label>
        <input
          type="text"
          value={startLocation}
          onChange={(e) => setStartLocation(e.target.value)}
          placeholder="Warehouse, Greeley CO"
          className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">Stops</label>
          <button
            onClick={addStop}
            className="text-xs text-emerald-700 hover:text-emerald-600 flex items-center gap-1"
          >
            + Add Stop
          </button>
        </div>
        {stops.map((stop, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Stop {i + 1}</span>
              {stops.length > 2 && (
                <button onClick={() => removeStop(i)} className="text-xs text-red-700 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={stop.name}
                  onChange={(e) => updateStop(i, "name", e.target.value)}
                  placeholder="Farmers Market"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">City *</label>
                <input
                  type="text"
                  value={stop.city}
                  onChange={(e) => updateStop(i, "city", e.target.value)}
                  placeholder="Greeley"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">State *</label>
                <input
                  type="text"
                  value={stop.state}
                  onChange={(e) => updateStop(i, "state", e.target.value)}
                  placeholder="CO"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Address</label>
                <input
                  type="text"
                  value={stop.address}
                  onChange={(e) => updateStop(i, "address", e.target.value)}
                  placeholder="123 Main St"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-stone-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Time Window</label>
              <input
                type="text"
                value={stop.time_window}
                onChange={(e) => updateStop(i, "time_window", e.target.value)}
                placeholder="8am–12pm"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-stone-50"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        ⚠️ AI-generated suggestions — review before use. Not a substitute for professional routing software.
      </div>
      <button
        onClick={handleOptimize}
        disabled={loading || validStops.length < 2}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Optimizing..." : "Optimize Route"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-stone-300 p-4 bg-white">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Est. Distance</p>
              <p className="text-base font-bold text-stone-950">{result.totalEstimatedDistance}</p>
            </div>
            <div className="rounded-xl border border-stone-300 p-4 bg-white">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Drive Time</p>
              <p className="text-base font-bold text-stone-950">{result.totalEstimatedDriveTime}</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 p-4 bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Optimized Sequence</p>
            {result.optimizedSequence.map((s, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-stone-300 last:border-0">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex-shrink-0">{s.position}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-950">{s.stopName}</p>
                  <p className="text-xs text-stone-400">{s.city}, {s.state}</p>
                  <p className="text-xs text-emerald-700 mt-0.5">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
          {result.suggestions.length > 0 && (
            <div className="rounded-xl border border-green-200 p-4 bg-green-50">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Suggestions</p>
              {result.suggestions.map((s, i) => <p key={i} className="text-sm text-green-600">✓ {s}</p>)}
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Warnings</p>
              {result.warnings.map((w, i) => <p key={i} className="text-sm text-amber-600">⚠ {w}</p>)}
            </div>
          )}
          <button onClick={() => copyToClipboard(JSON.stringify(result, null, 2))} className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1">
            📋 Copy to clipboard
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
      <p className="text-sm text-stone-500 bg-white rounded-lg p-3">
        Enter a product name for demand forecasting. Add historical sales rows to improve accuracy.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Product Name *</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Sweet Corn" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Stop Name</label>
          <input type="text" value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="Downtown Farmers Market" className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </div>
      </div>

      {/* Historical Data */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">Historical Sales</label>
          <button onClick={addRow} className="text-xs text-emerald-700 hover:text-emerald-600">+ Add Row</button>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-200">
          <div className="grid grid-cols-4 gap-2 px-3 py-2">
            <span className="text-xs text-stone-400 font-medium">Date</span>
            <span className="text-xs text-stone-400 font-medium">Units Sold</span>
            <span className="text-xs text-stone-400 font-medium">Stop</span>
            <span />
          </div>
          {historicalData.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 items-center">
              <input
                type="text"
                value={row.date}
                onChange={(e) => updateRow(i, "date", e.target.value)}
                placeholder="2026-04-01"
                className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 bg-stone-50"
              />
              <input
                type="text"
                value={row.quantity_sold}
                onChange={(e) => updateRow(i, "quantity_sold", e.target.value)}
                placeholder="120"
                className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 bg-stone-50"
              />
              <input
                type="text"
                value={row.stop}
                onChange={(e) => updateRow(i, "stop", e.target.value)}
                placeholder="Farmers Market"
                className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 bg-stone-50"
              />
              {historicalData.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-red-700 hover:text-red-600 text-xs justify-self-end">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
        ⚠️ AI-generated forecasts — review before use. Not a substitute for professional supply chain planning.
      </div>
      <button
        onClick={handleAnalyze}
        disabled={loading || !productName.trim()}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Forecasting..." : "Generate Forecast"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-300 p-4 bg-white">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Current Trend</p>
            <p className="text-sm text-stone-700 leading-relaxed">{result.currentTrend}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-stone-300 p-4 bg-white">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Next Stop</p>
              <p className="text-xl font-bold text-emerald-700">{result.prediction.nextStopVolume}<span className="text-sm font-normal text-stone-400 ml-1">units</span></p>
            </div>
            <div className="rounded-xl border border-stone-300 p-4 bg-white">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Next Week</p>
              <p className="text-xl font-bold text-emerald-700">{result.prediction.nextWeekVolume}<span className="text-sm font-normal text-stone-400 ml-1">units</span></p>
            </div>
            <div className="rounded-xl border border-stone-300 p-4 bg-white">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Confidence</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                result.prediction.confidence === "high" ? "bg-green-50 text-green-700" :
                result.prediction.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                "bg-red-50 text-red-700"
              }`}>{result.prediction.confidence}</span>
              <p className="text-xs text-stone-400 mt-1">{result.prediction.confidenceReason}</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 p-4 bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Recommended Stock</p>
            <p className="text-2xl font-bold text-stone-950">{result.recommendedStock.units}<span className="text-sm font-normal text-stone-400 ml-1">units</span></p>
            <p className="text-sm text-stone-500 mt-1">{result.recommendedStock.reasoning}</p>
          </div>
          {result.seasonalFactors.length > 0 && (
            <div className="rounded-xl border border-blue-200 p-4 bg-blue-50">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Seasonal Factors</p>
              {result.seasonalFactors.map((f, i) => <p key={i} className="text-sm text-blue-600">☀ {f}</p>)}
            </div>
          )}
          {result.riskFlags.length > 0 && (
            <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Risk Flags</p>
              {result.riskFlags.map((r, i) => <p key={i} className="text-sm text-amber-600">⚠ {r}</p>)}
            </div>
          )}
          <button onClick={() => copyToClipboard(JSON.stringify(result, null, 2))} className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1">
            📋 Copy to clipboard
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tool.icon}</span>
            <h2 className="text-lg font-bold text-stone-950">{tool.title}</h2>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-500 p-2">
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
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIsettingsClient({ isConnected, brandId, brandName }: Props) {
  const [activeTool, setActiveTool] = useState<AITool | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const filteredTools = activeModule ? AI_TOOLS.filter((t) => t.module === activeModule) : AI_TOOLS;
  const modules = [...new Set(AI_TOOLS.map((t) => t.module))];

  const availableCount = AI_TOOLS.filter((t) => t.status === "available").length;

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            <h1 className="text-3xl font-bold text-stone-950">AI Tools</h1>
          </div>
          <p className="text-stone-500">
            AI-assisted features across Harvest Reach, Products, Reports, and more.
          </p>
        </div>

        {/* Connection Status Banner */}
        {isConnected ? (
          <div className="mb-6 rounded-2xl bg-green-50 border border-green-200 p-5 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-50 flex-shrink-0">
              <svg className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-700">AI Connected</p>
              <p className="text-sm text-green-500">{availableCount} tool{availableCount !== 1 ? "s" : ""} ready to use</p>
            </div>
            <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-3 py-1">Active</span>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-50 flex-shrink-0">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-600">AI Not Configured</p>
              <p className="text-sm text-amber-500">Add your API key to enable AI tools.</p>
            </div>
            <Link
              href="/admin/settings"
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              Add API Key
            </Link>
          </div>
        )}

        {/* Module filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveModule(null)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
              activeModule === null ? "bg-emerald-600 text-white" : "bg-white text-stone-500 border border-stone-300 hover:border-emerald-300"
            }`}
          >
            All ({AI_TOOLS.length})
          </button>
          {modules.map((m) => {
            const count = AI_TOOLS.filter((t) => t.module === m).length;
            return (
              <button
                key={m}
                onClick={() => setActiveModule(activeModule === m ? null : m)}
                className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
                  activeModule === m ? "bg-emerald-600 text-white" : "bg-white text-stone-500 border border-stone-300 hover:border-emerald-300"
                }`}
              >
                {m} ({count})
              </button>
            );
          })}
        </div>

        {/* Tool Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTools.map((tool) => {
            const isReady = tool.status === "available" && isConnected;
            return (
              <div
                key={tool.id}
                className={`rounded-2xl bg-white p-5 shadow-black/20 ring-1 transition-all ${
                  tool.status === "available"
                    ? "ring-stone-200 hover:shadow-md"
                    : tool.status === "experimental"
                    ? "ring-amber-200 bg-amber-50"
                    : "ring-stone-200 opacity-75"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-0.5">{tool.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-stone-950">{tool.title}</h3>
                      {tool.badge && (
                        <span className="text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5">
                          {tool.badge}
                        </span>
                      )}
                      {tool.status === "available" && (
                        <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">Ready</span>
                      )}
                      {tool.status === "experimental" && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">Experimental</span>
                      )}
                      {tool.status === "coming_soon" && (
                        <span className="text-xs font-medium text-stone-400 bg-stone-50 rounded-full px-2 py-0.5">Coming Soon</span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500 font-medium">{tool.module}</span>
                    <p className="mt-2 text-sm text-stone-500 leading-relaxed">{tool.description}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-300">
                  {tool.status === "available" && (
                    <button
                      onClick={() => isConnected && setActiveTool(tool)}
                      disabled={!isConnected}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isConnected
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                          : "bg-stone-50 text-stone-500 cursor-not-allowed"
                      }`}
                      title={!isConnected ? "Add your OpenAI API key in Settings to enable" : "Open tool"}
                    >
                      Open Tool
                    </button>
                  )}
                  {tool.status === "coming_soon" && (
                    <button disabled className="w-full rounded-xl bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-500 cursor-not-allowed">
                      Coming Soon
                    </button>
                  )}
                  {tool.status === "experimental" && (
                    <button disabled className="w-full rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-600 cursor-not-allowed">
                      Request Access
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mt-8 rounded-xl bg-emerald-50 border border-emerald-200 p-5">
          <h3 className="text-sm font-semibold text-emerald-600 mb-2">About AI in Route Commerce</h3>
          <p className="text-sm text-emerald-700 leading-relaxed">
            AI tools process your data locally — orders, products, stops, and contacts — and send requests to your configured AI provider.
            No data is stored or shared beyond the generation request. Experimental features may require additional setup.
          </p>
        </div>
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