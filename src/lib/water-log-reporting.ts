/**
 * Water Log reporting - shapes entries for export, sync, and display.
 */

export type WaterLogReportRow = {
  logged_at: string;
  headgate_name: string;
  user_name: string;
  user_role: string;
  measurement: number;
  unit: string;
  notes: string | null;
  submitted_via: string;
};

export type WaterLogFilter = {
  dateFrom?: string;
  dateTo?: string;
  headgateId?: string;
  userId?: string;
  submittedVia?: string;
};

export type IrrigationSeasonSettings = {
  seasonStartMonth: number;
  seasonStartDay: number;
  seasonEndMonth: number;
  seasonEndDay: number;
};

export type DailyReportOptions = {
  recipientName?: string;
  seasonLabel?: string;
  sendEvenIfEmpty?: boolean;
  previewMode?: boolean;
};

export const WATER_LOG_DISPLAY_REFRESH_MS = 30_000;

export function getDisplayAgeLabel(minutes: number | null): string {
  if (minutes === null) return "never";
  if (minutes < 1) return "just now";
  if (minutes < 60) return Math.floor(minutes) + "m ago";
  if (minutes < 120) return "1h ago";
  if (minutes < 1440) return Math.floor(minutes / 60) + "h ago";
  return Math.floor(minutes / 1440) + "d ago";
}

export function getDisplayAgeColor(minutes: number | null): "green" | "yellow" | "red" {
  if (minutes === null) return "red";
  if (minutes < 30) return "green";
  if (minutes < 120) return "yellow";
  return "red";
}

export function shapeWaterLogEntry(entry: {
  id: string;
  logged_at: string;
  headgate_name: string;
  user_name: string;
  measurement: number;
  unit: string;
  notes: string | null;
  submitted_via: string;
  user_id?: string;
  [key: string]: unknown;
}): WaterLogReportRow {
  return {
    logged_at: entry.logged_at,
    headgate_name: entry.headgate_name,
    user_name: entry.user_name,
    user_role: (entry.user_role as string) ?? "irrigator",
    measurement: entry.measurement,
    unit: entry.unit,
    notes: entry.notes ?? null,
    submitted_via: entry.submitted_via,
  };
}

export function filterWaterLogEntries(
  rows: WaterLogReportRow[],
  filters: WaterLogFilter
): WaterLogReportRow[] {
  return rows.filter((row) => {
    if (filters.dateFrom && row.logged_at < filters.dateFrom) return false;
    if (filters.dateTo) {
      const toEnd = filters.dateTo + "T23:59:59.999Z";
      if (row.logged_at > toEnd) return false;
    }
    if (filters.headgateId && row.headgate_name !== filters.headgateId) return false;
    if (filters.userId && row.user_name !== filters.userId) return false;
    if (filters.submittedVia && row.submitted_via !== filters.submittedVia) return false;
    return true;
  });
}

function csvEncode(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}

export function waterLogToCSV(rows: WaterLogReportRow[]): string {
  const headers = ["When", "Headgate", "User", "Role", "Measurement", "Unit", "Notes", "Via"];
  const lines: string[] = [headers.join(",")];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cells = [
      csvEncode(r.logged_at),
      csvEncode(r.headgate_name),
      csvEncode(r.user_name),
      csvEncode(r.user_role),
      String(r.measurement),
      csvEncode(r.unit),
      csvEncode(r.notes ?? ""),
      csvEncode(r.submitted_via),
    ];
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

export function downloadWaterLogCSV(filename: string, rows: WaterLogReportRow[]): void {
  const csv = waterLogToCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function isInIrrigationSeason(
  date: Date,
  settings: IrrigationSeasonSettings = {
    seasonStartMonth: 3,
    seasonStartDay: 15,
    seasonEndMonth: 10,
    seasonEndDay: 15,
  }
): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const start = settings.seasonStartMonth * 100 + settings.seasonStartDay;
  const end = settings.seasonEndMonth * 100 + settings.seasonEndDay;
  const current = month * 100 + day;
  if (start <= end) {
    return current >= start && current <= end;
  } else {
    return current >= start || current <= end;
  }
}

export function formatDailyWaterReport(
  rows: WaterLogReportRow[],
  opts: DailyReportOptions = {}
): string | null {
  const today = new Date();
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dateLabel = months[today.getMonth()] + " " + today.getDate() + ", " + today.getFullYear();
  const count = rows.length;

  if (count === 0) {
    if (!opts.sendEvenIfEmpty) return null;
    return "Water Log Summary - " + dateLabel + "\nNo entries reported today.\n\nSent by Route Commerce Water Log";
  }

  let total = 0;
  for (let j = 0; j < rows.length; j++) {
    total += rows[j].measurement;
  }

  const lines: string[] = [
    "Water Log Summary - " + dateLabel,
    count + " " + (count === 1 ? "entry" : "entries") + " reported today  (" + total.toFixed(2) + " total)",
    "",
  ];

  for (let k = 0; k < rows.length; k++) {
    const row = rows[k];
    const time = new Date(row.logged_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    let entryLine = time + " | " + row.user_name + " | " + row.headgate_name + " | " + row.measurement + " " + row.unit;
    if (row.notes) {
      entryLine += ' - "' + row.notes + '"';
    }
    lines.push(entryLine);
  }

  lines.push("", "Sent by Route Commerce Water Log");
  return lines.join("\n");
}