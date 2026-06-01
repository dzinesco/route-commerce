"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
};

export default function StopTableClient({ stops }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
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

  function handleDeleted() {
    setDeleteError(null);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      {/* Filter bar */}
      <div className="border-b border-stone-200 px-5 py-3 flex gap-3 flex-wrap items-center">
        <input
          type="search"
          placeholder="Search stops..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 min-w-40 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-500 placeholder:text-stone-400 transition-colors"
        />
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {(["all", "active", "inactive", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(0); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : f === "inactive" ? "Inactive" : "Draft"}
            </button>
          ))}
        </div>
        <span className="text-xs text-stone-500">{filtered.length} stops</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs text-stone-500 px-1">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="mx-5 my-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}{" "}
          <button onClick={() => setDeleteError(null)} className="underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            <th className="px-5 py-4 font-semibold">City</th>
            <th className="px-5 py-4 font-semibold">Location</th>
            <th className="px-5 py-4 font-semibold">Date</th>
            <th className="px-5 py-4 font-semibold">Time</th>
            <th className="px-5 py-4 font-semibold">Brand</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sm text-stone-500">
                {search || statusFilter !== "all"
                  ? "No stops match your search."
                  : "No stops found. Create one to get started."}
              </td>
            </tr>
          ) : (
            paginatedStops.map((stop) => (
              <StopRow
                key={stop.id}
                stop={stop}
                onDeleted={handleDeleted}
                onDeleteError={setDeleteError}
              />
            ))
          )}
        </tbody>
      </table>
    </>
  );
}

function StopRowBase({
  stop,
  onDeleted,
  onDeleteError,
}: {
  stop: Stop;
  onDeleted: () => void;
  onDeleteError: (msg: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  async function handlePublish(stopId: string) {
    setPublishingId(stopId);
    setOpenMenu(null);
    const result = await publishStop(stopId, stop.brand_id);
    setPublishingId(null);
    if (result.success) {
      startTransition(() => router.refresh());
    }
  }

  async function handleDelete(stopId: string) {
    setDeletingId(stopId);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/delete_stop`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_stop_id: stopId, p_brand_id: stop.brand_id }),
      }
    );
    const data = await res.json();
    setDeletingId(null);
    setConfirmDelete(null);
    setOpenMenu(null);
    if (data.success) {
      onDeleted();
    } else {
      onDeleteError(data.error ?? "Delete failed");
    }
  }

  return (
    <tr className="hover:bg-stone-50 transition-colors relative">
      <td className="px-5 py-4">
        <Link
          href={`/admin/stops/${stop.id}`}
          className="font-medium text-stone-900 hover:text-emerald-600 transition-colors"
        >
          {stop.city}, {stop.state}
        </Link>
      </td>

      <td className="px-5 py-4 text-stone-600">{stop.location}</td>

      <td className="px-5 py-4 font-mono text-stone-500 text-xs">{stop.date}</td>

      <td className="px-5 py-4 font-mono text-stone-500 text-xs">{stop.time}</td>

      <td className="px-5 py-4 text-stone-600">
        {Array.isArray(stop.brands)
          ? stop.brands[0]?.name
          : stop.brands?.name}
      </td>

      <td className="px-5 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            stop.status === "draft"
              ? "bg-amber-100 text-amber-700 border border-amber-200"
              : stop.active
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-stone-100 text-stone-600 border border-stone-200"
          }`}
        >
          {stop.status === "draft" ? "Draft" : stop.active ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <div className="relative inline-flex items-center justify-end gap-2">
          <Link
            href={`/admin/stops/${stop.id}`}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              setOpenMenu(openMenu === stop.id ? null : stop.id);
            }}
            className="rounded-lg px-2 py-1.5 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            ⋮
          </button>

          {openMenu === stop.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => { setOpenMenu(null); setConfirmDelete(null); }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-stone-200 shadow-xl overflow-hidden">
                {stop.status === "draft" && (
                  <button
                    onClick={() => handlePublish(stop.id)}
                    disabled={publishingId === stop.id}
                    className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                  >
                    {publishingId === stop.id ? "Publishing..." : "Publish"}
                  </button>
                )}
                <a
                  href={`/admin/stops/new?duplicate=${stop.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Duplicate
                </a>
                <button
                  onClick={() => { setOpenMenu(null); setConfirmDelete(stop.id); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}

          {confirmDelete === stop.id && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
              />
              <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-xl bg-white border border-stone-200 shadow-xl p-4">
                <p className="text-sm font-semibold text-stone-900">
                  Delete &quot;{stop.city}, {stop.state}&quot;?
                </p>
                <p className="mt-1.5 text-xs text-stone-500">
                  This will remove the stop. If it has active orders, you must resolve those first.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
                    className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(stop.id)}
                    disabled={deletingId === stop.id}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {deletingId === stop.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

const StopRow = React.memo(StopRowBase);