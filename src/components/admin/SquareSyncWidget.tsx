"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSyncLog, syncSquareNow, type SyncLogEntry } from "@/actions/square-sync-ui";
import { getPaymentSettings } from "@/actions/payments";

type Props = {
  brandId: string;
};

export default function SquareSyncWidget({ brandId }: Props) {
  const [settings, setSettings] = useState<{
    provider: string | null;
    square_access_token: string | null;
    square_sync_enabled: boolean;
    square_inventory_mode: string;
    square_last_sync_at: string | null;
    square_last_sync_error: string | null;
  } | null>(null);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    getPaymentSettings(brandId).then((r) => {
      if (r.success && r.settings) setSettings(r.settings as any);
    });
    getSyncLog(brandId).then((r) => {
      if (r.success) setLogs(r.logs.slice(0, 5));
    });
    // Poll pending queue count every 30s
    const interval = setInterval(() => checkQueueCount(), 30000);
    checkQueueCount();
    return () => clearInterval(interval);
  }, [brandId]);

  async function checkQueueCount() {
    const { supabase } = await import("@/lib/supabase");
    const { count } = await supabase
      .from("square_sync_queue")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .in("status", ["pending"]);
    setQueueCount(count ?? 0);
  }

  useEffect(() => {
    if (!syncMsg) return;
    const timer = setTimeout(() => setSyncMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [syncMsg]);

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
    getSyncLog(brandId).then((r) => {
      if (r.success) setLogs(r.logs.slice(0, 5));
    });
    getPaymentSettings(brandId).then((r) => {
      if (r.success && r.settings) setSettings(r.settings as any);
    });
  }

  const lastSyncAt = settings?.square_last_sync_at
    ? timeAgo(settings.square_last_sync_at)
    : "Never";
  const lastError = settings?.square_last_sync_error;
  const hasToken = !!(settings?.square_access_token);
  const autoSyncEnabled = settings?.square_sync_enabled && hasToken;

  const subheading = hasToken
    ? autoSyncEnabled
      ? `Wholesale products · ${lastSyncAt}`
      : "Connected — auto-sync disabled"
    : "Not connected";

  return (
    <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-900/40">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-100">Square Inventory</h3>
              {autoSyncEnabled && (
                <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
                  Auto-sync
                </span>
              )}
              {!autoSyncEnabled && hasToken && (
                <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs font-medium text-zinc-500">
                  Sync off
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">
              {subheading}
            </p>
          </div>
        </div>
        {lastError && (
          <span className="rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-400">
            Sync Error
          </span>
        )}
      </div>

      {lastError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-900/30 px-3 py-2 text-xs text-red-400">
          {lastError}
        </div>
      )}

      {syncMsg && (
        <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
          syncMsg.kind === "success"
            ? "border-green-200 bg-green-900/30 text-green-400"
            : "border-red-200 bg-red-900/30 text-red-400"
        }`}>
          {syncMsg.text}
        </div>
      )}

      {hasToken ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleSyncNow("products")}
              disabled={syncing}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {syncing ? "..." : "Sync Products"}
            </button>
            <button
              onClick={() => handleSyncNow("orders")}
              disabled={syncing}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {syncing ? "..." : "Sync Orders"}
            </button>
            <button
              onClick={() => handleSyncNow("all")}
              disabled={syncing}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {syncing ? "..." : "Sync All"}
            </button>
          </div>

          {!autoSyncEnabled && hasToken && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-900/30 px-3 py-2 text-xs text-amber-700">
              Square sync is turned off. Wholesale products will not be pushed to Square automatically.
            </div>
          )}

          {logs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recent activity
              </p>
              {logs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                    log.status === "success"
                      ? "border-green-200 bg-green-900/30 text-green-400"
                      : "border-red-200 bg-red-900/30 text-red-400"
                  }`}
                >
                  <span className="truncate">
                    [{log.direction ?? "—"}] {log.event_type}
                  </span>
                  <span className="ml-2 text-slate-400">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Link
              href="/admin/settings/square-sync"
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
            >
              View Settings
            </Link>
            <Link
              href="/admin/orders?square=1"
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
            >
              Square Orders
            </Link>
          </div>
        </>
      ) : (
        <Link
          href="/admin/settings/payments"
          className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Connect Square
        </Link>
      )}
    </div>
  );
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