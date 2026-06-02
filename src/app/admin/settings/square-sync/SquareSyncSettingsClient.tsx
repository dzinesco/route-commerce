"use client";

import { useState } from "react";
import Link from "next/link";
import { syncSquareNow, getSyncLog, type SyncLogEntry } from "@/actions/square-sync-ui";
import { savePaymentSettings } from "@/actions/payments";
import { AdminToggle, AdminButton } from "@/components/admin/design-system";

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SquareSyncSettingsClient({ settings, logs, brandId }: Props) {
  const [squareSyncEnabled, setSquareSyncEnabled] = useState(
    settings?.square_sync_enabled ?? false
  );
  const [squareInventoryMode, setSquareInventoryMode] = useState<InventoryMode>(
    settings?.square_inventory_mode ?? "none"
  );
  const [syncing, setSyncing] = useState(false);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayLogs, setDisplayLogs] = useState<SyncLogEntry[]>(logs);
  const [dirty, setDirty] = useState(false);

  const hasToken = !!settings?.square_access_token;
  const lastSyncAt = settings?.square_last_sync_at
    ? formatDateTime(settings.square_last_sync_at)
    : "Never";
  const lastError = settings?.square_last_sync_error;
  const isEnabled = settings?.square_sync_enabled && hasToken;

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
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "Failed to save settings");
    }
  }

  async function handleSyncNow(type: "products" | "orders" | "all") {
    setSyncing(true);
    setSyncingType(type);
    setSyncMsg(null);
    const result = await syncSquareNow(brandId, type);
    setSyncMsg({
      kind: result.success ? "success" : "error",
      text: result.success
        ? `Sync complete — ${result.synced} item(s) synced.`
        : `Sync failed: ${result.errors[0] ?? "Unknown error"}`,
    });
    setSyncing(false);
    setSyncingType(null);
    const logResult = await getSyncLog(brandId);
    if (logResult.success) setDisplayLogs(logResult.logs);
  }

  return (
    <main className="min-h-screen bg-[var(--admin-bg)]">
      {/* Page Header */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent)] text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--admin-text-primary)]">Square Sync</h1>
            </div>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Sync products, orders, and inventory between Route Commerce and Square.
            </p>
          </div>
          {hasToken && (
            <div className="flex items-center gap-2">
              <AdminButton
                variant="secondary"
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
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync All Now
                  </>
                )}
              </AdminButton>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-8 pb-10 space-y-6 max-w-4xl">
        {/* Status messages */}
        {error && (
          <div className="rounded-xl border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10 px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--admin-danger)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--admin-danger)]">Error</p>
              <p className="text-sm text-[var(--admin-danger)]/80">{error}</p>
            </div>
          </div>
        )}
        {saved && (
          <div className="rounded-xl border border-[var(--admin-success)]/30 bg-[var(--admin-success)]/10 px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-[var(--admin-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-[var(--admin-success)]">Settings saved successfully!</p>
          </div>
        )}
        {syncMsg && (
          <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
            syncMsg.kind === "success"
              ? "border-[var(--admin-success)]/30 bg-[var(--admin-success)]/10"
              : "border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10"
          }`}>
            {syncMsg.kind === "success" ? (
              <svg className="w-5 h-5 text-[var(--admin-success)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--admin-danger)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            <p className={`text-sm font-medium ${
              syncMsg.kind === "success" ? "text-[var(--admin-success)]" : "text-[var(--admin-danger)]"
            }`}>{syncMsg.text}</p>
          </div>
        )}

        {/* Connection Status Card */}
        <div className="rounded-2xl bg-white border border-[var(--admin-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Connection Status</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                <p className="text-xs font-medium text-[var(--admin-text-muted)] mb-1">Provider</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{settings?.provider ?? "Not set"}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                <p className="text-xs font-medium text-[var(--admin-text-muted)] mb-1">Square Account</p>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${hasToken ? "bg-[var(--admin-success)]" : "bg-[var(--admin-text-muted)]"}`} />
                  <p className="text-sm font-semibold text-[var(--admin-text-primary)]">
                    {hasToken ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                <p className="text-xs font-medium text-[var(--admin-text-muted)] mb-1">Last Sync</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{lastSyncAt}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                <p className="text-xs font-medium text-[var(--admin-text-muted)] mb-1">Sync Status</p>
                {lastError ? (
                  <p className="text-sm font-semibold text-[var(--admin-danger)]">Error</p>
                ) : isEnabled ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[var(--admin-success)]" />
                    <p className="text-sm font-semibold text-[var(--admin-success)]">Active</p>
                  </div>
                ) : hasToken ? (
                  <p className="text-sm font-semibold text-amber-600">Disabled</p>
                ) : (
                  <p className="text-sm font-semibold text-[var(--admin-text-muted)]">N/A</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Sync Settings Card */}
        {hasToken && (
          <div className="rounded-2xl bg-white border border-[var(--admin-border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
              <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Sync Settings</h2>
            </div>
            <div className="p-5 space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Enable Square Sync</p>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                    Automatically sync products and orders with Square.
                  </p>
                </div>
                <AdminToggle
                  checked={squareSyncEnabled}
                  onChange={(checked) => {
                    setSquareSyncEnabled(checked);
                    setDirty(true);
                  }}
                />
              </div>

              {squareSyncEnabled && (
                <>
                  {/* Inventory mode */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Inventory Direction</p>
                      <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                        Choose how inventory data flows between Route Commerce and Square.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { value: "none", label: "None", desc: "No inventory sync" },
                        { value: "rc_to_square", label: "RC → Square", desc: "Push RC inventory" },
                        { value: "square_to_rc", label: "Square → RC", desc: "Pull from Square" },
                        { value: "bidirectional", label: "Bidirectional", desc: "Sync both ways" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSquareInventoryMode(opt.value as InventoryMode);
                            setDirty(true);
                          }}
                          className={`rounded-xl border p-3 text-left transition-all ${
                            squareInventoryMode === opt.value
                              ? "border-[var(--admin-accent)] bg-[var(--admin-accent-light)] ring-2 ring-[var(--admin-accent)]"
                              : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50"
                          }`}
                        >
                          <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{opt.label}</p>
                          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual sync buttons */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Manual Sync</p>
                      <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                        Manually trigger a sync for products or orders.
                      </p>
                    </div>
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
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Sync Products
                          </>
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
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                            </svg>
                            Sync Orders
                          </>
                        )}
                      </AdminButton>
                    </div>
                  </div>
                </>
              )}

              {/* Save button */}
              <div className="flex items-center gap-4 pt-4 border-t border-[var(--admin-border)]">
                <AdminButton
                  variant="primary"
                  size="md"
                  onClick={handleSaveSettings}
                  disabled={saving || !dirty}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Settings"
                  )}
                </AdminButton>
                {dirty && !saving && (
                  <span className="text-xs text-[var(--admin-text-muted)]">You have unsaved changes</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Not connected state */}
        {!hasToken && (
          <div className="rounded-2xl bg-white border border-[var(--admin-border)] p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--admin-bg)] mx-auto mb-4">
              <svg className="w-7 h-7 text-[var(--admin-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">Square Not Connected</h3>
            <p className="text-sm text-[var(--admin-text-muted)] max-w-md mx-auto mb-6">
              Connect your Square account to enable product and inventory sync.
            </p>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors"
            >
              Configure in Payment Settings
            </Link>
          </div>
        )}

        {/* Sync Log Card */}
        {hasToken && (
          <div className="rounded-2xl bg-white border border-[var(--admin-border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Sync Log</h2>
              <span className="text-xs text-[var(--admin-text-muted)]">
                Last 50 entries
              </span>
            </div>
            <div className="p-5">
              {displayLogs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--admin-bg)] mx-auto mb-3">
                    <svg className="w-6 h-6 text-[var(--admin-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--admin-text-muted)]">No sync activity yet</p>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-1">Sync logs will appear here after your first sync</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {displayLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start justify-between rounded-xl border px-4 py-3 ${
                        log.status === "success"
                          ? "border-[var(--admin-success)]/30 bg-[var(--admin-success)]/5"
                          : log.status === "partial"
                          ? "border-amber-200 bg-amber-50"
                          : "border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/5"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                            log.status === "success"
                              ? "bg-[var(--admin-success)]/20 text-[var(--admin-success)]"
                              : log.status === "partial"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-[var(--admin-danger)]/20 text-[var(--admin-danger)]"
                          }`}>
                            {log.status}
                          </span>
                          <span className="text-sm font-medium text-[var(--admin-text-primary)]">{log.event_type}</span>
                          {log.direction && (
                            <span className="text-xs text-[var(--admin-text-muted)]">({log.direction})</span>
                          )}
                        </div>
                        {log.message && (
                          <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">{log.message}</p>
                        )}
                      </div>
                      <span className="ml-3 text-xs text-[var(--admin-text-muted)] whitespace-nowrap">
                        {timeAgo(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Links Card */}
        <div className="rounded-2xl bg-white border border-[var(--admin-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Quick Links</h2>
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            <Link
              href="/admin/orders?square=1"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Square Orders
            </Link>
            <Link
              href="/admin/products?sync=square"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Products with Square
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.622.932.214.159.466.27.732.413.322.168.624-.139.748-.555.048-.401.096-.83.163-1.249.073-.418.306-.802.637-.972.326-.166.681-.182 1.011-.103.066.032.146.066.198.04a1.5 1.5 0 01.497 1.15c.039.247.015.497-.077.726-.085.21-.219.4-.383.595-.157.186-.356.333-.576.464-.26.148-.568.197-.924.12-.336-.07-.664-.214-.972-.398-.326-.195-.637-.464-.872-.732-.25-.283-.453-.597-.628-.947-.172-.342-.22-.718-.146-1.097.074-.39.33-.726.663-.986.311-.24.697-.36 1.103-.267.4.086.764.331 1.019.605.269.287.452.655.517.972.056.293.012.596-.017.884-.028.294-.09.576-.184.845-.093.263-.216.505-.366.737-.147.224-.307.416-.485.58-.172.153-.369.26-.576.336l-.123.003z" />
              </svg>
              Payment Settings
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}