"use client";

import { useState } from "react";
import { syncSquareNow, getSyncLog } from "@/actions/square-sync-ui";
import Link from "next/link";

type Props = {
  brandId: string;
  hasSquareToken: boolean;
};

export default function ProductSyncBanner({ brandId, hasSquareToken }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [logs, setLogs] = useState<{ event_type: string; status: string; created_at: string }[]>([]);

  async function handleSyncProducts() {
    setSyncing(true);
    setMsg(null);
    const result = await syncSquareNow(brandId, "products");
    setMsg({
      kind: result.success ? "success" : "error",
      text: result.success
        ? `Products synced — ${result.synced} item(s).`
        : `Failed: ${result.errors[0] ?? "Unknown error"}`,
    });
    setSyncing(false);
    const logResult = await getSyncLog(brandId);
    if (logResult.success) setLogs(logResult.logs.filter(l => l.entity_type === "product").slice(0, 5));
  }

  if (!hasSquareToken) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <span className="text-amber-700">Square not connected.</span>
        <Link href="/admin/settings/payments" className="ml-2 font-medium text-emerald-600 hover:text-emerald-700 underline transition-colors">
          Connect Square →
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleSyncProducts}
          disabled={syncing}
          className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          {syncing ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Products to Square
            </span>
          )}
        </button>
        <Link
          href="/admin/settings/square-sync"
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          Square Sync Settings
        </Link>
      </div>

      {msg && (
        <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
          msg.kind === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-2 space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-stone-500">
              <span className={`rounded px-1.5 py-0.5 font-medium ${
                log.status === "success" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-red-100 text-red-700 border border-red-200"
              }`}>{log.status}</span>
              <span className="text-stone-600">{log.event_type}</span>
              <span className="text-stone-400">{new Date(log.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}