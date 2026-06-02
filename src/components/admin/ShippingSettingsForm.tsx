"use client";

import { useState, useEffect } from "react";
import {
  getShippingSettings,
  saveShippingSettings,
  testFedExConnection,
  type ShippingSettings,
} from "@/actions/shipping/settings";
import { AdminInput, AdminTextInput, AdminTextarea, AdminSelect, AdminButton } from "./design-system";
import { AdminToggle } from "./design-system/AdminToggle";

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

interface ValidationErrors {
  fedexAccountNumber?: string;
  fedexApiKey?: string;
  fedexApiSecret?: string;
}

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
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const isConfigured = !!settings?.fedex_api_key && !!settings?.fedex_api_secret && !!settings?.fedex_account_number;

  // Track dirty state
  useEffect(() => {
    if (settings) {
      const hasChanges =
        fedexAccountNumber !== (settings.fedex_account_number ?? "") ||
        fedexApiKey !== (settings.fedex_api_key ?? "") ||
        fedexApiSecret !== (settings.fedex_api_secret ?? "") ||
        fedexUseProduction !== (settings.fedex_use_production ?? false) ||
        defaultServiceType !== (settings.default_service_type ?? "FEDEX_GROUND") ||
        refrigeratedHandlingNotes !== (settings.refrigerated_handling_notes ?? "") ||
        fragileHandlingNotes !== (settings.fragile_handling_notes ?? "");
      setDirty(hasChanges);
    }
  }, [fedexAccountNumber, fedexApiKey, fedexApiSecret, fedexUseProduction, defaultServiceType, refrigeratedHandlingNotes, fragileHandlingNotes, settings]);

  // Reload settings when brand changes
  useEffect(() => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    setDirty(false);
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
        setErrors({});
      } else {
        // Reset form for new brand
        setFedexAccountNumber("");
        setFedexApiKey("");
        setFedexApiSecret("");
        setFedexUseProduction(false);
        setDefaultServiceType("FEDEX_GROUND");
        setRefrigeratedHandlingNotes("Keep refrigerated. Do not freeze. Handle with care — contains fresh sweet corn and/or onions.");
        setFragileHandlingNotes("");
        setErrors({});
      }
    });
  }, [activeBrandId, isPlatformAdmin]);

  function validate(): boolean {
    const newErrors: ValidationErrors = {};
    
    if (fedexAccountNumber && fedexAccountNumber.length !== 12) {
      newErrors.fedexAccountNumber = "FedEx account number must be 12 digits";
    }
    
    if (fedexApiKey && fedexApiKey.length < 10) {
      newErrors.fedexApiKey = "API Key appears too short - verify it from FedEx developer portal";
    }
    
    if (fedexApiSecret && fedexApiSecret.length < 10) {
      newErrors.fedexApiSecret = "API Secret appears too short - verify it from FedEx developer portal";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate before saving
    if (!validate()) {
      setError("Please correct the errors below before saving.");
      return;
    }
    
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
      setDirty(false);
      setTimeout(() => setSaved(false), 4000);
    }
  }

  async function handleTestConnection() {
    if (!fedexApiKey || !fedexApiSecret) {
      setTestResult({ success: false, message: "Please enter both API Key and API Secret before testing." });
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
        <div className="p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
          <AdminInput label="Brand" helpText="Select a brand to configure shipping settings for:">
            <AdminSelect
              value={activeBrandId}
              onChange={(e) => setActiveBrandId(e.target.value)}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
            />
          </AdminInput>
        </div>
      )}

      {/* Connection status banner */}
      <div 
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border"
        style={{
          backgroundColor: isConfigured ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
          borderColor: isConfigured ? "var(--admin-success)" : "rgba(245, 158, 11, 0.3)",
          color: isConfigured ? "var(--admin-success)" : "rgb(245, 158, 11)",
        }}
      >
        <span 
          className="h-2.5 w-2.5 rounded-full shrink-0" 
          style={{ backgroundColor: isConfigured ? "var(--admin-success)" : "rgb(245, 158, 11)" }} 
        />
        {isConfigured ? (
          <div className="flex-1">
            <span className="font-semibold">FedEx Connected</span>
            <span className="ml-2 text-[var(--admin-text-muted)]">
              — {settings?.fedex_use_production ? "Production Mode" : "Sandbox/Test Mode"}
            </span>
          </div>
        ) : (
          <span>FedEx Not Configured — enter credentials below to enable shipping rates</span>
        )}
      </div>

      {/* Error/Success messages */}
      {error && (
        <div 
          className="rounded-xl p-4 text-sm border flex items-start gap-3"
          style={{ 
            backgroundColor: "rgba(239, 68, 68, 0.1)", 
            borderColor: "rgba(239, 68, 68, 0.3)", 
            color: "rgb(239, 68, 68)" 
          }}
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
      {saved && (
        <div 
          className="rounded-xl p-4 text-sm border flex items-center gap-3"
          style={{ 
            backgroundColor: "rgba(16, 185, 129, 0.1)", 
            borderColor: "rgba(16, 185, 129, 0.3)", 
            color: "var(--admin-success)" 
          }}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Shipping settings saved successfully!
        </div>
      )}
      {testResult && (
        <div 
          className="rounded-xl p-4 text-sm border flex items-start gap-3"
          style={{ 
            backgroundColor: testResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", 
            borderColor: testResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)", 
            color: testResult.success ? "var(--admin-success)" : "rgb(239, 68, 68)" 
          }}
        >
          {testResult.success ? (
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

      {/* FedEx credentials */}
      <div 
        className="space-y-5 rounded-xl border p-5"
        style={{ 
          backgroundColor: "var(--admin-bg-subtle)", 
          borderColor: "var(--admin-border)" 
        }}
      >
        <div>
          <h3 className="font-semibold text-[var(--admin-text-primary)]">FedEx API Credentials</h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Get your credentials from{" "}
            <a
              href="https://developer.fedex.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
              style={{ color: "var(--admin-accent)" }}
            >
              developer.fedex.com
            </a>
            . These are used for shipping fresh produce.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminInput 
            label="FedEx Account Number" 
            required
            error={errors.fedexAccountNumber}
            helpText="12-digit FedEx account number"
          >
            <AdminTextInput
              value={fedexAccountNumber}
              onChange={(e) => {
                setFedexAccountNumber(e.target.value);
                setDirty(true);
                if (errors.fedexAccountNumber) {
                  setErrors({ ...errors, fedexAccountNumber: undefined });
                }
              }}
              placeholder="000000000000"
              maxLength={12}
            />
          </AdminInput>
          <AdminInput 
            label="API Key" 
            required
            error={errors.fedexApiKey}
            helpText="From FedEx Developer Portal"
          >
            <AdminTextInput
              value={fedexApiKey}
              onChange={(e) => {
                setFedexApiKey(e.target.value);
                setDirty(true);
                if (errors.fedexApiKey) {
                  setErrors({ ...errors, fedexApiKey: undefined });
                }
              }}
              placeholder="Your FedEx API key"
            />
          </AdminInput>
        </div>

        <AdminInput 
          label="API Secret" 
          required
          error={errors.fedexApiSecret}
          helpText="Password field — click Show/Hide to reveal"
        >
          <div className="relative">
            <AdminTextInput
              type={showSecret ? "text" : "password"}
              value={fedexApiSecret}
              onChange={(e) => {
                setFedexApiSecret(e.target.value);
                setDirty(true);
                if (errors.fedexApiSecret) {
                  setErrors({ ...errors, fedexApiSecret: undefined });
                }
              }}
              placeholder="Your FedEx API secret"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg hover:bg-[var(--admin-bg)] transition-colors"
              style={{ color: "var(--admin-text-muted)" }}
            >
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
        </AdminInput>

        {/* Production toggle */}
        <div 
          className="flex items-center gap-4 rounded-xl px-4 py-3 border"
          style={{ 
            backgroundColor: "var(--admin-bg)", 
            borderColor: "var(--admin-border)" 
          }}
        >
          <AdminToggle
            checked={fedexUseProduction}
            onChange={(checked) => {
              setFedexUseProduction(checked);
              setDirty(true);
            }}
            label="Use Production Mode"
            description={fedexUseProduction ? "Live rates, real labels" : "Sandbox/test mode — safe for testing"}
          />
        </div>

        {/* Test connection */}
        <div className="flex items-center gap-4 pt-2">
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing || !fedexApiKey || !fedexApiSecret}
          >
            {testing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Testing...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.55 4.05l7.97 7.97-2.12 2.12-7.85-7.85-2.12 2.12 7.97 7.97-2.12 2.12-7.97-7.97 2.12-2.12 7.97 7.97L3.58 6.17l7.97-7.97 2.12 2.12-7.22 7.73z" />
                </svg>
                Test Connection
              </>
            )}
          </AdminButton>
          {testResult?.success && (
            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--admin-success)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Connection verified
            </span>
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
          <h3 className="font-semibold text-[var(--admin-text-primary)]">Default Shipping Service</h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Applied automatically for non-perishable orders. Perishable orders always require Overnight or 2-Day Air.
          </p>
        </div>

        <AdminInput label="Default for non-perishable orders" helpText="Used when creating shipments for non-perishable items">
          <AdminSelect
            value={defaultServiceType}
            onChange={(e) => {
              setDefaultServiceType(e.target.value);
              setDirty(true);
            }}
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
          <h3 className="font-semibold text-[var(--admin-text-primary)]">Handling Instructions</h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            These notes are attached to shipments for perishable or fragile items. Appear on carrier labels and in warehouse.
          </p>
        </div>

        <AdminInput 
          label="Refrigerated / Perishable Notes"
          helpText="Applied to all shipments with perishable items (sweet corn, onions, etc.)"
        >
          <AdminTextarea
            value={refrigeratedHandlingNotes}
            onChange={(e) => {
              setRefrigeratedHandlingNotes(e.target.value);
              setDirty(true);
            }}
            rows={3}
            placeholder="e.g. Keep refrigerated. Do not freeze. Contains fresh sweet corn and/or onions."
          />
        </AdminInput>

        <AdminInput label="Fragile Items Notes" helpText="Applied to shipments with fragile items">
          <AdminTextarea
            value={fragileHandlingNotes}
            onChange={(e) => {
              setFragileHandlingNotes(e.target.value);
              setDirty(true);
            }}
            rows={2}
            placeholder="e.g. Fragile — handle with care. Do not stack heavy items on top."
          />
        </AdminInput>
      </div>

      {/* Save/Cancel buttons */}
      {loading ? (
        <div className="flex items-center gap-3" style={{ color: "var(--admin-text-muted)" }}>
          <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Loading settings...
        </div>
      ) : (
        <div className="flex items-center gap-4 pt-4 border-t border-[var(--admin-border)]">
          <AdminButton
            variant="primary"
            size="md"
            type="submit"
            disabled={saving}
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
                Save Shipping Settings
              </>
            )}
          </AdminButton>
          {dirty && !saving && (
            <span className="text-xs text-[var(--admin-text-muted)]">You have unsaved changes</span>
          )}
        </div>
      )}
    </form>
  );
}