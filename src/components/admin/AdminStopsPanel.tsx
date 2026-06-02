"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScheduleImportModal from "@/components/admin/ScheduleImportModal";
import AddStopModal from "@/components/admin/AddStopModal";
import { publishStop } from "@/actions/stops";

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  active: boolean;
  deleted_at?: string | null;
  brand_id: string;
  status?: string;
  brands: { name: string } | { name: string }[];
};

type Props = {
  stops: Stop[];
  brandId: string;
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string) {
  if (!timeStr) return "—";
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export default function AdminStopsPanel({ stops, brandId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [page, setPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const filtered = stops.filter((s) => {
    const matchesSearch =
      !search ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.active && s.status !== "draft") ||
      (statusFilter === "inactive" && !s.active && s.status !== "draft") ||
      (statusFilter === "draft" && s.status === "draft");
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedStops = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handlePublish(stopId: string) {
    setPublishingId(stopId);
    setOpenMenu(null);
    await publishStop(stopId, brandId);
    setPublishingId(null);
    router.refresh();
  }

  async function handleDelete(stopId: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/delete_stop`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_stop_id: stopId, p_brand_id: brandId }),
      }
    );
    const data = await res.json();
    setConfirmDelete(null);
    setOpenMenu(null);
    if (data.success) {
      router.refresh();
    }
  }

  const activeCount = stops.filter((s) => s.active && s.status !== "draft").length;
  const draftCount = stops.filter((s) => s.status === "draft").length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">Tour Stops</h1>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-stone-500">
                  <span className="font-medium text-stone-700">{activeCount}</span> active
                </span>
                {draftCount > 0 && (
                  <span className="text-sm text-stone-500">
                    <span className="font-medium text-stone-700">{draftCount}</span> drafts
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Schedule
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Stop
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Filters */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm mb-5">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search city or location..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
              {(["all", "active", "draft", "inactive"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setPage(0); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    statusFilter === f
                      ? "bg-white text-emerald-700 shadow-sm border border-emerald-200"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                  }`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Count */}
            <span className="ml-auto text-sm text-stone-500">{filtered.length} stops</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-stone-600">No stops found</p>
              <p className="mt-1 text-sm text-stone-400">Create a stop or adjust your filters</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500">City</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Location</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Date</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Time</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500 hidden md:table-cell">Brand</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedStops.map((stop) => (
                  <tr key={stop.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/admin/stops/${stop.id}`} className="font-medium text-stone-900 hover:text-emerald-600 transition-colors">
                        {stop.city}, {stop.state}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-stone-600">{stop.location}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-stone-500">{formatDate(stop.date)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-stone-500">{formatTime(stop.time)}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-stone-600">
                        {Array.isArray(stop.brands) ? stop.brands[0]?.name : stop.brands?.name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        stop.status === "draft"
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : stop.active
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}>
                        {stop.status === "draft" ? "Draft" : stop.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="relative inline-flex items-center gap-2">
                        <Link
                          href={`/admin/stops/${stop.id}`}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setOpenMenu(openMenu === stop.id ? null : stop.id)}
                          className="rounded-lg px-2 py-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                        >
                          ⋮
                        </button>

                        {openMenu === stop.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => { setOpenMenu(null); setConfirmDelete(null); }} />
                            <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-stone-200 shadow-lg">
                              {stop.status === "draft" && (
                                <button
                                  onClick={() => handlePublish(stop.id)}
                                  disabled={publishingId === stop.id}
                                  className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                >
                                  {publishingId === stop.id ? "Publishing..." : "Publish"}
                                </button>
                              )}
                              <a href={`/admin/stops/new?duplicate=${stop.id}`} className="block px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50">
                                Duplicate
                              </a>
                              <button
                                onClick={() => { setOpenMenu(null); setConfirmDelete(stop.id); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}

                        {confirmDelete === stop.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setConfirmDelete(null)} />
                            <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-xl bg-white border border-stone-200 shadow-lg p-4">
                              <p className="text-sm font-semibold text-stone-900">Delete &quot;{stop.city}, {stop.state}&quot;?</p>
                              <p className="mt-1.5 text-xs text-stone-500">This cannot be undone.</p>
                              <div className="mt-4 flex gap-2">
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDelete(stop.id)}
                                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-stone-500">
              Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-3 text-sm font-medium text-stone-700">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ScheduleImportModal brandId={brandId} onClose={() => setShowImport(false)} onComplete={() => router.refresh()} />
      <AddStopModal isOpen={showAdd} onClose={() => setShowAdd(false)} brandId={brandId} onSuccess={() => router.refresh()} />
    </div>
  );
}