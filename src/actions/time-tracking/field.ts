"use server";

import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function rpcBody(body: Record<string, unknown>) {
  return JSON.stringify(body);
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
  brandId: string,
  pin: string
): Promise<{ success: boolean; session?: TimeTrackingSession; error?: string }> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/verify_time_tracking_pin`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: rpcBody({ p_brand_id: brandId, p_pin: pin }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Invalid PIN" };
  }

  const session: TimeTrackingSession = {
    worker_id: data.worker_id,
    name: data.name,
    role: data.role,
    lang: data.lang,
    session_id: data.session_id,
    brand_id: data.brand_id,
    expires_at: data.expires_at,
  };

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionCookie(session), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return { success: true, session };
}

// ── Clock In ───────────────────────────────────────────────────────────────────

export async function clockInWorker(
  brandId: string,
  taskId?: string,
  taskName = "General Labor"
): Promise<{ success: boolean; log_id?: string; clock_in?: string; error?: string }> {
  const session = await getTimeTrackingSession();
  if (!session) return { success: false, error: "Not logged in" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/clock_in_worker`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: rpcBody({
        p_brand_id: brandId,
        p_worker_id: session.worker_id,
        p_task_id: taskId ?? null,
        p_task_name: taskName,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return { success: true, log_id: data.log_id, clock_in: data.clock_in };
}

// ── Clock Out ──────────────────────────────────────────────────────────────────

export async function clockOutWorker(
  lunchMinutes = 0,
  notes?: string
): Promise<{ success: boolean; log_id?: string; clock_out?: string; total_minutes?: number; error?: string }> {
  const session = await getTimeTrackingSession();
  if (!session) return { success: false, error: "Not logged in" };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/clock_out_worker`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: rpcBody({
        p_worker_id: session.worker_id,
        p_lunch_minutes: lunchMinutes,
        p_notes: notes ?? null,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return {
    success: true,
    log_id: data.log_id,
    clock_out: data.clock_out,
    total_minutes: data.total_minutes,
  };
}

// ── Get Open Clock In ──────────────────────────────────────────────────────────

export async function getOpenClockIn(
  brandId: string
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

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_open_clock_in`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: rpcBody({ p_worker_id: session.worker_id }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.success) return { success: false, error: data?.error ?? "Failed" };
  return {
    success: true,
    open: data.open,
    log_id: data.log_id,
    task_name: data.task_name,
    clock_in: data.clock_in,
    elapsed_minutes: data.elapsed_minutes,
  };
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
  brandId: string,
  activeOnly = true
): Promise<TimeTaskField[]> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_time_tracking_tasks`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: rpcBody({ p_brand_id: brandId, p_active_only: activeOnly }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.tasks ?? [];
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

export async function getWorkerPayPeriodHours(
  brandId: string
): Promise<PayPeriodHours> {
  const session = await getTimeTrackingSession();
  if (!session) return { success: false, total_minutes: 0, total_hours: 0, daily_minutes: 0, daily_hours: 0, weekly_minutes: 0, weekly_hours: 0, daily_overtime: false, weekly_overtime: false, period_start: "", period_end: "", daily_threshold: 12, weekly_threshold: 56 };

  const [hoursRes, settingsRes] = await Promise.all([
    fetch(
      `${supabaseUrl}/rest/v1/rpc/get_worker_pay_period_hours`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        body: rpcBody({ p_brand_id: brandId, p_worker_id: session.worker_id }),
      }
    ),
    fetch(
      `${supabaseUrl}/rest/v1/rpc/get_time_tracking_settings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        body: rpcBody({ p_brand_id: brandId }),
      }
    ),
  ]);

  const data = await hoursRes.json();
  const settings = settingsRes.ok ? (await settingsRes.json()) : null;

  if (!hoursRes.ok) return { success: false, total_minutes: 0, total_hours: 0, daily_minutes: 0, daily_hours: 0, weekly_minutes: 0, weekly_hours: 0, daily_overtime: false, weekly_overtime: false, period_start: "", period_end: "", daily_threshold: 12, weekly_threshold: 56 };

  return {
    ...data,
    daily_threshold: settings ? Number(settings.daily_overtime_threshold) : 12,
    weekly_threshold: settings ? Number(settings.weekly_overtime_threshold) : 56,
  };
}