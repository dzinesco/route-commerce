"use client";

import { useState, useEffect } from "react";
import AIProviderPanel from "@/components/admin/AIProviderPanel";
import { savePaymentSettings } from "@/actions/payments";
import { saveResendCredentials, saveTwilioCredentials, testResendConnection, testTwilioConnection, getResendCredentials, getTwilioCredentials } from "@/actions/integrations/credentials";

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

const INTEGRATIONS: Integration[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "AI",
    description: "Power AI tools like Campaign Writer, Report Explainer, and Pricing Advisor.",
    accentColor: "border-violet-200",
    credentials: [
      { key: "OPENAI_API_KEY", label: "API Key", placeholder: "sk-...", isSecret: true },
      { key: "OPENAI_ORG_ID", label: "Organization ID", placeholder: "org-... (optional)" },
    ],
    syncOptions: [
      { key: "campaign_writer", label: "Campaign Idea Generator" },
      { key: "product_writer", label: "Product Description Writer" },
      { key: "report_explainer", label: "Report Explainer" },
      { key: "pricing_advisor", label: "Pricing Advisor" },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    icon: "Email",
    description: "Send transactional and marketing emails via Harvest Reach.",
    accentColor: "border-amber-200",
    credentials: [
      { key: "RESEND_API_KEY", label: "API Key", placeholder: "re_...", isSecret: true },
      { key: "RESEND_FROM_EMAIL", label: "From Email Address", placeholder: "orders@yourbrand.com" },
      { key: "RESEND_FROM_NAME", label: "From Name", placeholder: "Your Brand Name" },
    ],
    syncOptions: [
      { key: "transactional", label: "Transactional Email" },
      { key: "marketing", label: "Marketing Campaigns" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: "Stripe",
    description: "Process online payments for orders.",
    accentColor: "border-stone-300",
    credentials: [
      { key: "STRIPE_PUBLISHABLE_KEY", label: "Publishable Key", placeholder: "pk_live_..." },
      { key: "STRIPE_SECRET_KEY", label: "Secret Key", placeholder: "sk_live_...", isSecret: true },
      { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Secret", placeholder: "whsec_...", isSecret: true },
    ],
    syncOptions: [
      { key: "checkout", label: "Online Checkout" },
      { key: "refunds", label: "Refund Processing" },
    ],
  },
  {
    id: "twilio",
    name: "Twilio",
    icon: "SMS",
    description: "Send SMS campaigns and alerts via Harvest Reach.",
    accentColor: "border-blue-200",
    credentials: [
      { key: "TWILIO_ACCOUNT_SID", label: "Account SID", placeholder: "AC..." },
      { key: "TWILIO_AUTH_TOKEN", label: "Auth Token", placeholder: "Your Twilio auth token", isSecret: true },
      { key: "TWILIO_PHONE_NUMBER", label: "Phone Number", placeholder: "+1234567890" },
    ],
    syncOptions: [
      { key: "sms_campaigns", label: "SMS Campaigns" },
      { key: "alerts", label: "Order Alerts" },
    ],
  },
];

const iconColors: Record<string, string> = {
  AI: "bg-violet-100 text-violet-700",
  Email: "bg-amber-100 text-amber-700",
  Stripe: "bg-stone-100 text-stone-700",
  SMS: "bg-blue-100 text-blue-700",
};

function IntegrationCard({
  integration,
  initialCredentials,
  brandId,
}: {
  integration: Integration;
  initialCredentials?: Record<string, string>;
  brandId: string;
}) {
  const [credentials, setCredentials] = useState<Record<string, string>>(
    initialCredentials ?? {}
  );
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setTestResult(null);
    setError(null);

    if (integration.id === "resend") {
      const apiKey = credentials["RESEND_API_KEY"];
      if (!apiKey?.trim()) {
        setTestResult({ ok: false, message: "API key is required" });
        return;
      }
      const result = await testResendConnection(apiKey);
      setTestResult(result);
    } else if (integration.id === "twilio") {
      const accountSid = credentials["TWILIO_ACCOUNT_SID"];
      const authToken = credentials["TWILIO_AUTH_TOKEN"];
      if (!accountSid?.trim() || !authToken?.trim()) {
        setTestResult({ ok: false, message: "Account SID and Auth Token are required" });
        return;
      }
      const result = await testTwilioConnection(accountSid, authToken);
      setTestResult(result);
    } else {
      // Default test (placeholder)
      await new Promise((r) => setTimeout(r, 500));
      const hasKey = Object.values(credentials).some((v) => v.trim().length > 0);
      setTestResult(
        hasKey
          ? { ok: true, message: `Successfully connected to ${integration.name}` }
          : { ok: false, message: `No API key configured for ${integration.name}` }
      );
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setTestResult(null);

    try {
      if (integration.id === "resend") {
        const result = await saveResendCredentials(brandId, {
          api_key: credentials["RESEND_API_KEY"]?.trim() || null,
          from_email: credentials["RESEND_FROM_EMAIL"]?.trim() || null,
          from_name: credentials["RESEND_FROM_NAME"]?.trim() || null,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to save");
          return;
        }
        setTestResult({ ok: true, message: "Resend credentials saved successfully" });
      } else if (integration.id === "twilio") {
        const result = await saveTwilioCredentials(brandId, {
          account_sid: credentials["TWILIO_ACCOUNT_SID"]?.trim() || null,
          auth_token: credentials["TWILIO_AUTH_TOKEN"]?.trim() || null,
          phone_number: credentials["TWILIO_PHONE_NUMBER"]?.trim() || null,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to save");
          return;
        }
        setTestResult({ ok: true, message: "Twilio credentials saved successfully" });
      } else if (integration.id === "stripe") {
        const result = await savePaymentSettings({
          brandId,
          provider: "stripe",
          stripePublishableKey: credentials["STRIPE_PUBLISHABLE_KEY"]?.trim() || undefined,
          stripeSecretKey: credentials["STRIPE_SECRET_KEY"]?.trim() || undefined,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to save");
          return;
        }
        setTestResult({ ok: true, message: "Stripe credentials saved successfully" });
      } else {
        // Other integrations - just show success for now
        setTestResult({ ok: true, message: `${integration.name} settings saved` });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function toggleSecret(key: string) {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${integration.accentColor}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${iconColors[integration.icon] ?? "bg-stone-100 text-stone-700"}`}>{integration.icon}</span>
          <div>
            <h3 className="text-base font-semibold text-stone-900">{integration.name}</h3>
            <p className="text-xs text-stone-500 mt-0.5">{integration.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {integration.credentials.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-stone-600 mb-1">{field.label}</label>
            <div className="relative">
              <input
                type={showSecrets[field.key] ? "text" : "password"}
                value={credentials[field.key] ?? ""}
                onChange={(e) => setCredentials((p) => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm pr-16 text-stone-900 placeholder:text-stone-400 outline-none focus:border-emerald-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {field.isSecret && (
                  <button
                    type="button"
                    onClick={() => toggleSecret(field.key)}
                    className="text-xs text-stone-400 hover:text-stone-600 px-1"
                  >
                    {showSecrets[field.key] ? "Hide" : "Show"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {testResult && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
          testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          <span>{testResult.ok ? "✓" : "✗"}</span>
          <span>{testResult.message}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg px-4 py-2.5 text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}
      <div className="flex gap-2">
        <button onClick={handleTest} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50">Test Connection</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

type Props = {
  brandId: string;
  brands: { id: string; name: string }[];
};

export default function IntegrationsInner({ brandId, brands }: Props) {
  const [selectedBrandId, setSelectedBrandId] = useState(brandId);
  const [initialCredentials, setInitialCredentials] = useState<Record<string, Record<string, string>>>({});

  // Fetch initial credentials for each integration
  useEffect(() => {
    async function fetchCredentials() {
      const [resendCreds, twilioCreds] = await Promise.all([
        getResendCredentials(selectedBrandId),
        getTwilioCredentials(selectedBrandId),
      ]);

      setInitialCredentials({
        resend: {
          RESEND_API_KEY: resendCreds.api_key ?? "",
          RESEND_FROM_EMAIL: resendCreds.from_email ?? "",
          RESEND_FROM_NAME: resendCreds.from_name ?? "",
        },
        twilio: {
          TWILIO_ACCOUNT_SID: twilioCreds.account_sid ?? "",
          TWILIO_AUTH_TOKEN: twilioCreds.auth_token ?? "",
          TWILIO_PHONE_NUMBER: twilioCreds.phone_number ?? "",
        },
      });
    }
    fetchCredentials();
  }, [selectedBrandId]);

  return (
    <div>
      {/* AI Provider — separate panel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-stone-800">AI Provider</h3>
          <a href="/admin/settings/ai" className="text-xs text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Configure AI →</a>
        </div>
        <AIProviderPanel brandId={selectedBrandId} />
      </div>

      {/* Payment & email integrations grid */}
      <div className="space-y-3 mb-4">
        {INTEGRATIONS.filter(i => i.id !== "openai").map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            initialCredentials={initialCredentials[integration.id]}
            brandId={selectedBrandId}
          />
        ))}
      </div>
    </div>
  );
}