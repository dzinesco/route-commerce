"use client";

import { useMemo, useState } from "react";
import { type Stop, type StopView, getStopStatus } from "./types";
import StopsCalendar from "./StopsCalendar";
import StopsLocations from "./StopsLocations";
import StopsList from "./StopsList";

type Props = {
  stops: Stop[];
};

const TABS: { value: StopView; label: string; hint: string }[] = [
  { value: "calendar", label: "Calendar", hint: "Month at a glance" },
  { value: "locations", label: "Locations", hint: "Stops grouped by city" },
  { value: "list", label: "List", hint: "All stops in order" },
];

export default function StopsDashboardClient({ stops }: Props) {
  const [view, setView] = useState<StopView>("calendar");

  const stats = useMemo(() => {
    const total = stops.length;
    const active = stops.filter((s) => getStopStatus(s) === "active").length;
    const draft = stops.filter((s) => getStopStatus(s) === "draft").length;
    const cities = new Set(stops.map((s) => s.city.trim().toLowerCase())).size;
    const venues = new Set(
      stops.map((s) => `${s.city}|${s.state}|${s.location}`.toLowerCase())
    ).size;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);
    const upcoming = stops.filter((s) => {
      if (!s.date) return false;
      if (getStopStatus(s) === "inactive") return false;
      const d = new Date(s.date + "T00:00:00");
      return d >= today && d < in7;
    }).length;
    return { total, active, draft, cities, venues, upcoming };
  }, [stops]);

  return (
    <div className="space-y-6">
      {/* Top stats strip — almanac style */}
      <section
        aria-label="Stops overview"
        className="relative overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white p-5 shadow-sm"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 0.6 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--admin-text-muted)]">
              Harvest Dispatch · Almanac
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-medium tracking-tight text-[var(--admin-text-primary)]">
              {stats.total === 0
                ? "No stops scheduled"
                : `${stats.total} stop${stats.total === 1 ? "" : "s"} on the route`}
              <span className="ml-2 text-[var(--admin-accent)] italic font-light">
                {stats.cities} cit{stats.cities === 1 ? "y" : "ies"}
              </span>
            </h2>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
              {stats.active} active · {stats.draft} drafts · {stats.venues} distinct venues
            </p>
          </div>

          {/* Tab nav — binder-style with notched corners */}
          <div className="flex items-end gap-1">
            {TABS.map((t) => {
              const isActive = t.value === view;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setView(t.value)}
                  aria-pressed={isActive}
                  className={`
                    group relative -mb-px inline-flex flex-col items-start gap-0.5 rounded-t-xl border border-b-0 px-4 py-2.5 transition-all
                    ${isActive
                      ? "z-10 border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] shadow-[0_-4px_8px_-4px_rgba(60,56,37,0.08)]"
                      : "border-transparent bg-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-white/40"
                    }
                  `}
                >
                  <span className={`font-display text-base font-medium ${isActive ? "text-[var(--admin-accent-text)]" : ""}`}>
                    {t.label}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-80">
                    {t.hint}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-3 right-3 -bottom-px h-0.5 bg-[var(--admin-accent)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stat cells */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-[var(--admin-border-light)] pt-5 sm:grid-cols-4">
          <AlmanacStat
            numeral="I"
            label="Active"
            value={stats.active}
            accent
          />
          <AlmanacStat
            numeral="II"
            label="Upcoming 7d"
            value={stats.upcoming}
            accent={stats.upcoming > 0}
          />
          <AlmanacStat
            numeral="III"
            label="Cities"
            value={stats.cities}
          />
          <AlmanacStat
            numeral="IV"
            label="Venues"
            value={stats.venues}
          />
        </div>
      </section>

      {/* Active view */}
      <section>
        {view === "calendar" && <StopsCalendar stops={stops} />}
        {view === "locations" && <StopsLocations stops={stops} />}
        {view === "list" && <StopsList stops={stops} />}
      </section>
    </div>
  );
}

function AlmanacStat({
  numeral,
  label,
  value,
  accent,
}: {
  numeral: string;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-display text-base font-medium ${
          accent ? "bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)]" : "bg-[var(--admin-bg-subtle)] text-[var(--admin-text-muted)]"
        }`}
        aria-hidden
      >
        {numeral}
      </span>
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">
          {label}
        </p>
        <p
          className={`font-display text-2xl font-medium leading-none tabular-nums ${
            accent ? "text-[var(--admin-accent-text)]" : "text-[var(--admin-text-primary)]"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
