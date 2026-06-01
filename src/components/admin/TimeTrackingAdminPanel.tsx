"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getTimeTrackingWorkers, getTimeTrackingTasks, getWorkerTimeLogs, getTimeTrackingSummary, type TimeWorker, type TimeTask, type TimeLog, type TimeSummary } from "@/actions/time-tracking";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatHours(h: number): string {
  return h < 1 ? `${(h * 60).toFixed(0)}m` : `${h.toFixed(1)}h`;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TimeTrackingAdminPanel({ brandId }: { brandId?: string }) {
  const [workers, setWorkers] = useState<TimeWorker[]>([]);
  const [tasks, setTasks] = useState<TimeTask[]>([]);
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = now.toISOString().slice(0, 10);
    return { start, end };
  });
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [tab, setTab] = useState<"summary" | "logs">("summary");
  const [logPage, setLogPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    const [w, t, s, l] = await Promise.all([
      getTimeTrackingWorkers(brandId),
      getTimeTrackingTasks(brandId, false),
      getTimeTrackingSummary(brandId, dateRange.start, dateRange.end),
      getWorkerTimeLogs(brandId, {
        workerId: selectedWorker || undefined,
        taskId: selectedTask || undefined,
        start: dateRange.start,
        end: dateRange.end,
        limit: PAGE_SIZE,
        offset: logPage * PAGE_SIZE,
      }),
    ]);
    setWorkers(w);
    setTasks(t);
    setSummary(s);
    setLogs(l);
    setLoading(false);
  }, [brandId, dateRange, selectedWorker, selectedTask, logPage]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching pattern
  useEffect(() => { load(); }, [load]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset pagination on filter change
  useEffect(() => { setLogPage(0); }, [dateRange, selectedWorker, selectedTask]);

  if (!brandId) {
    return (
      <div className="text-center py-20 text-stone-500">
        <p className="text-sm">Select a brand to view time tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-950 tracking-tight">Time Tracking</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {dateRange.start} — {dateRange.end}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/time-tracking/settings?tab=export"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 rounded-xl px-4 py-2 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </Link>
          <Link
            href="/admin/time-tracking/settings"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 rounded-xl px-4 py-2 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs text-stone-500 font-medium">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500 font-medium">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500 font-medium">Worker</label>
            <select
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors min-w-[160px]"
            >
              <option value="">All Workers</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500 font-medium">Task</label>
            <select
              value={selectedTask}
              onChange={e => setSelectedTask(e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:border-emerald-500 transition-colors min-w-[160px]"
            >
              <option value="">All Tasks</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        <button
          onClick={() => setTab("summary")}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${tab === "summary" ? "text-emerald-600 border-emerald-600" : "text-stone-500 border-transparent hover:text-stone-700 hover:border-stone-300"}`}
        >
          Summary
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${tab === "logs" ? "text-emerald-600 border-emerald-600" : "text-stone-500 border-transparent hover:text-stone-700 hover:border-stone-300"}`}
        >
          All Logs ({loading ? "…" : logs.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-500 text-sm">Loading...</div>
      ) : tab === "summary" && summary ? (
        <div className="space-y-6">
          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Total Hours</p>
              <p className="text-3xl font-black text-stone-950">{formatHours(summary.totals.total_hours)}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Entries</p>
              <p className="text-3xl font-black text-stone-950">{summary.totals.entry_count}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Open Clock-ins</p>
              <p className="text-3xl font-black text-amber-600">{summary.totals.open_count}</p>
            </div>
          </div>

          {/* By Worker */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-950">By Worker</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-widest bg-stone-50">
                  <th className="text-left px-5 py-3 font-medium">Worker</th>
                  <th className="text-right px-5 py-3 font-medium">Entries</th>
                  <th className="text-right px-5 py-3 font-medium">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {(summary.by_worker ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-stone-400">No data</td></tr>
                ) : (summary.by_worker ?? []).map(w => (
                  <tr key={w.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5 text-stone-900 font-medium">{w.name}</td>
                    <td className="px-5 py-3.5 text-stone-600 text-right">{w.entry_count}</td>
                    <td className="px-5 py-3.5 text-stone-900 text-right font-mono">{formatHours(w.total_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* By Task */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-950">By Task</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-widest bg-stone-50">
                  <th className="text-left px-5 py-3 font-medium">Task</th>
                  <th className="text-right px-5 py-3 font-medium">Entries</th>
                  <th className="text-right px-5 py-3 font-medium">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {(summary.by_task ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-stone-400">No data</td></tr>
                ) : (summary.by_task ?? []).map(t => (
                  <tr key={t.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5 text-stone-900 font-medium">{t.name}</td>
                    <td className="px-5 py-3.5 text-stone-600 text-right">{t.entry_count}</td>
                    <td className="px-5 py-3.5 text-stone-900 text-right font-mono">{formatHours(t.total_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Logs tab */
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          {/* Pagination header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-stone-50">
            <p className="text-xs text-stone-500">
              {logs.length === PAGE_SIZE
                ? `Showing page ${logPage + 1}`
                : `${logs.length} entries`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogPage(p => Math.max(0, p - 1))}
                disabled={logPage === 0}
                className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-stone-500 px-1">Page {logPage + 1}</span>
              <button
                onClick={() => setLogPage(p => p + 1)}
                disabled={logs.length < PAGE_SIZE}
                className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-stone-500 uppercase tracking-widest border-b border-stone-200 bg-stone-50">
                <th className="text-left px-5 py-3 font-medium">Worker</th>
                <th className="text-left px-5 py-3 font-medium">Task</th>
                <th className="text-left px-5 py-3 font-medium">Clock In</th>
                <th className="text-left px-5 py-3 font-medium">Clock Out</th>
                <th className="text-right px-5 py-3 font-medium">Lunch</th>
                <th className="text-right px-5 py-3 font-medium">Total</th>
                <th className="text-left px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-stone-400">No entries found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3.5 text-stone-900 font-medium">{log.worker_name}</td>
                  <td className="px-5 py-3.5 text-stone-600">{log.task_name}</td>
                  <td className="px-5 py-3.5 text-stone-600 font-mono text-xs">
                    <span>{formatDate(log.clock_in)}</span>
                    <span className="ml-2 text-stone-400">{formatTime(log.clock_in)}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs">
                    {log.clock_out ? (
                      <>
                        <span className="text-stone-600">{formatDate(log.clock_out)}</span>
                        <span className="ml-2 text-stone-400">{formatTime(log.clock_out)}</span>
                      </>
                    ) : (
                      <span className="text-amber-600 font-semibold">OPEN</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-stone-600 text-right">{log.lunch_break_minutes > 0 ? `${log.lunch_break_minutes}m` : "—"}</td>
                  <td className="px-5 py-3.5 text-stone-900 text-right font-mono">{formatMinutes(log.total_minutes)}</td>
                  <td className="px-5 py-3.5 text-stone-500 text-xs max-w-[160px] truncate">{log.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}