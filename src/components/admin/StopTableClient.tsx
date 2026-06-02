"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishStop } from "@/actions/stops";
import { AdminSearchInput, AdminFilterTabs, AdminButton, AdminIconButton, useToast, Skeleton } from "@/components/admin/design-system";

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
  const { success: showSuccess, error: showError } = useToast();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set());
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const PAGE_SIZE = 50;

  // Simulate loading when filters change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [page, statusFilter, search]);

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

  const statusCounts = {
    all: stops.length,
    active: stops.filter(s => s.active && s.status !== "draft").length,
    inactive: stops.filter(s => !s.active && s.status !== "draft").length,
    draft: stops.filter(s => s.status === "draft").length,
  };

  const tabs = [
    { value: "all", label: "All", count: statusCounts.all },
    { value: "active", label: "Active", count: statusCounts.active },
    { value: "inactive", label: "Inactive", count: statusCounts.inactive },
    { value: "draft", label: "Draft", count: statusCounts.draft },
  ];

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedStops = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const draftStops = stops.filter(s => s.status === "draft" && s.active);

  // Bulk selection
  const toggleSelectAll = () => {
    if (selectedStops.size === paginatedStops.length) {
      setSelectedStops(new Set());
    } else {
      setSelectedStops(new Set(paginatedStops.map(s => s.id)));
    }
  };

  const toggleStopSelection = (stopId: string) => {
    setSelectedStops(prev => {
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
      const stop = stops.find(s => s.id === stopId);
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
      showSuccess(`${successCount} stop${successCount !== 1 ? 's' : ''} published`);
    } else {
      showError("Some stops failed", `${successCount} succeeded, ${failCount} failed`);
    }
    
    startTransition(() => router.refresh());
  }

  function handleDeleted() {
    setDeleteError(null);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      {/* Filter bar */}
      <div className="border-b border-[var(--admin-border)] px-5 py-3 flex gap-4 flex-wrap items-center">
        <AdminSearchInput
          placeholder="Search stops..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          onClear={() => { setSearch(""); setPage(0); }}
          showClear={true}
          className="flex-1 min-w-48 max-w-64"
        />
        <AdminFilterTabs
          activeTab={statusFilter}
          onTabChange={(value) => { setStatusFilter(value as typeof statusFilter); setPage(0); }}
          tabs={tabs}
          size="sm"
          showCounts={true}
        />
        <span className="text-xs text-[var(--admin-text-muted)] ml-auto">{filtered.length} stops</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <AdminIconButton
              variant="secondary"
              size="sm"
              label="Previous page"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              className="!rounded-lg border border-[var(--admin-border)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </AdminIconButton>
            <span className="text-xs text-[var(--admin-text-muted)] px-1">{page + 1}/{totalPages}</span>
            <AdminIconButton
              variant="secondary"
              size="sm"
              label="Next page"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isLoading}
              className="!rounded-lg border border-[var(--admin-border)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </AdminIconButton>
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedStops.size > 0 && (
        <div className="mx-5 my-3 flex items-center justify-between rounded-xl border border-[var(--admin-accent)] bg-[var(--admin-accent-light)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--admin-accent-text)]">
              {selectedStops.size} stop{selectedStops.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedStops(new Set())}
              className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
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
        <div className="mx-5 my-3 rounded-lg border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10 px-4 py-3 text-sm text-[var(--admin-danger)]">
          {deleteError}{" "}
          <button onClick={() => setDeleteError(null)} className="underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--admin-bg-subtle)] text-[var(--admin-text-muted)]">
          <tr>
            <th className="w-10 px-5 py-4">
              <input
                type="checkbox"
                checked={selectedStops.size === paginatedStops.length && paginatedStops.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-stone-300 text-[var(--admin-accent)] focus:ring-[var(--admin-accent)] cursor-pointer"
              />
            </th>
            <th className="px-5 py-4 font-semibold">City</th>
            <th className="px-5 py-4 font-semibold">Location</th>
            <th className="px-5 py-4 font-semibold">Date</th>
            <th className="px-5 py-4 font-semibold">Time</th>
            <th className="px-5 py-4 font-semibold">Brand</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border)]">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="hover:bg-[var(--admin-bg-subtle)] transition-colors">
                <td className="px-5 py-4"><Skeleton variant="rect" className="h-5 w-5" /></td>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-24 h-4" /></td>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-32 h-4" /></td>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-16 h-4" /></td>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-16 h-4" /></td>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-20 h-4" /></td>
                <td className="px-5 py-4"><Skeleton variant="rect" className="w-16 h-6 rounded-full" /></td>
                <td className="px-5 py-4"><Skeleton variant="rect" className="w-12 h-6" /></td>
              </tr>
            ))
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sm text-[var(--admin-text-muted)]">
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
                isSelected={selectedStops.has(stop.id)}
                onToggleSelect={() => toggleStopSelection(stop.id)}
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
  isSelected,
  onToggleSelect,
}: {
  stop: Stop;
  onDeleted: () => void;
  onDeleteError: (msg: string) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
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
      showSuccess("Stop published", "The stop is now visible on the storefront");
      startTransition(() => router.refresh());
    } else {
      showError("Failed to publish", result.error ?? "Please try again");
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
      showSuccess("Stop deleted", "The stop has been removed");
      onDeleted();
    } else {
      onDeleteError(data.error ?? "Delete failed");
    }
  }

  return (
    <tr className={`hover:bg-[var(--admin-bg-subtle)] transition-colors relative ${isSelected ? 'bg-[var(--admin-accent-light)]/30' : ''}`}>
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-stone-300 text-[var(--admin-accent)] focus:ring-[var(--admin-accent)] cursor-pointer"
        />
      </td>
      <td className="px-5 py-4">
        <Link
          href={`/admin/stops/${stop.id}`}
          className="font-medium text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] transition-colors"
        >
          {stop.city}, {stop.state}
        </Link>
      </td>

      <td className="px-5 py-4 text-[var(--admin-text-secondary)]">{stop.location}</td>

      <td className="px-5 py-4 font-mono text-[var(--admin-text-muted)] text-xs">{stop.date}</td>

      <td className="px-5 py-4 font-mono text-[var(--admin-text-muted)] text-xs">{stop.time}</td>

      <td className="px-5 py-4 text-[var(--admin-text-secondary)]">
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
              ? "bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)] border border-[var(--admin-accent)]"
              : "bg-[var(--admin-bg-subtle)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]"
          }`}
        >
          {stop.status === "draft" ? "Draft" : stop.active ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <div className="relative inline-flex items-center justify-end gap-2">
          <Link
            href={`/admin/stops/${stop.id}`}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors"
          >
            Edit
          </Link>
          <AdminIconButton
            variant="ghost"
            size="sm"
            label="More options"
            onClick={(e) => {
              e.preventDefault();
              setOpenMenu(openMenu === stop.id ? null : stop.id);
            }}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
            </svg>
          </AdminIconButton>

          {openMenu === stop.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => { setOpenMenu(null); setConfirmDelete(null); }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-[var(--admin-border)] shadow-xl overflow-hidden">
                {stop.status === "draft" && (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => handlePublish(stop.id)}
                    disabled={publishingId === stop.id}
                    className="!justify-start !text-[var(--admin-accent)] hover:!bg-[var(--admin-accent-light)]"
                  >
                    {publishingId === stop.id ? "Publishing..." : "Publish"}
                  </AdminButton>
                )}
                <a
                  href={`/admin/stops/new?duplicate=${stop.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] transition-colors"
                >
                  Duplicate
                </a>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => { setOpenMenu(null); setConfirmDelete(stop.id); }}
                  className="!justify-start !text-[var(--admin-danger)] hover:!bg-[var(--admin-danger)]/10"
                >
                  Delete
                </AdminButton>
              </div>
            </>
          )}

          {confirmDelete === stop.id && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
              />
              <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-xl bg-white border border-[var(--admin-border)] shadow-xl p-4">
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">
                  Delete &quot;{stop.city}, {stop.state}&quot;?
                </p>
                <p className="mt-1.5 text-xs text-[var(--admin-text-muted)]">
                  This will remove the stop. If it has active orders, you must resolve those first.
                </p>
                <div className="mt-4 flex gap-2">
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(stop.id)}
                    disabled={deletingId === stop.id}
                    isLoading={deletingId === stop.id}
                  >
                    {deletingId === stop.id ? "..." : "Delete"}
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