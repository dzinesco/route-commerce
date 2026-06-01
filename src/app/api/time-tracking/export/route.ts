import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { getTimeTrackingSettings, getTimeTrackingWorkers, getWorkerTimeLogs } from "@/actions/time-tracking";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";

type LogEntry = {
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
  brandId: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function csvRow(values: (string | number | boolean | null)[]): string {
  return values.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
}

// Determine current pay period from settings
function getPayPeriodDates(
  startDay: number,
  lengthDays: number
): { start: string; end: string } {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0=Sun
  const daysSinceStartDay = (currentDayOfWeek - startDay + 7) % 7;
  const periodStart = new Date(now);
  periodStart.setDate(now.getDate() - daysSinceStartDay - (lengthDays - 1));
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + lengthDays - 1);
  return {
    start: formatDate(periodStart.toISOString()),
    end: formatDate(periodEnd.toISOString()),
  };
}

type ExportType = "quickbooks" | "payroll" | "detailed" | "summary";

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const exportType = (searchParams.get("type") ?? "detailed") as ExportType;
  const brandFilter = searchParams.get("brand") ?? null; // "tuxedo" | "ird" | null
  const startDate = searchParams.get("start") ?? "";
  const endDate = searchParams.get("end") ?? "";
  const includeOvertime = searchParams.get("overtime") !== "false";
  const includeNotes = searchParams.get("notes") !== "false";

  // Determine brand IDs to export
  let brandIds: string[] = [];
  if (brandFilter === "tuxedo") brandIds = [TUXEDO_BRAND_ID];
  else if (brandFilter === "ird") brandIds = [IRD_BRAND_ID];
  else if (adminUser.brand_id) brandIds = [adminUser.brand_id];
  else brandIds = [TUXEDO_BRAND_ID, IRD_BRAND_ID];

  // Collect all logs across brands
  let allLogs: LogEntry[] = [];
  let allSettings: Awaited<ReturnType<typeof getTimeTrackingSettings>>[] = [];
  let allWorkers: Awaited<ReturnType<typeof getTimeTrackingWorkers>>[] = [];

  for (const brandId of brandIds) {
    const [workers, settings, logs] = await Promise.all([
      getTimeTrackingWorkers(brandId),
      getTimeTrackingSettings(brandId),
      getWorkerTimeLogs(brandId, {
        start: startDate || undefined,
        end: endDate || undefined,
        limit: 5000,
      }),
    ]);
    allWorkers.push(workers);
    allSettings.push(settings);
    allLogs = allLogs.concat((logs as LogEntry[]).map(l => ({ ...l, brandId })));
  }

  // Sort by clock_in
  allLogs.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

  // Default to current pay period if no dates given
  const defaultPeriod = getPayPeriodDates(0, 7);
  const start = startDate || defaultPeriod.start;
  const end = endDate || defaultPeriod.end;

  // Filter by date range
  allLogs = allLogs.filter(l => {
    const d = formatDate(l.clock_in);
    return d >= start && d <= end;
  });

  // Helper to compute overtime for a log entry
  function computeOvertime(log: (typeof allLogs)[0], settings: NonNullable<typeof allSettings[0]>) {
    if (!includeOvertime) return { regularHours: 0, overtimeHours: 0 };
    const totalHours = log.total_minutes / 60;
    const dailyThreshold = Number(settings.daily_overtime_threshold);
    const weeklyThreshold = Number(settings.weekly_overtime_threshold);
    // Compute which threshold was hit
    const overtimeHours = Math.max(0, totalHours - dailyThreshold);
    const regularHours = totalHours - overtimeHours;
    return { regularHours, overtimeHours };
  }

  let csv = "";
  let filename = "";

  if (exportType === "quickbooks") {
    // QuickBooks Time import format
    // Columns: Employee Name, Date, Clock In, Clock Out, Hours, Task/Service Item, Overtime Hours, Notes
    const headers = ["Employee Name", "Date", "Clock In", "Clock Out", "Hours", "Task / Service Item", "Overtime Hours", "Notes"];
    const rows = allLogs.map((log, i) => {
      const worker = allWorkers.flat().find(w => w.id === log.worker_id);
      const settings = allSettings.find(s => s && s.brand_id === log.brandId);
      const { regularHours, overtimeHours } = settings ? computeOvertime(log, settings) : { regularHours: 0, overtimeHours: 0 };
      const totalHours = log.total_minutes / 60;
      return [
        log.worker_name,
        formatDate(log.clock_in),
        formatTime(log.clock_in),
        log.clock_out ? formatTime(log.clock_out) : "",
        totalHours.toFixed(2),
        log.task_name,
        overtimeHours > 0 ? overtimeHours.toFixed(2) : "",
        log.notes ?? "",
      ];
    });
    csv = [headers, ...rows].map(csvRow).join("\n");
    filename = `time-tracking-quickbooks-${start}-to-${end}.csv`;
  }
  else if (exportType === "payroll") {
    // Standard payroll export — grouped by worker with totals
    // Columns: Worker Name, Role, Total Hours, Regular Hours, Overtime Hours, Days Worked, Tasks
    const workerMap = new Map<string, {
      name: string; role: string; totalMin: number; days: Set<string>; tasks: Set<string>;
      dailyOTMin: number; weeklyOTMin: number;
    }>();
    for (const log of allLogs) {
      if (!workerMap.has(log.worker_id)) {
        const w = allWorkers.flat().find(w => w.id === log.worker_id);
        workerMap.set(log.worker_id, {
          name: log.worker_name,
          role: w?.role ?? "worker",
          totalMin: 0, days: new Set(), tasks: new Set(),
          dailyOTMin: 0, weeklyOTMin: 0,
        });
      }
      const entry = workerMap.get(log.worker_id)!;
      entry.totalMin += log.total_minutes;
      entry.days.add(formatDate(log.clock_in));
      entry.tasks.add(log.task_name);
    }
    const headers = ["Worker Name", "Role", "Days Worked", "Total Hours", "Regular Hours", "Overtime Hours", "Tasks"];
    const rows = [...workerMap.values()].map(e => {
      const totalH = e.totalMin / 60;
      const otH = Math.max(0, totalH - 40); // weekly OT at 40h
      const regH = totalH - otH;
      return [
        e.name,
        e.role,
        e.days.size,
        totalH.toFixed(2),
        regH.toFixed(2),
        otH > 0 ? otH.toFixed(2) : "",
        [...e.tasks].join("; "),
      ];
    });
    csv = [headers, ...rows].map(csvRow).join("\n");
    filename = `time-tracking-payroll-${start}-to-${end}.csv`;
  }
  else if (exportType === "summary") {
    // Pay period summary — one row per worker per pay period
    const brandName = allSettings[0]?.brand_name ?? "Farm";
    const headers = ["Brand", "Worker Name", "Pay Period Start", "Pay Period End", "Total Hours", "Daily OT Hours", "Weekly OT Hours", "Status"];
    const workerMap = new Map<string, {
      brandName: string; name: string; totalMin: number; dailyOT: number; weeklyOT: number;
    }>();
    for (const log of allLogs) {
      if (!workerMap.has(log.worker_id)) {
        const settings = allSettings.find(s => s && s.brand_id === log.brandId);
        workerMap.set(log.worker_id, {
          brandName: settings?.brand_name ?? brandName,
          name: log.worker_name,
          totalMin: 0, dailyOT: 0, weeklyOT: 0,
        });
      }
      const entry = workerMap.get(log.worker_id)!;
      const totalH = log.total_minutes / 60;
      const settings = allSettings.find(s => s && s.brand_id === log.brandId);
      if (settings) {
        const dailyThr = Number(settings.daily_overtime_threshold);
        const weeklyThr = Number(settings.weekly_overtime_threshold);
        if (totalH > dailyThr) entry.dailyOT += (totalH - dailyThr);
        if (totalH > weeklyThr) entry.weeklyOT += (totalH - weeklyThr);
      }
      entry.totalMin += log.total_minutes;
    }
    const rows = [...workerMap.values()].map(e => {
      const totalH = e.totalMin / 60;
      return [
        e.brandName,
        e.name,
        start, end,
        totalH.toFixed(2),
        e.dailyOT > 0 ? e.dailyOT.toFixed(2) : "",
        e.weeklyOT > 0 ? e.weeklyOT.toFixed(2) : "",
        e.weeklyOT > 0 ? "OVERTIME" : totalH > 40 ? "NEAR OT" : "OK",
      ];
    });
    csv = [headers, ...rows].map(csvRow).join("\n");
    filename = `time-tracking-summary-${start}-to-${end}.csv`;
  }
  else {
    // Detailed audit log
    const headers = [
      "Worker Name", "Task", "Date", "Clock In", "Clock Out",
      "Lunch (min)", "Total Minutes", "Hours", "Overtime Hours",
      "Submitted Via", "Notes", "Brand",
    ];
    const rows = allLogs.map(log => {
      const settings = allSettings.find(s => s && s.brand_id === log.brandId);
      const { regularHours, overtimeHours } = settings ? computeOvertime(log, settings) : { regularHours: 0, overtimeHours: 0 };
      return [
        log.worker_name,
        log.task_name,
        formatDate(log.clock_in),
        formatTime(log.clock_in),
        log.clock_out ? formatTime(log.clock_out) : "",
        log.lunch_break_minutes,
        log.total_minutes,
        (log.total_minutes / 60).toFixed(2),
        overtimeHours > 0 ? overtimeHours.toFixed(2) : "",
        log.submitted_via,
        log.notes ?? "",
        allSettings.find(s => s && s.brand_id === log.brandId)?.brand_name ?? "",
      ];
    });
    csv = [headers, ...rows].map(csvRow).join("\n");
    filename = `time-tracking-detailed-${start}-to-${end}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}