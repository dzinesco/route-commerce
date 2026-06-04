export type StopStatus = "draft" | "active" | "inactive";

export type Stop = {
  id: string;
  city: string;
  state: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  active: boolean;
  deleted_at?: string | null;
  brand_id: string;
  status?: string;
  address?: string | null;
  zip?: string | null;
  cutoff_time?: string | null;
  brands: { name: string } | { name: string }[];
};

export type StopView = "calendar" | "locations" | "list";

export type LocationGroup = {
  key: string;
  city: string;
  state: string;
  venueCount: number; // distinct location strings at this city
  total: number;
  active: number;
  draft: number;
  inactive: number;
  upcoming: number;
  nextDate: string | null; // YYYY-MM-DD
  firstDate: string | null;
  lastDate: string | null;
  sampleVenue: string;
  stops: Stop[];
};

export function getStopStatus(s: Stop): StopStatus {
  if (s.status === "draft") return "draft";
  return s.active ? "active" : "inactive";
}

export function getStopDate(s: Stop): Date | null {
  if (!s.date) return null;
  const d = new Date(s.date + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export function formatTime12(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return time;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
