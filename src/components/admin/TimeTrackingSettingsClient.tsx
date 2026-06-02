"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTimeTrackingWorkers,
  getTimeTrackingTasks,
  createTimeWorker,
  resetTimeWorkerPin,
  updateTimeWorker,
  deleteTimeWorker,
  createTimeTask,
  updateTimeTask,
  deleteTimeTask,
  getTimeTrackingSettings,
  updateTimeTrackingSettings,
  getTimeTrackingNotificationLog,
  type TimeWorker,
  type TimeTask,
  type TimeTrackingSettings,
  type NotificationLogEntry,
} from "@/actions/time-tracking";

// One-color outline icons
const Icons = {
  clock: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  dollarSign: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  clipboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
    </svg>
  ),
  chart: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10"/>
      <line x1="18" x2="18" y1="20" y2="4"/>
      <line x1="6" x2="6" y1="20" y2="16"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  alert: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
  ),
};

type Tab = "dashboard" | "settings";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimeTrackingSettingsClientProps {
  brandId: string;
}

export default function TimeTrackingSettingsClient({ brandId }: TimeTrackingSettingsClientProps) {
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "settings" || t === "export") setTab(t as Tab);
  }, []);

  const [workers, setWorkers] = useState<TimeWorker[]>([]);
  const [tasks, setTasks] = useState<TimeTask[]>([]);
  const [settings, setSettings] = useState<TimeTrackingSettings | null>(null);
  const [notificationLog, setNotificationLog] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [payPeriodStartDay, setPayPeriodStartDay] = useState(0);
  const [payPeriodLength, setPayPeriodLength] = useState(7);
  const [dailyOvertimeThreshold, setDailyOvertimeThreshold] = useState(12);
  const [weeklyOvertimeThreshold, setWeeklyOvertimeThreshold] = useState(56);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [overtimeNotifications, setOvertimeNotifications] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [notificationSmsNumbers, setNotificationSmsNumbers] = useState<string[]>([]);
  const [enableDailyAlerts, setEnableDailyAlerts] = useState(true);
  const [enableWeeklyAlerts, setEnableWeeklyAlerts] = useState(true);
  const [dailyAlertThreshold, setDailyAlertThreshold] = useState(80);
  const [weeklyAlertThreshold, setWeeklyAlertThreshold] = useState(80);
  const [sendEndOfPeriodSummary, setSendEndOfPeriodSummary] = useState(true);
  const [brandName, setBrandName] = useState("Farm");
  const [newEmail, setNewEmail] = useState("");
  const [newSms, setNewSms] = useState("");

  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<TimeWorker | null>(null);
  const [workerName, setWorkerName] = useState("");
  const [workerRole, setWorkerRole] = useState("worker");
  const [workerLang, setWorkerLang] = useState("en");
  const [workerActive, setWorkerActive] = useState(true);
  const [resetPinResult, setResetPinResult] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TimeTask | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskNameEs, setTaskNameEs] = useState("");
  const [taskUnit, setTaskUnit] = useState("hours");
  const [taskActive, setTaskActive] = useState(true);
  const [taskSortOrder, setTaskSortOrder] = useState(0);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exportBrand, setExportBrand] = useState<"all" | "tuxedo" | "ird">("all");
  const [includeOvertime, setIncludeOvertime] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, t, s] = await Promise.all([
      getTimeTrackingWorkers(brandId),
      getTimeTrackingTasks(brandId, false),
      getTimeTrackingSettings(brandId),
    ]);
    setWorkers(w);
    setTasks(t);
    if (s) {
      setSettings(s);
      setPayPeriodStartDay(s.pay_period_start_day);
      setPayPeriodLength(s.pay_period_length_days);
      setDailyOvertimeThreshold(s.daily_overtime_threshold);
      setWeeklyOvertimeThreshold(s.weekly_overtime_threshold);
      setOvertimeMultiplier(s.overtime_multiplier);
      setOvertimeNotifications(s.overtime_notifications);
      setNotificationEmails(s.notification_emails ?? []);
      setNotificationSmsNumbers(s.notification_sms_numbers ?? []);
      setEnableDailyAlerts(s.enable_daily_alerts ?? true);
      setEnableWeeklyAlerts(s.enable_weekly_alerts ?? true);
      setDailyAlertThreshold(Math.round((s.daily_alert_threshold ?? 0.80) * 100));
      setWeeklyAlertThreshold(Math.round((s.weekly_alert_threshold ?? 0.80) * 100));
      setSendEndOfPeriodSummary(s.send_end_of_period_summary ?? true);
      setBrandName(s.brand_name ?? "Farm");
    }
    const log = await getTimeTrackingNotificationLog(brandId, 50);
    setNotificationLog(log);
    setLoading(false);
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveNotifications = async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSaved(false);
    const result = await updateTimeTrackingSettings(brandId, {
      pay_period_start_day: payPeriodStartDay,
      pay_period_length_days: payPeriodLength,
      daily_overtime_threshold: dailyOvertimeThreshold,
      weekly_overtime_threshold: weeklyOvertimeThreshold,
      overtime_multiplier: overtimeMultiplier,
      overtime_notifications: overtimeNotifications,
      notification_emails: notificationEmails,
      notification_sms_numbers: notificationSmsNumbers,
      enable_daily_alerts: enableDailyAlerts,
      enable_weekly_alerts: enableWeeklyAlerts,
      daily_alert_threshold: dailyAlertThreshold / 100,
      weekly_alert_threshold: weeklyAlertThreshold / 100,
      send_end_of_period_summary: sendEndOfPeriodSummary,
      brand_name: brandName,
    });
    setSettingsSaving(false);
    if (!result.success) { setSettingsError(result.error ?? "Failed to save"); return; }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    load();
  };

  const addEmail = () => {
    const email = newEmail.trim();
    if (email && !notificationEmails.includes(email)) {
      setNotificationEmails([...notificationEmails, email]);
    }
    setNewEmail("");
  };
  const removeEmail = (email: string) => setNotificationEmails(notificationEmails.filter(e => e !== email));
  const addSms = () => {
    const num = newSms.replace(/[^0-9+]/g, "");
    if (num && !notificationSmsNumbers.includes(num)) {
      setNotificationSmsNumbers([...notificationSmsNumbers, num]);
    }
    setNewSms("");
  };
  const removeSms = (num: string) => setNotificationSmsNumbers(notificationSmsNumbers.filter(n => n !== num));

  function buildExportUrl(type: "quickbooks" | "payroll" | "detailed" | "summary") {
    const params = new URLSearchParams({
      type,
      start: exportStart,
      end: exportEnd,
      brand: exportBrand,
      overtime: String(includeOvertime),
      notes: String(includeNotes),
    });
    return `/api/time-tracking/export?${params}`;
  }

  function triggerDownload(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const openAddWorker = () => {
    setEditingWorker(null);
    setWorkerName(""); setWorkerRole("worker"); setWorkerLang("en");
    setWorkerActive(true); setWorkerError(null); setResetPinResult(null);
    setShowWorkerModal(true);
  };

  const openEditWorker = (w: TimeWorker) => {
    setEditingWorker(w); setWorkerName(w.name); setWorkerRole(w.role);
    setWorkerLang(w.lang); setWorkerActive(w.active);
    setWorkerError(null); setResetPinResult(null);
    setShowWorkerModal(true);
  };

  const handleSaveWorker = async () => {
    if (!workerName.trim()) { setWorkerError("Name is required"); return; }
    setSubmitting(true); setWorkerError(null);
    if (editingWorker) {
      const result = await updateTimeWorker(editingWorker.id, workerName.trim(), workerRole, workerLang, workerActive);
      if (!result.success) { setWorkerError(result.error ?? "Failed"); setSubmitting(false); return; }
    } else {
      const result = await createTimeWorker(brandId, workerName.trim(), workerRole, workerLang);
      if (!result.success) { setWorkerError(result.error ?? "Failed"); setSubmitting(false); return; }
    }
    setSubmitting(false); setShowWorkerModal(false); load();
  };

  const handleResetPin = async (workerId: string) => {
    const result = await resetTimeWorkerPin(workerId);
    if (result.success && result.pin) setResetPinResult(result.pin);
    else setWorkerError(result.error ?? "Failed to reset PIN");
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm("Delete this worker? This cannot be undone.")) return;
    const result = await deleteTimeWorker(workerId);
    if (!result.success) { setWorkerError(result.error ?? "Failed"); return; }
    load();
  };

  const openAddTask = () => {
    setEditingTask(null); setTaskName(""); setTaskNameEs("");
    setTaskUnit("hours"); setTaskActive(true); setTaskSortOrder(0);
    setTaskError(null); setShowTaskModal(true);
  };

  const openEditTask = (t: TimeTask) => {
    setEditingTask(t); setTaskName(t.name); setTaskNameEs(t.name_es ?? "");
    setTaskUnit(t.unit); setTaskActive(t.active); setTaskSortOrder(t.sort_order);
    setTaskError(null); setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskName.trim()) { setTaskError("Name is required"); return; }
    setSubmitting(true); setTaskError(null);
    if (editingTask) {
      const result = await updateTimeTask(editingTask.id, taskName.trim(), taskNameEs, taskUnit, taskActive, taskSortOrder);
      if (!result.success) { setTaskError(result.error ?? "Failed"); setSubmitting(false); return; }
    } else {
      const result = await createTimeTask(brandId, taskName.trim(), taskNameEs || null, taskUnit, taskSortOrder);
      if (!result.success) { setTaskError(result.error ?? "Failed"); setSubmitting(false); return; }
    }
    setSubmitting(false); setShowTaskModal(false); load();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    const result = await deleteTimeTask(taskId);
    if (!result.success) { setTaskError(result.error ?? "Failed"); return; }
    load();
  };

  const triggerLabel: Record<string, { en: string; color: string }> = {
    daily_approaching:    { en: "Daily OT Approaching",   color: "bg-amber-100 text-amber-700" },
    daily_reached:        { en: "Daily OT Reached",        color: "bg-red-100 text-red-700" },
    weekly_approaching:   { en: "Weekly OT Approaching",  color: "bg-amber-100 text-amber-700" },
    weekly_reached:       { en: "Weekly OT Reached",       color: "bg-red-100 text-red-700" },
    end_of_period_summary:{ en: "Period Summary",          color: "bg-emerald-100 text-emerald-700" },
  };

  if (loading) return <div className="text-center py-16 text-stone-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Time Tracking</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {tab === "dashboard" ? "Summary, exports & recent activity" : "Workers, tasks & overtime rules"}
          </p>
        </div>
      </div>

      {/* Two-tab nav */}
      <div className="flex gap-1 border-b border-stone-200">
        <button onClick={() => setTab("dashboard")} className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 -mb-px ${tab === "dashboard" ? "text-stone-900 border-stone-900" : "text-stone-500 border-transparent hover:text-stone-700"}`}>
          Dashboard
        </button>
        <button onClick={() => setTab("settings")} className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 -mb-px ${tab === "settings" ? "text-stone-900 border-stone-900" : "text-stone-500 border-transparent hover:text-stone-700"}`}>
          Settings
        </button>
      </div>

      {/* Dashboard tab */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-stone-900">{workers.length}</p>
              <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Workers</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-stone-900">{tasks.length}</p>
              <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Tasks</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-amber-600">{notificationLog.filter(n => n.email_sent || n.sms_sent).length}</p>
              <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Alerts Sent</p>
            </div>
          </div>

          {/* Quick export section */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-800">Export Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => triggerDownload(buildExportUrl("quickbooks"))}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-emerald-500 transition-all text-left">
                <span className="text-stone-400">{Icons.clock("h-5 w-5")}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">QuickBooks</p>
                  <p className="text-xs text-stone-500">Time import CSV</p>
                </div>
              </button>
              <button onClick={() => triggerDownload(buildExportUrl("payroll"))}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-blue-500 transition-all text-left">
                <span className="text-stone-400">{Icons.dollarSign("h-5 w-5")}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Payroll</p>
                  <p className="text-xs text-stone-500">ADP / Gusto / Generic</p>
                </div>
              </button>
              <button onClick={() => triggerDownload(buildExportUrl("detailed"))}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-violet-500 transition-all text-left">
                <span className="text-stone-400">{Icons.clipboard("h-5 w-5")}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Detailed Log</p>
                  <p className="text-xs text-stone-500">Full audit report</p>
                </div>
              </button>
              <button onClick={() => triggerDownload(buildExportUrl("summary"))}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-amber-500 transition-all text-left">
                <span className="text-stone-400">{Icons.chart("h-5 w-5")}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Period Summary</p>
                  <p className="text-xs text-stone-500">Per-worker totals</p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-stone-500">
              <span>From:</span>
              <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none focus:border-emerald-500" />
              <span>To:</span>
              <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          {/* Notification log */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">Recent Alerts</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-widest border-b border-stone-100">
                  <th className="text-left px-5 py-3 font-medium">Time</th>
                  <th className="text-left px-5 py-3 font-medium">Worker</th>
                  <th className="text-left px-5 py-3 font-medium">Alert</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">SMS</th>
                </tr>
              </thead>
              <tbody>
                {notificationLog.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-stone-400">No alerts sent yet</td></tr>
                ) : notificationLog.slice(0, 20).map(entry => {
                  const meta = triggerLabel[entry.trigger_type] ?? { en: entry.trigger_type, color: "bg-stone-100 text-stone-500" };
                  return (
                    <tr key={entry.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3.5 text-stone-500 text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-stone-800 font-medium">{entry.worker_name ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>{meta.en}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-emerald-600">{Icons.check("h-4 w-4")}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-stone-300">{entry.sms_sent ? Icons.check("h-4 w-4 text-emerald-600") : "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="space-y-6">
          {/* Workers section */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">Workers & PINs</h3>
              <button onClick={() => { setEditingWorker(null); setWorkerName(""); setWorkerRole("worker"); setWorkerLang("en"); setWorkerActive(true); setShowWorkerModal(true); setWorkerError(null); setResetPinResult(null); }}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-all">+ Add Worker</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-widest border-b border-stone-100">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Role</th>
                  <th className="text-left px-5 py-3 font-medium">Lang</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Last Used</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-stone-400">No workers yet</td></tr>
                ) : workers.map(w => (
                  <tr key={w.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5 text-stone-800 font-medium">{w.name}</td>
                    <td className="px-5 py-3.5 text-stone-500 capitalize">{w.role}</td>
                    <td className="px-5 py-3.5 text-stone-400 uppercase text-xs font-mono">{w.lang}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${w.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                        {w.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-stone-400 text-xs">{w.last_used_at ? new Date(w.last_used_at).toLocaleDateString() : "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditWorker(w)} className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-lg hover:bg-stone-100 transition-all">Edit</button>
                        <button onClick={() => handleResetPin(w.id)} className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-50 transition-all">Reset PIN</button>
                        <button onClick={() => handleDeleteWorker(w.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tasks section */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">Tasks</h3>
              <button onClick={() => { setEditingTask(null); setTaskName(""); setTaskNameEs(""); setTaskUnit("hours"); setTaskSortOrder(0); setTaskActive(true); setShowTaskModal(true); setTaskError(null); }}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all">+ Add Task</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-widest border-b border-stone-100">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Name (ES)</th>
                  <th className="text-left px-5 py-3 font-medium">Unit</th>
                  <th className="text-left px-5 py-3 font-medium">Sort</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-stone-400">No tasks yet</td></tr>
                ) : tasks.map(t => (
                  <tr key={t.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5 text-stone-800 font-medium">{t.name}</td>
                    <td className="px-5 py-3.5 text-stone-500">{t.name_es ?? "—"}</td>
                    <td className="px-5 py-3.5 text-stone-400 text-xs font-mono">{t.unit}</td>
                    <td className="px-5 py-3.5 text-stone-400 text-xs">{t.sort_order}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${t.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                        {t.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditTask(t)} className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-lg hover:bg-stone-100 transition-all">Edit</button>
                        <button onClick={() => handleDeleteTask(t.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pay Period & Overtime section */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-800">Pay Period & Overtime</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">Work week starts on</label>
                <select value={payPeriodStartDay} onChange={e => setPayPeriodStartDay(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">Pay period length</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={31} value={payPeriodLength}
                    onChange={e => setPayPeriodLength(Number(e.target.value))}
                    className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors" />
                  <span className="text-sm text-stone-500">days</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">Daily overtime threshold</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={24} value={dailyOvertimeThreshold}
                    onChange={e => setDailyOvertimeThreshold(Number(e.target.value))}
                    className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors" />
                  <span className="text-sm text-stone-500">hrs</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">Weekly overtime threshold</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={80} value={weeklyOvertimeThreshold}
                    onChange={e => setWeeklyOvertimeThreshold(Number(e.target.value))}
                    className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors" />
                  <span className="text-sm text-stone-500">hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Colorado notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 mt-0.5">{Icons.alert("h-5 w-5")}</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Colorado Overtime Law</p>
                <p className="text-xs text-amber-700 mt-1">Colorado requires daily overtime (1.5×) after 12 hours in a workday, or weekly overtime after 40 hours in a workweek.</p>
              </div>
            </div>
          </div>

          {/* Alert Settings */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-800">Alert Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-700 font-medium">Daily overtime alerts</p>
                  <p className="text-xs text-stone-500">Send notification when worker hits daily threshold</p>
                </div>
                <button onClick={() => setEnableDailyAlerts(!enableDailyAlerts)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enableDailyAlerts ? "bg-emerald-600" : "bg-stone-300"}`}>
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${enableDailyAlerts ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-700 font-medium">Weekly overtime alerts</p>
                  <p className="text-xs text-stone-500">Send notification when worker hits weekly threshold</p>
                </div>
                <button onClick={() => setEnableWeeklyAlerts(!enableWeeklyAlerts)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enableWeeklyAlerts ? "bg-emerald-600" : "bg-stone-300"}`}>
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${enableWeeklyAlerts ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-700 font-medium">Show overtime warning on employee screen</p>
                  <p className="text-xs text-stone-500">Display alert when worker approaches thresholds</p>
                </div>
                <button onClick={() => setOvertimeNotifications(!overtimeNotifications)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${overtimeNotifications ? "bg-emerald-600" : "bg-stone-300"}`}>
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${overtimeNotifications ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Notification Recipients */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-800">Notification Recipients</h3>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">Email addresses</label>
              <div className="flex gap-2">
                <input value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (addEmail(), e.preventDefault())}
                  className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="manager@farm.com" />
                <button onClick={addEmail} className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all">Add</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {notificationEmails.map(e => (
                  <span key={e} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-xs px-2 py-1 rounded-lg">
                    {e}
                    <button onClick={() => removeEmail(e)} className="text-stone-400 hover:text-red-500 ml-1">&times;</button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">SMS numbers</label>
              <div className="flex gap-2">
                <input value={newSms}
                  onChange={e => setNewSms(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (addSms(), e.preventDefault())}
                  className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="+1234567890" />
                <button onClick={addSms} className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all">Add</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {notificationSmsNumbers.map(n => (
                  <span key={n} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-xs px-2 py-1 rounded-lg">
                    {n}
                    <button onClick={() => removeSms(n)} className="text-stone-400 hover:text-red-500 ml-1">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {settingsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl py-3 px-4 text-red-700 text-sm">{settingsError}</div>
          )}
          {settingsSaved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-3 px-4 text-emerald-700 text-sm">Settings saved successfully.</div>
          )}
          <button onClick={handleSaveNotifications} disabled={settingsSaving}
            className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 font-semibold text-sm text-white transition-all">
            {settingsSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}

      {/* Worker Modal */}
      {showWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">{editingWorker ? "Edit Worker" : "Add Worker"}</h3>
              <button onClick={() => setShowWorkerModal(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {workerError && <div className="bg-red-50 border border-red-200 rounded-xl py-3 px-4 text-red-700 text-sm">{workerError}</div>}
              {resetPinResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-3 px-4">
                  <p className="text-emerald-700 text-sm font-semibold mb-1">New PIN:</p>
                  <p className="text-2xl font-mono font-bold text-stone-900">{resetPinResult}</p>
                  <p className="text-stone-500 text-xs mt-1">Show this to the worker — it will not be shown again.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">Name *</label>
                <input value={workerName} onChange={e => setWorkerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Worker name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">Role</label>
                  <select value={workerRole} onChange={e => setWorkerRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="worker">Worker</option>
                    <option value="time_admin">Time Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">Lang</label>
                  <select value={workerLang} onChange={e => setWorkerLang(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="workerActive" checked={workerActive} onChange={e => setWorkerActive(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 bg-white text-emerald-600" />
                <label htmlFor="workerActive" className="text-sm text-stone-700">Active</label>
              </div>
              {editingWorker && (
                <div className="pt-2 border-t border-stone-100">
                  <button onClick={() => handleResetPin(editingWorker.id)} className="text-xs text-amber-600 hover:text-amber-800 font-semibold underline underline-offset-2">
                    Reset PIN for this worker
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowWorkerModal(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-300 transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveWorker} disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all">
                  {submitting ? "..." : editingWorker ? "Save" : "Add Worker"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">{editingTask ? "Edit Task" : "Add Task"}</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {taskError && <div className="bg-red-50 border border-red-200 rounded-xl py-3 px-4 text-red-700 text-sm">{taskError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">Name (EN) *</label>
                <input value={taskName} onChange={e => setTaskName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Harvesting" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">Name (ES)</label>
                <input value={taskNameEs} onChange={e => setTaskNameEs(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Cosecha" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">Unit</label>
                  <select value={taskUnit} onChange={e => setTaskUnit(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="hours">Hours</option>
                    <option value="pieces">Pieces</option>
                    <option value="units">Units</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">Sort Order</label>
                  <input type="number" value={taskSortOrder} onChange={e => setTaskSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="taskActive" checked={taskActive} onChange={e => setTaskActive(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 bg-white text-emerald-600" />
                <label htmlFor="taskActive" className="text-sm text-stone-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-300 transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveTask} disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all">
                  {submitting ? "..." : editingTask ? "Save" : "Add Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}