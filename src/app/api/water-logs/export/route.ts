import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminUser.can_manage_water_log) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  // Use brand_id from session (always Tuxedo for water log) or fallback to env
  const brandId = adminUser.brand_id ?? process.env.TUXEDO_BRAND_ID ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  type WaterEntry = {
    id: string;
    user_id: string | null;
    headgate_id: string | null;
    measurement: number | null;
    unit: string | null;
    notes: string | null;
    created_at: string;
  };

  const { rows: data } = await pool.query<{ get_water_entries: WaterEntry[] | null }>(
    `SELECT get_water_entries($1, $2) AS "get_water_entries"`,
    [brandId, 10000],
  );
  const entries = data[0]?.get_water_entries ?? [];

  if (format === "csv") {
    const headers = ["id", "user_id", "headgate_id", "measurement", "unit", "notes", "created_at"];
    const csvRows = [headers.join(",")];
    for (const row of entries) {
      csvRows.push([
        row.id,
        row.user_id ?? "",
        row.headgate_id ?? "",
        row.measurement ?? "",
        row.unit ?? "",
        `"${(row.notes ?? "").replace(/"/g, '""')}"`,
        row.created_at ?? "",
      ].join(","));
    }
    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="water-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(entries);
}
