"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import { mockWorkers, mockTasks, mockTimeEntries } from "@/lib/mock-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Mock mode flag - only enabled when explicitly set
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

function rpcBody(body: Record<string, unknown>) {
  return JSON.stringify(body);
}

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
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_time_tracking_workers`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_brand_id: brandId }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.workers ?? []).map((w: Record<string, unknown>) => ({
    id: w.id as string,
    brand_id: w.brand_id as string,
    name: w.name as string,
    role: w.role as string,
    lang: w.lang as string,
    pin: w.pin as string,
    active: w.active as boolean,
    last_used_at: w.last_used_at as string | null,
    created_at: w.created_at as string,
    worker_number: w.worker_number as number | null,
  }));
}

export async function createTimeWorker(
  brandId: string,
  name: string,
  role = "worker",
  lang = "en"
): Promise<{ success: boolean; worker?: TimeWorker; pin?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/create_time_worker`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_brand_id: brandId, p_name: name, p_role: role, p_lang: lang }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true, worker: data.worker, pin: data.pin };
}

export async function resetTimeWorkerPin(workerId: string): Promise<{ success: boolean; pin?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/reset_time_worker_pin`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_worker_id: workerId }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true, pin: data.pin };
}

export async function updateTimeWorker(
  workerId: string,
  name: string,
  role: string,
  lang: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_time_worker`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_worker_id: workerId, p_name: name, p_role: role, p_lang: lang, p_active: active }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true };
}

export async function deleteTimeWorker(workerId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_time_worker`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_worker_id: workerId }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true };
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
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_time_tracking_tasks`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_brand_id: brandId, p_active_only: activeOnly }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.tasks ?? [];
}

export async function createTimeTask(
  brandId: string,
  name: string,
  nameEs: string | null = null,
  unit = "hours",
  sortOrder = 0
): Promise<{ success: boolean; id?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/create_time_task`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_brand_id: brandId, p_name: name, p_name_es: nameEs, p_unit: unit, p_sort_order: sortOrder }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true, id: data.id };
}

export async function updateTimeTask(
  taskId: string,
  name: string,
  nameEs: string,
  unit: string,
  active: boolean,
  sortOrder: number
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_time_task`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_task_id: taskId, p_name: name, p_name_es: nameEs, p_unit: unit, p_active: active, p_sort_order: sortOrder }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true };
}

export async function deleteTimeTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_time_task`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_task_id: taskId }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true };
}

// ── Time Logs ─────────────────────────────────────────────────────────────────

export async function getWorkerTimeLogs(
  brandId: string,
  options: {
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
    if (options.workerId) entries = entries.filter(e => e.worker_id === options.workerId);
    
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
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_worker_time_logs`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({
        p_brand_id: brandId,
        p_worker_id: options.workerId ?? null,
        p_task_id: options.taskId ?? null,
        p_start: options.start ?? null,
        p_end: options.end ?? null,
        p_limit: options.limit ?? 200,
        p_offset: options.offset ?? 0,
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.logs ?? [];
}

export async function updateWorkerTimeLog(
  logId: string,
  taskName: string,
  clockIn: string,
  clockOut: string | null,
  lunchMinutes: number,
  notes: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_worker_time_log`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({
        p_log_id: logId,
        p_task_name: taskName,
        p_clock_in: clockIn,
        p_clock_out: clockOut,
        p_lunch_minutes: lunchMinutes,
        p_notes: notes,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true };
}

export async function deleteWorkerTimeLog(logId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_worker_time_log`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_log_id: logId }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true };
}

export async function getTimeTrackingSummary(
  brandId: string,
  start: string,
  end: string
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
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_time_tracking_summary`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_brand_id: brandId, p_start: start, p_end: end }),
    }
  );
  if (!res.ok) return { by_worker: [], by_task: [], totals: { entry_count: 0, total_hours: 0, open_count: 0 } };
  return res.json();
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
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_time_tracking_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_brand_id: brandId }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

export async function updateTimeTrackingSettings(
  brandId: string,
  settings: {
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

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_time_tracking_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({
        p_brand_id: brandId,
        p_pay_period_start_day: settings.pay_period_start_day,
        p_pay_period_length_days: settings.pay_period_length_days,
        p_daily_threshold: settings.daily_overtime_threshold,
        p_weekly_threshold: settings.weekly_overtime_threshold,
        p_overtime_multiplier: settings.overtime_multiplier,
        p_overtime_notifications: settings.overtime_notifications,
        p_notification_emails: settings.notification_emails ?? null,
        p_notification_sms_numbers: settings.notification_sms_numbers ?? null,
        p_enable_daily_alerts: settings.enable_daily_alerts ?? null,
        p_enable_weekly_alerts: settings.enable_weekly_alerts ?? null,
        p_daily_alert_threshold: settings.daily_alert_threshold ?? null,
        p_weekly_alert_threshold: settings.weekly_alert_threshold ?? null,
        p_send_end_of_period_summary: settings.send_end_of_period_summary ?? null,
        p_brand_name: settings.brand_name ?? null,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true };
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
  brandId: string,
  limit = 100
): Promise<NotificationLogEntry[]> {
  if (useMockData) {
    // Return empty log in mock mode
    return [];
  }
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_time_tracking_notification_log`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: rpcBody({ p_brand_id: brandId, p_limit: limit }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data ?? [];
}
