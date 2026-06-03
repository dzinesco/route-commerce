"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import LayoutContainer from "@/components/layout/LayoutContainer";
import {
  verifyTimeTrackingPin,
  clockInWorker,
  clockOutWorker,
  getOpenClockIn,
  logoutTimeTracking,
  getTimeTrackingTasksField,
  getWorkerPayPeriodHours,
  getTimeTrackingSession,
  type TimeTrackingSession,
  type TimeTaskField,
  type PayPeriodHours,
} from "@/actions/time-tracking/field";

const BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const BRAND_NAME = "Tuxedo Corn";

const OLATHE_SWEET_LOGO_DARK =
  "https://wnzkhezyhnfzhkhiflrp.supabase.co/storage/v1/object/public/brand-logos/64294306-5f42-463d-a5e8-2ad6c81a96de/olathe-sweet-logo.png";

// ── Translations ───────────────────────────────────────────────────────────────

type Translations = {
  title: string;
  enter_pin: string;
  pin_placeholder: string;
  clock_in: string;
  clock_out: string;
  select_task: string;
  general_labor: string;
  logout: string;
  clocked_in_at: string;
  lunch_break: string;
  notes_placeholder: string;
  submit_clock_out: string;
  invalid_pin: string;
  back_to_login: string;
  cancel: string;
  hours_this_period: string;
  today: string;
  this_week: string;
  overtime_warning: string;
  daily_overtime_hit: string;
  weekly_overtime_hit: string;
  pay_period: string;
  hours_remaining: string;
  overtime: string;
};

const TRANS_EN: Translations = {
  title: "Worker Clock",
  enter_pin: "Enter your 4-digit PIN",
  pin_placeholder: "PIN",
  clock_in: "Clock In",
  clock_out: "Clock Out",
  select_task: "Select a task",
  general_labor: "General Labor",
  logout: "Logout",
  clocked_in_at: "Clocked in at",
  lunch_break: "Lunch break (minutes)",
  notes_placeholder: "Notes (optional)",
  submit_clock_out: "Submit Clock Out",
  invalid_pin: "Invalid PIN. Please try again.",
  back_to_login: "Back to PIN entry",
  cancel: "Cancel",
  hours_this_period: "Hours this pay period",
  today: "Today",
  this_week: "This week",
  overtime_warning: "Overtime threshold reached",
  daily_overtime_hit: "Daily overtime",
  weekly_overtime_hit: "Weekly overtime",
  pay_period: "Pay period",
  hours_remaining: "hours remaining",
  overtime: "Overtime",
};

const TRANS_ES: Translations = {
  title: "Reloj de Trabajador",
  enter_pin: "Ingrese su PIN de 4 dígitos",
  pin_placeholder: "PIN",
  clock_in: "Entrada",
  clock_out: "Salida",
  select_task: "Seleccione una tarea",
  general_labor: "Labor General",
  logout: "Salir",
  clocked_in_at: "Entrada a las",
  lunch_break: "Descanso de almuerzo (minutos)",
  notes_placeholder: "Notas (opcional)",
  submit_clock_out: "Enviar Salida",
  invalid_pin: "PIN inválido. Por favor intente de nuevo.",
  back_to_login: "Volver al PIN",
  cancel: "Cancelar",
  hours_this_period: "Horas este período",
  today: "Hoy",
  this_week: "Esta semana",
  overtime_warning: "Umbral de horas extra alcanzado",
  daily_overtime_hit: "Horas extra diarias",
  weekly_overtime_hit: "Horas extra semanales",
  pay_period: "Período de pago",
  hours_remaining: "horas restantes",
  overtime: "Horas extra",
};

// ── Cookie helpers ─────────────────────────────────────────────────────────────

function getLangCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/time_tracking_lang=(\w+)/);
  return match ? match[1] : "en";
}

function setLangCookie(lang: string) {
  document.cookie = `time_tracking_lang=${lang}; path=/; max-age=86400`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatHoursDecimal(h: number): string {
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  return `${h.toFixed(1)}h`;
}

function formatPeriodRange(start: string, end: string, lang: "en" | "es"): string {
  const s = new Date(start);
  const e = new Date(end);
  if (lang === "es") {
    return `${s.toLocaleDateString("es-ES", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("es-ES", { month: "short", day: "numeric" })}`;
  }
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function taskLabel(task: TimeTaskField, lang: "en" | "es"): string {
  return lang === "en" ? task.name : (task.name_es ?? task.name);
}

// ── Screen types ───────────────────────────────────────────────────────────────

type Screen = "loading" | "pin" | "task_select" | "working" | "clock_out_form" | "clocked_out";

interface OpenEntry {
  log_id: string;
  task_name: string;
  clock_in: string;
  elapsed_minutes: number;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TimeTrackingFieldClient({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
  brandAccent: string;
}) {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [screen, setScreen] = useState<Screen>("pin");
  const [session, setSession] = useState<TimeTrackingSession | null>(null);
  const [tasks, setTasks] = useState<TimeTaskField[]>([]);
  const [openEntry, setOpenEntry] = useState<OpenEntry | null>(null);
  const [payPeriod, setPayPeriod] = useState<PayPeriodHours | null>(null);
  const [clockOutResult, setClockOutResult] = useState<{ clock_out: string; total_minutes: number } | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [lunchMinutes, setLunchMinutes] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const t = lang === "en" ? TRANS_EN : TRANS_ES;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initRef = useRef(false);

  // Load lang preference
  useEffect(() => {
    setLang(getLangCookie() as "en" | "es");
  }, []);

  // Fetch pay period hours
  const loadPayPeriod = async () => {
    const result = await getWorkerPayPeriodHours(brandId);
    if (result.success) setPayPeriod(result);
  };

  // Init
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      // Only check for open clock-in if session exists
      const stored = await getTimeTrackingSession();
      if (!stored) {
        setScreen("pin");
        await loadPayPeriod();
        return;
      }
      setSession(stored);
      const open = await getOpenClockIn(brandId);
      await loadPayPeriod();

      if (open.success && open.open && open.log_id) {
        setOpenEntry({
          log_id: open.log_id!,
          task_name: open.task_name ?? t.general_labor,
          clock_in: open.clock_in!,
          elapsed_minutes: open.elapsed_minutes ?? 0,
        });
        setScreen("working");
      } else {
        setScreen("task_select");
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]); // intentionally omits screen — re-running init on screen change causes race with session cookie being set

  // Poll elapsed + pay period every 30s when on working screen
  useEffect(() => {
    if (screen !== "working") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const open = await getOpenClockIn(brandId);
      if (open.success && open.open && open.log_id) {
        setOpenEntry(prev =>
          prev ? { ...prev, elapsed_minutes: open.elapsed_minutes ?? prev.elapsed_minutes } : null
        );
      }
      await loadPayPeriod();
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [screen, brandId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleLang = () => {
    const next = lang === "en" ? "es" : "en";
    setLangCookie(next);
    setLang(next);
  };

  const handlePinSubmit = async (pin: string) => {
    setError(null);
    const result = await verifyTimeTrackingPin(brandId, pin);
    if (!result.success) {
      setError(result.error ?? t.invalid_pin);
      return;
    }
    setSession(result.session!);
    const [open, taskList] = await Promise.all([
      getOpenClockIn(brandId),
      getTimeTrackingTasksField(brandId),
    ]);
    setTasks(taskList);
    await loadPayPeriod();
    if (open.success && open.open && open.log_id) {
      setOpenEntry({
        log_id: open.log_id!,
        task_name: open.task_name ?? t.general_labor,
        clock_in: open.clock_in!,
        elapsed_minutes: open.elapsed_minutes ?? 0,
      });
      setScreen("working");
    } else {
      setScreen("task_select");
    }
  };

  // Dispatch overtime notification (fire-and-forget)
  const dispatchNotification = async (workerName: string, dailyHours: number, weeklyHours: number) => {
    try {
      await fetch("/api/time-tracking/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, workerId: session?.worker_id, workerName, dailyHours, weeklyHours }),
      });
    } catch {
      // non-critical
    }
  };

  const handleSelectTask = async (taskName: string) => {
    setError(null);
    setSubmitting(true);
    const result = await clockInWorker(brandId, undefined, taskName);
    setSubmitting(false);
    if (!result.success) {
      if (result.error === "Already clocked in") {
        const open = await getOpenClockIn(brandId);
        if (open.success && open.open) {
          setOpenEntry({
            log_id: open.log_id!,
            task_name: open.task_name ?? taskName,
            clock_in: open.clock_in!,
            elapsed_minutes: open.elapsed_minutes ?? 0,
          });
          setScreen("working");
          return;
        }
      }
      setError(result.error ?? "Clock in failed");
      return;
    }
    setOpenEntry({
      log_id: result.log_id!,
      task_name: taskName,
      clock_in: result.clock_in!,
      elapsed_minutes: 0,
    });
    await loadPayPeriod();
    if (payPeriod) {
      dispatchNotification(session?.name ?? taskName, payPeriod.daily_hours, payPeriod.weekly_hours);
    }
    setScreen("working");
  };

  const handleClockOut = async () => {
    setError(null);
    setSubmitting(true);
    const result = await clockOutWorker(lunchMinutes, notes || undefined);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Clock out failed");
      return;
    }
    setClockOutResult({ clock_out: result.clock_out!, total_minutes: result.total_minutes ?? 0 });
    await loadPayPeriod();
    if (payPeriod) {
      dispatchNotification(session?.name ?? openEntry?.task_name ?? "Worker", payPeriod.daily_hours, payPeriod.weekly_hours);
    }
    setScreen("clocked_out");
  };

  const handleLogout = async () => {
    await logoutTimeTracking();
    setSession(null);
    setOpenEntry(null);
    setPayPeriod(null);
    setClockOutResult(null);
    setSelectedTaskId("");
    setLunchMinutes(0);
    setNotes("");
    setScreen("pin");
  };

  const handleBackToPin = () => {
    setClockOutResult(null);
    setOpenEntry(null);
    setPayPeriod(null);
    setSelectedTaskId("");
    setLunchMinutes(0);
    setNotes("");
    setScreen("pin");
  };

  const showOvertimeWarning = payPeriod && (payPeriod.daily_overtime || payPeriod.weekly_overtime);

  return (
    <div className="min-h-screen bg-stone-950 text-zinc-100">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative inline-block h-8 w-auto">
            <Image src={OLATHE_SWEET_LOGO_DARK} alt="Olathe Sweet" fill style={{ objectFit: "contain" }} className="opacity-80" />
          </span>
          <span className="text-sm font-semibold text-zinc-400">{brandName}</span>
        </div>
        <button
          onClick={toggleLang}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-1 transition-colors"
        >
          {lang === "en" ? "ES" : "EN"}
        </button>
      </div>

      <LayoutContainer>
        <div className="max-w-md mx-auto py-8 px-4 space-y-5">

          {screen === "loading" && (
            <div className="text-center text-zinc-500 text-sm py-20">Loading...</div>
          )}

          {screen === "pin" && (
            <PinEntry
              t={t}
              onSubmit={handlePinSubmit}
              error={error}
              submitting={submitting}
            />
          )}

          {(screen === "task_select") && (
            <TaskSelectScreen
              t={t}
              tasks={tasks}
              lang={lang}
              onSelectTask={handleSelectTask}
              error={error}
              submitting={submitting}
            />
          )}

          {screen === "working" && openEntry && (
            <WorkingScreen
              t={t}
              lang={lang}
              openEntry={openEntry}
              payPeriod={payPeriod}
              showOvertimeWarning={showOvertimeWarning ?? false}
              onClockOut={() => setScreen("clock_out_form")}
              onLogout={handleLogout}
            />
          )}

          {screen === "clock_out_form" && openEntry && (
            <ClockOutForm
              t={t}
              tasks={tasks}
              lang={lang}
              openEntryTaskName={openEntry.task_name}
              selectedTaskId={selectedTaskId}
              setSelectedTaskId={setSelectedTaskId}
              lunchMinutes={lunchMinutes}
              setLunchMinutes={setLunchMinutes}
              notes={notes}
              setNotes={setNotes}
              onSubmit={handleClockOut}
              onBack={() => setScreen("working")}
              error={error}
              submitting={submitting}
            />
          )}

          {screen === "clocked_out" && clockOutResult && (
            <ClockedOutScreen
              t={t}
              lang={lang}
              payPeriod={payPeriod}
              clockOutResult={clockOutResult}
              onBackToPin={handleBackToPin}
            />
          )}

        </div>
      </LayoutContainer>
    </div>
  );
}

// ── Pay Period Card ─────────────────────────────────────────────────────────────

function PayPeriodCard({
  t,
  lang,
  payPeriod,
  showWarning,
}: {
  t: Translations;
  lang: "en" | "es";
  payPeriod: PayPeriodHours | null;
  showWarning: boolean;
}) {
  if (!payPeriod) return null;

  const rangeStr = formatPeriodRange(payPeriod.period_start, payPeriod.period_end, lang);
  const dailyRemaining = Math.max(0, payPeriod.daily_threshold - payPeriod.daily_hours);
  const weeklyRemaining = Math.max(0, payPeriod.weekly_threshold - payPeriod.weekly_hours);
  const dailyOT = payPeriod.daily_hours > payPeriod.daily_threshold;
  const weeklyOT = payPeriod.weekly_hours > payPeriod.weekly_threshold;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {t.pay_period}
        </p>
        {showWarning && (
          <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t.overtime_warning}
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-600">{rangeStr}</p>

      {/* Large remaining hours display */}
      {!dailyOT && !weeklyOT ? (
        <div className="text-center py-2">
          <p className="text-4xl font-black text-emerald-400">{formatHoursDecimal(weeklyRemaining)}</p>
          <p className="text-xs text-zinc-500 mt-1">{t.hours_remaining} {t.this_week.toLowerCase()}</p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-2xl font-black text-amber-400">{t.overtime}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {dailyOT ? `${formatHoursDecimal(payPeriod.daily_hours)} ${t.today.toLowerCase()}` : ""}
            {dailyOT && weeklyOT ? " · " : ""}
            {weeklyOT ? `${formatHoursDecimal(payPeriod.weekly_hours)} ${t.this_week.toLowerCase()}` : ""}
          </p>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Main total */}
        <div className="flex-1 text-center">
          <p className="text-3xl font-black text-white">{formatHoursDecimal(payPeriod.total_hours)}</p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">{t.hours_this_period}</p>
        </div>

        {/* Today + week breakdown */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${payPeriod.daily_overtime ? "bg-amber-400" : "bg-zinc-600"}`} />
            <span className="text-xs text-zinc-400">{t.today}</span>
            <span className="text-xs font-mono text-zinc-200 ml-auto">{formatHoursDecimal(payPeriod.daily_hours)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${payPeriod.weekly_overtime ? "bg-amber-400" : "bg-zinc-600"}`} />
            <span className="text-xs text-zinc-400">{t.this_week}</span>
            <span className="text-xs font-mono text-zinc-200 ml-auto">{formatHoursDecimal(payPeriod.weekly_hours)}</span>
          </div>
        </div>
      </div>

      {/* Overtime flags */}
      {(payPeriod.daily_overtime || payPeriod.weekly_overtime) && (
        <div className="flex gap-2 pt-1">
          {payPeriod.daily_overtime && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-900/40 text-amber-400 border border-amber-700/50 rounded-full px-2 py-0.5">
              {t.daily_overtime_hit}
            </span>
          )}
          {payPeriod.weekly_overtime && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-900/40 text-amber-400 border border-amber-700/50 rounded-full px-2 py-0.5">
              {t.weekly_overtime_hit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Working Screen ────────────────────────────────────────────────────────────

function WorkingScreen({
  t,
  lang,
  openEntry,
  payPeriod,
  showOvertimeWarning,
  onClockOut,
  onLogout,
}: {
  t: Translations;
  lang: "en" | "es";
  openEntry: OpenEntry;
  payPeriod: PayPeriodHours | null;
  showOvertimeWarning: boolean;
  onClockOut: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-4">
      <PayPeriodCard t={t} lang={lang} payPeriod={payPeriod} showWarning={showOvertimeWarning} />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700/50 mb-3">
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">{t.clocked_in_at}</p>
        <p className="text-xl font-bold text-white">{formatTime(openEntry.clock_in)}</p>
        <p className="text-sm text-zinc-400 mt-1">{openEntry.task_name}</p>
        <p className="text-3xl font-black text-emerald-400 mt-3">{formatHours(openEntry.elapsed_minutes)}</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={onClockOut}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all"
        >
          {t.clock_out}
        </button>
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl font-semibold text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all"
        >
          {t.logout}
        </button>
      </div>
    </div>
  );
}

// ── Task Select Screen ─────────────────────────────────────────────────────────

function TaskSelectScreen({
  t,
  tasks,
  lang,
  onSelectTask,
  error,
  submitting,
}: {
  t: Translations;
  tasks: TimeTaskField[];
  lang: "en" | "es";
  onSelectTask: (name: string) => void;
  error: string | null;
  submitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="relative inline-block h-14 w-auto">
          <Image src={OLATHE_SWEET_LOGO_DARK} alt="Olathe Sweet" fill style={{ objectFit: "contain" }} className="mx-auto opacity-80 mb-3" />
        </span>
        <h1 className="text-2xl font-black text-white">{t.title}</h1>
        <p className="text-sm text-zinc-400 mt-1">{t.select_task}</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl py-3 px-4 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => onSelectTask(t.general_labor)}
          disabled={submitting}
          className="w-full text-left px-4 py-3.5 rounded-xl border border-emerald-600 bg-emerald-900/20 text-emerald-400 font-medium hover:bg-emerald-900/30 transition-all disabled:opacity-40"
        >
          {t.general_labor}
        </button>
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => onSelectTask(taskLabel(task, lang))}
            disabled={submitting}
            className="w-full text-left px-4 py-3.5 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 transition-all disabled:opacity-40"
          >
            <span className="font-medium">{taskLabel(task, lang)}</span>
            <span className="text-zinc-500 text-xs ml-2">({task.unit})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Clock Out Form ────────────────────────────────────────────────────────────

function ClockOutForm({
  t,
  tasks,
  lang,
  openEntryTaskName,
  selectedTaskId,
  setSelectedTaskId,
  lunchMinutes,
  setLunchMinutes,
  notes,
  setNotes,
  onSubmit,
  onBack,
  error,
  submitting,
}: {
  t: Translations;
  tasks: TimeTaskField[];
  lang: "en" | "es";
  openEntryTaskName: string;
  selectedTaskId: string;
  setSelectedTaskId: (id: string) => void;
  lunchMinutes: number;
  setLunchMinutes: (m: number) => void;
  notes: string;
  setNotes: (n: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
  submitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-zinc-400 uppercase tracking-widest mb-1">{t.clock_out}</p>
        <p className="text-lg font-bold text-white">{openEntryTaskName}</p>
      </div>

      <div className="space-y-4">
        {/* Task */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            {t.select_task}
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSelectedTaskId("")}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                selectedTaskId === ""
                  ? "border-emerald-500 bg-emerald-900/20 text-emerald-400"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {t.general_labor}
            </button>
            {tasks.map(task => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedTaskId === task.id
                    ? "border-emerald-500 bg-emerald-900/20 text-emerald-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span className="font-medium">{taskLabel(task, lang)}</span>
                <span className="text-zinc-500 text-xs ml-2">({task.unit})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lunch */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            {t.lunch_break}
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={lunchMinutes}
            onChange={e => setLunchMinutes(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-center font-mono text-lg focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            {t.notes_placeholder}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/50 rounded-xl py-3 px-4">
            {error}
          </p>
        )}

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all"
        >
          {submitting ? "..." : t.submit_clock_out}
        </button>

        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl font-semibold text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

// ── Clocked Out Screen ─────────────────────────────────────────────────────────

function ClockedOutScreen({
  t,
  lang,
  payPeriod,
  clockOutResult,
  onBackToPin,
}: {
  t: Translations;
  lang: "en" | "es";
  payPeriod: PayPeriodHours | null;
  clockOutResult: { clock_out: string; total_minutes: number };
  onBackToPin: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/40 border border-emerald-700/50 mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-zinc-400 uppercase tracking-widest mb-1">{t.clock_out}</p>
        <p className="text-2xl font-bold text-white">{formatTime(clockOutResult.clock_out)}</p>
        <p className="text-zinc-400 text-sm mt-2">
          {lang === "en" ? "Total time:" : "Tiempo total:"}{" "}
          <span className="text-emerald-400 font-bold">{formatHours(clockOutResult.total_minutes)}</span>
        </p>
      </div>

      {payPeriod && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{t.hours_this_period}</p>
          <p className="text-2xl font-black text-white">{formatHoursDecimal(payPeriod.total_hours)}</p>
          {(payPeriod.daily_overtime || payPeriod.weekly_overtime) && (
            <div className="flex justify-center gap-2 mt-2">
              {payPeriod.daily_overtime && (
                <span className="text-[10px] font-bold uppercase bg-amber-900/40 text-amber-400 border border-amber-700/50 rounded-full px-2 py-0.5">
                  {t.daily_overtime_hit}
                </span>
              )}
              {payPeriod.weekly_overtime && (
                <span className="text-[10px] font-bold uppercase bg-amber-900/40 text-amber-400 border border-amber-700/50 rounded-full px-2 py-0.5">
                  {t.weekly_overtime_hit}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onBackToPin}
        className="w-full py-3 rounded-2xl font-semibold text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all"
      >
        {t.back_to_login}
      </button>
    </div>
  );
}

// ── PIN Entry ─────────────────────────────────────────────────────────────────

function PinEntry({
  t,
  onSubmit,
  error,
  submitting,
}: {
  t: Translations;
  onSubmit: (pin: string) => void;
  error: string | null;
  submitting: boolean;
}) {
  const [pin, setPin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;
    onSubmit(pin);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="relative inline-block h-14 w-auto">
          <Image src={OLATHE_SWEET_LOGO_DARK} alt="Olathe Sweet" fill style={{ objectFit: "contain" }} className="mx-auto opacity-80 mb-3" />
        </span>
        <h1 className="text-2xl font-black text-white">{t.title}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 text-center">
            {t.enter_pin}
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder={t.pin_placeholder}
            className="w-full text-center text-3xl font-mono tracking-widest py-5 rounded-2xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            autoComplete="off"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/50 rounded-xl py-3 px-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pin.length !== 4 || submitting}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
        >
          {submitting ? "..." : t.clock_in}
        </button>
      </form>
    </div>
  );
}