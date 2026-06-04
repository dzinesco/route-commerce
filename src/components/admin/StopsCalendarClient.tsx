"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishStop } from "@/actions/stops";
import { useToast } from "@/components/admin/design-system";
import type { StopForView } from "./StopsViewClient";

type Props = {
  stops: StopForView[];
};

/* ================================================================== */
/*  Date helpers — work with YYYY-MM-DD strings to avoid TZ drift      */
/* ================================================================== */

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date | null {
  // Treat YYYY-MM-DD as a local date (no UTC shift)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function todayYmd(): string {
  return ymd(new Date());
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES_ITALIC = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(month: Date): Date[] {
  // Start at the Sunday on or before the 1st of the month
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDayOfWeek = first.getDay(); // 0 = Sun
  const start = new Date(first);
  start.setDate(1 - startDayOfWeek);

  // 6 weeks = 42 cells
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function statusOf(stop: StopForView): "active" | "draft" | "inactive" {
  if (stop.status === "draft") return "draft";
  if (stop.active) return "active";
  return "inactive";
}

function statusLabel(s: "active" | "draft" | "inactive"): string {
  return s === "draft" ? "Draft" : s === "active" ? "Active" : "Inactive";
}

function brandName(s: StopForView): string {
  return Array.isArray(s.brands) ? s.brands[0]?.name ?? "—" : s.brands?.name ?? "—";
}

function formatTime12(t: string | null | undefined): string {
  if (!t) return "—";
  // t is "HH:MM" or "HH:MM:SS"
  const [hStr = "0", mStr = "00"] = t.split(":");
  const h = Number(hStr);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

function formatTimeCompact(t: string | null | undefined): string {
  if (!t) return "—";
  const [hStr = "0", mStr = "00"] = t.split(":");
  const h = Number(hStr);
  const ampm = h >= 12 ? "p" : "a";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr}${ampm}`;
}

function formatDateLong(d: Date): string {
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  return `${weekday}, ${month} ${d.getDate()}`;
}

function formatDateLongSpelled(d: Date): string {
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  return `${weekday}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

const MAX_EVENTS_PER_CELL = 3;

export default function StopsCalendarClient({ stops }: Props) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [, startTransition] = useTransition();
  const [viewMonth, setViewMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<{
    stopId: string;
    cellRect: DOMRect;
  } | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Bucket stops by YYYY-MM-DD
  const stopsByDate = useMemo(() => {
    const map = new Map<string, StopForView[]>();
    for (const s of stops) {
      if (!s.date) continue;
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    // Sort each day by time
    for (const list of map.values()) {
      list.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }
    return map;
  }, [stops]);

  const todayStr = useMemo(() => todayYmd(), []);

  const monthCells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  // Earliest/latest stop dates — used to enable/disable nav
  const dateRange = useMemo(() => {
    if (stops.length === 0) return null;
    const dates = stops.map((s) => s.date).filter(Boolean).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [stops]);

  const isFirstMonth = useMemo(() => {
    if (!dateRange?.min) return false;
    const minDate = parseYmd(dateRange.min);
    if (!minDate) return false;
    return viewMonth.getFullYear() === minDate.getFullYear() && viewMonth.getMonth() === minDate.getMonth();
  }, [dateRange, viewMonth]);

  const isLastMonth = useMemo(() => {
    if (!dateRange?.max) return false;
    const maxDate = parseYmd(dateRange.max);
    if (!maxDate) return false;
    return viewMonth.getFullYear() === maxDate.getFullYear() && viewMonth.getMonth() === maxDate.getMonth();
  }, [dateRange, viewMonth]);

  function goPrevMonth() {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  }
  function goNextMonth() {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  }
  function goToday() {
    const today = new Date();
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayYmd());
  }

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!activePopover) return;
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-event-popover]") || target.closest("[data-event-chip]")) return;
      setActivePopover(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActivePopover(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [activePopover]);

  // Close drawer on Escape
  useEffect(() => {
    if (!selectedDate) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDate(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedDate]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (selectedDate) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [selectedDate]);

  const openStop = useCallback((stop: StopForView, anchorRect: DOMRect) => {
    setActivePopover({ stopId: stop.id, cellRect: anchorRect });
  }, []);

  const handlePublish = useCallback(
    async (stop: StopForView) => {
      setActivePopover(null);
      setPublishingId(stop.id);
      const result = await publishStop(stop.id, stop.brand_id);
      setPublishingId(null);
      if (result.success) {
        showSuccess("Stop published", `${stop.city}, ${stop.state} is now visible to customers`);
        startTransition(() => router.refresh());
      } else {
        showError("Failed to publish", result.error ?? "Please try again");
      }
    },
    [router, showSuccess, showError]
  );

  const activeStop = useMemo(
    () => (activePopover ? stops.find((s) => s.id === activePopover.stopId) ?? null : null),
    [activePopover, stops]
  );

  const selectedDayStops = useMemo(() => {
    if (!selectedDate) return [];
    return stopsByDate.get(selectedDate) ?? [];
  }, [selectedDate, stopsByDate]);

  const selectedDayDate = useMemo(() => (selectedDate ? parseYmd(selectedDate) : null), [selectedDate]);

  // Compute popover position with viewport edge detection
  const popoverStyle = useMemo<React.CSSProperties | null>(() => {
    if (!activePopover) return null;
    const POPOVER_W = 288; // 18rem
    const MARGIN = 8;
    const rect = activePopover.cellRect;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    // Default: place below the chip, left-aligned
    let left = rect.left + rect.width / 2 - POPOVER_W / 2;
    const top = rect.bottom + MARGIN;
    if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8;
    if (left < 8) left = 8;
    return { left, top };
  }, [activePopover]);

  const popoverArrowStyle = useMemo<React.CSSProperties | null>(() => {
    if (!activePopover || !popoverStyle) return null;
    const rect = activePopover.cellRect;
    const arrowLeft = rect.left + rect.width / 2 - (popoverStyle.left as number) - 5;
    return { left: Math.max(8, Math.min(arrowLeft, 270)) };
  }, [activePopover, popoverStyle]);

  // === Render ===
  return (
    <>
      <div className="ha-calendar">
        {/* Header */}
        <div className="ha-calendar-header">
          <div className="ha-calendar-title-block">
            <span className="ha-calendar-eyebrow">
              Tour Almanac · {stops.length} {stops.length === 1 ? "stop" : "stops"} on file
            </span>
            <h2 className="ha-calendar-title">
              <span className="ha-calendar-title-italic">{MONTH_NAMES_ITALIC[viewMonth.getMonth()]}</span>
              <span className="ha-calendar-title-year">{viewMonth.getFullYear()}</span>
            </h2>
          </div>
          <div className="ha-calendar-nav">
            <button
              type="button"
              className="ha-calendar-nav-btn"
              onClick={goPrevMonth}
              disabled={isFirstMonth}
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button type="button" className="ha-calendar-today" onClick={goToday}>
              <span className="ha-calendar-today-dot" style={{ background: "currentColor" }} />
              Today
            </button>
            <button
              type="button"
              className="ha-calendar-nav-btn"
              onClick={goNextMonth}
              disabled={isLastMonth}
              aria-label="Next month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* DOW header */}
        <div className="ha-calendar-dow" role="row">
          {DOW_LABELS.map((label) => (
            <div key={label} className="ha-calendar-dow-cell" role="columnheader">
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="ha-calendar-grid" role="grid">
          {monthCells.map((d) => {
            const key = ymd(d);
            const dayStops = stopsByDate.get(key) ?? [];
            const isOut = d.getMonth() !== viewMonth.getMonth();
            const isToday = key === todayStr;
            const hasStops = dayStops.length > 0;
            const dow = d.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isSelected = selectedDate === key;

            return (
              <div
                key={key}
                role="gridcell"
                tabIndex={hasStops ? 0 : -1}
                onClick={() => hasStops && setSelectedDate(key)}
                onKeyDown={(e) => {
                  if (hasStops && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setSelectedDate(key);
                  }
                }}
                className={[
                  "ha-calendar-cell",
                  isOut ? "ha-calendar-cell--out" : "",
                  isWeekend ? "ha-calendar-cell--weekend" : "",
                  hasStops ? "ha-calendar-cell--has-stops" : "",
                  isToday ? "ha-calendar-cell--today" : "",
                  isSelected ? "ha-calendar-cell--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={hasStops ? `${formatDateLong(d)} — ${dayStops.length} stop${dayStops.length !== 1 ? "s" : ""}` : formatDateLong(d)}
              >
                <div className="ha-calendar-daynum">
                  <span>{d.getDate()}</span>
                  {isToday && <span className="ha-calendar-today-dot" />}
                </div>
                <div className="ha-calendar-events">
                  {dayStops.slice(0, MAX_EVENTS_PER_CELL).map((stop) => (
                    <EventChip
                      key={stop.id}
                      stop={stop}
                      isPublishing={publishingId === stop.id}
                      onOpen={(rect) => openStop(stop, rect)}
                      isActive={activePopover?.stopId === stop.id}
                    />
                  ))}
                  {dayStops.length > MAX_EVENTS_PER_CELL && (
                    <button
                      type="button"
                      className="ha-calendar-event-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(key);
                      }}
                    >
                      +{dayStops.length - MAX_EVENTS_PER_CELL} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="ha-calendar-legend">
          <span className="ha-calendar-legend-item">
            <span className="ha-calendar-legend-swatch" style={{ background: "var(--admin-accent)" }} />
            Active
          </span>
          <span className="ha-calendar-legend-item">
            <span className="ha-calendar-legend-swatch" style={{ background: "#f59e0b" }} />
            Draft
          </span>
          <span className="ha-calendar-legend-item">
            <span className="ha-calendar-legend-swatch" style={{ background: "var(--admin-text-muted)" }} />
            Inactive
          </span>
          <span style={{ marginLeft: "auto" }} className="hidden sm:inline">
            Tip — click any day with stops to see the full route · click an event for details
          </span>
        </div>
      </div>

      {/* Event popover */}
      {activeStop && activePopover && popoverStyle && (
        <EventPopover
          stop={activeStop}
          isPublishing={publishingId === activeStop.id}
          onPublish={() => handlePublish(activeStop)}
          onOpenRoute={() => {
            setActivePopover(null);
            setSelectedDate(activeStop.date);
          }}
          style={popoverStyle}
          arrowStyle={popoverArrowStyle}
        />
      )}

      {/* Day-route drawer */}
      {selectedDate && selectedDayDate && (
        <DayRouteDrawer
          date={selectedDayDate}
          dateStr={selectedDate}
          stops={selectedDayStops}
          onClose={() => setSelectedDate(null)}
          onPublish={handlePublish}
        />
      )}
    </>
  );
}

/* ================================================================== */
/*  EventChip — single stop on a day cell                             */
/* ================================================================== */

function EventChip({
  stop,
  onOpen,
  isActive,
  isPublishing,
}: {
  stop: StopForView;
  onOpen: (rect: DOMRect) => void;
  isActive: boolean;
  isPublishing: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const status = statusOf(stop);
  return (
    <button
      ref={ref}
      type="button"
      data-event-chip
      onClick={(e) => {
        e.stopPropagation();
        if (!isPublishing && ref.current) onOpen(ref.current.getBoundingClientRect());
      }}
      className={`ha-calendar-event ha-calendar-event--${status} ${isActive ? "!bg-[var(--admin-accent)]/20" : ""}`}
      title={`${stop.city}, ${stop.state} — ${stop.location}`}
    >
      <span className="ha-calendar-event-time">{formatTimeCompact(stop.time)}</span>
      <span className="ha-calendar-event-text">{stop.city}, {stop.state}</span>
    </button>
  );
}

/* ================================================================== */
/*  EventPopover — floating detail card                               */
/* ================================================================== */

function EventPopover({
  stop,
  isPublishing,
  onPublish,
  onOpenRoute,
  style,
  arrowStyle,
}: {
  stop: StopForView;
  isPublishing: boolean;
  onPublish: () => void;
  onOpenRoute: () => void;
  style: React.CSSProperties;
  arrowStyle: React.CSSProperties | null;
}) {
  const status = statusOf(stop);
  return (
    <div
      data-event-popover
      className="ha-event-popover"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {arrowStyle && <div className="ha-event-popover-arrow" style={{ ...arrowStyle, top: -5 }} />}
      <div className="ha-event-popover-eyebrow">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            background:
              status === "active" ? "var(--admin-accent)" : status === "draft" ? "#f59e0b" : "var(--admin-text-muted)",
          }}
        />
        {statusLabel(status)} · {brandName(stop)}
      </div>
      <h3 className="ha-event-popover-title">
        {stop.city}, {stop.state}
      </h3>
      <p className="ha-event-popover-location">{stop.location}</p>

      <div className="ha-event-popover-grid">
        <div className="ha-event-popover-field">
          <span className="ha-event-popover-field-label">Pickup</span>
          <span className="ha-event-popover-field-value">{formatTime12(stop.time)}</span>
        </div>
        <div className="ha-event-popover-field">
          <span className="ha-event-popover-field-label">Cutoff</span>
          <span className="ha-event-popover-field-value">{stop.cutoff_time ? formatTime12(stop.cutoff_time) : "—"}</span>
        </div>
        {stop.address && (
          <div className="ha-event-popover-field" style={{ gridColumn: "1 / -1" }}>
            <span className="ha-event-popover-field-label">Address</span>
            <span className="ha-event-popover-field-value" style={{ fontFamily: "var(--font-geist), sans-serif", fontSize: "0.75rem" }}>
              {stop.address}{stop.zip ? `, ${stop.zip}` : ""}
            </span>
          </div>
        )}
      </div>

      <div className="ha-event-popover-actions">
        {status === "draft" && (
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="ha-event-popover-btn ha-event-popover-btn--primary"
          >
            {isPublishing ? "Publishing…" : "Publish"}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenRoute}
          className="ha-event-popover-btn"
        >
          View route
        </button>
        <Link
          href={`/admin/stops/${stop.id}`}
          className="ha-event-popover-btn ha-event-popover-btn--primary"
        >
          Edit
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  DayRouteDrawer — full day's route on the side                     */
/* ================================================================== */

function DayRouteDrawer({
  date,
  dateStr,
  stops,
  onClose,
  onPublish,
}: {
  date: Date;
  dateStr: string;
  stops: StopForView[];
  onClose: () => void;
  onPublish: (stop: StopForView) => void;
}) {
  const sorted = useMemo(() => [...stops].sort((a, b) => (a.time || "").localeCompare(b.time || "")), [stops]);
  const counts = useMemo(() => {
    const active = sorted.filter((s) => s.status !== "draft" && s.active).length;
    const draft = sorted.filter((s) => s.status === "draft").length;
    const total = sorted.length;
    return { active, draft, total };
  }, [sorted]);
  const brands = useMemo(() => Array.from(new Set(sorted.map(brandName))), [sorted]);
  const routeNumber = useMemo(() => {
    // Editorial "Route 03" — count of stops with status badge
    return String(sorted.length).padStart(2, "0");
  }, [sorted.length]);

  const earliest = sorted[0]?.time;
  const latest = sorted[sorted.length - 1]?.time;

  return (
    <>
      <div className="ha-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="ha-drawer" role="dialog" aria-label={`Route for ${formatDateLongSpelled(date)}`}>
        <header className="ha-drawer-header">
          <div>
            <div className="ha-drawer-eyebrow">Route {routeNumber} · {dateStr}</div>
            <h2 className="ha-drawer-title">{formatDateLongSpelled(date)}</h2>
            <p className="ha-drawer-subtitle">
              {sorted.length} {sorted.length === 1 ? "stop" : "stops"} on the route
              {earliest && latest && sorted.length > 1 && (
                <> · {formatTime12(earliest)} – {formatTime12(latest)}</>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ha-drawer-close" aria-label="Close">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ha-drawer-body">
          {sorted.length === 0 ? (
            <div className="ha-drawer-empty">
              <p className="ha-drawer-empty-mark">No route on this day</p>
              <p className="ha-drawer-empty-text">
                No stops are scheduled for {formatDateLongSpelled(date)}.
              </p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="ha-route-summary">
                <div className="ha-route-summary-cell">
                  <span className="ha-route-summary-num">{counts.total}</span>
                  <span className="ha-route-summary-label">Stops</span>
                </div>
                <div className="ha-route-summary-cell">
                  <span className="ha-route-summary-num">{counts.active}</span>
                  <span className="ha-route-summary-label">Live</span>
                </div>
                <div className="ha-route-summary-cell">
                  <span className="ha-route-summary-num">{brands.length}</span>
                  <span className="ha-route-summary-label">Brands</span>
                </div>
              </div>

              {/* Route spine */}
              <div className="ha-route-list">
                {sorted.map((stop, idx) => {
                  const status = statusOf(stop);
                  return (
                    <article key={stop.id} className="ha-route-stop">
                      <div className="ha-route-stop-spine">
                        <div className={`ha-route-stop-marker ha-route-stop-marker--${status}`}>
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div className="ha-route-stop-line" />
                      </div>
                      <div className="ha-route-stop-content">
                        <div className="ha-route-stop-time">{formatTime12(stop.time)}</div>
                        <h3 className="ha-route-stop-name">
                          {stop.city}, {stop.state}
                        </h3>
                        <p className="ha-route-stop-location">{stop.location}</p>
                        <div className="ha-route-stop-meta">
                          <span className="ha-route-stop-meta-pill">{brandName(stop)}</span>
                          <span
                            className="ha-route-stop-meta-pill"
                            style={{
                              background:
                                status === "active"
                                  ? "var(--admin-accent-light)"
                                  : status === "draft"
                                    ? "rgba(245, 158, 11, 0.1)"
                                    : "var(--admin-bg-subtle)",
                              color:
                                status === "active"
                                  ? "var(--admin-accent-text)"
                                  : status === "draft"
                                    ? "#92400e"
                                    : "var(--admin-text-secondary)",
                              borderColor:
                                status === "active"
                                  ? "var(--admin-accent)"
                                  : status === "draft"
                                    ? "rgba(245, 158, 11, 0.3)"
                                    : "var(--admin-border-light)",
                            }}
                          >
                            {statusLabel(status)}
                          </span>
                          {stop.cutoff_time && (
                            <span className="ha-route-stop-meta-pill">
                              Cutoff {formatTime12(stop.cutoff_time)}
                            </span>
                          )}
                          {stop.address && (
                            <span className="ha-route-stop-meta-pill">
                              {stop.address}{stop.zip ? `, ${stop.zip}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="ha-route-stop-actions">
                          {status === "draft" && (
                            <button
                              type="button"
                              onClick={() => onPublish(stop)}
                              className="ha-route-stop-action ha-route-stop-action--primary"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Publish
                            </button>
                          )}
                          <Link
                            href={`/admin/stops/${stop.id}`}
                            className="ha-route-stop-action ha-route-stop-action--primary"
                          >
                            Edit
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                          <Link
                            href={`/admin/stops/new?duplicate=${stop.id}`}
                            className="ha-route-stop-action"
                          >
                            Duplicate
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
