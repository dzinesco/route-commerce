"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishStop } from "@/actions/stops";
import {
  AdminSearchInput,
  AdminFilterTabs,
  AdminButton,
  AdminIconButton,
  useToast,
  Skeleton,
} from "@/components/admin/design-system";
import ScheduleImportModal from "@/components/admin/ScheduleImportModal";
import AddStopModal from "@/components/admin/AddStopModal";
import StopDetailModal from "@/components/admin/StopDetailModal";

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
  address?: string | null;
  brands: { name: string } | { name: string }[] | null;
};

type Props = {
  stops: Stop[];
  /**
   * Hide the internal search/filter bar at the top of the table. Use when
   * the parent component already renders shared filters (e.g. StopsViewClient).
   */
  hideInternalFilterBar?: boolean;
};

const TAB_NUMERIC: Record<"all" | "active" | "inactive" | "draft", "all" | "active" | "inactive" | "draft"> = {
  all: "all",
  active: "active",
  inactive: "inactive",
  draft: "draft",
};

export default function StopTableClient({ stops, hideInternalFilterBar = false }: Props) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set());
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [openStopId, setOpenStopId] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 220);
    return () => clearTimeout(timer);
  }, [page, statusFilter, search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stops.filter((s) => {
      const matchesSearch =
        !q ||
        s.city.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.active && s.status !== "draft") ||
        (statusFilter === "inactive" && !s.active && s.status !== "draft") ||
        (statusFilter === "draft" && s.status === "draft");
      return matchesSearch && matchesStatus;
    });
  }, [stops, search, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      all: stops.length,
      active: stops.filter((s) => s.active && s.status !== "draft").length,
      inactive: stops.filter((s) => !s.active && s.status !== "draft").length,
      draft: stops.filter((s) => s.status === "draft").length,
    }),
    [stops]
  );

  const tabs = useMemo(
    () => [
      { value: "all", label: "All", count: statusCounts.all },
      { value: "active", label: "Active", count: statusCounts.active },
      { value: "inactive", label: "Inactive", count: statusCounts.inactive },
      { value: "draft", label: "Draft", count: statusCounts.draft },
    ],
    [statusCounts]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedStops = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelectAll = () => {
    if (selectedStops.size === paginatedStops.length) {
      setSelectedStops(new Set());
    } else {
      setSelectedStops(new Set(paginatedStops.map((s) => s.id)));
    }
  };

  const toggleStopSelection = (stopId: string) => {
    setSelectedStops((prev) => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  };

  async function handleBulkPublish() {
    if (selectedStops.size === 0) return;
    setBulkPublishing(true);
    let successCount = 0;
    let failCount = 0;
    for (const stopId of selectedStops) {
      const stop = stops.find((s) => s.id === stopId);
      if (stop && stop.status === "draft") {
        const result = await publishStop(stopId, stop.brand_id);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }
    setBulkPublishing(false);
    setSelectedStops(new Set());
    if (failCount === 0) {
      showSuccess(`${successCount} stop${successCount !== 1 ? "s" : ""} published`);
    } else {
      showError("Some stops failed", `${successCount} succeeded, ${failCount} failed`);
    }
    startTransition(() => router.refresh());
  }

  function handleDeleted() {
    setDeleteError(null);
    startTransition(() => router.refresh());
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <>
      {/* Filter bar */}
      {!hideInternalFilterBar && (
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-[var(--admin-border)]">
        <AdminSearchInput
          placeholder="Search by city or venue…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          onClear={() => {
            setSearch("");
            setPage(0);
          }}
          showClear
          className="flex-1 min-w-[180px] max-w-[280px]"
        />
        <AdminFilterTabs
          activeTab={statusFilter}
          onTabChange={(value) => {
            setStatusFilter(TAB_NUMERIC[value as keyof typeof TAB_NUMERIC] ?? "all");
            setPage(0);
          }}
          tabs={tabs}
          size="sm"
          showCounts
        />
        <span className="text-xs text-[var(--admin-text-muted)] ml-auto tabular-nums">
          {filtered.length} stop{filtered.length !== 1 ? "s" : ""}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <AdminIconButton
              variant="secondary"
              size="sm"
              label="Previous page"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              className="!rounded-lg border border-[var(--admin-border)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </AdminIconButton>
            <span className="text-xs text-[var(--admin-text-muted)] px-1 tabular-nums">
              {page + 1}/{totalPages}
            </span>
            <AdminIconButton
              variant="secondary"
              size="sm"
              label="Next page"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isLoading}
              className="!rounded-lg border border-[var(--admin-border)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </AdminIconButton>
          </div>
        )}
        <AdminButton
          variant="secondary"
          size="sm"
          onClick={() => setShowImport(true)}
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          }
        >
          Upload Schedule
        </AdminButton>
        <AdminButton
          variant="primary"
          size="sm"
          onClick={() => setShowAdd(true)}
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add Stop
        </AdminButton>
      </div>
      )}

      {/* Bulk actions bar */}
      {selectedStops.size > 0 && (
        <div className="mx-4 my-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-emerald-800 tabular-nums">
              {selectedStops.size} stop{selectedStops.size !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedStops(new Set())}
              className="text-xs text-stone-500 hover:text-stone-700"
            >
              Clear
            </button>
          </div>
          <AdminButton
            variant="primary"
            size="sm"
            onClick={handleBulkPublish}
            isLoading={bulkPublishing}
          >
            Publish Selected
          </AdminButton>
        </div>
      )}

      {/* Delete error */}
      {deleteError && (
        <div className="mx-4 my-3 rounded-lg border border-red-500/30 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {deleteError}{" "}
          <button onClick={() => setDeleteError(null)} className="underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--admin-bg-subtle)]/40 text-[var(--admin-text-muted)] text-xs uppercase tracking-wide">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedStops.size === paginatedStops.length && paginatedStops.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                aria-label="Select all"
              />
            </th>
            <th className="px-4 py-3 font-semibold">When</th>
            <th className="px-4 py-3 font-semibold">Where</th>
            <th className="px-4 py-3 font-semibold">Venue</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border)]">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3.5"><Skeleton variant="rect" className="h-4 w-4" /></td>
                <td className="px-4 py-3.5"><Skeleton variant="text" className="w-24 h-4" /></td>
                <td className="px-4 py-3.5"><Skeleton variant="text" className="w-32 h-4" /></td>
                <td className="px-4 py-3.5"><Skeleton variant="text" className="w-40 h-4" /></td>
                <td className="px-4 py-3.5"><Skeleton variant="rect" className="w-16 h-5 rounded-full" /></td>
                <td className="px-4 py-3.5"><Skeleton variant="rect" className="w-6 h-6" /></td>
              </tr>
            ))
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-14 text-center">
                <div className="flex flex-col items-center gap-3 text-[var(--admin-text-muted)]">
                  <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-700">
                      {search || statusFilter !== "all"
                        ? "No stops match your filters"
                        : "No stops yet"}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {search || statusFilter !== "all"
                        ? "Try a different search or clear the filters above."
                        : "Use the buttons above to upload a schedule or add your first stop."}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            paginatedStops.map((stop) => (
              <StopRow
                key={stop.id}
                stop={stop}
                onDeleted={handleDeleted}
                onDeleteError={setDeleteError}
                isSelected={selectedStops.has(stop.id)}
                onToggleSelect={(e) => {
                  e.stopPropagation();
                  toggleStopSelection(stop.id);
                }}
                onOpen={() => setOpenStopId(stop.id)}
              />
            ))
          )}
        </tbody>
      </table>

      {showImport && (
        <ScheduleImportModal
          brandId={stops[0]?.brand_id ?? ""}
          onClose={() => setShowImport(false)}
          onComplete={refresh}
        />
      )}

      <AddStopModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        brandId={stops[0]?.brand_id ?? ""}
        onSuccess={refresh}
      />

      {openStopId && (
        <StopDetailModal
          stopId={openStopId}
          onClose={() => setOpenStopId(null)}
        />
      )}
    </>
  );
}

function formatDate(iso: string): { date: string; weekday: string } {
  // Stop date is stored as YYYY-MM-DD; parse without TZ shift
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return { date: iso, weekday: "" };
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("en-US", { weekday: "short" });
  const month = dt.toLocaleDateString("en-US", { month: "short" });
  return { date: `${month} ${d}`, weekday };
}

function formatTime(t: string): string {
  // Stored as HH:MM (24h). Display as 10:00 AM.
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${mStr} ${period}`;
}

function StopRowBase({
  stop,
  onDeleted,
  onDeleteError,
  isSelected,
  onToggleSelect,
  onOpen,
}: {
  stop: Stop;
  onDeleted: () => void;
  onDeleteError: (msg: string) => void;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
}) {
  const { success: showSuccess, error: showError } = useToast();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const { date, weekday } = formatDate(stop.date);
  const time = formatTime(stop.time);

  async function handlePublish() {
    setPublishingId(stop.id);
    const result = await publishStop(stop.id, stop.brand_id);
    setPublishingId(null);
    if (result.success) {
      showSuccess("Stop published", "The stop is now visible on the storefront");
      onDeleted();
    } else {
      showError("Failed to publish", result.error ?? "Please try again");
    }
  }

  async function handleDelete() {
    setDeletingId(stop.id);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/delete_stop`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_stop_id: stop.id, p_brand_id: stop.brand_id }),
      }
    );
    const data = await res.json();
    setDeletingId(null);
    setConfirmDelete(null);
    setOpenMenu(null);
    if (data.success) {
      showSuccess("Stop deleted", "The stop has been removed");
      onDeleted();
    } else {
      onDeleteError(data.error ?? "Delete failed");
    }
  }

  return (
    <tr
      onClick={onOpen}
      className={`group cursor-pointer transition-colors ${isSelected ? "bg-emerald-50/60" : "hover:bg-[var(--admin-bg-subtle)]/60"}`}
    >
      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          onClick={onToggleSelect}
          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          aria-label={`Select stop in ${stop.city}`}
        />
      </td>

      <td className="px-4 py-3.5">
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-[var(--admin-text-primary)] tabular-nums">{date}</span>
          <span className="text-[11px] text-[var(--admin-text-muted)] tabular-nums">
            {weekday} {time && `· ${time}`}
          </span>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-[var(--admin-text-primary)]">{stop.city}</span>
          <span className="text-[11px] text-[var(--admin-text-muted)] tabular-nums">{stop.state}</span>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex flex-col leading-tight">
          <span className="text-[var(--admin-text-secondary)]">{stop.location}</span>
          {stop.address && (
            <span className="text-[11px] text-[var(--admin-text-muted)] truncate max-w-[260px]">
              {stop.address}
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-3.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            stop.status === "draft"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : stop.active
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-stone-100 text-stone-500 border border-stone-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              stop.status === "draft"
                ? "bg-amber-500"
                : stop.active
                  ? "bg-emerald-500"
                  : "bg-stone-400"
            }`}
          />
          {stop.status === "draft" ? "Draft" : stop.active ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="relative inline-flex items-center justify-end gap-1">
          <AdminIconButton
            variant="ghost"
            size="sm"
            label="More options"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenMenu(openMenu === stop.id ? null : stop.id);
            }}
            className="opacity-60 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </AdminIconButton>

          {openMenu === stop.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(null);
                  setConfirmDelete(null);
                }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-[var(--admin-border)] shadow-xl overflow-hidden">
                {stop.status === "draft" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublish();
                    }}
                    disabled={publishingId === stop.id}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                  >
                    {publishingId === stop.id ? "Publishing…" : "Publish"}
                  </button>
                )}
                <Link
                  href={`/admin/stops/new?duplicate=${stop.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center px-4 py-2.5 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] transition-colors"
                >
                  Duplicate
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(null);
                    setConfirmDelete(stop.id);
                  }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(null);
                  setOpenMenu(null);
                }}
              />
              <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-xl bg-white border border-[var(--admin-border)] shadow-xl p-4">
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">
                  Delete &quot;{stop.city}, {stop.state}&quot;?
                </p>
                <p className="mt-1.5 text-xs text-[var(--admin-text-muted)]">
                  This will remove the stop. If it has active orders, you must resolve those first.
                </p>
                <div className="mt-4 flex gap-2 justify-end">
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(null);
                      setOpenMenu(null);
                    }}
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={deletingId === stop.id}
                    isLoading={deletingId === stop.id}
                  >
                    {deletingId === stop.id ? "Deleting…" : "Delete"}
                  </AdminButton>
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
