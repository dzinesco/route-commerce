"use client";

import { useState, useEffect } from "react";
import {
  getShippingSettings,
  saveShippingSettings,
  testFedExConnection,
  type ShippingSettings,
} from "@/actions/shipping/settings";
import { AdminInput, AdminTextInput, AdminTextarea, AdminSelect, AdminButton } from "./design-system";

const SERVICE_OPTIONS = [
  { value: "FEDEX_OVERNIGHT", label: "FedEx Overnight" },
  { value: "FEDEX_2_DAY_AIR", label: "FedEx 2-Day Air" },
  { value: "FEDEX_EXPRESS_SAVER", label: "FedEx Express Saver" },
  { value: "FEDEX_GROUND", label: "FedEx Ground" },
];

type Props = {
  settings: ShippingSettings | null;
  brandId: string;
  brands?: { id: string; name: string }[];
  isPlatformAdmin?: boolean;
};

export default function ShippingSettingsForm({
  settings,
  brandId: initialBrandId,
  brands = [],
  isPlatformAdmin = false,
}: Props) {
  const [activeBrandId, setActiveBrandId] = useState(initialBrandId);
  const [fedexAccountNumber, setFedexAccountNumber] = useState(settings?.fedex_account_number ?? "");
  const [fedexApiKey, setFedexApiKey] = useState(settings?.fedex_api_key ?? "");
  const [fedexApiSecret, setFedexApiSecret] = useState(settings?.fedex_api_secret ?? "");
  const [fedexUseProduction, setFedexUseProduction] = useState(settings?.fedex_use_production ?? false);
  const [defaultServiceType, setDefaultServiceType] = useState(settings?.default_service_type ?? "FEDEX_GROUND");
  const [refrigeratedHandlingNotes, setRefrigeratedHandlingNotes] = useState(
    settings?.refrigerated_handling_notes ?? "Keep refrigerated. Do not freeze. Handle with care — contains fresh sweet corn and/or onions."
  );
  const [fragileHandlingNotes, setFragileHandlingNotes] = useState(settings?.fragile_handling_notes ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const isConfigured = !!settings?.fedex_api_key && !!settings?.fedex_api_secret && !!settings?.fedex_account_number;

  // Reload settings when brand changes
  useEffect(() => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    getShippingSettings(activeBrandId).then((result) => {
      setLoading(false);
      if (result.success && result.settings) {
        const s = result.settings;
        setFedexAccountNumber(s.fedex_account_number ?? "");
        setFedexApiKey(s.fedex_api_key ?? "");
        setFedexApiSecret(s.fedex_api_secret ?? "");
        setFedexUseProduction(s.fedex_use_production);
        setDefaultServiceType(s.default_service_type);
        setRefrigeratedHandlingNotes(s.refrigerated_handling_notes ?? "");
        setFragileHandlingNotes(s.fragile_handling_notes ?? "");
      } else {
        // Reset form for new brand
        setFedexAccountNumber("");
        setFedexApiKey("");
        setFedexApiSecret("");
        setFedexUseProduction(false);
        setDefaultServiceType("FEDEX_GROUND");
        setRefrigeratedHandlingNotes("Keep refrigerated. Do not freeze. Handle with care — contains fresh sweet corn and/or onions.");
        setFragileHandlingNotes("");
      }
    });
  }, [activeBrandId, isPlatformAdmin]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    setTestResult(null);

    const result = await saveShippingSettings({
      brandId: activeBrandId,
      fedexAccountNumber: fedexAccountNumber || undefined,
      fedexApiKey: fedexApiKey || undefined,
      fedexApiSecret: fedexApiSecret || undefined,
      fedexUseProduction,
      defaultServiceType,
      refrigeratedHandlingNotes: refrigeratedHandlingNotes || undefined,
      fragileHandlingNotes: fragileHandlingNotes || undefined,
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleTestConnection() {
    if (!fedexApiKey || !fedexApiSecret) {
      setTestResult({ success: false, message: "Enter API Key and API Secret before testing." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testFedExConnection(fedexApiKey, fedexApiSecret, fedexUseProduction);
    setTesting(false);
    setTestResult({ success: result.success, message: result.success ? result.message : result.error ?? "Connection failed" });
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Platform admin brand picker */}
      {isPlatformAdmin && brands.length > 0 && (
        <AdminInput label="Brand">
          <AdminSelect
            value={activeBrandId}
            onChange={(e) => setActiveBrandId(e.target.value)}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
          />
        </AdminInput>
      )}

      {/* Connection status banner */}
      <div 
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border"
        style={{
          backgroundColor: isConfigured ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
          borderColor: isConfigured ? "var(--admin-accent)" : "rgba(245, 158, 11, 0.3)",
          color: isConfigured ? "var(--admin-accent)" : "rgb(245, 158, 11)",
        }}
      >
        <span 
          className="h-2.5 w-2.5 rounded-full" 
          style={{ backgroundColor: isConfigured ? "var(--admin-accent)" : "rgb(245, 158, 11)" }} 
        />
        {isConfigured
          ? `FedEx Connected — ${settings?.fedex_use_production ? "Production" : "Sandbox"} mode`
          : "FedEx Not Configured — enter credentials below to enable shipping rates and label generation"}
      </div>

      {error && (
        <div 
          className="rounded-xl p-4 text-sm border"
          style={{ 
            backgroundColor: "rgba(239, 68, 68, 0.1)", 
            borderColor: "rgba(239, 68, 68, 0.3)", 
            color: "rgb(239, 68, 68)" 
          }}
        >
          {error}
        </div>
      )}
      {saved && (
        <div 
          className="rounded-xl p-4 text-sm border"
          style={{ 
            backgroundColor: "rgba(16, 185, 129, 0.1)", 
            borderColor: "rgba(16, 185, 129, 0.3)", 
            color: "var(--admin-accent)" 
          }}
        >
          Shipping settings saved.
        </div>
      )}
      {testResult && (
        <div 
          className="rounded-xl p-4 text-sm border"
          style={{ 
            backgroundColor: testResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", 
            borderColor: testResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)", 
            color: testResult.success ? "var(--admin-accent)" : "rgb(239, 68, 68)" 
          }}
        >
          {testResult.message}
        </div>
      )}

      {/* FedEx credentials */}
      <div 
        className="space-y-5 rounded-xl border p-5"
        style={{ 
          backgroundColor: "var(--admin-bg-subtle)", 
          borderColor: "var(--admin-border)" 
        }}
      >
        <div>
          <h3 className="font-semibold" style={{ color: "var(--admin-text-primary)" }}>FedEx API Credentials</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--admin-text-muted)" }}>
            Used for shipping fresh sweet corn and onions. Get your credentials from{" "}
            <a
              href="https://developer.fedex.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
              style={{ color: "var(--admin-accent)" }}
            >
              developer.fedex.com
            </a>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminInput label="FedEx Account Number *">
            <AdminTextInput
              value={fedexAccountNumber}
              onChange={(e) => setFedexAccountNumber(e.target.value)}
              placeholder="000000000000 (12 digits)"
            />
          </AdminInput>
          <AdminInput label="API Key *">
            <AdminTextInput
              value={fedexApiKey}
              onChange={(e) => setFedexApiKey(e.target.value)}
              placeholder="Your FedEx API key"
            />
          </AdminInput>
        </div>

        <AdminInput label="API Secret *" helpText="Password field — click Show/Hide to reveal">
          <div className="relative">
            <AdminTextInput
              type={showSecret ? "text" : "password"}
              value={fedexApiSecret}
              onChange={(e) => setFedexApiSecret(e.target.value)}
              placeholder="Your FedEx API secret"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-colors"
              style={{ color: "var(--admin-text-muted)" }}
            >
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
        </AdminInput>

        {/* Production toggle */}
        <div 
          className="flex items-center gap-3 rounded-xl px-4 py-3 border"
          style={{ 
            backgroundColor: "var(--admin-bg)", 
            borderColor: "var(--admin-border)" 
          }}
        >
          <button
            type="button"
            onClick={() => setFedexUseProduction(!fedexUseProduction)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ 
              backgroundColor: fedexUseProduction ? "var(--admin-accent)" : "var(--admin-text-muted)" 
            }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full transition-transform"
              style={{ 
                backgroundColor: "white",
                transform: fedexUseProduction ? "translateX(26px)" : "translateX(4px)" 
              }}
            />
          </button>
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>Use Production Mode</span>
            <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              {fedexUseProduction
                ? "Live rates, real labels. Sandbox is currently active."
                : "Sandbox/test mode. Use for testing before going live."}
            </p>
          </div>
        </div>

        {/* Test connection */}
        <div className="flex items-center gap-3">
          <AdminButton
            variant="primary"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing || !fedexApiKey || !fedexApiSecret}
          >
            {testing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Testing...
              </span>
            ) : (
              "Test Connection"
            )}
          </AdminButton>
          {testResult?.success && (
            <span className="text-sm font-medium" style={{ color: "var(--admin-accent)" }}>✓ Connection verified</span>
          )}
        </div>
      </div>

      {/* Default shipping options */}
      <div 
        className="space-y-5 rounded-xl border p-5"
        style={{ 
          backgroundColor: "var(--admin-bg-subtle)", 
          borderColor: "var(--admin-border)" 
        }}
      >
        <div>
          <h3 className="font-semibold" style={{ color: "var(--admin-text-primary)" }}>Default Shipping Service</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--admin-text-muted)" }}>
            Applied automatically when creating shipments. Perishable orders always require Overnight or 2-Day Air regardless of this setting.
          </p>
        </div>

        <AdminInput label="Default for non-perishable orders">
          <AdminSelect
            value={defaultServiceType}
            onChange={(e) => setDefaultServiceType(e.target.value)}
            options={SERVICE_OPTIONS}
          />
        </AdminInput>
      </div>

      {/* Handling notes */}
      <div 
        className="space-y-5 rounded-xl border p-5"
        style={{ 
          backgroundColor: "var(--admin-bg-subtle)", 
          borderColor: "var(--admin-border)" 
        }}
      >
        <div>
          <h3 className="font-semibold" style={{ color: "var(--admin-text-primary)" }}>Handling Instructions</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--admin-text-muted)" }}>
            These notes are attached to shipments containing perishable or fragile items (sweet corn, onions, etc.). Appear on the carrier label and in the warehouse.
          </p>
        </div>

        <AdminInput 
          label="Refrigerated / Perishable Notes"
          helpText="Applied to all shipments with perishable items (is_perishable = true)."
        >
          <AdminTextarea
            value={refrigeratedHandlingNotes}
            onChange={(e) => setRefrigeratedHandlingNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Keep refrigerated. Do not freeze. Contains fresh sweet corn and/or onions."
          />
        </AdminInput>

        <AdminInput label="Fragile Items Notes">
          <AdminTextarea
            value={fragileHandlingNotes}
            onChange={(e) => setFragileHandlingNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Fragile — handle with care. Do not stack heavy items on top."
          />
        </AdminInput>
      </div>

      {loading ? (
        <div className="flex items-center gap-3" style={{ color: "var(--admin-text-muted)" }}>
          <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Loading settings...
        </div>
      ) : (
        <AdminButton
          variant="primary"
          size="md"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Shipping Settings"}
        </AdminButton>
      )}
    </form>
  );
}