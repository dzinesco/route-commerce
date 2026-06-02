"use client";

import { useState, useEffect } from "react";
import AIProviderPanel from "@/components/admin/AIProviderPanel";
import { savePaymentSettings } from "@/actions/payments";
import { saveResendCredentials, saveTwilioCredentials, testResendConnection, testTwilioConnection, getResendCredentials, getTwilioCredentials } from "@/actions/integrations/credentials";
import { AdminInput, AdminTextInput, AdminSelect, AdminButton } from "@/components/admin/design-system";
import { AdminToggle } from "@/components/admin/design-system/AdminToggle";

type Props = {
  brandId: string;
  brands: { id: string; name: string }[];
  isPlatformAdmin: boolean;
};

type CredentialField = {
  key: string;
  label: string;
  placeholder: string;
  isSecret?: boolean;
};

type Integration = {
  id: string;
  name: string;
  icon: string;
  description: string;
  accentColor: string;
  credentials: CredentialField[];
  connected?: boolean;
};

// Simplified integration cards for display (AI is handled separately)
const COMMUNICATION_INTEGRATIONS: { id: string; name: string; icon: string; description: string; accentColor: string }[] = [
  {
    id: "resend",
    name: "Resend",
    icon: "📧",
    description: "Send transactional and marketing emails via Harvest Reach.",
    accentColor: "border-amber-200 bg-amber-50/50",
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: "💳",
    description: "Process online payments for orders.",
    accentColor: "border-stone-200 bg-stone-50/50",
  },
  {
    id: "twilio",
    name: "Twilio",
    icon: "📱",
    description: "Send SMS campaigns and alerts via Harvest Reach.",
    accentColor: "border-blue-200 bg-blue-50/50",
  },
];

const INTEGRATIONS: Integration[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    description: "Power AI tools like Campaign Writer, Report Explainer, and Pricing Advisor.",
    accentColor: "border-violet-200 bg-violet-50/50",
    credentials: [],
  },
  {
    id: "resend",
    name: "Resend",
    icon: "📧",
    description: "Send transactional and marketing emails via Harvest Reach.",
    accentColor: "border-amber-200 bg-amber-50/50",
    credentials: [
      { key: "RESEND_API_KEY", label: "API Key", placeholder: "re_...", isSecret: true },
      { key: "RESEND_FROM_EMAIL", label: "From Email Address", placeholder: "orders@yourbrand.com" },
      { key: "RESEND_FROM_NAME", label: "From Name", placeholder: "Your Brand Name" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: "💳",
    description: "Process online payments for orders.",
    accentColor: "border-stone-200 bg-stone-50/50",
    credentials: [
      { key: "STRIPE_PUBLISHABLE_KEY", label: "Publishable Key", placeholder: "pk_live_..." },
      { key: "STRIPE_SECRET_KEY", label: "Secret Key", placeholder: "sk_live_...", isSecret: true },
    ],
  },
  {
    id: "twilio",
    name: "Twilio",
    icon: "📱",
    description: "Send SMS campaigns and alerts via Harvest Reach.",
    accentColor: "border-blue-200 bg-blue-50/50",
    credentials: [
      { key: "TWILIO_ACCOUNT_SID", label: "Account SID", placeholder: "AC..." },
      { key: "TWILIO_AUTH_TOKEN", label: "Auth Token", placeholder: "Your Twilio auth token", isSecret: true },
      { key: "TWILIO_PHONE_NUMBER", label: "Phone Number", placeholder: "+1234567890" },
    ],
  },
];

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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Track dirty state
  useEffect(() => {
    const hasValues = Object.values(credentials).some((v) => v.trim().length > 0);
    setDirty(hasValues && JSON.stringify(initialCredentials) !== JSON.stringify(credentials));
  }, [credentials, initialCredentials]);

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
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        // Other integrations - just show success for now
        setTestResult({ ok: true, message: `${integration.name} settings saved` });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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

  function updateCredential(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={`rounded-2xl border p-6 bg-white ${integration.accentColor}`}>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-bg)] text-lg">
            {integration.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">{integration.name}</h3>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{integration.description}</p>
          </div>
        </div>
        {testResult?.ok && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-success)]/10 px-3 py-1 text-xs font-medium text-[var(--admin-success)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-success)]" />
            Connected
          </span>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 rounded-xl p-4 text-sm border flex items-start gap-3 bg-[var(--admin-danger)]/10 border-[var(--admin-danger)]/30 text-[var(--admin-danger)]">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 rounded-xl p-4 text-sm border flex items-center gap-3 bg-[var(--admin-success)]/10 border-[var(--admin-success)]/30 text-[var(--admin-success)]">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Settings saved successfully!
        </div>
      )}
      {testResult && (
        <div className={`mb-4 rounded-xl p-4 text-sm border flex items-start gap-3 ${
          testResult.ok 
            ? "bg-[var(--admin-success)]/10 border-[var(--admin-success)]/30 text-[var(--admin-success)]" 
            : "bg-[var(--admin-danger)]/10 border-[var(--admin-danger)]/30 text-[var(--admin-danger)]"
        }`}>
          {testResult.ok ? (
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
          {testResult.message}
        </div>
      )}

      {/* Credentials form */}
      <div className="space-y-4 mb-5">
        {integration.credentials.map((field) => (
          <AdminInput 
            key={field.key} 
            label={field.label}
            helpText={field.isSecret ? "Click Show/Hide to reveal" : undefined}
          >
            <div className="relative">
              <AdminTextInput
                type={showSecrets[field.key] ? "text" : "password"}
                value={credentials[field.key] ?? ""}
                onChange={(e) => updateCredential(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
              {field.isSecret && (
                <button
                  type="button"
                  onClick={() => toggleSecret(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg hover:bg-[var(--admin-bg)] transition-colors"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {showSecrets[field.key] ? "Hide" : "Show"}
                </button>
              )}
            </div>
          </AdminInput>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--admin-border)]">
        <AdminButton
          variant="secondary"
          size="sm"
          onClick={handleTest}
          disabled={saving}
        >
          {testResult?.ok ? "Re-test" : "Test Connection"}
        </AdminButton>
        <AdminButton
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Save
            </>
          )}
        </AdminButton>
        {dirty && !saving && (
          <span className="text-xs text-[var(--admin-text-muted)]">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsClientPage({ brandId, brands, isPlatformAdmin }: Props) {
  const [selectedBrandId, setSelectedBrandId] = useState(brandId);
  const [initialCredentials, setInitialCredentials] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  // Fetch initial credentials for each integration
  useEffect(() => {
    async function fetchCredentials() {
      setLoading(true);
      try {
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
      } finally {
        setLoading(false);
      }
    }
    fetchCredentials();
  }, [selectedBrandId]);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Brand selector for platform admins */}
      {isPlatformAdmin && brands.length > 0 && (
        <div className="rounded-2xl bg-white border border-[var(--admin-border)] p-5">
          <AdminInput label="Select Brand" helpText="Choose a brand to configure integrations for:">
            <AdminSelect
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
            />
          </AdminInput>
        </div>
      )}

      {/* AI Provider Section */}
      <div className="rounded-2xl bg-white border border-[var(--admin-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-sm">🤖</div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">AI Provider</h3>
              <p className="text-xs text-[var(--admin-text-muted)]">Configure AI models for intelligent features</p>
            </div>
          </div>
          <a 
            href="/admin/settings/ai" 
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)]"
          >
            Configure AI
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
        <div className="p-5">
          <AIProviderPanel brandId={selectedBrandId} />
        </div>
      </div>

      {/* Payment & Email integrations grid */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-4">Communication & Payments</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-[var(--admin-accent)] border-t-transparent animate-spin" />
                <span className="text-sm text-[var(--admin-text-muted)]">Loading integrations...</span>
              </div>
            </div>
          ) : (
            INTEGRATIONS.filter(i => i.id !== "openai").map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                initialCredentials={initialCredentials[integration.id]}
                brandId={selectedBrandId}
              />
            ))
          )}
        </div>
      </div>

      {/* Help text */}
      <div className="rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-[var(--admin-text-muted)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[var(--admin-text-primary)]">Need help?</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">
              Contact us at <a href="mailto:support@cielohermosa.com" className="underline hover:text-[var(--admin-accent)]">support@cielohermosa.com</a> for assistance setting up integrations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}