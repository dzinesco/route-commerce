"use client";

import { useState, useCallback } from "react";
import type { Contact, ContactSource } from "@/actions/communications/contacts";
import { getContacts, deleteContact, exportContacts } from "@/actions/communications/contacts";
import { formatDate } from "@/lib/format-date";
import { AdminButton } from "./design-system";

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
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  upload: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  mail: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
};

// Empty state component
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
        {Icons.users("w-10 h-10 text-emerald-600")}
      </div>
      <h3 className="text-lg font-semibold text-stone-800">
        {hasFilters ? "No contacts match your filters" : "No contacts yet"}
      </h3>
      <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
        {hasFilters 
          ? "Try adjusting your search or filter criteria to find contacts."
          : "Contacts are added when customers place orders or are imported from other sources."}
      </p>
    </div>
  );
}

// Loading skeleton
function ContactSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="border-b border-[var(--admin-border)]">
          <td className="px-4 py-3">
            <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-32 bg-stone-200 rounded animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-16 bg-stone-200 rounded-full animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-16 bg-stone-200 rounded animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-12 bg-stone-200 rounded animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

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

  const hasFilters = search.length > 0 || sourceFilter !== "";

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
    if (!confirm("Delete this contact? This action cannot be undone.")) return;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
            {Icons.users("w-6 h-6 text-white")}
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Contacts</h2>
            <p className="text-sm text-stone-500">{total.toLocaleString()} contact{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminButton variant="secondary" onClick={handleExport} disabled={exporting || total === 0} icon={Icons.download("w-4 h-4")}>
            {exporting ? "Exporting..." : "Export"}
          </AdminButton>
        </div>
      </div>

      {/* Search + filters */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            {Icons.search("h-5 w-5 text-stone-400")}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, phone..."
            className="w-full pl-11 pr-4 py-2.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => handleSourceFilter(e.target.value as ContactSource | "")}
          className="px-4 py-2.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        >
          <option value="">All Sources</option>
          <option value="order">From Orders</option>
          <option value="import">Imported</option>
          <option value="manual">Manual Entry</option>
          <option value="admin">Admin Added</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm"
        >
          Search
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-[var(--admin-border)]">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-[var(--admin-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Email Opt</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Unsub</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <ContactSkeleton />
            </tbody>
          </table>
        </div>
      ) : contacts.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--admin-border)]">
          <EmptyState hasFilters={hasFilters} />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-[var(--admin-border)]">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-[var(--admin-border)]">
                <tr>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Email Opt</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-500 text-xs uppercase tracking-wider">Unsubscribed</th>
                  <th className="text-right px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)] bg-white">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-stone-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                          {(c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "??").slice(0, 2).toUpperCase()}
                        </div>
                        <span>{c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        {Icons.mail("w-4 h-4 text-stone-400")}
                        <span className="truncate max-w-[150px]">{c.email || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${SOURCE_COLORS[c.source]}`}>
                        {c.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.email_opt_in ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Opted in
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                          Opted out
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-stone-500 text-xs">
                      {c.unsubscribed_at ? formatDate(new Date(c.unsubscribed_at)) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 disabled:opacity-50 transition-colors"
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                      {(c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "??").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-800 text-sm">
                        {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"}
                      </div>
                      <div className="text-xs text-stone-500">{c.email || "—"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 disabled:opacity-50"
                  >
                    {Icons.trash("h-4 w-4")}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${SOURCE_COLORS[c.source]}`}>
                    {c.source}
                  </span>
                  {c.phone && (
                    <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                      {c.phone}
                    </span>
                  )}
                  {c.email_opt_in ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                      Opted in
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
                      Opted out
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
            <span className="text-sm text-stone-500">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePage(-1)}
                disabled={page === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-stone-50 transition-colors"
              >
                {Icons.chevronLeft("h-4 w-4")}
                <span>Previous</span>
              </button>
              <button
                onClick={() => handlePage(1)}
                disabled={(page + 1) * limit >= total}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-stone-50 transition-colors"
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