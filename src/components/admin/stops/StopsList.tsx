"use client";

import { useMemo } from "react";
import { type Stop, getStopStatus } from "./types";

type Props = {
  stops: Stop[];
};

// Minimal list view used inside the StopsDashboard tab nav.
// It is a calmer, read-only list; for bulk publish/edit use the
// dedicated /admin/stops page.
export default function StopsList({ stops }: Props) {
  const sorted = useMemo(() => {
    return [...stops].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [stops]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-white p-10 text-center">
        <p className="font-display text-lg text-[var(--admin-text-primary)]">No stops yet</p>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
          Switch to a different tab to add stops.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--admin-border-light)] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-sm">
      {sorted.map((s) => {
        const status = getStopStatus(s);
        const dot =
          status === "active"
            ? "bg-[var(--admin-accent-dot)]"
            : status === "draft"
            ? "bg-amber-500"
            : "bg-stone-400";
        const brand = Array.isArray(s.brands) ? s.brands[0]?.name : s.brands?.name;
        return (
          <li key={s.id} className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--admin-bg-subtle)]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-muted)] w-20">
              {s.date ? new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-[var(--admin-text-muted)] w-14">
              {s.time ? s.time.slice(0, 5) : "—"}
            </span>
            <span className="flex-1 min-w-0">
              <span className="truncate font-display text-sm font-medium text-[var(--admin-text-primary)]">
                {s.city}, {s.state}
              </span>
              <span className="ml-2 truncate text-xs text-[var(--admin-text-secondary)]">{s.location}</span>
            </span>
            {brand && (
              <span className="hidden md:inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-muted)]">
                {brand}
              </span>
            )}
            <span
              className={`font-mono text-[9px] uppercase tracking-wider ${
                status === "active" ? "text-[var(--admin-accent-text)]" : status === "draft" ? "text-amber-700" : "text-[var(--admin-text-muted)]"
              }`}
            >
              {status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
