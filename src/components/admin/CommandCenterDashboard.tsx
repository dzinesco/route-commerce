"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPlatformMetrics,
  getPlatformActivityFeed,
  getBrandHealthSnapshot,
  getPainLog,
  resolvePainLogItem,
  createPainLogItem,
  type PlatformMetrics,
  type ActivityEvent,
  type BrandHealth,
  type PainLogItem,
} from "@/actions/platform/command-center";

// ── Constants ─────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30000;

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  order_placed:     { bg: "bg-violet-500/20", text: "text-violet-300", dot: "bg-violet-400" },
  order_completed:  { bg: "bg-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400" },
  pickup_completed: { bg: "bg-blue-900/300/20",   text: "text-blue-300",   dot: "bg-blue-400" },
  payment_failed:   { bg: "bg-red-900/300/20",    text: "text-red-300",    dot: "bg-red-400" },
  stop_created:     { bg: "bg-amber-900/300/20",  text: "text-amber-300",  dot: "bg-amber-400" },
  route_updated:   { bg: "bg-cyan-500/20",   text: "text-cyan-300",   dot: "bg-cyan-400" },
  default:          { bg: "bg-zinc-900/10",      text: "text-white/60",   dot: "bg-zinc-900/40" },
};

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-900/300/15",   text: "text-red-300",    border: "border-red-500/30" },
  high:     { bg: "bg-orange-500/15",text: "text-orange-300", border: "border-orange-500/30" },
  medium:   { bg: "bg-amber-900/300/15",text: "text-amber-300",  border: "border-amber-500/30" },
  low:      { bg: "bg-zinc-900/8",      text: "text-white/60",    border: "border-white/10" },
};

const HEALTH_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  healthy:  { label: "Operational", bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/25", dot: "bg-emerald-400" },
  warning:  { label: "Attention",   bg: "bg-amber-900/300/15",  text: "text-amber-300",    border: "border-amber-500/25", dot: "bg-amber-400" },
  critical: { label: "Critical",    bg: "bg-red-900/300/15",    text: "text-red-300",      border: "border-red-500/25",   dot: "bg-red-400" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatCurrencyFull(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Metric Card ─────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  prefix,
  suffix,
  status,
  delay = 0,
  tv = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  prefix?: string;
  suffix?: string;
  status?: "healthy" | "warning" | "critical";
  delay?: number;
  tv?: boolean;
}) {
  const valueColor = {
    healthy:  "text-white",
    warning:  "text-amber-300",
    critical:  "text-red-300",
  }[status ?? "healthy"]!;

  return (
    <div
      className={`
        rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl p-5
        ${status === "critical" ? "border-red-500/20" : ""}
      `}
    >
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25`}>{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        {prefix && <span className="text-2xl text-white/25">{prefix}</span>}
        <span className={`${tv ? "text-5xl" : "text-4xl"} font-black tracking-tighter leading-none ${valueColor}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {suffix && <span className="text-2xl text-white/25">{suffix}</span>}
      </div>
      {sub && <p className={`text-xs mt-2 text-white/20`}>{sub}</p>}
    </div>
  );
}

// ── Brand Health Card ─────────────────────────────────────────────────────────

function BrandCard({ brand, tv = false }: { brand: BrandHealth; tv?: boolean }) {
  const c = HEALTH_CONFIG[brand.health_status as keyof typeof HEALTH_CONFIG] ?? HEALTH_CONFIG.warning;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-white truncate leading-tight ${tv ? "text-2xl" : "text-lg"}`}>{brand.brand_name}</p>
          <p className={`text-sm text-white/20 mt-1`}>{brand.brand_slug}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${c.bg} ${c.text} ${c.border}`}>
            {c.label}
          </span>
          <div className={`h-2 w-2 rounded-full ${c.dot}`} />
        </div>
      </div>

      <div className={`mt-6 grid grid-cols-3 gap-6`}>
        {[
          { label: "Orders", value: brand.orders_today },
          { label: "Revenue", value: formatCurrency(Number(brand.revenue_today)) },
          { label: "Routes", value: brand.active_stops },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className={`text-xs font-medium text-white/20`}>{label}</p>
            <p className={`${tv ? "text-2xl" : "text-xl"} font-black text-white mt-1 leading-none`}>{value}</p>
          </div>
        ))}
      </div>

      {brand.open_pain_items > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-900/300/10 border border-red-500/20 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className={`text-sm font-semibold text-red-300`}>
            {brand.open_pain_items} open issue{brand.open_pain_items !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Activity Item ──────────────────────────────────────────────────────────────

function ActivityItem({ event }: { event: ActivityEvent }) {
  const c = EVENT_COLORS[event.event_type] ?? EVENT_COLORS.default;
  const label = event.event_type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex items-start gap-3.5 py-3.5 border-b border-white/[0.03] last:border-0">
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block h-2 w-2 rounded-full ${c.dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
            {label}
          </span>
          {event.brand_name && (
            <span className={`text-xs font-medium text-white/25`}>{event.brand_name}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <p className={`text-sm text-white/40 truncate`}>
            {event.entity_type && <span>{event.entity_type}</span>}
            {event.entity_id && <span className="font-mono text-white/15 ml-1">#{event.entity_id.slice(0, 6)}</span>}
          </p>
          <span className={`text-xs text-white/15 shrink-0`}>
            {event.created_at ? timeAgo(event.created_at) : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Pain Item ─────────────────────────────────────────────────────────────────

function PainItem({
  item,
  onResolve,
  onSnooze,
}: {
  item: PainLogItem;
  onResolve: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const c = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.low;

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${c.bg} ${c.text} ${c.border}`}>
            {item.severity}
          </span>
          <span className={`text-sm font-semibold text-white/80 leading-tight`}>{item.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onSnooze(item.id)}
            className="rounded-lg bg-zinc-900/5 border border-white/10 px-2.5 py-1 text-xs font-medium text-white/35 hover:bg-zinc-900/10 hover:text-white/60 transition-all"
          >
            Snooze
          </button>
          <button
            onClick={() => onResolve(item.id)}
            className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-all"
          >
            Done
          </button>
        </div>
      </div>
      <div className={`mt-2 flex items-center gap-2 text-xs text-white/25`}>
        {item.brand_name && <span>{item.brand_name}</span>}
        <span>·</span>
        <span>{item.category}</span>
        <span>·</span>
        <span>{item.created_at ? timeAgo(item.created_at) + " ago" : ""}</span>
      </div>
    </div>
  );
}

// ── AI Briefing ────────────────────────────────────────────────────────────────

function AIBriefing({ metrics, brandHealth }: {
  metrics: PlatformMetrics | null;
  brandHealth: BrandHealth[];
}) {
  const lines: string[] = [];
  if (!metrics) return <div className="h-16 animate-pulse bg-zinc-900/[0.04] rounded-xl" />;

  if (metrics.orders_today > 0) {
    lines.push(`${metrics.orders_today} order${metrics.orders_today !== 1 ? "s" : ""} placed today.`);
  }
  if (Number(metrics.revenue_today) > 0) {
    lines.push(`${formatCurrencyFull(Number(metrics.revenue_today))} in revenue processed.`);
  }
  if (metrics.failed_orders_today > 0) {
    lines.push(`${metrics.failed_orders_today} failed order${metrics.failed_orders_today !== 1 ? "s" : ""} need attention.`);
  }
  if (metrics.pending_orders_today > 0) {
    lines.push(`${metrics.pending_orders_today} order${metrics.pending_orders_today !== 1 ? "s" : ""} pending confirmation.`);
  }
  const crit = brandHealth.filter(b => b.health_status === "critical").length;
  if (crit > 0) lines.push(`${crit} brand${crit !== 1 ? "s" : ""} in critical state.`);
  const warn = brandHealth.filter(b => b.health_status === "warning").length;
  if (warn > 0 && crit === 0) lines.push(`${warn} brand${warn !== 1 ? "s" : ""} need attention.`);

  if (lines.length === 0) {
    lines.push("Platform is running smoothly — no active issues.");
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-white/50 leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function CommandCenterDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [brandHealth, setBrandHealth] = useState<BrandHealth[]>([]);
  const [painLog, setPainLog] = useState<PainLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [tvMode, setTvMode] = useState(false);
  const [addForm, setAddForm] = useState({ severity: "medium", category: "operations", title: "", description: "" });
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());

  const tv = tvMode;

  const fetchAll = useCallback(async () => {
    try {
      const [m, a, b, p] = await Promise.all([
        getPlatformMetrics(),
        getPlatformActivityFeed(),
        getBrandHealthSnapshot(),
        getPainLog(),
      ]);
      setMetrics(m);
      setActivity(a);
      setBrandHealth(b);
      setPainLog(p);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const handleResolve = async (id: string) => {
    setResolving(prev => new Set([...prev, id]));
    try {
      const r = await resolvePainLogItem(id);
      if (r.success) setPainLog(prev => prev.filter(i => i.id !== id));
    } finally {
      setResolving(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleSnooze = (id: string) => {
    setSnoozed(prev => new Set([...prev, id]));
    setTimeout(() => {
      setSnoozed(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 3600000);
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) return;
    const r = await createPainLogItem({
      severity: addForm.severity as "low" | "medium" | "high" | "critical",
      category: addForm.category,
      title: addForm.title,
      description: addForm.description || null,
    });
    if (r.success) {
      setAddForm({ severity: "medium", category: "operations", title: "", description: "" });
      setShowAddForm(false);
      fetchAll();
    }
  };

  const openItems = painLog.filter(p => p.status === "open" && !snoozed.has(p.id));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="h-14 w-14 rounded-full border-2 border-white/[0.08] border-t-white/25 animate-spin" />
          <p className="text-xs text-white/25 tracking-widest uppercase">Initializing</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl p-10 text-center max-w-md">
          <div className="mb-5 text-5xl">⚠</div>
          <h3 className="text-xl font-bold text-white">Connection Lost</h3>
          <p className="text-sm text-white/35 mt-2">{error}</p>
          <button
            onClick={fetchAll}
            className="mt-8 rounded-2xl bg-zinc-900/10 border border-white/20 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-900/20 transition-all"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-center justify-between px-8">
        <div>
          <h1 className={`${tv ? "text-4xl" : "text-3xl"} font-black tracking-tight text-white`}>
            Command Center
          </h1>
          <p className={`${tv ? "text-base" : "text-sm"} text-white/25 mt-2 tracking-wide`}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            <span className="text-emerald-400/50 font-semibold">LIVE</span>
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchAll}
            className="flex items-center gap-2.5 rounded-xl bg-zinc-900/5 border border-white/10 px-4 py-2 text-sm text-white/35 hover:bg-zinc-900/10 hover:text-white/60 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setTvMode(v => !v)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tv
                ? "bg-zinc-900/15 border border-white/25 text-white/80"
                : "bg-zinc-900/5 border border-white/10 text-white/35 hover:text-white/60"
            }`}
          >
            {tv ? "Exit TV" : "TV Mode"}
          </button>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className={`grid ${tv ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-6"} gap-5 px-8 mb-12`}>
        <MetricCard label="Active Brands" value={metrics?.active_brands ?? 0} status="healthy" />
        <MetricCard label="Orders Today" value={metrics?.orders_today ?? 0} status={metrics?.failed_orders_today ? "critical" : "healthy"} />
        <MetricCard label="Revenue Today" value={formatCurrency(Number(metrics?.revenue_today ?? 0))} status="healthy" />
        <MetricCard label="Active Routes" value={metrics?.active_routes ?? 0} status={(metrics?.pending_orders_today ?? 0) > 5 ? "warning" : "healthy"} />
        <MetricCard label="Failed Orders" value={metrics?.failed_orders_today ?? 0} status={(metrics?.failed_orders_today ?? 0) > 0 ? "critical" : "healthy"} />
        <MetricCard label="Pending Orders" value={metrics?.pending_orders_today ?? 0} status={(metrics?.pending_orders_today ?? 0) > 5 ? "warning" : "healthy"} />
      </div>

      {/* ── AI Briefing (full width) ──────────────────────────────────────── */}
      <div className="px-8 mb-10">
        <div className="rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl p-8">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.04]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-white/40">Daily Briefing</h2>
              <p className="text-xs text-white/20 mt-0.5">Platform intelligence summary</p>
            </div>
          </div>
          <AIBriefing metrics={metrics} brandHealth={brandHealth} />
        </div>
      </div>

      {/* ── 2-Column Body ───────────────────────────────────────────────────── */}
      <div className={`grid gap-10 px-8 ${tv ? "grid-cols-12" : "grid-cols-1 lg:grid-cols-2"}`}>

        {/* ── LEFT: Brand Health + Activity ───────────────────────────── */}
        <div className="space-y-10">
          {/* Brand Health */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-white/25">
                Brand Health
              </h2>
              <span className="rounded-full bg-zinc-900/5 px-2.5 py-0.5 text-xs text-white/15">
                {brandHealth.length}
              </span>
            </div>
            <div className="space-y-5">
              {brandHealth.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl p-10 text-center">
                  <p className="text-sm text-white/25">No active brands</p>
                </div>
              ) : (
                brandHealth.map((b) => (
                  <BrandCard key={b.brand_id} brand={b} tv={tv} />
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-white/25">
                Live Activity
              </h2>
              <span className="rounded-full bg-zinc-900/5 px-2.5 py-0.5 text-xs text-white/15">
                {activity.length}
              </span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto p-5">
                {activity.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-white/20">No recent events</p>
                  </div>
                ) : (
                  activity.slice(0, 30).map((e) => (
                    <ActivityItem key={e.id} event={e} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Founder Queue ─────────────────────────────── */}
        <div className="space-y-10">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-white/25">
                  Founder Queue
                </h2>
                {openItems.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-900/300/20 text-xs font-black text-amber-300">
                    {openItems.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="text-xs text-white/25 hover:text-white/50 transition-colors"
              >
                + Add
              </button>
            </div>

            {showAddForm && (
              <div className="mb-5 space-y-2.5 rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl p-5">
                <select
                  value={addForm.severity}
                  onChange={e => setAddForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-900/5 border border-white/10 px-4 py-3 text-sm text-white/75 outline-none focus:border-white/20"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <input
                  value={addForm.title}
                  onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Issue title..."
                  className="w-full rounded-xl bg-zinc-900/5 border border-white/10 px-4 py-3 text-sm text-white/75 placeholder-white/15 outline-none focus:border-white/20"
                />
                <input
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Category (e.g. deployment, payment)"
                  className="w-full rounded-xl bg-zinc-900/5 border border-white/10 px-4 py-3 text-sm text-white/75 placeholder-white/15 outline-none focus:border-white/20"
                />
                <textarea
                  value={addForm.description}
                  onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full resize-none rounded-xl bg-zinc-900/5 border border-white/10 px-4 py-3 text-sm text-white/75 placeholder-white/15 outline-none focus:border-white/20"
                />
                <div className="flex gap-2.5">
                  <button onClick={handleAdd} className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all">
                    Log Issue
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="flex-1 rounded-xl bg-zinc-900/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-white/35 hover:bg-zinc-900/10 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {openItems.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl p-10 text-center">
                  <p className="text-base font-semibold text-white/35">All clear</p>
                  <p className="text-sm text-white/20 mt-1.5">Add an issue to track it here.</p>
                </div>
              ) : (
                openItems.map((item) => (
                  <PainItem
                    key={item.id}
                    item={item}
                    onResolve={handleResolve}
                    onSnooze={handleSnooze}
                  />
                ))
              )}
            </div>
          </div>

          {/* Quick Access */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-white/25 mb-5">
              Quick Access
            </h2>
            <div className="rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl p-4 space-y-1">
              {[
                { label: "Reports",    href: "/admin/reports" },
                { label: "Orders",    href: "/admin/orders" },
                { label: "Stops",     href: "/admin/stops" },
                { label: "Settings",  href: "/admin/settings" },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 text-sm text-white/30 hover:bg-zinc-900/5 hover:text-white/70 transition-all"
                >
                  <span className="font-medium">{link.label}</span>
                  <span className="text-white/10">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
}