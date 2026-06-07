"use server";

import { and, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { stops } from "@/db/schema";

export type StopOption = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  zip: string;
  is_upcoming: boolean;
  is_past: boolean;
};

/**
 * The legacy `get_stops_for_segment_picker` RPC returned a denormalized
 * `(id, city, state, date, time, location, zip, ...)` row. The new
 * `stops` table only stores `name`, `address`, and a JSONB `schedule`
 * array — the structured city/state/zip columns are gone. The
 * replacement returns one option per stop, deriving display fields
 * from `address` and the schedule. `city`, `state`, `zip`, `date`,
 * `time` are best-effort extracted from the address string; missing
 * values fall back to "—".
 */
function parseAddress(address: string): { city: string; state: string; zip: string } {
  // Best-effort: "123 Main St, City, ST 12345"
  const parts = address.split(",").map((s) => s.trim());
  const stateZip = parts[parts.length - 1] ?? "";
  const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (stateZipMatch) {
    return {
      city: parts.length >= 2 ? parts[parts.length - 2] : "",
      state: stateZipMatch[1],
      zip: stateZipMatch[2],
    };
  }
  return { city: parts[1] ?? "", state: "", zip: "" };
}

export async function getStopsForSegmentPicker(
  brandId: string,
  stopId?: string
): Promise<StopOption[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) return [];

  try {
    const rows = await withTenant(brandId, (db) =>
      db
        .select({
          id: stops.id,
          name: stops.name,
          address: stops.address,
          schedule: stops.schedule,
        })
        .from(stops)
        .where(
          stopId
            ? and(eq(stops.tenantId, brandId), eq(stops.id, stopId))
            : eq(stops.tenantId, brandId),
        ),
    );

    const now = Date.now();
    return rows.map((r) => {
      const { city, state, zip } = parseAddress(r.address);
      const sched = Array.isArray(r.schedule) ? r.schedule : [];
      const first = sched[0] as { date?: string; time?: string } | undefined;
      const dateStr = first?.date ?? "";
      const timeStr = first?.time ?? "";
      const ts = dateStr ? new Date(dateStr).getTime() : NaN;
      const isUpcoming = Number.isFinite(ts) ? ts >= now : false;
      const isPast = Number.isFinite(ts) ? ts < now : false;
      return {
        id: r.id,
        city,
        state,
        date: dateStr,
        time: timeStr,
        location: r.name,
        zip,
        is_upcoming: isUpcoming,
        is_past: isPast,
      };
    });
  } catch {
    return [];
  }
}
