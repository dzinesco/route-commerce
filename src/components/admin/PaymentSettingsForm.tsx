"use client";

import { useState, useEffect } from "react";
import { savePaymentSettings, type PaymentProvider, type PaymentSettings } from "@/actions/payments";
import { syncSquareNow, getSyncLog, type SyncLogEntry } from "@/actions/square-sync-ui";
import WebhookLogsSection from "@/components/admin/WebhookLogsSection";

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
  const [showStripe, setShowStripe] = useState(settings?.provider === "stripe" || settings?.provider === "square" ? settings.provider === "stripe" : false);
  const [showSquare, setShowSquare] = useState(settings?.provider === "square");

  // Square Sync state
  const [squareSyncEnabled, setSquareSyncEnabled] = useState(
    settings?.square_sync_enabled ?? false
  );
  const [squareInventoryMode, setSquareInventoryMode] = useState<InventoryMode>(
    settings?.square_inventory_mode ?? "none"
  );
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);

  const hasSquareToken = !!settings?.square_access_token;

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

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
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleSyncNow(type: string) {
    setSyncing(true);
    setSyncResult(null);
    const result = await syncSquareNow(activeBrandId, type as "products" | "orders" | "all");
    setSyncResult({
      success: result.success,
      message: result.success
        ? `Synced ${result.synced} item(s).`
        : `Sync failed: ${result.errors?.[0] ?? "Unknown error"}`,
    });
    setSyncing(false);
    // Refresh sync log
    const logResult = await getSyncLog(brandId);
    if (logResult.success) setSyncLog(logResult.logs);
  }

  async function handleDisconnectSquare() {
    if (!confirm("Disconnect Square? This will clear the access token.")) return;
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
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Brand</label>
          <select
            value={activeBrandId}
            onChange={(e) => setActiveBrandId(e.target.value)}
            className="w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-base text-zinc-100 outline-none focus:border-zinc-400"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-900/50 border border-red-700 p-4 text-sm text-red-200">{error}</div>
      )}
      {saved && (
        <div className="rounded-xl bg-green-900/50 border border-green-700 p-4 text-sm text-green-200">
          Payment settings saved.
        </div>
      )}
      {syncResult && (
        <div className={`rounded-xl p-4 text-sm border ${
          syncResult.success ? "bg-green-900/50 border-green-700 text-green-200" : "bg-red-900/50 border-red-700 text-red-200"
        }`}>
          {syncResult.message}
        </div>
      )}

      {/* Connected status banner */}
      {settings?.stripe_publishable_key && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-900/30 px-4 py-3 text-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-900/300 text-white text-xs font-bold">✓</span>
          <div>
            <p className="font-semibold text-green-300">Stripe Connected</p>
            <p className="text-xs text-green-400/70">Payments are configured for this brand</p>
          </div>
        </div>
      )}

      {/* Provider selection */}
      <div>
        <label className="block text-sm font-semibold text-zinc-300">Payment Provider</label>
        <p className="mt-1 text-sm text-zinc-500">
          Choose how to process payments for this brand.
        </p>
        <div className="mt-3 flex gap-3">
          {[
            { value: "", label: "None / Manual" },
            { value: "stripe", label: "Stripe" },
            { value: "square", label: "Square" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setProvider(opt.value as PaymentProvider | "");
                setShowStripe(opt.value === "stripe");
                setShowSquare(opt.value === "square");
              }}
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                provider === opt.value
                  ? "border-zinc-400 bg-zinc-700 text-zinc-50"
                  : "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stripe credentials */}
      {showStripe && (
        <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-900/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900">Stripe</h3>
            {settings?.stripe_publishable_key && (
              <span className="flex items-center gap-1.5 rounded-full bg-green-900/40 px-2.5 py-1 text-xs font-semibold text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-900/300"></span>
                Connected
              </span>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Publishable Key</label>
            <input
              type="text"
              value={stripePublishableKey}
              onChange={(e) => setStripePublishableKey(e.target.value)}
              placeholder="pk_live_..."
              className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Secret Key</label>
            <input
              type="password"
              value={stripeSecretKey}
              onChange={(e) => setStripeSecretKey(e.target.value)}
              placeholder="sk_live_..."
              className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Stripe Settings"}
          </button>
        </div>
      )}

      {/* Square credentials */}
      {showSquare && (
        <div className="space-y-4 rounded-xl border border-green-200 bg-green-900/30 p-4">
          <h3 className="font-semibold text-green-900">Square</h3>
          {!hasSquareToken ? (
            <div className="space-y-3">
              <p className="text-sm text-green-400">
                Connect your Square account via OAuth to enable sync.
              </p>
              <a
                href="/api/square/oauth"
                className="inline-block rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Connect Square
              </a>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Location ID</label>
                <input
                  type="text"
                  value={squareLocationId}
                  onChange={(e) => setSquareLocationId(e.target.value)}
                  placeholder="L..."
                  className="mt-1 w-full rounded-xl border border-zinc-600 px-4 py-3 text-sm font-mono outline-none focus:border-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={handleDisconnectSquare}
                className="text-sm text-red-400 hover:underline"
              >
                Disconnect Square
              </button>
            </>
          )}
        </div>
      )}

      {/* Square Sync section */}
      {hasSquareToken && provider === "square" && (
        <div className="space-y-5 rounded-xl border border-purple-200 bg-purple-50 p-5">
          <div>
            <h3 className="font-semibold text-purple-900">Square Sync</h3>
            <p className="mt-1 text-sm text-purple-700">
              Keep products, orders, and inventory in sync between Route Commerce and Square.
            </p>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSquareSyncEnabled(!squareSyncEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                squareSyncEnabled ? "bg-purple-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-zinc-900 transition-transform ${
                  squareSyncEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-purple-900">
              {squareSyncEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {squareSyncEnabled && (
            <>
              {/* Inventory mode */}
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-300">Inventory sync direction</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "none", label: "None" },
                    { value: "rc_to_square", label: "RC → Square" },
                    { value: "square_to_rc", label: "Square → RC" },
                    { value: "bidirectional", label: "Bidirectional" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSquareInventoryMode(opt.value as InventoryMode)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        squareInventoryMode === opt.value
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-zinc-600 text-zinc-400 hover:bg-purple-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync Now buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSyncNow("products")}
                  disabled={syncing}
                  className="rounded-lg border border-purple-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Sync Products Now"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncNow("orders")}
                  disabled={syncing}
                  className="rounded-lg border border-purple-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Sync Orders Now"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncNow("all")}
                  disabled={syncing}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Sync All Now"}
                </button>
              </div>

              {/* Last sync info */}
              <div className="text-xs text-zinc-500">
                Last sync: {lastSyncAt}
                {settings?.square_last_sync_error && (
                  <span className="ml-2 text-red-500">— {settings.square_last_sync_error}</span>
                )}
              </div>

              {/* Sync log preview */}
              {syncLog.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Recent sync activity
                  </p>
                  <div className="space-y-1">
                    {syncLog.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                          entry.status === "success"
                            ? "border-green-200 bg-green-900/30 text-green-400"
                            : "border-red-200 bg-red-900/30 text-red-400"
                        }`}
                      >
                        <span>
                          [{entry.direction ?? "—"}] {entry.event_type} — {entry.status}
                        </span>
                        <span className="text-slate-400">
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

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-zinc-100 px-6 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Payment Settings"}
      </button>
    </form>
  );
}
