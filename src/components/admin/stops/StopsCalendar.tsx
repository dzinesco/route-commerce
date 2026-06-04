"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type Stop,
  type StopStatus,
  formatMonthYear,
  formatTime12,
  getStopDate,
  getStopStatus,
  isSameDay,
} from "./types";

type Props = {
  stops: Stop[];
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_STYLES: Record<StopStatus, { bg: string; text: string; dot: string; border: string }> = {
  active: {
    bg: "bg-[var(--admin-accent-light)]",
    text: "text-[var(--admin-accent-text)]",
    dot: "bg-[var(--admin-accent-dot)]",
    border: "border-[var(--admin-accent)]/40",
  },
  draft: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    dot: "bg-amber-500",
    border: "border-amber-300",
  },
  inactive: {
    bg: "bg-stone-100",
    text: "text-stone-500",
    dot: "bg-stone-400",
    border: "border-stone-300",
  },
};

function buildMonthGrid(viewYear: number, viewMonth: number) {
  // Sunday-first 6-row grid
  const first = new Date(viewYear, viewMonth, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  // Leading days from previous month
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth, -i);
    cells.push({ date: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  }
  // Trailing days to fill 6 rows = 42 cells
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }
  return cells;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StopsCalendar({ stops }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(ymd(today));

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);

  const stopsByDate = useMemo(() => {
    const map = new Map<string, Stop[]>();
    for (const s of stops) {
      const d = getStopDate(s);
      if (!d) continue;
      const k = ymd(d);
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    // sort each bucket by time
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }
    return map;
  }, [stops]);

  const visibleStopsByDate = useMemo(() => {
    const map = new Map<string, Stop[]>();
    for (const [k, arr] of stopsByDate.entries()) {
      map.set(
        k,
        arr.filter((s) => getStopStatus(s) !== "inactive" || arr.length <= 6)
      );
    }
    return map;
  }, [stopsByDate]);

  const monthStopsCount = useMemo(() => {
    let count = 0;
    for (const cell of cells) {
      if (!cell.inMonth) continue;
      count += stopsByDate.get(ymd(cell.date))?.length ?? 0;
    }
    return count;
  }, [cells, stopsByDate]);

  const upcomingWeek = useMemo(() => {
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    let count = 0;
    for (const s of stops) {
      const d = getStopDate(s);
      if (!d) continue;
      if (d >= today && d < end && getStopStatus(s) !== "inactive") count++;
    }
    return count;
  }, [stops, today]);

  const goPrev = () => {
    setView((v) => {
      const m = v.month - 1;
      if (m < 0) return { year: v.year - 1, month: 11 };
      return { ...v, month: m };
    });
    setSelectedDate(null);
  };
  const goNext = () => {
    setView((v) => {
      const m = v.month + 1;
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { ...v, month: m };
    });
    setSelectedDate(null);
  };
  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDate(ymd(today));
  };

  const monthLabel = formatMonthYear(new Date(view.year, view.month, 1));
  const isCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();

  const selectedDayStops = selectedDate ? stopsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Calendar card */}
      <section
        className="relative overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-sm"
        aria-label="Stops calendar"
      >
        {/* Decorative paper texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(34,197,94,0.04) 0%, transparent 40%), radial-gradient(circle at 80% 90%, rgba(217,119,6,0.04) 0%, transparent 40%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 0.5 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* Header */}
        <header className="relative flex items-center justify-between border-b border-[var(--admin-border)] px-6 py-5">
          <div className="flex items-baseline gap-4">
            <h2 className="font-display text-3xl font-medium text-[var(--admin-text-primary)] tracking-tight">
              {monthLabel.split(" ")[0]}
              <span className="text-[var(--admin-accent)] italic font-light">
                {" "}
                {monthLabel.split(" ")[1]}
              </span>
            </h2>
            <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--admin-text-muted)]">
              {monthStopsCount} stop{monthStopsCount === 1 ? "" : "s"} scheduled
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={goPrev}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] hover:text-[var(--admin-text-primary)] transition-colors"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={goToday}
              disabled={isCurrentMonth}
              className="h-8 px-3 inline-flex items-center justify-center rounded-lg border border-[var(--admin-border)] bg-white font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] hover:text-[var(--admin-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Today
            </button>
            <button
              onClick={goNext}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] hover:text-[var(--admin-text-primary)] transition-colors"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </header>

        {/* Weekday header */}
        <div className="relative grid grid-cols-7 border-b border-[var(--admin-border)]">
          {WEEKDAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`px-2 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] ${
                i === 0 || i === 6 ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-muted)]"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="relative grid grid-cols-7 grid-rows-6">
          {cells.map((cell, idx) => {
            const k = ymd(cell.date);
            const dayStops = stopsByDate.get(k) ?? [];
            const visibleStops = visibleStopsByDate.get(k) ?? [];
            const isToday = isSameDay(cell.date, today);
            const isSelected = k === selectedDate;
            const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
            const overflow = dayStops.length - visibleStops.length;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(k)}
                className={`
                  group relative flex min-h-[110px] flex-col items-stretch gap-1.5 border-b border-r border-[var(--admin-border-light)] p-2 text-left transition-colors
                  ${!cell.inMonth ? "bg-[var(--admin-bg-subtle)]/40" : "bg-white"}
                  ${isWeekend && cell.inMonth ? "bg-[var(--admin-bg-subtle)]/30" : ""}
                  ${isSelected ? "!bg-[var(--admin-accent-light)] ring-2 ring-inset ring-[var(--admin-accent)]" : "hover:bg-[var(--admin-accent-light)]/40"}
                `}
              >
                {/* Date number row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`
                      inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold
                      ${isToday
                        ? "bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-sm"
                        : !cell.inMonth
                        ? "text-[var(--admin-text-muted)]/50"
                        : isSelected
                        ? "text-[var(--admin-accent-text)]"
                        : "text-[var(--admin-text-primary)]"
                      }
                    `}
                  >
                    {cell.date.getDate()}
                  </span>
                  {dayStops.length > 0 && cell.inMonth && (
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--admin-text-muted)]">
                      {dayStops.length}
                    </span>
                  )}
                </div>

                {/* Stop chips */}
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {visibleStops.slice(0, 3).map((s) => {
                    const status = getStopStatus(s);
                    const st = STATUS_STYLES[status];
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-1 rounded ${st.bg} ${st.border} border px-1.5 py-0.5 text-[10px] font-medium leading-tight ${st.text}`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} aria-hidden />
                        <span className="truncate">
                          {s.time && (
                            <span className="font-mono opacity-70 mr-0.5">{formatTime12(s.time).replace(" ", "").toLowerCase()}</span>
                          )}
                          {s.city}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="px-1.5 text-[10px] font-mono font-semibold text-[var(--admin-accent-text)]">
                      +{overflow} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <footer className="relative flex flex-wrap items-center gap-4 border-t border-[var(--admin-border)] px-6 py-3">
          {(["active", "draft", "inactive"] as StopStatus[]).map((s) => {
            const st = STATUS_STYLES[s];
            return (
              <div key={s} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-muted)]">
                <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden />
                <span>{s}</span>
              </div>
            );
          })}
          <div className="ml-auto flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-muted)]">
            <span>
              <span className="font-display text-base font-semibold text-[var(--admin-accent)]">
                {upcomingWeek}
              </span>{" "}
              upcoming in 7d
            </span>
          </div>
        </footer>
      </section>

      {/* Day detail panel */}
      <aside className="rounded-2xl border border-[var(--admin-border)] bg-white shadow-sm">
        <div className="border-b border-[var(--admin-border)] px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-2xl font-medium text-[var(--admin-text-primary)]">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
                : "Pick a day"}
            </h3>
          </div>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">
            {selectedDate
              ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Select a date on the calendar"}
          </p>
        </div>

        <div className="max-h-[640px] overflow-y-auto px-2 py-2">
          {!selectedDate ? (
            <div className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-[var(--admin-text-muted)]">
              No day selected
            </div>
          ) : selectedDayStops.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-bg-subtle)]">
                <svg className="h-5 w-5 text-[var(--admin-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <p className="font-display text-lg text-[var(--admin-text-primary)]">No stops</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-muted)]">
                Free day on the route
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {selectedDayStops.map((s) => {
                const status = getStopStatus(s);
                const st = STATUS_STYLES[status];
                return (
                  <li key={s.id}>
                    <Link
                      href={`/admin/stops/${s.id}`}
                      className="group block rounded-xl border border-transparent px-3 py-3 transition-all hover:border-[var(--admin-border)] hover:bg-[var(--admin-bg-subtle)]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${st.bg} ${st.border} border`}
                        >
                          <span className="font-mono text-[10px] font-bold text-[var(--admin-text-primary)]">
                            {formatTime12(s.time).split(" ")[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate font-display text-base font-medium text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors">
                              {s.city}, {s.state}
                            </p>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--admin-text-muted)]">
                              {formatTime12(s.time).split(" ")[1]}
                            </span>
                          </div>
                          <p className="truncate text-xs text-[var(--admin-text-secondary)]">{s.location}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full ${st.bg} ${st.text} px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${st.border} border`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden />
                              {status}
                            </span>
                            {Array.isArray(s.brands) ? s.brands[0]?.name : s.brands?.name ? (
                              <span className="truncate font-mono text-[9px] uppercase tracking-wider text-[var(--admin-text-muted)]">
                                {Array.isArray(s.brands) ? s.brands[0]?.name : s.brands?.name}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
