"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { savePaymentSettings, type PaymentProvider, type PaymentSettings } from "@/actions/payments";
import { syncSquareNow, getSyncLog, type SyncLogEntry } from "@/actions/square-sync-ui";
import WebhookLogsSection from "@/components/admin/WebhookLogsSection";
import { AdminInput, AdminTextInput, AdminSelect, AdminButton } from "./design-system";
import { AdminToggle } from "./design-system/AdminToggle";

type InventoryMode = "none" | "rc_to_square" | "square_to_rc" | "bidirectional";

type Props = {
  settings: {
    provider?: PaymentProvider | null;
    stripe_publishable_key?: string | null;
    stripe_secret_key?: string | null;
    square_access_token?: string | null;
    square_location_id?: string | null;
    square_sync_enabled?: boolean;
    square_inventory_mode?: InventoryMode;
    square_last_sync_at?: string | null;
    square_last_sync_error?: string | null;
  } | null;
  brandId: string;
  brands?: { id: string; name: string }[];
  isPlatformAdmin?: boolean;
};

interface ValidationErrors {
  squareLocationId?: string;
}

export default function PaymentSettingsForm({ settings, brandId, brands = [], isPlatformAdmin = false }: Props) {
  const [activeBrandId, setActiveBrandId] = useState(brandId);
  const [provider, setProvider] = useState<PaymentProvider | "">(
    (settings?.provider ?? "") as PaymentProvider | ""
  );
  const [stripePublishableKey, setStripePublishableKey] = useState(
    settings?.stripe_publishable_key ?? ""
  );
  const [stripeSecretKey, setStripeSecretKey] = useState(
    settings?.stripe_secret_key ?? ""
  );
  const [squareAccessToken, setSquareAccessToken] = useState(
    settings?.square_access_token ?? ""
  );
  const [squareLocationId, setSquareLocationId] = useState(
    settings?.square_location_id ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showStripe, setShowStripe] = useState(settings?.provider === "stripe" || settings?.provider === "square" ? settings.provider === "stripe" : false);
  const [showSquare, setShowSquare] = useState(settings?.provider === "square");
  const [showSecretStripe, setShowSecretStripe] = useState(false);
  const [showSecretSquare, setShowSecretSquare] = useState(false);

  // Square Sync state
  const [squareSyncEnabled, setSquareSyncEnabled] = useState(
    settings?.square_sync_enabled ?? false
  );
  const [squareInventoryMode, setSquareInventoryMode] = useState<InventoryMode>(
    settings?.square_inventory_mode ?? "none"
  );
  const [syncing, setSyncing] = useState(false);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);

  const hasSquareToken = !!settings?.square_access_token;
  const hasStripeKeys = !!settings?.stripe_publishable_key;

  // Read URL params to show connection success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("square_connected") === "true") {
      setSyncResult({ success: true, message: "Square connected successfully!" });
      window.history.replaceState({}, "", window.location.pathname);
    }
    const err = params.get("error");
    if (err) {
      setSyncResult({ success: false, message: `Square connection failed: ${err}` });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Load sync log on mount
  useEffect(() => {
    if (hasSquareToken) {
      getSyncLog(activeBrandId).then((result) => {
        if (result.success) setSyncLog(result.logs);
      });
    }
  }, [hasSquareToken, activeBrandId]);

  // Track dirty state
  useEffect(() => {
    const hasChanges =
      provider !== ((settings?.provider) ?? "") ||
      squareSyncEnabled !== (settings?.square_sync_enabled ?? false) ||
      squareInventoryMode !== (settings?.square_inventory_mode ?? "none") ||
      squareLocationId !== (settings?.square_location_id ?? "");
    setDirty(hasChanges);
  }, [provider, squareSyncEnabled, squareInventoryMode, squareLocationId, settings]);

  function validate(): boolean {
    const newErrors: ValidationErrors = {};
    
    if (squareLocationId && !squareLocationId.startsWith("L")) {
      newErrors.squareLocationId = "Location ID should start with 'L'";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validate()) {
      setError("Please correct the errors below.");
      return;
    }
    
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await savePaymentSettings({
      brandId: activeBrandId,
      provider: provider || null,
      stripePublishableKey: stripePublishableKey || undefined,
      stripeSecretKey: stripeSecretKey || undefined,
      squareAccessToken: squareAccessToken || undefined,
      squareLocationId: squareLocationId || undefined,
      squareSyncEnabled,
      squareInventoryMode,
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save");
    } else {
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleSyncNow(type: string) {
    setSyncing(true);
    setSyncingType(type);
    setSyncResult(null);
    const result = await syncSquareNow(activeBrandId, type as "products" | "orders" | "all");
    setSyncResult({
      success: result.success,
      message: result.success
        ? `Synced ${result.synced} item(s).`
        : `Sync failed: ${result.errors?.[0] ?? "Unknown error"}`,
    });
    setSyncing(false);
    setSyncingType(null);
    // Refresh sync log
    const logResult = await getSyncLog(activeBrandId);
    if (logResult.success) setSyncLog(logResult.logs);
  }

  async function handleDisconnectSquare() {
    if (!confirm("Disconnect Square? This will clear the access token and disable sync.")) return;
    setSaving(true);
    setError(null);
    const result = await savePaymentSettings({
      brandId: activeBrandId,
      provider: provider || null,
      squareAccessToken: "",
      squareLocationId: "",
      squareSyncEnabled: false,
      squareInventoryMode: "none",
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to disconnect");
    } else {
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const lastSyncAt = settings?.square_last_sync_at
    ? new Date(settings.square_last_sync_at).toLocaleString()
    : "Never";

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Platform admin brand picker */}
      {isPlatformAdmin && brands.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
          <AdminInput label="Brand" helpText="Select a brand to configure payment settings for:">
            <AdminSelect
              value={activeBrandId}
              onChange={(e) => setActiveBrandId(e.target.value)}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
            />
          </AdminInput>
        </div>
      )}

      {/* Error/Success messages */}
      {error && (
        <div className="rounded-xl border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10 px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-[var(--admin-danger)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-[var(--admin-success)]/30 bg-[var(--admin-success)]/10 px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-[var(--admin-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Payment settings saved successfully!
        </div>
      )}
      {syncResult && (
        <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
          syncResult.success 
            ? "border-[var(--admin-success)]/30 bg-[var(--admin-success)]/10" 
            : "border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10"
        }`}>
          {syncResult.success ? (
            <svg className="w-5 h-5 text-[var(--admin-success)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[var(--admin-danger)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
          {syncResult.message}
        </div>
      )}

      {/* Connected status banner */}
      {hasStripeKeys && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-success)]/30 bg-[var(--admin-success)]/10 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-success)] text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--admin-success)]">Stripe Connected</p>
            <p className="text-xs text-[var(--admin-text-muted)]">Payments are configured for this brand</p>
          </div>
        </div>
      )}

      {/* Provider selection */}
      <div className="space-y-3">
        <AdminInput 
          label="Payment Provider" 
          helpText="Choose how to process payments for this brand."
        >
          <div className="flex flex-wrap gap-3">
            {[
              { value: "", label: "None / Manual", icon: "—" },
              { value: "stripe", label: "Stripe", icon: "💳" },
              { value: "square", label: "Square", icon: "◼️" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setProvider(opt.value as PaymentProvider | "");
                  setShowStripe(opt.value === "stripe");
                  setShowSquare(opt.value === "square");
                  setDirty(true);
                }}
                className={`rounded-xl border px-5 py-3.5 text-sm font-medium transition-all ${
                  provider === opt.value
                    ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white shadow-sm"
                    : "border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-bg)]"
                }`}
              >
                <span className="mr-2">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </AdminInput>
      </div>

      {/* Stripe credentials */}
      {showStripe && (
        <div className="space-y-4 rounded-xl border border-[var(--admin-accent)]/30 bg-[var(--admin-accent)]/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h3 className="font-semibold text-[var(--admin-text-primary)]">Stripe</h3>
            </div>
            {hasStripeKeys && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-success)]/10 px-3 py-1 text-xs font-medium text-[var(--admin-success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-success)]" />
                Connected
              </span>
            )}
          </div>
          
          {!hasStripeKeys ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--admin-text-secondary)]">
                Connect your Stripe account to process payments. You&apos;ll be redirected to Stripe to authorize the connection.
              </p>
              <a
                href="/api/stripe/oauth"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Connect with Stripe
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-[var(--admin-success)]/10 border border-[var(--admin-success)]/30 p-3">
                <p className="text-sm text-[var(--admin-success)]">
                  ✓ Your Stripe account is connected and ready to accept payments.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Disconnect Stripe? You'll need to reconnect to accept payments.")) return;
                  const result = await savePaymentSettings({
                    brandId: activeBrandId,
                    provider: null,
                    stripePublishableKey: "",
                    stripeSecretKey: "",
                  });
                  if (result.success) {
                    window.location.reload();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--admin-danger)] hover:underline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Disconnect Stripe
              </button>
            </div>
          )}
        </div>
      )}

      {/* Square credentials */}
      {showSquare && (
        <div className="space-y-4 rounded-xl border border-[var(--admin-success)]/30 bg-[var(--admin-success)]/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">◼️</span>
              <h3 className="font-semibold text-[var(--admin-text-primary)]">Square</h3>
            </div>
            {hasSquareToken && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-success)]/10 px-3 py-1 text-xs font-medium text-[var(--admin-success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-success)]" />
                Connected
              </span>
            )}
          </div>
          {!hasSquareToken ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--admin-text-secondary)]">
                Connect your Square account via OAuth to enable sync.
              </p>
              <a
                href="/api/square/oauth"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-success)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--admin-success)]/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Connect Square
              </a>
            </div>
          ) : (
            <>
              <AdminInput 
                label="Location ID" 
                error={errors.squareLocationId}
                helpText="Starts with 'L' (e.g., LXXXXXXXXX)"
              >
                <div className="relative">
                  <AdminTextInput
                    value={squareLocationId}
                    onChange={(e) => {
                      setSquareLocationId(e.target.value);
                      setDirty(true);
                      if (errors.squareLocationId) {
                        setErrors({ ...errors, squareLocationId: undefined });
                      }
                    }}
                    placeholder="L..."
                  />
                </div>
              </AdminInput>
              <button
                type="button"
                onClick={handleDisconnectSquare}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--admin-danger)] hover:underline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Disconnect Square
              </button>
            </>
          )}
        </div>
      )}

      {/* Square Sync section */}
      {hasSquareToken && provider === "square" && (
        <div className="space-y-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] p-5">
          <div>
            <h3 className="font-semibold text-[var(--admin-text-primary)]">Square Sync</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Keep products, orders, and inventory in sync between Route Commerce and Square.
            </p>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[var(--admin-border)]">
            <AdminToggle
              checked={squareSyncEnabled}
              onChange={(checked) => {
                setSquareSyncEnabled(checked);
                setDirty(true);
              }}
              label="Enable Square Sync"
              description="Automatically sync products and orders with Square"
            />
          </div>

          {squareSyncEnabled && (
            <>
              {/* Inventory mode */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--admin-text-primary)]">Inventory sync direction</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "none", label: "None", desc: "No sync" },
                    { value: "rc_to_square", label: "RC → Square", desc: "Push to Square" },
                    { value: "square_to_rc", label: "Square → RC", desc: "Pull from Square" },
                    { value: "bidirectional", label: "Bidirectional", desc: "Sync both" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSquareInventoryMode(opt.value as InventoryMode);
                        setDirty(true);
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        squareInventoryMode === opt.value
                          ? "border-[var(--admin-accent)] bg-[var(--admin-accent-light)] ring-2 ring-[var(--admin-accent)]"
                          : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{opt.label}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync Now buttons */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--admin-text-primary)]">Manual Sync</p>
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSyncNow("products")}
                    disabled={syncing}
                  >
                    {syncing && syncingType === "products" ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Syncing...
                      </span>
                    ) : (
                      "Sync Products Now"
                    )}
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSyncNow("orders")}
                    disabled={syncing}
                  >
                    {syncing && syncingType === "orders" ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Syncing...
                      </span>
                    ) : (
                      "Sync Orders Now"
                    )}
                  </AdminButton>
                  <AdminButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleSyncNow("all")}
                    disabled={syncing}
                  >
                    {syncing && syncingType === "all" ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Syncing...
                      </span>
                    ) : (
                      "Sync All Now"
                    )}
                  </AdminButton>
                </div>
              </div>

              {/* Last sync info */}
              <div className="rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] px-4 py-3">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  <span className="font-medium text-[var(--admin-text-secondary)]">Last sync:</span> {lastSyncAt}
                  {settings?.square_last_sync_error && (
                    <span className="ml-2 text-[var(--admin-danger)]">— {settings.square_last_sync_error}</span>
                  )}
                </p>
              </div>

              {/* Sync log preview */}
              {syncLog.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                    Recent sync activity
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {syncLog.slice(0, 10).map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                          entry.status === "success"
                            ? "border-[var(--admin-success)]/30 bg-[var(--admin-success)]/5 text-[var(--admin-success)]"
                            : "border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/5 text-[var(--admin-danger)]"
                        }`}
                      >
                        <span>
                          [{entry.direction ?? "—"}] {entry.event_type} — {entry.status}
                        </span>
                        <span className="text-[var(--admin-text-muted)]">
                          {new Date(entry.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Wholesale webhook log */}
      <WebhookLogsSection brandId={activeBrandId} />

      {/* Save button */}
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
              Save Payment Settings
            </>
          )}
        </AdminButton>
        {dirty && !saving && (
          <span className="text-xs text-[var(--admin-text-muted)]">You have unsaved changes</span>
        )}
      </div>
    </form>
  );
}