"use client";

import { useState, useMemo } from "react";
import StopTableClient from "@/components/admin/StopTableClient";
import StopsCalendarClient from "@/components/admin/StopsCalendarClient";
import { AdminSearchInput, AdminFilterTabs } from "@/components/admin/design-system";

export type StopStatusFilter = "all" | "active" | "inactive" | "draft";
export type StopsViewMode = "calendar" | "table";

export type StopForView = {
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
  zip?: string | null;
  cutoff_time?: string | null;
  brands: { name: string } | { name: string }[];
};

type Props = {
  stops: StopForView[];
};

export default function StopsViewClient({ stops }: Props) {
  const [view, setView] = useState<StopsViewMode>("calendar");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StopStatusFilter>("all");

  // Apply shared filter so both views agree on what's visible
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stops.filter((s) => {
      const matchesSearch =
        !q ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q);
      const isDraft = s.status === "draft";
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.active && !isDraft) ||
        (statusFilter === "inactive" && !s.active && !isDraft) ||
        (statusFilter === "draft" && isDraft);
      return matchesSearch && matchesStatus;
    });
  }, [stops, search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: stops.length,
      active: stops.filter((s) => s.active && s.status !== "draft").length,
      inactive: stops.filter((s) => !s.active && s.status !== "draft").length,
      draft: stops.filter((s) => s.status === "draft").length,
    }),
    [stops]
  );

  const tabs = [
    { value: "all", label: "All", count: counts.all },
    { value: "active", label: "Active", count: counts.active },
    { value: "inactive", label: "Inactive", count: counts.inactive },
    { value: "draft", label: "Draft", count: counts.draft },
  ];

  return (
    <>
      {/* Filter / search / view-toggle bar — shared across both views */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
        <AdminFilterTabs
          activeTab={statusFilter}
          onTabChange={(v) => setStatusFilter(v as StopStatusFilter)}
          tabs={tabs}
          size="sm"
          showCounts
        />
        <AdminSearchInput
          placeholder="Search city, state, or venue…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          showClear
          className="flex-1 min-w-48 max-w-72"
        />
        <span className="text-xs text-[var(--admin-text-muted)]">
          {filtered.length} {filtered.length === 1 ? "stop" : "stops"}
        </span>
        <div className="sm:ml-auto">
          <div className="ha-viewtoggle" role="tablist" aria-label="Stops view mode">
            <button
              type="button"
              role="tab"
              aria-selected={view === "calendar"}
              onClick={() => setView("calendar")}
              className={`ha-viewtoggle-btn ${view === "calendar" ? "ha-viewtoggle-btn--active" : ""}`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
              Calendar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "table"}
              onClick={() => setView("table")}
              className={`ha-viewtoggle-btn ${view === "table" ? "ha-viewtoggle-btn--active" : ""}`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
              Table
            </button>
          </div>
        </div>
      </div>

      {view === "calendar" ? (
        <StopsCalendarClient stops={filtered} />
      ) : (
        <StopTableClient stops={filtered} hideInternalFilterBar />
      )}
    </>
  );
}
