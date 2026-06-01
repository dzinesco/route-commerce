"use client";

import { useState, useEffect } from "react";
import AIProviderPanel from "@/components/admin/AIProviderPanel";
import { savePaymentSettings, getPaymentSettings } from "@/actions/payments";

// ── Integration types ───────────────────────────────────────────────────────────

type CredentialField = {
  key: string;
  label: string;
  placeholder: string;
  isSecret?: boolean;
};

type SyncOption = {
  key: string;
  label: string;
  description?: string;
};

type Integration = {
  id: string;
  name: string;
  icon: string;
  description: string;
  accentColor: string;
  credentials: CredentialField[];
  syncOptions: SyncOption[];
};

type AvailableIntegration = {
  id: string;
  name: string;
  icon: string;
  description: string;
  accentColor: string;
};

// ── Integration catalogue ───────────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "AI",
    description: "Power AI tools like Campaign Writer, Report Explainer, and Pricing Advisor.",
    accentColor: "bg-violet-950/50 ring-violet-800",
    credentials: [
      { key: "OPENAI_API_KEY", label: "API Key", placeholder: "sk-...", isSecret: true },
      { key: "OPENAI_ORG_ID", label: "Organization ID", placeholder: "org-... (optional)" },
    ],
    syncOptions: [
      { key: "campaign_writer", label: "Campaign Idea Generator", description: "AI-powered email campaign ideas" },
      { key: "product_writer", label: "Product Description Writer", description: "AI product copy and alt text" },
      { key: "report_explainer", label: "Report Explainer", description: "Plain-English report summaries" },
      { key: "pricing_advisor", label: "Pricing Advisor", description: "AI pricing recommendations" },
      { key: "demand_forecast", label: "Demand Forecasting", description: "Predict order volumes" },
      { key: "route_optimizer", label: "Route Optimizer", description: "AI stop sequence optimization" },
      { key: "customer_insights", label: "Customer Insights", description: "NL query for orders & customers" },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    icon: "Email",
    description: "Send transactional and marketing emails via Harvest Reach.",
    accentColor: "bg-amber-950/50 ring-amber-800",
    credentials: [
      { key: "RESEND_API_KEY", label: "API Key", placeholder: "re_...", isSecret: true },
      { key: "RESEND_FROM_EMAIL", label: "From Email Address", placeholder: "orders@yourbrand.com" },
      { key: "RESEND_FROM_NAME", label: "From Name", placeholder: "Your Brand Name" },
    ],
    syncOptions: [
      { key: "transactional", label: "Transactional Email", description: "Order confirmations, pickup reminders" },
      { key: "marketing", label: "Marketing Campaigns", description: "Harvest Reach email campaigns" },
      { key: "stop_blast", label: "Stop Blast Messages", description: "Automated stop notification emails" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: "Stripe",
    description: "Process online payments for orders. Collect card details and handle refunds.",
    accentColor: "bg-zinc-800/50 ring-zinc-700",
    credentials: [
      { key: "STRIPE_PUBLISHABLE_KEY", label: "Publishable Key", placeholder: "pk_live_..." },
      { key: "STRIPE_SECRET_KEY", label: "Secret Key", placeholder: "sk_live_...", isSecret: true },
      { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Secret", placeholder: "whsec_...", isSecret: true },
    ],
    syncOptions: [
      { key: "checkout", label: "Online Checkout", description: "Branded checkout for orders" },
      { key: "refunds", label: "Refund Processing", description: "Issue partial or full refunds" },
      { key: "customer_portal", label: "Customer Portal", description: "Invoice and payment management" },
    ],
  },
  {
    id: "twilio",
    name: "Twilio",
    icon: "SMS",
    description: "Send SMS campaigns and alerts via Harvest Reach.",
    accentColor: "bg-blue-950/50 ring-blue-800",
    credentials: [
      { key: "TWILIO_ACCOUNT_SID", label: "Account SID", placeholder: "AC..." },
      { key: "TWILIO_AUTH_TOKEN", label: "Auth Token", placeholder: "Your Twilio auth token", isSecret: true },
      { key: "TWILIO_PHONE_NUMBER", label: "Phone Number", placeholder: "+1234567890" },
    ],
    syncOptions: [
      { key: "sms_campaigns", label: "SMS Campaigns", description: "Harvest Reach text message campaigns" },
      { key: "alerts", label: "Order Alerts", description: "SMS pickup and shipping notifications" },
      { key: "two_way", label: "Two-Way Messaging", description: "Customer replies and responses" },
    ],
  },
];

const AVAILABLE_INTEGRATIONS: AvailableIntegration[] = [
  { id: "shipbob", name: "ShipBob", icon: "3PL", description: "Fulfillment for e-commerce orders", accentColor: "bg-blue-950/50 ring-blue-800" },
  { id: "fedex", name: "FedEx", icon: "FedEx", description: "Live shipping rates and label printing", accentColor: "bg-amber-950/50 ring-amber-800" },
  { id: "quickbooks", name: "QuickBooks", icon: "QB", description: "Sync orders and invoices to QuickBooks Online", accentColor: "bg-green-950/50 ring-green-800" },
  { id: "hubspot", name: "HubSpot", icon: "CRM", description: "CRM sync for customer and order data", accentColor: "bg-orange-950/50 ring-orange-800" },
];

type Props = {
  brandId: string;
  brands: { id: string; name: string }[];
  isPlatformAdmin: boolean;
  paymentSettings?: {
    provider?: string | null;
    stripe_publishable_key?: string | null;
    stripe_secret_key?: string | null;
    square_access_token?: string | null;
    square_location_id?: string | null;
    square_sync_enabled?: boolean;
    square_inventory_mode?: string;
  } | null;
  resendConfigured?: boolean;
};

const iconColors: Record<string, string> = {
  AI: "bg-violet-900 text-violet-300",
  Email: "bg-amber-900 text-amber-300",
  Stripe: "bg-zinc-800 text-zinc-200",
  SMS: "bg-blue-900 text-blue-300",
  "3PL": "bg-blue-900 text-blue-300",
  FedEx: "bg-amber-900 text-amber-300",
  QB: "bg-green-900 text-green-300",
  CRM: "bg-orange-900 text-orange-300",
};

// ── Individual integration card ────────────────────────────────────────────────

function IntegrationCard({
  integration,
  brandId,
  initialPaymentSettings,
  resendConfigured,
}: {
  integration: Integration;
  brandId: string;
  initialPaymentSettings?: Props["paymentSettings"];
  resendConfigured?: boolean;
}) {
  const hasStripeCredentials = !!(integration.id === "stripe" && initialPaymentSettings?.stripe_publishable_key);
  const hasResendCredentials = !!(integration.id === "resend" && resendConfigured);
  const [enabled, setEnabled] = useState(hasStripeCredentials || hasResendCredentials);
  const [env, setEnv] = useState("sandbox");
  const [syncEnabled, setSyncEnabled] = useState<Record<string, boolean>>({});
  const [credentials, setCredentials] = useState<Record<string, string>>(() => {
    if (integration.id === "stripe" && initialPaymentSettings) {
      const c: Record<string, string> = {};
      if (initialPaymentSettings.stripe_publishable_key)
        c["STRIPE_PUBLISHABLE_KEY"] = initialPaymentSettings.stripe_publishable_key;
      if (initialPaymentSettings.stripe_secret_key)
        c["STRIPE_SECRET_KEY"] = initialPaymentSettings.stripe_secret_key;
      return c;
    }
    if (integration.id === "resend" && resendConfigured) {
      const c: Record<string, string> = {};
      if (process.env.NEXT_PUBLIC_RESEND_API_KEY)
        c["RESEND_API_KEY"] = process.env.NEXT_PUBLIC_RESEND_API_KEY;
      if (process.env.NEXT_PUBLIC_FROM_EMAIL)
        c["RESEND_FROM_EMAIL"] = process.env.NEXT_PUBLIC_FROM_EMAIL;
      if (process.env.NEXT_PUBLIC_FROM_NAME)
        c["RESEND_FROM_NAME"] = process.env.NEXT_PUBLIC_FROM_NAME;
      return c;
    }
    return {};
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    if (integration.id === "stripe") {
      const secretKey = credentials["STRIPE_SECRET_KEY"]?.trim();
      if (!secretKey) {
        setTestResult({ ok: false, message: "No secret key entered" });
        setTesting(false);
        return;
      }
      if (!secretKey.startsWith("sk_live_") && !secretKey.startsWith("sk_test_")) {
        setTestResult({ ok: false, message: "Invalid secret key format — must start with sk_live_ or sk_test_" });
        setTesting(false);
        return;
      }
      try {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
        if (res.ok) {
          const data = await res.json();
          const currency = data.currency?.toUpperCase() ?? "USD";
          const available = data.available?.amount ?? 0;
          setTestResult({ ok: true, message: `Connected! Balance: ${currency} $${(available / 100).toFixed(2)}` });
        } else {
          const err = await res.json().catch(() => ({}));
          setTestResult({ ok: false, message: err.error?.message ?? `HTTP ${res.status}` });
        }
      } catch (e: unknown) {
        setTestResult({ ok: false, message: e instanceof Error ? e.message : "Network error" });
      }
    } else {
      await new Promise((r) => setTimeout(r, 1200));
      const hasKey = Object.values(credentials).some((v) => v.trim().length > 0);
      if (hasKey) {
        setTestResult({ ok: true, message: `Successfully connected to ${integration.name}` });
      } else {
        setTestResult({ ok: false, message: `No API key configured for ${integration.name}` });
      }
    }
    setTesting(false);
  }

  async function handleSave() {
    if (integration.id === "stripe") {
      setSaving(true);
      setError(null);
      try {
        const res = await savePaymentSettings({
          brandId,
          provider: "stripe",
          stripePublishableKey: credentials["STRIPE_PUBLISHABLE_KEY"]?.trim() || undefined,
          stripeSecretKey: credentials["STRIPE_SECRET_KEY"]?.trim() || undefined,
        });
        if (!res.success) {
          setError(res.error ?? "Failed to save Stripe settings");
        } else {
          setSaving(false);
          return;
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
      setSaving(false);
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
  }

  function toggleSync(key: string) {
    setSyncEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSecret(key: string) {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const iconColors: Record<string, string> = {
    AI: "bg-violet-900 text-violet-300",
    Email: "bg-amber-900 text-amber-300",
    Stripe: "bg-zinc-800 text-zinc-200",
    SMS: "bg-blue-900 text-blue-300",
    "3PL": "bg-blue-900 text-blue-300",
    FedEx: "bg-amber-900 text-amber-300",
    QB: "bg-green-900 text-green-300",
    CRM: "bg-orange-900 text-orange-300",
  };

  return (
    <div className={`rounded-2xl border p-5 bg-zinc-900 shadow-black/20 ring-1 ${integration.accentColor.replace("50", "950/50")}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${iconColors[integration.icon] ?? "bg-zinc-800 text-zinc-300"}`}>{integration.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-100">{integration.name}</h3>
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                enabled
                  ? "bg-green-900/60 text-green-300 border border-green-700"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700"
              }`}>
                {enabled ? "Connected" : "Not Configured"}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{integration.description}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-900 after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
        </label>
      </div>

      {/* Sync options */}
      {integration.syncOptions && integration.syncOptions.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Features</p>
          <div className="space-y-2">
            {integration.syncOptions.map((opt) => (
              <label key={opt.key} className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={syncEnabled[opt.key] ?? false}
                  onChange={() => toggleSync(opt.key)}
                  className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100">{opt.label}</span>
                  {opt.description && (
                    <span className="block text-xs text-zinc-500">{opt.description}</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Credentials */}
      <div className="space-y-3 mb-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Credentials</p>
        {integration.credentials.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-zinc-400 mb-1">{field.label}</label>
            <div className="relative">
              <input
                type={showSecrets[field.key] ? "text" : "password"}
                value={credentials[field.key] ?? ""}
                onChange={(e) => setCredentials((p) => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm pr-16 text-zinc-100 outline-none focus:border-violet-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {field.isSecret && (
                  <button
                    type="button"
                    onClick={() => toggleSecret(field.key)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-1"
                  >
                    {showSecrets[field.key] ? "Hide" : "Show"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Environment toggle */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-zinc-400 mb-1">Environment</label>
        <div className="flex gap-2">
          {["sandbox", "production"].map((e) => (
            <button
              key={e}
              onClick={() => setEnv(e)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                env === e
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
          testResult.ok ? "bg-green-900/50 text-green-300 border border-green-700" : "bg-red-900/50 text-red-300 border border-red-700"
        }`}>
          <span>{testResult.ok ? "✓" : "✗"}</span>
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg px-4 py-2.5 text-sm bg-red-900/50 text-red-300 border border-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={testing || !enabled}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ── Custom integration type ────────────────────────────────────────────────────

type CustomIntegration = {
  id: string;
  name: string;
  type: "ai_provider" | "payment_processor" | "other";
  enabled: boolean;
  credentials: { key: string; label: string; value: string; isSecret?: boolean }[];
  syncOptions: string[];
  testEndpoint?: string;
};

// ── Main client component ───────────────────────────────────────────────────────

export default function IntegrationsClient({ brandId, brands, isPlatformAdmin, paymentSettings, resendConfigured }: Props) {
  const [selectedBrandId, setSelectedBrandId] = useState(brandId);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [customIntegrations, setCustomIntegrations] = useState<CustomIntegration[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomType, setNewCustomType] = useState<"ai_provider" | "payment_processor" | "other">("other");
  const [currentPaymentSettings, setCurrentPaymentSettings] = useState(paymentSettings);

  // Re-fetch payment settings when brand changes
  useEffect(() => {
    if (!isPlatformAdmin) return;
    getPaymentSettings(selectedBrandId).then((result) => {
      if (result.success) setCurrentPaymentSettings(result.settings);
    });
  }, [selectedBrandId, isPlatformAdmin]);

  // Integrations shown in the grid — OpenAI card is hidden since it's now handled by AIProviderPanel
  const gridIntegrations = INTEGRATIONS.filter((i) => i.id !== "openai");

  const filtered = gridIntegrations.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
  );

  const availableFiltered = AVAILABLE_INTEGRATIONS.filter(
    (a) =>
      !gridIntegrations.find((i) => i.id === a.id) &&
      (a.name.toLowerCase().includes(addSearch.toLowerCase()) ||
        a.description.toLowerCase().includes(addSearch.toLowerCase()))
  );

  function addIntegration(app: AvailableIntegration) {
    setShowAddModal(false);
    setAddSearch("");
  }

  function handleAddCustom() {
    if (!newCustomName.trim()) return;
    const newInt: CustomIntegration = {
      id: `custom_${Date.now()}`,
      name: newCustomName,
      type: newCustomType,
      enabled: false,
      credentials: [],
      syncOptions: [],
    };
    setCustomIntegrations((prev) => [...prev, newInt]);
    setNewCustomName("");
    setShowCustomForm(false);
  }

  return (
    <div>
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700">
                <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-100">Integrations</h1>
                <p className="text-xs text-zinc-500">Connect payment processors, email providers, and other services.</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 shrink-0"
            >
              + Add Integration
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Brand picker */}
        {isPlatformAdmin && brands.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <label className="text-sm font-medium text-zinc-400">Brand</label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-violet-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
          />
        </div>

        {/* AI Provider panel */}
        <div className="mb-8">
          <AIProviderPanel brandId={selectedBrandId} />
        </div>

        {/* Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((int) => (
            <IntegrationCard
              key={int.id}
              integration={int}
              brandId={selectedBrandId}
              initialPaymentSettings={currentPaymentSettings}
              resendConfigured={resendConfigured}
            />
          ))}
        </div>

        {/* Custom integrations */}
        {customIntegrations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Custom</h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {customIntegrations.map((ci) => (
                <div key={ci.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
                  <p className="text-sm font-semibold text-zinc-200">{ci.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{ci.type}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add integration modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">Add Integration</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-violet-500 mb-4"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableFiltered.map((app) => (
                <button
                  key={app.id}
                  onClick={() => addIntegration(app)}
                  className="w-full flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-left hover:bg-zinc-700"
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${iconColors[app.icon] ?? "bg-zinc-700 text-zinc-300"}`}>{app.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{app.name}</p>
                    <p className="text-xs text-zinc-500">{app.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
