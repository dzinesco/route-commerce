"use server";

import { cookies } from "next/headers";

// TODO(migration): the time-tracking feature was built on Supabase RPCs
// (verify_time_tracking_pin, clock_in_worker, clock_out_worker,
// get_open_clock_in, get_time_tracking_tasks,
// get_worker_pay_period_hours, get_time_tracking_settings,
// get_water_user_by_id, get_water_admin_session, submit_water_entry,
// trigger_water_alert) plus tables that don't exist in the SaaS rebuild
// schema (`time_workers`, `time_tasks`, `time_logs`, `water_*`). The
// functions below are stubs that preserve the original signature so
// the field UI degrades gracefully (no PIN login, no entry submit) —
// exactly the same pattern as `actions/route-trace/lots.ts`. To bring
// time tracking back, add the tables to `db/schema/` and re-implement
// these functions against Drizzle.

export type TimeTrackingSession = {
  worker_id: string;
  name: string;
  role: string;
  lang: string;
  session_id: string;
  brand_id: string;
  expires_at: string;
};

// ── Cookie helpers ─────────────────────────────────────────────────────────────

const SESSION_COOKIE = "time_tracking_session";
const COOKIE_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

function sessionCookie(session: TimeTrackingSession) {
  return `${session.worker_id}|${session.session_id}|${session.expires_at}`;
}

function parseSessionCookie(cookie: string): TimeTrackingSession | null {
  const parts = cookie.split("|");
  if (parts.length !== 3) return null;
  const [worker_id, session_id, expires_at] = parts;
  if (new Date(expires_at) < new Date()) return null;
  return {
    worker_id,
    name: "",
    role: "worker",
    lang: "en",
    session_id,
    brand_id: "",
    expires_at,
  };
}

// ── Verify PIN ─────────────────────────────────────────────────────────────────

export async function verifyTimeTrackingPin(
  _brandId: string,
  _pin: string
): Promise<{ success: boolean; session?: TimeTrackingSession; error?: string }> {
  // RPC no longer exists; surface a friendly error so the field UI can
  // disable the PIN pad.
  return { success: false, error: "Time tracking is not configured" };
}

// ── Clock In ───────────────────────────────────────────────────────────────────

export async function clockInWorker(
  _brandId: string,
  _taskId?: string,
  _taskName = "General Labor"
): Promise<{ success: boolean; log_id?: string; clock_in?: string; error?: string }> {
  const session = await getTimeTrackingSession();
  if (!session) return { success: false, error: "Not logged in" };
  return { success: false, error: "Time tracking is not configured" };
}

// ── Clock Out ──────────────────────────────────────────────────────────────────

export async function clockOutWorker(
  _lunchMinutes = 0,
  _notes?: string
): Promise<{ success: boolean; log_id?: string; clock_out?: string; total_minutes?: number; error?: string }> {
  const session = await getTimeTrackingSession();
  if (!session) return { success: false, error: "Not logged in" };
  return { success: false, error: "Time tracking is not configured" };
}

// ── Get Open Clock In ──────────────────────────────────────────────────────────

export async function getOpenClockIn(
  _brandId: string
): Promise<{
  success: boolean;
  open?: boolean;
  log_id?: string;
  task_name?: string;
  clock_in?: string;
  elapsed_minutes?: number;
  error?: string;
}> {
  const session = await getTimeTrackingSession();
  if (!session) return { success: false, error: "Not logged in" };
  return { success: true, open: false };
}

// ── Logout ─────────────────────────────────────────────────────────────────────

export async function logoutTimeTracking(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ── Get Current Session ────────────────────────────────────────────────────────

export async function getTimeTrackingSession(): Promise<TimeTrackingSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return null;
  return parseSessionCookie(cookie.value);
}

// ── Get Tasks (for task picker) ─────────────────────────────────────────────────

export type TimeTaskField = {
  id: string;
  name: string;
  name_es: string | null;
  unit: string;
  active: boolean;
  sort_order: number;
};

export async function getTimeTrackingTasksField(
  _brandId: string,
  _activeOnly = true
): Promise<TimeTaskField[]> {
  return [];
}

// ── Pay Period Hours ───────────────────────────────────────────────────────────

export type PayPeriodHours = {
  success: boolean;
  total_minutes: number;
  total_hours: number;
  daily_minutes: number;
  daily_hours: number;
  weekly_minutes: number;
  weekly_hours: number;
  daily_overtime: boolean;
  weekly_overtime: boolean;
  period_start: string;
  period_end: string;
  daily_threshold: number;
  weekly_threshold: number;
};

const EMPTY_PAY_PERIOD: PayPeriodHours = {
  success: false,
  total_minutes: 0,
  total_hours: 0,
  daily_minutes: 0,
  daily_hours: 0,
  weekly_minutes: 0,
  weekly_hours: 0,
  daily_overtime: false,
  weekly_overtime: false,
  period_start: "",
  period_end: "",
  daily_threshold: 12,
  weekly_threshold: 56,
};

export async function getWorkerPayPeriodHours(
  _brandId: string
): Promise<PayPeriodHours> {
  const session = await getTimeTrackingSession();
  if (!session) return { ...EMPTY_PAY_PERIOD };
  return { ...EMPTY_PAY_PERIOD };
}
