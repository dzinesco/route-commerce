"use client";

import { useState } from "react";
import type { MessageLogEntry } from "@/actions/communications/send";
import { formatDate } from "@/lib/format-date";

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-zinc-950 text-zinc-300",
  sent: "bg-blue-900/40 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  opened: "bg-violet-100 text-violet-700",
  clicked: "bg-amber-100 text-amber-700",
  bounced: "bg-red-900/40 text-red-400",
  failed: "bg-red-900/40 text-red-400",
  unsubscribed: "bg-orange-100 text-orange-700",
};

const METHOD_COLORS: Record<string, string> = {
  email: "bg-blue-900/40 text-blue-700",
  sms: "bg-green-900/40 text-green-400",
  push: "bg-purple-100 text-purple-700",
  internal: "bg-zinc-950 text-zinc-400",
};

function EngagementBadges({ log }: { log: MessageLogEntry }) {
  const badges = [];
  if (log.delivered_at) {
    badges.push(
      <span key="delivered" className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium">
        ✓ Delivered
      </span>
    );
  }
  if (log.opened_at) {
    badges.push(
      <span key="opened" className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-medium">
        Opened {formatDate(new Date(log.opened_at))}
      </span>
    );
  }
  if (log.clicked_at) {
    badges.push(
      <span key="clicked" className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
        Clicked {formatDate(new Date(log.clicked_at))}
      </span>
    );
  }
  if (log.bounced_at) {
    badges.push(
      <span key="bounced" className="rounded-full bg-red-900/40 text-red-400 px-2 py-0.5 text-xs font-medium">
        ✗ Bounced
        {log.bounce_reason && <span className="ml-1">{log.bounce_reason}</span>}
      </span>
    );
  }
  return badges.length > 0 ? <div className="flex flex-wrap gap-1 mt-1">{badges}</div> : null;
}

export default function MessageLogPanel({ initialLogs }: { initialLogs: MessageLogEntry[] }) {
  const [logs] = useState(initialLogs);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");

  const filtered = logs.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterMethod !== "all" && l.delivery_method !== filterMethod) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Message Logs</h2>
          <p className="text-sm text-zinc-500">{filtered.length} message{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-4 flex-wrap">
        <select
          className="text-sm border border-zinc-600 rounded-lg px-3 py-2"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Failed</option>
        </select>
        <select
          className="text-sm border border-zinc-600 rounded-lg px-3 py-2"
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="push">Push</option>
          <option value="internal">Internal</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No messages logged yet</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Sent At</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Recipient</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-800">
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {l.sent_at ? new Date(l.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">{l.customer_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${METHOD_COLORS[l.delivery_method] ?? "bg-zinc-950"}`}>
                        {l.delivery_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-xs truncate max-w-[180px]">{l.subject ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status] ?? "bg-zinc-950"}`}>
                        {l.status}
                      </span>
                      {l.error_message && (
                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-[120px]">{l.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {l.delivered_at && (
                          <span className="text-xs text-emerald-600">✓ {formatDate(new Date(l.delivered_at))}</span>
                        )}
                        {l.opened_at && (
                          <span className="text-xs text-violet-600">Opened {formatDate(new Date(l.opened_at))}</span>
                        )}
                        {l.clicked_at && (
                          <span className="text-xs text-amber-400">Clicked {formatDate(new Date(l.clicked_at))}</span>
                        )}
                        {l.bounced_at && (
                          <span className="text-xs text-red-500">✗ Bounced{l.bounce_reason ? `: ${l.bounce_reason}` : ""}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((l) => (
              <div key={l.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="text-sm font-medium text-zinc-100">{l.customer_email ?? "—"}</div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status] ?? "bg-zinc-950"}`}>
                    {l.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">{l.subject ?? "—"}</div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${METHOD_COLORS[l.delivery_method] ?? "bg-zinc-950"}`}>
                    {l.delivery_method}
                  </span>
                  <span className="text-xs text-slate-400">
                    {l.sent_at ? formatDate(new Date(l.sent_at)) : "—"}
                  </span>
                </div>
                <EngagementBadges log={l} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
