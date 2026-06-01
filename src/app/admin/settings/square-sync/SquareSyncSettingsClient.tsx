"use client";

import { useState } from "react";
import Link from "next/link";
import { syncSquareNow, getSyncLog, type SyncLogEntry } from "@/actions/square-sync-ui";
import { savePaymentSettings } from "@/actions/payments";

type InventoryMode = "none" | "rc_to_square" | "square_to_rc" | "bidirectional";

type Props = {
  settings: {
    provider?: string | null;
    square_access_token?: string | null;
    square_location_id?: string | null;
    square_sync_enabled?: boolean;
    square_inventory_mode?: InventoryMode;
    square_last_sync_at?: string | null;
    square_last_sync_error?: string | null;
  } | null;
  logs: SyncLogEntry[];
  brandId: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function SquareSyncSettingsClient({ settings, logs, brandId }: Props) {
  const [squareSyncEnabled, setSquareSyncEnabled] = useState(
    settings?.square_sync_enabled ?? false
  );
  const [squareInventoryMode, setSquareInventoryMode] = useState<InventoryMode>(
    settings?.square_inventory_mode ?? "none"
  );
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayLogs, setDisplayLogs] = useState<SyncLogEntry[]>(logs);

  async function handleSaveSettings() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const result = await savePaymentSettings({
      brandId,
      provider: (settings?.provider as any) || null,
      squareSyncEnabled,
      squareInventoryMode,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "Failed to save settings");
    }
  }

  async function handleSyncNow(type: "products" | "orders" | "all") {
    setSyncing(true);
    setSyncMsg(null);
    const result = await syncSquareNow(brandId, type);
    setSyncMsg({
      kind: result.success ? "success" : "error",
      text: result.success
        ? `Sync complete — ${result.synced} item(s) synced.`
        : `Sync failed: ${result.errors[0] ?? "Unknown error"}`,
    });
    setSyncing(false);
    const logResult = await getSyncLog(brandId);
    if (logResult.success) setDisplayLogs(logResult.logs);
  }

  const hasToken = !!settings?.square_access_token;
  const lastSyncAt = settings?.square_last_sync_at
    ? formatDateTime(settings.square_last_sync_at)
    : "Never";
  const lastError = settings?.square_last_sync_error;
  const isEnabled = settings?.square_sync_enabled && hasToken;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top nav */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-300">Admin</Link>
          <span className="text-slate-400">/</span>
          <Link href="/admin/settings" className="text-sm text-zinc-500 hover:text-zinc-300">Settings</Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-medium text-zinc-100">Square Sync</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Square Sync</h1>
          <p className="mt-2 text-zinc-400">
            Sync products, orders, and inventory between Route Commerce and Square.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {syncMsg && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            syncMsg.kind === "success"
              ? "border-green-200 bg-green-900/30 text-green-400"
              : "border-red-200 bg-red-900/30 text-red-400"
          }`}>
            {syncMsg.text}
          </div>
        )}

        {/* Connection status */}
        <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Connection Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Provider</p>
              <p className="font-medium text-zinc-100">{settings?.provider ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-zinc-500">Square Account</p>
              <p className={`font-medium ${hasToken ? "text-green-400" : "text-slate-400"}`}>
                {hasToken ? "Connected" : "Not connected"}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Last Sync</p>
              <p className="font-medium text-zinc-100">{lastSyncAt}</p>
            </div>
            <div>
              <p className="text-zinc-500">Sync Status</p>
              {lastError ? (
                <p className="font-medium text-red-400">Error — {lastError}</p>
              ) : isEnabled ? (
                <p className="font-medium text-green-400">Active</p>
              ) : hasToken ? (
                <p className="font-medium text-yellow-600">Disabled</p>
              ) : (
                <p className="font-medium text-slate-400">Not connected</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/admin/settings/payments"
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Manage Connection
            </Link>
            {hasToken && (
              <button
                onClick={() => handleSyncNow("all")}
                disabled={syncing}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync All Now"}
              </button>
            )}
          </div>
        </div>

        {/* Sync settings */}
        {hasToken && (
          <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-100 mb-5">Sync Settings</h2>

            <div className="space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">Enable Square Sync</p>
                  <p className="text-sm text-zinc-500">Automatically sync products and orders with Square.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSquareSyncEnabled(!squareSyncEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    squareSyncEnabled ? "bg-green-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-zinc-900 shadow transition-transform ${
                      squareSyncEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {squareSyncEnabled && (
                <>
                  {/* Inventory mode */}
                  <div>
                    <p className="mb-2 font-medium text-zinc-100">Inventory Direction</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { value: "none", label: "None", desc: "No inventory sync" },
                        { value: "rc_to_square", label: "RC → Square", desc: "RC inventory to Square" },
                        { value: "square_to_rc", label: "Square → RC", desc: "Square inventory to RC" },
                        { value: "bidirectional", label: "Bidirectional", desc: "Sync both ways" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSquareInventoryMode(opt.value as InventoryMode)}
                          className={`rounded-xl border p-3 text-left text-sm ${
                            squareInventoryMode === opt.value
                              ? "border-green-600 bg-green-900/30 text-green-900"
                              : "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                          }`}
                        >
                          <p className="font-semibold">{opt.label}</p>
                          <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual sync buttons */}
                  <div>
                    <p className="mb-2 font-medium text-zinc-100">Manual Sync</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSyncNow("products")}
                        disabled={syncing}
                        className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {syncing ? "..." : "Sync Products"}
                      </button>
                      <button
                        onClick={() => handleSyncNow("orders")}
                        disabled={syncing}
                        className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {syncing ? "..." : "Sync Orders"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {saved && (
                <span className="ml-3 text-sm text-green-600">Settings saved.</span>
              )}
            </div>
          </div>
        )}

        {/* Sync log */}
        <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Sync Log</h2>
          {displayLogs.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No sync activity yet.</p>
          ) : (
            <div className="space-y-2">
              {displayLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${
                    log.status === "success"
                      ? "border-green-200 bg-green-900/30"
                      : log.status === "partial"
                      ? "border-yellow-200 bg-amber-900/30"
                      : "border-red-200 bg-red-900/30"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                        log.status === "success"
                          ? "bg-green-900/40 text-green-400"
                          : log.status === "partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-900/40 text-red-400"
                      }`}>
                        {log.status}
                      </span>
                      <span className="font-medium text-zinc-300">{log.event_type}</span>
                      {log.direction && (
                        <span className="text-xs text-slate-400">({log.direction})</span>
                      )}
                    </div>
                    {log.message && (
                      <p className="mt-1 text-xs text-zinc-500">{log.message}</p>
                    )}
                  </div>
                  <span className="ml-3 text-xs text-slate-400 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/orders?square=1"
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Square Orders
            </Link>
            <Link
              href="/admin/products?sync=square"
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Products with Square
            </Link>
            <Link
              href="/admin/settings/payments"
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Payment Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}