"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { mockWorkers, mockTasks, mockTimeEntries } from "@/lib/mock-data";

// TODO(migration): the time-tracking admin RPCs (get_time_tracking_workers,
// create_time_worker, reset_time_worker_pin, update_time_worker,
// delete_time_worker, create_time_task, update_time_task,
// delete_time_task, get_worker_time_logs, update_worker_time_log,
// delete_worker_time_log, get_time_tracking_summary,
// get_time_tracking_settings, update_time_tracking_settings,
// get_time_tracking_notification_log, check_and_notify_overtime) and
// the underlying tables (`time_workers`, `time_tasks`, `time_logs`,
// `time_tracking_settings`, `time_tracking_notification_log`) were
// not carried over into the SaaS rebuild's `db/schema/`. The actions
// below preserve the original signatures and return mock data when
// `NEXT_PUBLIC_USE_MOCK_DATA === "true"`, but the real RPC paths now
// return empty/empty-list results. To bring time tracking back, add
// the tables to `db/schema/` and re-implement against Drizzle. See
// `actions/route-trace/lots.ts` for the same pattern.

// Mock mode flag - only enabled when explicitly set
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimeWorker = {
  id: string;
  brand_id: string;
  name: string;
  role: string;
  lang: string;
  pin: string;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
  worker_number: number | null;
};

export type TimeTask = {
  id: string;
  name: string;
  name_es: string | null;
  unit: string;
  active: boolean;
  sort_order: number;
};

export type TimeLog = {
  id: string;
  worker_id: string;
  worker_name: string;
  task_id: string | null;
  task_name: string;
  clock_in: string;
  clock_out: string | null;
  lunch_break_minutes: number;
  notes: string | null;
  submitted_via: string;
  total_minutes: number;
  created_at: string;
};

export type TimeSummary = {
  by_worker: { id: string; name: string; entry_count: number; total_hours: number }[];
  by_task: { id: string; name: string; name_es: string | null; entry_count: number; total_hours: number }[];
  totals: { entry_count: number; total_hours: number; open_count: number };
};

// ── Workers ───────────────────────────────────────────────────────────────────

export async function getTimeTrackingWorkers(brandId: string): Promise<TimeWorker[]> {
  if (useMockData) {
    return mockWorkers.map(w => ({
      id: w.id,
      brand_id: brandId,
      name: w.name,
      role: w.role,
      lang: w.language,
      pin: "0000",
      active: w.is_active,
      last_used_at: null,
      created_at: new Date().toISOString(),
      worker_number: null,
    }));
  }
  // Time tracking tables not in SaaS rebuild — return empty list.
  return [];
}

export async function createTimeWorker(
  _brandId: string,
  _name: string,
  _role = "worker",
  _lang = "en"
): Promise<{ success: boolean; worker?: TimeWorker; pin?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

export async function resetTimeWorkerPin(_workerId: string): Promise<{ success: boolean; pin?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

export async function updateTimeWorker(
  _workerId: string,
  _name: string,
  _role: string,
  _lang: string,
  _active: boolean
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

export async function deleteTimeWorker(_workerId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function getTimeTrackingTasks(brandId: string, activeOnly = false): Promise<TimeTask[]> {
  if (useMockData) {
    return mockTasks.map(t => ({
      id: t.id,
      name: t.name_en,
      name_es: t.name_es,
      unit: t.unit,
      active: true,
      sort_order: t.sort_order,
    }));
  }
  return [];
}

export async function createTimeTask(
  _brandId: string,
  _name: string,
  _nameEs: string | null = null,
  _unit = "hours",
  _sortOrder = 0
): Promise<{ success: boolean; id?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

export async function updateTimeTask(
  _taskId: string,
  _name: string,
  _nameEs: string,
  _unit: string,
  _active: boolean,
  _sortOrder: number
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

export async function deleteTimeTask(_taskId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

// ── Time Logs ─────────────────────────────────────────────────────────────────

export async function getWorkerTimeLogs(
  brandId: string,
  _options: {
    workerId?: string;
    taskId?: string;
    start?: string;
    end?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<TimeLog[]> {
  if (useMockData) {
    // Filter by worker, task, date range
    let entries = mockTimeEntries.filter(e => e.brand_id === brandId);
    if (_options.workerId) entries = entries.filter(e => e.worker_id === _options.workerId);

    return entries.map(e => {
      const worker = mockWorkers.find(w => w.id === e.worker_id);
      const task = mockTasks.find(t => t.id === e.task_id);
      return {
        id: e.id,
        worker_id: e.worker_id,
        worker_name: worker?.name ?? "Unknown",
        task_id: e.task_id,
        task_name: task?.name_en ?? "Unknown",
        clock_in: `${e.date}T09:00:00Z`,
        clock_out: `${e.date}T${9 + e.hours}:00:00Z`,
        lunch_break_minutes: 0,
        notes: null,
        submitted_via: "web",
        total_minutes: Math.round(e.hours * 60),
        created_at: new Date().toISOString(),
      };
    });
  }
  return [];
}

export async function updateWorkerTimeLog(
  _logId: string,
  _taskName: string,
  _clockIn: string,
  _clockOut: string | null,
  _lunchMinutes: number,
  _notes: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

export async function deleteWorkerTimeLog(_logId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

export async function getTimeTrackingSummary(
  brandId: string,
  _start: string,
  _end: string
): Promise<TimeSummary> {
  if (useMockData) {
    const entries = mockTimeEntries.filter(e => e.brand_id === brandId);

    // Calculate by worker
    const workerMap = new Map<string, { id: string; name: string; total_hours: number; entry_count: number }>();
    entries.forEach(e => {
      const worker = mockWorkers.find(w => w.id === e.worker_id);
      const existing = workerMap.get(e.worker_id) || { id: e.worker_id, name: worker?.name ?? "Unknown", total_hours: 0, entry_count: 0 };
      existing.total_hours += e.hours;
      existing.entry_count += 1;
      workerMap.set(e.worker_id, existing);
    });

    // Calculate by task
    const taskMap = new Map<string, { id: string; name: string; name_es: string | null; total_hours: number; entry_count: number }>();
    entries.forEach(e => {
      const task = mockTasks.find(t => t.id === e.task_id);
      const existing = taskMap.get(e.task_id) || { id: e.task_id, name: task?.name_en ?? "Unknown", name_es: task?.name_es ?? null, total_hours: 0, entry_count: 0 };
      existing.total_hours += e.hours;
      existing.entry_count += 1;
      taskMap.set(e.task_id, existing);
    });

    return {
      by_worker: Array.from(workerMap.values()),
      by_task: Array.from(taskMap.values()),
      totals: {
        entry_count: entries.length,
        total_hours: entries.reduce((sum, e) => sum + e.hours, 0),
        open_count: 0,
      },
    };
  }
  return { by_worker: [], by_task: [], totals: { entry_count: 0, total_hours: 0, open_count: 0 } };
}

// ── Time Tracking Settings ─────────────────────────────────────────────────────

export type TimeTrackingSettings = {
  id: string;
  brand_id: string;
  pay_period_start_day: number;
  pay_period_length_days: number;
  daily_overtime_threshold: number;
  weekly_overtime_threshold: number;
  overtime_multiplier: number;
  overtime_notifications: boolean;
  notification_emails: string[];
  notification_sms_numbers: string[];
  enable_daily_alerts: boolean;
  enable_weekly_alerts: boolean;
  daily_alert_threshold: number;
  weekly_alert_threshold: number;
  send_end_of_period_summary: boolean;
  brand_name: string;
};

export async function getTimeTrackingSettings(brandId: string): Promise<TimeTrackingSettings | null> {
  if (useMockData) {
    return {
      id: "settings-mock",
      brand_id: brandId,
      pay_period_start_day: 0,
      pay_period_length_days: 7,
      daily_overtime_threshold: 8,
      weekly_overtime_threshold: 40,
      overtime_multiplier: 1.5,
      overtime_notifications: true,
      notification_emails: ["admin@tuxedocorn.com"],
      notification_sms_numbers: [],
      enable_daily_alerts: true,
      enable_weekly_alerts: true,
      daily_alert_threshold: 8,
      weekly_alert_threshold: 40,
      send_end_of_period_summary: true,
      brand_name: "Tuxedo Corn",
    };
  }
  // Real RPC not in SaaS rebuild.
  return null;
}

export async function updateTimeTrackingSettings(
  _brandId: string,
  _settings: {
    pay_period_start_day: number;
    pay_period_length_days: number;
    daily_overtime_threshold: number;
    weekly_overtime_threshold: number;
    overtime_multiplier: number;
    overtime_notifications: boolean;
    notification_emails?: string[];
    notification_sms_numbers?: string[];
    enable_daily_alerts?: boolean;
    enable_weekly_alerts?: boolean;
    daily_alert_threshold?: number;
    weekly_alert_threshold?: number;
    send_end_of_period_summary?: boolean;
    brand_name?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  return { success: false, error: "Time tracking is not configured" };
}

// ── Notification Log ─────────────────────────────────────────────────────────

export type NotificationLogEntry = {
  id: string;
  worker_id: string | null;
  worker_name: string | null;
  trigger_type: string;
  threshold_hours: number | null;
  actual_hours: number | null;
  emails_sent: string[];
  sms_numbers_sent: string[];
  email_sent: boolean;
  sms_sent: boolean;
  error_message: string | null;
  created_at: string;
};

export async function getTimeTrackingNotificationLog(
  _brandId: string,
  _limit = 100
): Promise<NotificationLogEntry[]> {
  return [];
}
