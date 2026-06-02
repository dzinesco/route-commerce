"use client";

import { useState, useCallback } from "react";
import type { Contact, ContactSource } from "@/actions/communications/contacts";
import { getContacts, deleteContact, exportContacts } from "@/actions/communications/contacts";
import { formatDate } from "@/lib/format-date";

const SOURCE_COLORS: Record<ContactSource, string> = {
  order: "bg-blue-100 text-blue-700",
  import: "bg-purple-100 text-purple-700",
  manual: "bg-emerald-100 text-emerald-700",
  admin: "bg-stone-100 text-stone-600",
};

// Icon components
const Icons = {
  users: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  download: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  trash: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  ),
  chevronLeft: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  chevronRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
};

export default function ContactListPanel({
  initialContacts,
  initialTotal,
  brandId,
}: {
  initialContacts: Contact[];
  initialTotal: number;
  brandId: string;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<ContactSource | "">("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const limit = 50;

  const loadPage = useCallback(async (searchVal: string, sourceVal: string, pageNum: number) => {
    setLoading(true);
    const result = await getContacts({
      brandId,
      search: searchVal || undefined,
      source: sourceVal || undefined,
      limit,
      offset: pageNum * limit,
    });
    setLoading(false);
    if (result.success) {
      setContacts(result.contacts);
      setTotal(result.total);
    }
  }, [brandId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadPage(search, sourceFilter, 0);
  };

  const handleSourceFilter = (val: ContactSource | "") => {
    setSourceFilter(val);
    setPage(0);
    loadPage(search, val, 0);
  };

  const handlePage = (dir: number) => {
    const next = page + dir;
    setPage(next);
    loadPage(search, sourceFilter, next);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    setDeleting(id);
    const result = await deleteContact(id);
    setDeleting(null);
    if (result.success) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => t - 1);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportContacts({
      brandId,
      brandSlug: "contacts",
      search: search || undefined,
      source: sourceFilter || undefined,
    });
    setExporting(false);
    if (!result.success) {
      alert("Export failed: " + result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-text-primary)]">
            {Icons.users("w-4 h-4 text-[var(--admin-bg)]")}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">Contacts</h2>
            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">{total} contact{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] hover:bg-[var(--admin-card-hover)] disabled:opacity-50 transition-colors"
        >
          {Icons.download("h-3.5 w-3.5 sm:h-4 sm:w-4")}
          <span>{exporting ? "Exporting..." : "Export"}</span>
        </button>
      </div>

      {/* Search + filters */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {Icons.search("h-4 w-4 text-[var(--admin-text-muted)]")}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, phone..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-[var(--admin-border)] rounded-lg bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => handleSourceFilter(e.target.value as ContactSource | "")}
          className="text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 bg-white text-[var(--admin-text-primary)]"
        >
          <option value="">All Sources</option>
          <option value="order">Order</option>
          <option value="import">Import</option>
          <option value="manual">Manual</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-[var(--admin-text-muted)]">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-[var(--admin-text-muted)]">No contacts found</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-[var(--admin-card)]">
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Name</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Email</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Phone</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Source</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Email</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Unsubscribed</th>
                  <th className="text-right px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--admin-card-hover)] transition-colors">
                    <td className="px-3 sm:px-4 py-3 font-medium text-[var(--admin-text-primary)]">
                      {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-[var(--admin-text-muted)]">{c.email || "—"}</td>
                    <td className="px-3 sm:px-4 py-3 text-[var(--admin-text-muted)]">{c.phone || "—"}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${SOURCE_COLORS[c.source]}`}>
                        {c.source}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      {c.email_opt_in ? (
                        <span className="text-emerald-600 text-xs font-semibold">Opted in</span>
                      ) : (
                        <span className="text-red-500 text-xs font-semibold">Opted out</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-[var(--admin-text-muted)] text-xs">
                      {c.unsubscribed_at
                        ? formatDate(new Date(c.unsubscribed_at))
                        : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                        title="Delete contact"
                      >
                        {Icons.trash("h-4 w-4")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {contacts.map((c) => (
              <div key={c.id} className="rounded-xl border border-[var(--admin-border)] bg-white p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-[var(--admin-text-primary)] text-sm">
                    {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {Icons.trash("h-4 w-4")}
                  </button>
                </div>
                <div className="text-xs text-[var(--admin-text-muted)]">{c.email || "—"}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[c.source]}`}>
                    {c.source}
                  </span>
                  {c.phone && <span className="text-xs text-[var(--admin-text-muted)]">{c.phone}</span>}
                  {c.email_opt_in ? (
                    <span className="text-emerald-600 text-xs font-semibold">Opted in</span>
                  ) : (
                    <span className="text-red-500 text-xs font-semibold">Opted out</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--admin-border)]">
            <span className="text-xs sm:text-sm text-[var(--admin-text-muted)]">
              Page {page + 1} — {Math.min((page + 1) * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePage(-1)}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-xs sm:text-sm disabled:opacity-50 hover:bg-[var(--admin-card-hover)] transition-colors"
              >
                {Icons.chevronLeft("h-4 w-4")}
                <span>Previous</span>
              </button>
              <button
                onClick={() => handlePage(1)}
                disabled={(page + 1) * limit >= total}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-xs sm:text-sm disabled:opacity-50 hover:bg-[var(--admin-card-hover)] transition-colors"
              >
                <span>Next</span>
                {Icons.chevronRight("h-4 w-4")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}