"use client";
/* eslint-disable react-hooks/set-state-in-effect */

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
import { AdminToggle } from "./design-system/AdminToggle";
import { AdminInput, AdminTextInput, AdminSelect, AdminButton } from "./design-system";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type AccordionProps = {
  title: string;
  id?: string;
  description?: string;
  defaultOpen?: boolean;
  accentColor?: "emerald" | "violet" | "amber" | "stone";
  children: React.ReactNode;
};

function Accordion({ title, id, description, defaultOpen = false, accentColor = "stone", children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const accent = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    stone: "bg-stone-50 text-stone-700 border-stone-200",
  }[accentColor];
  const borderColor = open ? "border-stone-300" : "border-stone-200";

  return (
    <div id={id} className={`rounded-xl border ${borderColor} bg-white shadow-sm overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-stone-900">{title}</span>
          {description && (
            <span className="text-xs text-stone-500 hidden sm:block">{description}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${accent}`}>
            {open ? "Open" : "Closed"}
          </span>
          <svg
            className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>
      <div className={`transition-all duration-200 ${open ? "block" : "hidden"}`}>
        <div className="px-5 pb-5 pt-2">{children}</div>
      </div>
    </div>
  );
}

type Props = {
  brandId: string;
  workersOnly?: boolean;
  tasksOnly?: boolean;
};

export default function SettingsSections({ brandId, workersOnly, tasksOnly }: Props) {
  const [workers, setWorkers] = useState<TimeWorker[]>([]);
  const [tasks, setTasks] = useState<TimeTask[]>([]);
  const [settings, setSettings] = useState<TimeTrackingSettings | null>(null);
  const [notificationLog, setNotificationLog] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings form state
  const [payPeriodStartDay, setPayPeriodStartDay] = useState(0);
  const [payPeriodLength, setPayPeriodLength] = useState(7);
  const [dailyOvertimeThreshold, setDailyOvertimeThreshold] = useState(12);
  const [weeklyOvertimeThreshold, setWeeklyOvertimeThreshold] = useState(56);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [overtimeNotifications, setOvertimeNotifications] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Notification form state
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

  // Worker modal state
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<TimeWorker | null>(null);
  const [workerName, setWorkerName] = useState("");
  const [workerRole, setWorkerRole] = useState("worker");
  const [workerLang, setWorkerLang] = useState("en");
  const [workerActive, setWorkerActive] = useState(true);
  const [resetPinResult, setResetPinResult] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TimeTask | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskNameEs, setTaskNameEs] = useState("");
  const [taskUnit, setTaskUnit] = useState("hours");
  const [taskActive, setTaskActive] = useState(true);
  const [taskSortOrder, setTaskSortOrder] = useState(0);
  const [taskError, setTaskError] = useState<string | null>(null);

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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-stone-500 text-sm">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading settings...
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {(!workersOnly && !tasksOnly) && (
        <>
          {/* ACCORDION 1: General Settings */}
          <Accordion
            id="general"
            title="General Settings"
            description="Pay period, overtime, alerts"
            defaultOpen={true}
            accentColor="stone"
          >
            <div className="space-y-5">
              {/* Pay Period & Overtime */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-stone-800 mb-4">Pay Period & Overtime</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Colorado Overtime Law</p>
                    <p className="text-xs text-amber-700 mt-1">Colorado requires daily overtime (1.5×) after 12 hours in a workday, or weekly overtime after 40 hours in a workweek.</p>
                  </div>
                </div>
              </div>

              {/* Alert Settings */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-stone-800 mb-4">Alert Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--admin-border)]">
                    <div>
                      <p className="text-sm text-[var(--admin-text-primary)] font-medium">Daily overtime alerts</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">Notify when worker hits daily limit</p>
                    </div>
                    <AdminToggle
                      checked={enableDailyAlerts}
                      onChange={setEnableDailyAlerts}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--admin-border)]">
                    <div>
                      <p className="text-sm text-[var(--admin-text-primary)] font-medium">Weekly overtime alerts</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">Notify when worker hits weekly limit</p>
                    </div>
                    <AdminToggle
                      checked={enableWeeklyAlerts}
                      onChange={setEnableWeeklyAlerts}
                    />
                  </div>
                </div>
              </div>

              {/* Notification Recipients */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-stone-800 mb-4">Notification Recipients</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">Email addresses</label>
                    <div className="flex gap-2">
                      <input value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (addEmail(), e.preventDefault())}
                        className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500"
                        placeholder="manager@farm.com" />
                      <button onClick={addEmail} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {notificationEmails.map(e => (
                        <span key={e} className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 text-xs px-2.5 py-1 rounded-lg">
                          {e}
                          <button onClick={() => removeEmail(e)} className="text-stone-400 hover:text-red-500 ml-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
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
                        className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500"
                        placeholder="+1234567890" />
                      <button onClick={addSms} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {notificationSmsNumbers.map(n => (
                        <span key={n} className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 text-xs px-2.5 py-1 rounded-lg">
                          {n}
                          <button onClick={() => removeSms(n)} className="text-stone-400 hover:text-red-500 ml-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {settingsError && (
                <div className="rounded-xl border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10 px-4 py-3 text-sm text-[var(--admin-danger)] flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {settingsError}
                </div>
              )}
              {settingsSaved && (
                <div className="rounded-xl border border-[var(--admin-success)]/30 bg-[var(--admin-success)]/10 px-4 py-3 text-sm text-[var(--admin-success)] flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Settings saved successfully!
                </div>
              )}
              <div className="flex items-center gap-3">
                <AdminButton
                  variant="primary"
                  size="md"
                  onClick={handleSaveNotifications}
                  disabled={settingsSaving}
                >
                  {settingsSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Save Settings
                    </>
                  )}
                </AdminButton>
              </div>
            </div>
          </Accordion>
        </>
      )}

      {/* ACCORDION 2: Workers & PINs */}
      {(workersOnly || (!workersOnly && !tasksOnly)) && (
        <Accordion
          id="workers"
          title="Workers & PINs"
          description={`${workers.length} worker${workers.length !== 1 ? "s" : ""}`}
          defaultOpen={workersOnly}
          accentColor="emerald"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-stone-500">Manage time tracking workers and PIN codes.</p>
              <button onClick={openAddWorker}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-all">+ Add Worker</button>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-500 uppercase tracking-widest border-b border-stone-100">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Lang</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Last Used</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400 text-sm">No workers yet — add one to get started.</td></tr>
                  ) : workers.map(w => (
                    <tr key={w.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3.5 text-stone-900 font-medium">{w.name}</td>
                      <td className="px-4 py-3.5 text-stone-500 capitalize text-xs">{w.role}</td>
                      <td className="px-4 py-3.5 text-stone-400 uppercase text-xs font-mono hidden sm:table-cell">{w.lang}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${w.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                          {w.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-stone-400 text-xs hidden md:table-cell">{w.last_used_at ? new Date(w.last_used_at).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditWorker(w)} className="text-xs text-stone-500 hover:text-stone-900 px-2 py-1 rounded-lg hover:bg-stone-100 transition-all">Edit</button>
                          <button onClick={() => handleResetPin(w.id)} className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-50 transition-all">Reset PIN</button>
                          <button onClick={() => handleDeleteWorker(w.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Accordion>
      )}

      {/* ACCORDION 3: Tasks */}
      {(tasksOnly || (!workersOnly && !tasksOnly)) && (
        <Accordion
          id="tasks"
          title="Tasks"
          description={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
          defaultOpen={tasksOnly}
          accentColor="amber"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-stone-500">Define tasks workers can clock into.</p>
              <button onClick={openAddTask}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all">+ Add Task</button>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-500 uppercase tracking-widest border-b border-stone-100">
                    <th className="text-left px-4 py-3 font-medium">Name (EN)</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Name (ES)</th>
                    <th className="text-left px-4 py-3 font-medium">Unit</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Sort</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400 text-sm">No tasks yet — add one to get started.</td></tr>
                  ) : tasks.map(t => (
                    <tr key={t.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3.5 text-stone-900 font-medium">{t.name}</td>
                      <td className="px-4 py-3.5 text-stone-500 text-xs hidden sm:table-cell">{t.name_es ?? "—"}</td>
                      <td className="px-4 py-3.5 text-stone-400 text-xs font-mono">{t.unit}</td>
                      <td className="px-4 py-3.5 text-stone-400 text-xs hidden md:table-cell">{t.sort_order}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${t.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                          {t.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditTask(t)} className="text-xs text-stone-500 hover:text-stone-900 px-2 py-1 rounded-lg hover:bg-stone-100 transition-all">Edit</button>
                          <button onClick={() => handleDeleteTask(t.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Accordion>
      )}

      {/* Worker Modal */}
      {showWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">{editingWorker ? "Edit Worker" : "Add Worker"}</h3>
              <button onClick={() => setShowWorkerModal(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
              <button onClick={() => setShowTaskModal(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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