"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type LocationGroup,
  type Stop,
  formatTime12,
  getStopStatus,
} from "./types";

type Props = {
  stops: Stop[];
};

function groupStopsByLocation(stops: Stop[]): LocationGroup[] {
  const map = new Map<string, LocationGroup>();
  for (const s of stops) {
    const key = `${(s.city || "Unknown").trim().toUpperCase()}|${(s.state || "").trim().toUpperCase()}`;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        city: s.city || "Unknown",
        state: s.state || "",
        venueCount: 0,
        total: 0,
        active: 0,
        draft: 0,
        inactive: 0,
        upcoming: 0,
        nextDate: null,
        firstDate: null,
        lastDate: null,
        sampleVenue: s.location,
        stops: [],
      };
      map.set(key, group);
    }
    group.stops.push(s);
    group.total += 1;
    const status = getStopStatus(s);
    if (status === "active") group.active += 1;
    else if (status === "draft") group.draft += 1;
    else group.inactive += 1;

    if (s.date) {
      if (!group.firstDate || s.date < group.firstDate) group.firstDate = s.date;
      if (!group.lastDate || s.date > group.lastDate) group.lastDate = s.date;
    }
  }
  // post-process: count distinct venues, upcoming stops
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (const g of map.values()) {
    const venues = new Set(g.stops.map((s) => (s.location || "").trim().toLowerCase()).filter(Boolean));
    g.venueCount = Math.max(1, venues.size);
    g.upcoming = g.stops.filter((s) => s.date >= todayStr && getStopStatus(s) !== "inactive").length;
    const future = g.stops
      .filter((s) => s.date >= todayStr && getStopStatus(s) !== "inactive")
      .map((s) => s.date)
      .sort();
    g.nextDate = future[0] ?? null;
    g.stops.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }

  return Array.from(map.values()).sort((a, b) => {
    // active locations with upcoming stops first, sorted by next date; then by city
    if (a.nextDate && !b.nextDate) return -1;
    if (!a.nextDate && b.nextDate) return 1;
    if (a.nextDate && b.nextDate) return a.nextDate.localeCompare(b.nextDate);
    return a.city.localeCompare(b.city);
  });
}

function formatDateLabel(ymd: string | null): string {
  if (!ymd) return "—";
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRange(a: string | null, b: string | null): string {
  if (!a) return "—";
  if (!b || a === b) return formatDateLabel(a);
  return `${formatDateLabel(a)} → ${formatDateLabel(b)}`;
}

export default function StopsLocations({ stops }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const groups = useMemo(() => groupStopsByLocation(stops), [stops]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (q) {
        const hay = `${g.city} ${g.state} ${g.sampleVenue}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (showOnlyActive && g.active === 0) return false;
      return true;
    });
  }, [groups, query, showOnlyActive]);

  // Aggregated stats
  const stats = useMemo(() => {
    const totalLocations = groups.length;
    const totalStops = stops.length;
    const totalActive = groups.reduce((sum, g) => sum + g.active, 0);
    const totalUpcoming = groups.reduce((sum, g) => sum + g.upcoming, 0);
    const totalDrafts = groups.reduce((sum, g) => sum + g.draft, 0);
    const totalCities = new Set(groups.map((g) => g.city.toLowerCase())).size;
    const totalVenues = groups.reduce((sum, g) => sum + g.venueCount, 0);
    return { totalLocations, totalStops, totalActive, totalUpcoming, totalDrafts, totalCities, totalVenues };
  }, [groups, stops]);

  if (stops.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--admin-bg-subtle)]">
          <svg className="h-7 w-7 text-[var(--admin-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <h3 className="font-display text-2xl font-medium text-[var(--admin-text-primary)]">
          No locations yet
        </h3>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
          Create your first stop to see pickup locations here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats strip — almanac style */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { numeral: "I", label: "Locations", value: stats.totalLocations, hint: `${stats.totalVenues} venues` },
          { numeral: "II", label: "Cities", value: stats.totalCities, hint: "covered" },
          { numeral: "III", label: "Stops", value: stats.totalStops, hint: "all-time" },
          { numeral: "IV", label: "Active", value: stats.totalActive, hint: "live" },
          { numeral: "V", label: "Upcoming", value: stats.totalUpcoming, hint: "in queue" },
          { numeral: "VI", label: "Drafts", value: stats.totalDrafts, hint: "unpublished" },
        ].map((s) => (
          <div
            key={s.numeral}
            className="group relative overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[var(--admin-accent)]/30"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">
                  {s.numeral} · {s.label}
                </p>
                <p className="mt-2 font-display text-3xl font-medium leading-none text-[var(--admin-text-primary)] tabular-nums">
                  {s.value}
                </p>
                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--admin-text-muted)]">
                  {s.hint}
                </p>
              </div>
              <div
                aria-hidden
                className="h-8 w-8 -rotate-3 font-display text-2xl text-[var(--admin-accent)]/15 group-hover:text-[var(--admin-accent)]/30 transition-colors"
              >
                {s.numeral}
              </div>
            </div>
            <div className="mt-3 h-px w-full bg-gradient-to-r from-[var(--admin-accent)]/20 via-[var(--admin-accent)]/40 to-[var(--admin-accent)]/20" />
          </div>
        ))}
      </section>

      {/* Filter bar */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--admin-border)] bg-white px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, state, venue..."
            className="w-full rounded-lg border border-[var(--admin-border)] bg-white pl-9 pr-3 py-2 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/15"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={showOnlyActive}
            onClick={() => setShowOnlyActive((v) => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors ${showOnlyActive ? "bg-[var(--admin-accent)]" : "bg-stone-300"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${showOnlyActive ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-secondary)]">
            Active only
          </span>
        </label>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-muted)]">
          {filtered.length} of {groups.length} locations
        </span>
      </section>

      {/* Location grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-white p-10 text-center">
          <p className="font-display text-lg text-[var(--admin-text-primary)]">No locations match.</p>
          <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">Try a different search.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g, idx) => {
            const isOpen = expandedKey === g.key;
            return (
              <article
                key={g.key}
                className={`
                  group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all
                  ${isOpen ? "border-[var(--admin-accent)] shadow-md ring-1 ring-[var(--admin-accent)]/20" : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 hover:shadow-md"}
                `}
              >
                {/* Decorative route number */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-3 select-none font-display text-[80px] leading-none font-medium text-[var(--admin-accent)]/[0.06] group-hover:text-[var(--admin-accent)]/[0.1] transition-colors"
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedKey(isOpen ? null : g.key)}
                  className="block w-full text-left p-5"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Pin marker */}
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--admin-accent-light)] border border-[var(--admin-accent)]/30">
                          <svg className="h-3.5 w-3.5 text-[var(--admin-accent-text)]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-xl font-medium text-[var(--admin-text-primary)]">
                            {g.city}
                            {g.state && (
                              <span className="ml-1.5 font-mono text-xs font-normal text-[var(--admin-text-muted)]">
                                {g.state}
                              </span>
                            )}
                          </h3>
                          <p className="truncate text-xs text-[var(--admin-text-secondary)]">
                            {g.sampleVenue}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`mt-1 h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-full border transition-transform ${
                        isOpen ? "border-[var(--admin-accent)] bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)] rotate-45" : "border-[var(--admin-border)] bg-white text-[var(--admin-text-muted)]"
                      }`}
                      aria-hidden
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                  </div>

                  {/* Stat grid */}
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Stat label="Stops" value={g.total} />
                    <Stat label="Active" value={g.active} accent={g.active > 0} />
                    <Stat label="Upcoming" value={g.upcoming} accent={g.upcoming > 0} />
                  </div>

                  {/* Date range + drafts */}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--admin-border-light)] pt-3 font-mono text-[10px] uppercase tracking-wider">
                    <div className="text-[var(--admin-text-muted)]">
                      {g.firstDate ? (
                        <>
                          <span className="text-[var(--admin-text-secondary)]">{formatRange(g.firstDate, g.lastDate)}</span>
                          {" · "}
                          {g.venueCount > 1 ? `${g.venueCount} venues` : `${g.total} stop${g.total === 1 ? "" : "s"}`}
                        </>
                      ) : (
                        "No dates"
                      )}
                    </div>
                    {g.draft > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                        {g.draft} draft
                      </span>
                    )}
                  </div>

                  {/* Next up ribbon */}
                  {g.nextDate && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--admin-accent)]/20 bg-gradient-to-r from-[var(--admin-accent-light)] to-transparent px-3 py-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--admin-accent-text)]">
                        Next →
                      </span>
                      <span className="font-display text-sm font-medium text-[var(--admin-text-primary)]">
                        {formatDateLabel(g.nextDate)}
                      </span>
                    </div>
                  )}
                </button>

                {/* Expanded stop list */}
                {isOpen && (
                  <div className="border-t border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/40 px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">
                        All stops · {g.stops.length}
                      </h4>
                      <Link
                        href={`/admin/stops/new?city=${encodeURIComponent(g.city)}&state=${encodeURIComponent(g.state)}`}
                        className="font-mono text-[10px] uppercase tracking-wider text-[var(--admin-accent-text)] hover:underline"
                      >
                        + Add at this city
                      </Link>
                    </div>
                    <ul className="space-y-1">
                      {g.stops.map((s) => {
                        const status = getStopStatus(s);
                        const dot =
                          status === "active"
                            ? "bg-[var(--admin-accent-dot)]"
                            : status === "draft"
                            ? "bg-amber-500"
                            : "bg-stone-400";
                        return (
                          <li key={s.id}>
                            <Link
                              href={`/admin/stops/${s.id}`}
                              className="flex items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-2 transition-colors hover:border-[var(--admin-border)] hover:bg-[var(--admin-bg-subtle)]"
                            >
                              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                              <span className="font-mono text-[10px] tabular-nums text-[var(--admin-text-muted)] w-16">
                                {s.date ? new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                              </span>
                              <span className="font-mono text-[10px] tabular-nums text-[var(--admin-text-muted)] w-14">
                                {formatTime12(s.time)}
                              </span>
                              <span className="flex-1 truncate text-xs text-[var(--admin-text-primary)]">
                                {s.location}
                              </span>
                              <span
                                className={`font-mono text-[9px] uppercase tracking-wider ${
                                  status === "active" ? "text-[var(--admin-accent-text)]" : status === "draft" ? "text-amber-700" : "text-[var(--admin-text-muted)]"
                                }`}
                              >
                                {status}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        accent ? "border-[var(--admin-accent)]/30 bg-[var(--admin-accent-light)]" : "border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50"
      }`}
    >
      <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--admin-text-muted)]">{label}</p>
      <p
        className={`mt-0.5 font-display text-xl font-medium tabular-nums leading-none ${
          accent ? "text-[var(--admin-accent-text)]" : "text-[var(--admin-text-primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
