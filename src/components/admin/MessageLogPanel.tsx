"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { getMessageLogs, type MessageLogEntry } from "@/actions/communications/send";
import { formatDate } from "@/lib/format-date";
import { AdminButton } from "./design-system";

const PAGE_SIZE = 20;

// Icon components
const Icons = {
  list: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  refresh: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  eye: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  mousePointer: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
      <path d="m13 13 6 6"/>
    </svg>
  ),
  messageSquare: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  send: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  mail: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  clock: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
};

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  queued: { bg: "bg-stone-100", text: "text-stone-600", dot: "bg-stone-400" },
  sent: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  delivered: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  opened: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  clicked: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  bounced: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500" },
  failed: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500" },
  unsubscribed: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
};

// Method color mapping
const METHOD_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  email: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  sms: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  push: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  internal: { bg: "bg-stone-100", text: "text-stone-600", dot: "bg-stone-400" },
};

// Empty state component
function LogsEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center">
        <svg className="w-10 h-10 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-stone-800">
        {hasFilters ? "No messages match your filters" : "No message logs yet"}
      </h3>
      <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your search or status filter to find messages."
          : "Send your first campaign to start tracking message delivery and engagement."}
      </p>
    </div>
  );
}

// Loading skeleton
function LogSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="border-b border-[var(--admin-border)]">
          <td className="px-4 py-3">
            <div className="h-3 w-20 bg-stone-200 rounded animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-3 w-32 bg-stone-200 rounded animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-14 bg-stone-200 rounded-full animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-3 w-40 bg-stone-200 rounded animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-20 bg-stone-200 rounded-full animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-24 bg-stone-200 rounded-full animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.queued;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {status}
    </span>
  );
}

// Method badge component
function MethodBadge({ method }: { method: string }) {
  const colors = METHOD_COLORS[method] || METHOD_COLORS.internal;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {method}
    </span>
  );
}

// Engagement indicator
function EngagementIndicator({ log }: { log: MessageLogEntry }) {
  const hasEngagement = log.delivered_at || log.opened_at || log.clicked_at || log.bounced_at;
  
  if (!hasEngagement) {
    return <span className="text-xs text-stone-400">No engagement yet</span>;
  }
  
  return (
    <div className="flex items-center gap-1.5">
      {log.delivered_at && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium" title="Delivered">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Delivered
        </span>
      )}
      {log.opened_at && (
        <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium" title="Opened">
          {Icons.eye("w-3.5 h-3.5")}
          Opened
        </span>
      )}
      {log.clicked_at && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium" title="Clicked">
          {Icons.mousePointer("w-3.5 h-3.5")}
          Clicked
        </span>
      )}
      {log.bounced_at && (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium" title="Bounced">
          {Icons.x("w-3.5 h-3.5")}
          Bounced
        </span>
      )}
    </div>
  );
}

export default function MessageLogPanel({ brandId }: { brandId?: string }) {
  const [logs, setLogs] = useState<MessageLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    if (!brandId) return;
    setIsLoading(true);
    const result = await getMessageLogs({
      brandId,
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 100,
    });
    if (result.success) {
      setLogs(result.logs);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [brandId, statusFilter]);

  // Filter logs based on search
  const filteredLogs = search
    ? logs.filter((l: MessageLogEntry) =>
        l.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
        l.subject?.toLowerCase().includes(search.toLowerCase()) ||
        l.status?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  // Calculate stats
  const stats = {
    total: logs.length,
    delivered: logs.filter((l: MessageLogEntry) => l.status === "delivered" || l.delivered_at).length,
    failed: logs.filter((l: MessageLogEntry) => l.status === "failed" || l.status === "bounced").length,
    pending: logs.filter((l: MessageLogEntry) => l.status === "queued" || l.status === "sent").length,
  };

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRefresh = () => {
    fetchLogs();
    setPage(1);
  };

  const hasFilters = search.length > 0 || statusFilter !== "all";

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
            {Icons.messageSquare("h-6 h-6 text-white")}
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Message Logs</h2>
            <p className="text-sm text-stone-500">
              {isLoading ? "Loading..." : `${filteredLogs.length} message${filteredLogs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <AdminButton variant="secondary" onClick={handleRefresh} disabled={isLoading} icon={Icons.refresh("w-4 h-4" + (isLoading ? " animate-spin" : ""))}>
          Refresh
        </AdminButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-stone-50 rounded-bl-full" />
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-50 rounded-bl-full" />
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Delivered</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.delivered}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-red-50 rounded-bl-full" />
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Failed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full" />
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            {Icons.search("h-5 w-5 text-stone-400")}
          </div>
          <input
            type="text"
            placeholder="Search by email or subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-4 py-2.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Sent At</th>
                <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Recipient</th>
                <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Method</th>
                <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Subject</th>
                <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Engagement</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <LogSkeleton />
            </tbody>
          </table>
        </div>
      ) : paginatedLogs.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <LogsEmptyState hasFilters={hasFilters} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Sent At</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Method</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {paginatedLogs.map((log: MessageLogEntry) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3.5 text-stone-500 text-xs whitespace-nowrap">
                      {log.sent_at ? formatDate(log.sent_at) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-stone-800 text-sm font-medium">
                      {log.customer_email ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <MethodBadge method={log.delivery_method} />
                    </td>
                    <td className="px-4 py-3.5 text-stone-700 text-sm truncate max-w-[180px]" title={log.subject ?? undefined}>
                      {log.subject ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={log.status} />
                        {log.error_message && (
                          <p className="text-[10px] text-red-600 mt-0.5 truncate max-w-[120px]" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <EngagementIndicator log={log} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {paginatedLogs.map((log: MessageLogEntry) => (
              <div key={log.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-stone-800">{log.customer_email ?? "—"}</div>
                    <div className="text-xs text-stone-500 mt-0.5 truncate max-w-[200px]">{log.subject ?? "—"}</div>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MethodBadge method={log.delivery_method} />
                  <span className="text-xs text-stone-500">
                    {log.sent_at ? formatDate(log.sent_at) : "—"}
                  </span>
                </div>
                <EngagementIndicator log={log} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
              <p className="text-sm text-stone-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border border-stone-200 rounded-xl bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 text-sm border rounded-xl transition-colors ${
                        page === pageNum
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm border border-stone-200 rounded-xl bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}