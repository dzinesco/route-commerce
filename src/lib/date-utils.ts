// Centralized date formatting utilities for Route Commerce
// All display dates in the admin use these helpers — no raw toLocaleString inline

/**
 * Format an ISO date string as "Jan 5, 2025"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Format an ISO datetime string as "Jan 5, 2025 at 2:30 PM"
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Format an ISO date string as YYYY-MM-DD (for form inputs, export filenames)
 */
export function formatDateISO(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Format as YYYY-MM-DDTHH:MM for datetime-local input min values
 */
export function formatDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

/**
 * Relative time: "5m ago", "2h ago", "3d ago"
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "Just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Month name from 0-based index (for selector options)
 */
export function getMonthName(monthIndex: number): string {
  return new Date(0, monthIndex).toLocaleString("en-US", { month: "long" });
}

/**
 * Short month name: "Jan", "Feb"
 */
export function getMonthNameShort(monthIndex: number): string {
  return new Date(0, monthIndex).toLocaleString("en-US", { month: "short" });
}

/**
 * Format a date for display in a label/range: "Jan 5 — Jan 12, 2025"
 */
export function formatDateRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return `${startISO} — ${endISO}`;
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} — ${endStr}`;
}