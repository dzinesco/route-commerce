"use client";

import { useState, useEffect } from "react";
import { getMessageLogs, type MessageLogEntry } from "@/actions/communications/send";
import { formatDate } from "@/lib/format-date";
import AdminBadge from "./design-system/AdminBadge";

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
};

// Status to badge variant mapping
const getStatusBadgeProps = (status: string): { variant: "default" | "success" | "warning" | "danger" | "info"; dot: boolean } => {
  const map: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info"; dot: boolean }> = {
    queued: { variant: "default", dot: true },
    sent: { variant: "info", dot: true },
    delivered: { variant: "success", dot: true },
    opened: { variant: "info", dot: true },
    clicked: { variant: "warning", dot: true },
    bounced: { variant: "danger", dot: true },
    failed: { variant: "danger", dot: true },
    unsubscribed: { variant: "warning", dot: true },
  };
  return map[status] ?? { variant: "default", dot: true };
};

// Method to badge variant mapping
const getMethodBadgeProps = (method: string): { variant: "default" | "success" | "warning" | "danger" | "info"; dot: boolean } => {
  const map: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info"; dot: boolean }> = {
    email: { variant: "info", dot: true },
    sms: { variant: "success", dot: true },
    push: { variant: "warning", dot: true },
    internal: { variant: "default", dot: true },
  };
  return map[method] ?? { variant: "default", dot: true };
};

const PAGE_SIZE = 20;

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

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            {Icons.messageSquare("h-5 w-5 text-white")}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">Message Logs</h2>
            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">
              {isLoading ? "Loading..." : `${filteredLogs.length} message${filteredLogs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-50"
        >
          {Icons.refresh("h-4 w-4" + (isLoading ? " animate-spin" : ""))}
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-[var(--admin-text-primary)] mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Delivered</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.delivered}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Failed</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Pending</p>
          <p className="text-xl sm:text-2xl font-bold text-stone-600 mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          {Icons.search("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400")}
          <input
            type="text"
            placeholder="Search by email or subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--admin-border)] rounded-xl bg-white text-[var(--admin-text-primary)] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 text-sm border border-[var(--admin-border)] rounded-xl bg-white text-[var(--admin-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-stone-500">
            {Icons.refresh("h-5 w-5 animate-spin")}
            <span>Loading logs...</span>
          </div>
        </div>
      ) : paginatedLogs.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-stone-100 mb-4">
            {Icons.list("h-8 w-8 text-stone-400")}
          </div>
          <p className="text-sm font-medium text-stone-600">No messages logged yet</p>
          <p className="text-xs text-stone-400 mt-1">Send a campaign to see logs here</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-[var(--admin-border)]">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Sent At</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Recipient</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)] bg-white">
                {paginatedLogs.map((log: MessageLogEntry) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-[var(--admin-text-muted)] text-xs whitespace-nowrap">
                      {log.sent_at ? formatDate(log.sent_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-primary)] text-xs">
                      {log.customer_email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const props = getMethodBadgeProps(log.delivery_method);
                        return <AdminBadge variant={props.variant} dot>{log.delivery_method}</AdminBadge>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-primary)] text-xs truncate max-w-[160px]" title={log.subject ?? undefined}>
                      {log.subject ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const props = getStatusBadgeProps(log.status);
                        return <AdminBadge variant={props.variant} dot>{log.status}</AdminBadge>;
                      })()}
                      {log.error_message && (
                        <p className="text-[10px] text-red-600 mt-0.5 truncate max-w-[100px]" title={log.error_message}>
                          {log.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {log.delivered_at && (
                          <AdminBadge variant="success" dot>Delivered</AdminBadge>
                        )}
                        {log.opened_at && (
                          <AdminBadge variant="info" dot>Opened</AdminBadge>
                        )}
                        {log.clicked_at && (
                          <AdminBadge variant="warning" dot>Clicked</AdminBadge>
                        )}
                        {log.bounced_at && (
                          <AdminBadge variant="danger" dot>Bounced</AdminBadge>
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
            {paginatedLogs.map((log: MessageLogEntry) => (
              <div key={log.id} className="rounded-xl border border-[var(--admin-border)] bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[var(--admin-text-primary)]">{log.customer_email ?? "—"}</div>
                    <div className="text-xs text-[var(--admin-text-muted)] mt-0.5">{log.subject ?? "—"}</div>
                  </div>
                  {(() => {
                    const props = getStatusBadgeProps(log.status);
                    return <AdminBadge variant={props.variant} dot>{log.status}</AdminBadge>;
                  })()}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const props = getMethodBadgeProps(log.delivery_method);
                    return <AdminBadge variant={props.variant} dot>{log.delivery_method}</AdminBadge>;
                  })()}
                  <span className="text-xs text-[var(--admin-text-muted)]">
                    {log.sent_at ? formatDate(log.sent_at) : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {log.delivered_at && (
                    <AdminBadge variant="success" dot>Delivered</AdminBadge>
                  )}
                  {log.opened_at && (
                    <AdminBadge variant="info" dot>Opened</AdminBadge>
                  )}
                  {log.clicked_at && (
                    <AdminBadge variant="warning" dot>Clicked</AdminBadge>
                  )}
                  {log.bounced_at && (
                    <AdminBadge variant="danger" dot>Bounced</AdminBadge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--admin-border)]">
              <p className="text-xs text-[var(--admin-text-muted)]">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-[var(--admin-border)] rounded-lg bg-white text-[var(--admin-text-primary)] hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                        page === pageNum
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:bg-stone-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-[var(--admin-border)] rounded-lg bg-white text-[var(--admin-text-primary)] hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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