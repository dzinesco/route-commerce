"use client";

import { useState, useCallback } from "react";
import type { Contact, ContactSource } from "@/actions/communications/contacts";
import { getContacts, deleteContact, exportContacts } from "@/actions/communications/contacts";
import { formatDate } from "@/lib/format-date";

const SOURCE_COLORS: Record<ContactSource, string> = {
  order: "bg-blue-900/40 text-blue-700",
  import: "bg-purple-100 text-purple-700",
  manual: "bg-green-900/40 text-green-400",
  admin: "bg-zinc-950 text-zinc-300",
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Contacts</h2>
          <p className="text-sm text-zinc-500">{total} contact{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export Contacts"}
        </button>
      </div>

      {/* Search + filters */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, name, phone..."
          className="flex-1 text-sm border border-zinc-600 rounded-lg px-3 py-2"
        />
        <select
          value={sourceFilter}
          onChange={(e) => handleSourceFilter(e.target.value as ContactSource | "")}
          className="text-sm border border-zinc-600 rounded-lg px-3 py-2"
        >
          <option value="">All Sources</option>
          <option value="order">Order</option>
          <option value="import">Import</option>
          <option value="manual">Manual</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No contacts found</div>
      ) : (
        <>
          <div className="hidden sm:block bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Email Opt-in</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Unsubscribed</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800">
                    <td className="px-4 py-3 font-medium text-zinc-100">
                      {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[c.source]}`}>
                        {c.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.email_opt_in ? (
                        <span className="text-green-600 text-xs font-medium">Opted in</span>
                      ) : (
                        <span className="text-red-500 text-xs font-medium">Opted out</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {c.unsubscribed_at
                        ? formatDate(new Date(c.unsubscribed_at))
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="text-red-500 hover:text-red-400 text-xs disabled:opacity-50"
                      >
                        {deleting === c.id ? "..." : "Delete"}
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
              <div key={c.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="font-medium text-zinc-100 text-sm">
                    {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="text-red-500 hover:text-red-400 text-xs disabled:opacity-50"
                  >
                    {deleting === c.id ? "..." : "Delete"}
                  </button>
                </div>
                <div className="text-xs text-zinc-400">{c.email || "—"}</div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[c.source]}`}>
                    {c.source}
                  </span>
                  {c.phone && <span className="text-xs text-zinc-500">{c.phone}</span>}
                  {c.email_opt_in ? (
                    <span className="text-green-600 text-xs font-medium">Opted in</span>
                  ) : (
                    <span className="text-red-500 text-xs font-medium">Opted out</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-zinc-500">
              Page {page + 1} — {contacts.length} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePage(-1)}
                disabled={page === 0}
                className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-zinc-800"
              >
                Previous
              </button>
              <button
                onClick={() => handlePage(1)}
                disabled={(page + 1) * limit >= total}
                className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
