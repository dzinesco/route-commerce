"use client";

import { useState, useEffect, useCallback } from "react";
import GlassModal from "@/components/admin/GlassModal";
import {
  getTimeTrackingWorkers,
  getTimeTrackingTasks,
  getWorkerTimeLogs,
  getTimeTrackingSummary,
  createTimeWorker,
  updateTimeWorker,
  deleteTimeWorker,
  resetTimeWorkerPin,
  createTimeTask,
  updateTimeTask,
  deleteTimeTask,
  type TimeWorker,
  type TimeTask,
  type TimeLog,
  type TimeSummary,
} from "@/actions/time-tracking";
import { formatDate } from "@/lib/format-date";
import TimeTrackingSettingsClient from "./TimeTrackingSettingsClient";
import { AdminButton, AdminFilterTabs } from "./design-system";

// One-color outline icons
const Icons = {
  clock: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  chart: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10"/>
      <line x1="18" x2="18" y1="20" y2="4"/>
      <line x1="6" x2="6" y1="20" y2="16"/>
    </svg>
  ),
  user: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  clipboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v16m8-8H4" />
    </svg>
  ),
  refresh: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  ),
  download: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  edit: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  trash: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  fileText: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  ),
  timer: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" x2="14" y1="2" y2="2"/>
      <line x1="12" x2="15" y1="14" y2="11"/>
      <circle cx="12" cy="14" r="8"/>
    </svg>
  ),
  settings: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
};

const PAGE_SIZE = 50;

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
      active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-green-500" : "bg-stone-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatHours(h: number): string {
  return h < 1 ? `${(h * 60).toFixed(0)}m` : `${h.toFixed(1)}h`;
}

function formatMinutes(minutes: number): string {
  const h = minutes / 60;
  return h < 1 ? `${minutes}m` : `${h.toFixed(1)}h`;
}

// ── Main Component ───────────────────────────────────────────────────────────

type Tab = "summary" | "workers" | "tasks" | "logs" | "settings";

const TABS = [
  { value: "summary", label: "Summary", icon: Icons.chart("h-4 w-4") },
  { value: "workers", label: "Workers", icon: Icons.user("h-4 w-4") },
  { value: "tasks", label: "Tasks", icon: Icons.clipboard("h-4 w-4") },
  { value: "logs", label: "Logs", icon: Icons.clock("h-4 w-4") },
  { value: "settings", label: "Settings", icon: Icons.settings("h-4 w-4") },
];

export default function TimeTrackingAdminPanel({ brandId }: { brandId?: string }) {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t === "tasks" || t === "workers") return t as Tab;
    }
    return "summary" as Tab;
  });
  const [workers, setWorkers] = useState<TimeWorker[]>([]);
  const [tasks, setTasks] = useState<TimeTask[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { start, end: now.toISOString().slice(0, 10) };
  });
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [logPage, setLogPage] = useState(0);

  const [workerModal, setWorkerModal] = useState<TimeWorker | null | "new">(null);
  const [taskModal, setTaskModal] = useState<TimeTask | null | "new">(null);
  const [exportModal, setExportModal] = useState(false);
  const [logModal, setLogModal] = useState<TimeLog | null>(null);

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

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setLogPage(0); }, [dateRange, selectedWorker, selectedTask]);

  if (!brandId) {
    return (
      <div className="text-center py-20 text-[var(--admin-text-muted)]">
        <p className="text-sm">Select a brand to view time tracking.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      {/* Header with date range */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[var(--admin-accent)]">
              {Icons.clock("h-5 w-5 sm:h-6 sm:w-6 text-white")}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--admin-text-primary)] tracking-tight">Time Tracking</h1>
              <p className="text-xs text-[var(--admin-text-muted)]">{dateRange.start} — {dateRange.end}</p>
            </div>
          </div>
          <AdminButton
            onClick={() => setExportModal(true)}
            icon={Icons.download("h-4 w-4")}
            variant="secondary"
          >
            Export
          </AdminButton>
        </div>

        {/* Tab navigation - using AdminFilterTabs */}
        <AdminFilterTabs
          activeTab={tab}
          onTabChange={(t) => setTab(t as Tab)}
          tabs={TABS}
          size="md"
          showCounts={false}
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        {/* ── Summary Tab ── */}
        {tab === "summary" && (
          <SummaryTab
            summary={summary}
            workers={workers}
            loading={loading}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onRefresh={load}
          />
        )}

        {/* ── Workers Tab ── */}
        {tab === "workers" && (
          <WorkersTab
            workers={workers}
            onAdd={() => setWorkerModal("new")}
            onEdit={(w) => setWorkerModal(w)}
            brandId={brandId}
            onSave={() => {
              load();
              setWorkerModal(null);
            }}
          />
        )}

        {/* ── Tasks Tab ── */}
        {tab === "tasks" && (
          <TasksTab
            tasks={tasks}
            onAdd={() => setTaskModal("new")}
            onEdit={(t) => setTaskModal(t)}
            brandId={brandId}
            onSave={() => {
              load();
              setTaskModal(null);
            }}
          />
        )}

        {/* ── Logs Tab ── */}
        {tab === "logs" && (
          <LogsTab
            logs={logs}
            workers={workers}
            tasks={tasks}
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedWorker={selectedWorker}
            setSelectedWorker={setSelectedWorker}
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            loading={loading}
            onRefresh={load}
            onViewLog={setLogModal}
          />
        )}

        {/* ── Settings Tab ── */}
        {tab === "settings" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-6">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[var(--admin-text-primary)]">
                {Icons.settings("w-4 h-4 sm:w-5 sm:h-5 text-[var(--admin-bg)]")}
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Time Tracking Settings</h2>
                <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Configure your time tracking workflow</p>
              </div>
            </div>
            <TimeTrackingSettingsClient brandId={brandId} />
          </div>
        )}
      </div>

      {/* Worker Modal */}
      {workerModal !== null && (
        <WorkerModal
          worker={workerModal === "new" ? null : workerModal}
          brandId={brandId}
          onClose={() => setWorkerModal(null)}
          onSave={(saved) => {
            if (saved) load();
            setWorkerModal(null);
          }}
        />
      )}

      {/* Task Modal */}
      {taskModal !== null && (
        <TaskModal
          task={taskModal === "new" ? null : taskModal}
          brandId={brandId}
          onClose={() => setTaskModal(null)}
          onSave={(saved) => {
            if (saved) load();
            setTaskModal(null);
          }}
        />
      )}

      {/* Export Modal */}
      {exportModal && (
        <GlassModal title="Export Time Logs" onClose={() => setExportModal(false)}>
          <div className="p-6">
            <p className="text-sm text-[var(--admin-text-secondary)] mb-4">Download time logs for the selected date range.</p>
            <AdminButton
              onClick={() => {
                window.location.href = `/api/time-tracking/export?brandId=${brandId}&start=${dateRange.start}&end=${dateRange.end}`;
                setExportModal(false);
              }}
              icon={Icons.download("h-4 w-4")}
              fullWidth
            >
              Download CSV
            </AdminButton>
          </div>
        </GlassModal>
      )}

      {/* Log Detail Modal */}
      {logModal && (
        <GlassModal title="Time Log Detail" onClose={() => setLogModal(null)}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">Worker</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{logModal.worker_name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">Task</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{logModal.task_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">Clock In</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{logModal.clock_in ? formatDate(logModal.clock_in) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">Clock Out</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{logModal.clock_out ? formatDate(logModal.clock_out) : "Open"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">Duration</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{formatMinutes(logModal.total_minutes)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-[var(--admin-text-secondary)]">{logModal.notes || "—"}</p>
              </div>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
}

// ── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ summary, workers, loading, dateRange, setDateRange, onRefresh }: {
  summary: TimeSummary | null;
  workers: TimeWorker[];
  loading: boolean;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs text-[var(--admin-text-muted)] font-medium">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] text-sm focus:outline-none focus:border-[var(--admin-accent)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--admin-text-muted)] font-medium">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] text-sm focus:outline-none focus:border-[var(--admin-accent)]"
            />
          </div>
          <AdminButton onClick={onRefresh} icon={Icons.refresh("h-4 w-4")}>
            Refresh
          </AdminButton>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[var(--admin-text-muted)]">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      ) : summary ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--admin-text-muted)]">{Icons.timer("h-4 w-4")}</span>
                <span className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Total Hours</span>
              </div>
              <p className="text-3xl font-black text-[var(--admin-text-primary)]">{formatMinutes(summary.totals.total_hours * 60)}</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1">{summary.totals.entry_count} entries</p>
            </div>
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--admin-text-muted)]">{Icons.fileText("h-4 w-4")}</span>
                <span className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Entries</span>
              </div>
              <p className="text-3xl font-black text-[var(--admin-text-primary)]">{summary.totals.entry_count}</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1">This period</p>
            </div>
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--admin-text-muted)]">{Icons.clock("h-4 w-4")}</span>
                <span className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Open Clock-ins</span>
              </div>
              <p className="text-3xl font-black text-[var(--admin-text-primary)]">{summary.totals.open_count}</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1">In progress</p>
            </div>
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--admin-text-muted)]">{Icons.user("h-4 w-4")}</span>
                <span className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">Workers</span>
              </div>
              <p className="text-3xl font-black text-[var(--admin-text-primary)]">{workers.length}</p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1">Active</p>
            </div>
          </div>

          {/* By Worker Table */}
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
              <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">By Worker</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
                  <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Worker</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-[var(--admin-text-muted)] uppercase">Entries</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-[var(--admin-text-muted)] uppercase">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {(summary.by_worker ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-[var(--admin-text-muted)]">No data</td></tr>
                ) : (
                  (summary.by_worker ?? []).map((w) => (
                    <tr key={w.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)] transition-colors">
                      <td className="px-5 py-4 text-sm font-semibold text-[var(--admin-text-primary)]">{w.name}</td>
                      <td className="px-5 py-4 text-sm text-[var(--admin-text-secondary)] text-right">{w.entry_count}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-[var(--admin-text-primary)] text-right">{formatMinutes(w.total_hours * 60)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-[var(--admin-text-muted)]">
          <p className="text-sm">No summary data available</p>
        </div>
      )}
    </div>
  );
}

// ── Workers Tab ───────────────────────────────────────────────────────────────

function WorkersTab({ workers, onAdd, onEdit, brandId, onSave }: {
  workers: TimeWorker[];
  onAdd: () => void;
  onEdit: (w: TimeWorker) => void;
  brandId: string;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]">
        <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">Workers ({workers.length})</h3>
        <AdminButton onClick={onAdd} icon={Icons.plus("h-4 w-4")}>
          Add Worker
        </AdminButton>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
            <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Name</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">PIN</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Status</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Language</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {workers.length === 0 ? (
            <tr><td colSpan={5} className="px-5 py-8 text-center text-[var(--admin-text-muted)]">No workers yet</td></tr>
          ) : (
            workers.map((w) => (
              <tr key={w.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)] transition-colors">
                <td className="px-5 py-4 text-sm font-semibold text-[var(--admin-text-primary)]">{w.name}</td>
                <td className="px-5 py-4 text-sm font-mono text-[var(--admin-text-secondary)]">{w.pin || "—"}</td>
                <td className="px-5 py-4"><StatusBadge active={w.active} /></td>
                <td className="px-5 py-4 text-sm text-[var(--admin-text-muted)]">{w.lang?.toUpperCase() ?? "EN"}</td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => onEdit(w)} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]">
                    {Icons.edit("h-4 w-4")}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ tasks, onAdd, onEdit, brandId, onSave }: {
  tasks: TimeTask[];
  onAdd: () => void;
  onEdit: (t: TimeTask) => void;
  brandId: string;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]">
        <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">Tasks ({tasks.length})</h3>
        <AdminButton onClick={onAdd} icon={Icons.plus("h-4 w-4")}>
          Add Task
        </AdminButton>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
            <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Name</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Unit</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Status</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr><td colSpan={4} className="px-5 py-8 text-center text-[var(--admin-text-muted)]">No tasks yet</td></tr>
          ) : (
            tasks.map((t) => (
              <tr key={t.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)] transition-colors">
                <td className="px-5 py-4">
                  <div className="text-sm font-semibold text-[var(--admin-text-primary)]">{t.name}</div>
                  {t.name_es && <div className="text-xs text-[var(--admin-text-muted)]">{t.name_es}</div>}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--admin-text-secondary)] capitalize">{t.unit || "hours"}</td>
                <td className="px-5 py-4"><StatusBadge active={t.active} /></td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => onEdit(t)} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]">
                    {Icons.edit("h-4 w-4")}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab({ logs, workers, tasks, dateRange, setDateRange, selectedWorker, setSelectedWorker, selectedTask, setSelectedTask, loading, onRefresh, onViewLog }: {
  logs: TimeLog[];
  workers: TimeWorker[];
  tasks: TimeTask[];
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  selectedWorker: string;
  setSelectedWorker: (v: string) => void;
  selectedTask: string;
  setSelectedTask: (v: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onViewLog: (log: TimeLog) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs text-[var(--admin-text-muted)] font-medium">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] text-sm focus:outline-none focus:border-[var(--admin-accent)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--admin-text-muted)] font-medium">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] text-sm focus:outline-none focus:border-[var(--admin-accent)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--admin-text-muted)] font-medium">Worker</label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] text-sm focus:outline-none focus:border-[var(--admin-accent)] min-w-[160px]"
            >
              <option value="">All Workers</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--admin-text-muted)] font-medium">Task</label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] text-sm focus:outline-none focus:border-[var(--admin-accent)] min-w-[160px]"
            >
              <option value="">All Tasks</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <AdminButton onClick={onRefresh} icon={Icons.refresh("h-4 w-4")}>
            Refresh
          </AdminButton>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[var(--admin-text-muted)]">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
            <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">Time Logs</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
                <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Worker</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Task</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Clock In</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-[var(--admin-text-muted)] uppercase">Clock Out</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-[var(--admin-text-muted)] uppercase">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[var(--admin-text-muted)]">No logs yet</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)] transition-colors cursor-pointer" onClick={() => onViewLog(log)}>
                    <td className="px-5 py-4 text-sm font-semibold text-[var(--admin-text-primary)]">{log.worker_name}</td>
                    <td className="px-5 py-4 text-sm text-[var(--admin-text-secondary)]">{log.task_name || "—"}</td>
                    <td className="px-5 py-4 text-sm text-[var(--admin-text-muted)]">{log.clock_in ? formatDate(log.clock_in) : "—"}</td>
                    <td className="px-5 py-4 text-sm text-[var(--admin-text-muted)]">{log.clock_out ? formatDate(log.clock_out) : "Open"}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[var(--admin-text-primary)] text-right">{formatMinutes(log.total_minutes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Worker Modal ─────────────────────────────────────────────────────────────

function WorkerModal({ worker, brandId, onClose, onSave }: {
  worker: TimeWorker | null;
  brandId: string;
  onClose: () => void;
  onSave: (saved: boolean) => void;
}) {
  const [name, setName] = useState(worker?.name ?? "");
  const [role, setRole] = useState(worker?.role ?? "worker");
  const [lang, setLang] = useState(worker?.lang ?? "en");
  const [active, setActive] = useState(worker?.active ?? true);
  const [loading, setLoading] = useState(false);
  const isEdit = !!worker;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit && worker) {
        await updateTimeWorker(worker.id, name, role, lang, active);
      } else {
        await createTimeWorker(brandId, name, role, lang);
      }
      onSave(true);
    } catch {
      onSave(false);
    }
    setLoading(false);
  }

  async function handleResetPin() {
    if (!worker) return;
    setLoading(true);
    await resetTimeWorkerPin(worker.id);
    setLoading(false);
  }

  async function handleDelete() {
    if (!worker || !confirm("Delete this worker?")) return;
    setLoading(true);
    await deleteTimeWorker(worker.id);
    onSave(true);
    setLoading(false);
  }

  return (
    <GlassModal title={isEdit ? "Edit Worker" : "Add Worker"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)]">
            <option value="worker">Worker</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Language</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)]">
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-[var(--admin-border)]" />
          <span className="text-sm text-[var(--admin-text-secondary)]">Active</span>
        </label>
        <div className="flex gap-2 pt-2">
          {isEdit && worker && (
            <>
              <AdminButton type="button" variant="secondary" size="sm" onClick={handleResetPin} disabled={loading} icon={Icons.refresh("h-3.5 w-3.5")}>
                Reset PIN
              </AdminButton>
              <AdminButton type="button" variant="danger" size="sm" onClick={handleDelete} disabled={loading} icon={Icons.trash("h-3.5 w-3.5")}>
                Delete
              </AdminButton>
            </>
          )}
          <AdminButton type="submit" disabled={loading} isLoading={loading} className="ml-auto">
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </AdminButton>
        </div>
      </form>
    </GlassModal>
  );
}

// ── Task Modal ───────────────────────────────────────────────────────────────

function TaskModal({ task, brandId, onClose, onSave }: {
  task: TimeTask | null;
  brandId: string;
  onClose: () => void;
  onSave: (saved: boolean) => void;
}) {
  const [name, setName] = useState(task?.name ?? "");
  const [nameEs, setNameEs] = useState(task?.name_es ?? "");
  const [unit, setUnit] = useState(task?.unit ?? "hours");
  const [active, setActive] = useState(task?.active ?? true);
  const [loading, setLoading] = useState(false);
  const isEdit = !!task;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit && task) {
        await updateTimeTask(task.id, name, nameEs, unit, active, task.sort_order);
      } else {
        await createTimeTask(brandId, name, nameEs || null, unit);
      }
      onSave(true);
    } catch {
      onSave(false);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!task || !confirm("Delete this task?")) return;
    setLoading(true);
    await deleteTimeTask(task.id);
    onSave(true);
    setLoading(false);
  }

  return (
    <GlassModal title={isEdit ? "Edit Task" : "Add Task"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Task Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Harvesting" className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Name in Spanish</label>
          <input value={nameEs} onChange={(e) => setNameEs(e.target.value)} placeholder="e.g., Cosecha" className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)]">
            <option value="hours">Hours</option>
            <option value="pieces">Pieces</option>
            <option value="units">Units</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-[var(--admin-border)]" />
          <span className="text-sm text-[var(--admin-text-secondary)]">Active</span>
        </label>
        <div className="flex gap-2 pt-2">
          {isEdit && task && (
            <AdminButton type="button" variant="danger" size="sm" onClick={handleDelete} disabled={loading} icon={Icons.trash("h-3.5 w-3.5")}>
              Delete
            </AdminButton>
          )}
          <AdminButton type="submit" disabled={loading} isLoading={loading} className="ml-auto">
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </AdminButton>
        </div>
      </form>
    </GlassModal>
  );
}