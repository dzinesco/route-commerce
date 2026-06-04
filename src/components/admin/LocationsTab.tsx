"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteLocation } from "@/actions/locations";
import AddLocationModal from "@/components/admin/AddLocationModal";
import EditLocationModal, { type LocationForEdit } from "@/components/admin/EditLocationModal";
import {
  AdminSearchInput,
  AdminFilterTabs,
  AdminButton,
  AdminIconButton,
  useToast,
  Skeleton,
} from "@/components/admin/design-system";

export type AdminLocation = {
  id: string;
  brand_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  slug: string | null;
  stop_count: number;
};

type Props = {
  locations: AdminLocation[];
  brandId: string;
};

type StatusFilter = "all" | "active" | "inactive";

export default function LocationsTab({ locations, brandId }: Props) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LocationForEdit | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(t);
  }, [page, statusFilter, search]);

  const counts = useMemo(
    () => ({
      all: locations.length,
      active: locations.filter((l) => l.active).length,
      inactive: locations.filter((l) => !l.active).length,
    }),
    [locations]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((l) => {
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.address ?? "").toLowerCase().includes(q) ||
        (l.city ?? "").toLowerCase().includes(q) ||
        (l.contact_name ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && l.active) ||
        (statusFilter === "inactive" && !l.active);
      return matchesSearch && matchesStatus;
    });
  }, [locations, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const tabs = [
    { value: "all", label: "All", count: counts.all },
    { value: "active", label: "Active", count: counts.active },
    { value: "inactive", label: "Inactive", count: counts.inactive },
  ];

  function handleAdded() {
    setShowAdd(false);
    showSuccess("Venue created");
    startTransition(() => router.refresh());
  }

  function handleEdited() {
    setEditing(null);
    showSuccess("Venue updated");
    startTransition(() => router.refresh());
  }

  async function handleDelete(loc: AdminLocation) {
    if (!confirm(`Delete venue "${loc.name}"? This cannot be undone.`)) return;
    setPendingDeleteId(loc.id);
    setDeleteError(null);
    const res = await deleteLocation(loc.id, brandId);
    setPendingDeleteId(null);
    if (res.success) {
      showSuccess("Venue deleted");
      startTransition(() => router.refresh());
    } else {
      setDeleteError(res.error ?? "Delete failed");
      showError("Delete failed", res.error ?? "Unknown error");
    }
  }

  return (
    <>
      {/* Filter bar */}
      <div className="border-b border-[var(--admin-border)] px-5 py-3 flex gap-4 flex-wrap items-center">
        <AdminSearchInput
          placeholder="Search venues by name, city, or contact…"
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
          className="flex-1 min-w-48 max-w-72"
        />
        <AdminFilterTabs
          activeTab={statusFilter}
          onTabChange={(value) => {
            setStatusFilter(value as StatusFilter);
            setPage(0);
          }}
          tabs={tabs}
          size="sm"
          showCounts
        />
        <span className="text-xs text-[var(--admin-text-muted)] ml-auto">
          {filtered.length} venue{filtered.length !== 1 ? "s" : ""}
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
            <span className="text-xs text-[var(--admin-text-muted)] px-1">
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
          variant="primary"
          size="sm"
          onClick={() => setShowAdd(true)}
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add Venue
        </AdminButton>
      </div>

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
            <th className="px-5 py-4 font-semibold">Venue</th>
            <th className="px-5 py-4 font-semibold">Address</th>
            <th className="px-5 py-4 font-semibold">Contact</th>
            <th className="px-5 py-4 font-semibold text-center">Stops</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border)]">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-32 h-4" /></td>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-48 h-4" /></td>
                <td className="px-5 py-4"><Skeleton variant="text" className="w-32 h-4" /></td>
                <td className="px-5 py-4 text-center"><Skeleton variant="rect" className="w-8 h-5 mx-auto rounded-full" /></td>
                <td className="px-5 py-4"><Skeleton variant="rect" className="w-16 h-6 rounded-full" /></td>
                <td className="px-5 py-4"><Skeleton variant="rect" className="w-12 h-6" /></td>
              </tr>
            ))
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-[var(--admin-text-muted)]">
                  <svg className="h-10 w-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm">
                    {search || statusFilter !== "all"
                      ? "No venues match your filters."
                      : "No venues yet. Add your first venue to get started."}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            paginated.map((loc) => (
              <tr key={loc.id} className="hover:bg-[var(--admin-bg-subtle)] transition-colors">
                <td className="px-5 py-4">
                  <div className="font-semibold text-[var(--admin-text-primary)]">{loc.name}</div>
                  {(loc.city || loc.state) && (
                    <div className="text-xs text-[var(--admin-text-muted)]">
                      {[loc.city, loc.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  {loc.address ? (
                    <div>
                      <div className="text-[var(--admin-text-secondary)]">{loc.address}</div>
                      {loc.zip && (
                        <div className="text-xs text-[var(--admin-text-muted)]">{loc.zip}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--admin-text-muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {loc.contact_name || loc.phone || loc.contact_email ? (
                    <div className="space-y-0.5">
                      {loc.contact_name && (
                        <div className="text-[var(--admin-text-secondary)]">{loc.contact_name}</div>
                      )}
                      {loc.phone && (
                        <div className="text-xs text-[var(--admin-text-muted)]">{loc.phone}</div>
                      )}
                      {loc.contact_email && (
                        <div className="text-xs text-[var(--admin-text-muted)] truncate max-w-[200px]">
                          {loc.contact_email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--admin-text-muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  {loc.stop_count > 0 ? (
                    <span
                      className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "#047857",
                      }}
                    >
                      {loc.stop_count}
                    </span>
                  ) : (
                    <span className="text-[var(--admin-text-muted)] text-xs">0</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {loc.active ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(16, 185, 129, 0.12)", color: "#047857" }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#10b981" }} />
                      Active
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(120, 113, 108, 0.12)", color: "#57534e" }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#a8a29e" }} />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditing(loc as LocationForEdit)}
                      className="rounded-lg p-1.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors"
                      title="Edit venue"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(loc)}
                      disabled={pendingDeleteId === loc.id}
                      className="rounded-lg p-1.5 text-[var(--admin-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete venue"
                    >
                      {pendingDeleteId === loc.id ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showAdd && (
        <AddLocationModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          brandId={brandId}
          onSuccess={handleAdded}
        />
      )}

      {editing && (
        <EditLocationModal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          location={editing}
          brandId={brandId}
          onSuccess={handleEdited}
        />
      )}
    </>
  );
}
