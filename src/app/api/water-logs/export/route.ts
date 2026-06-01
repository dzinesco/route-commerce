import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_entries`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId, p_limit: 10000 }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch water log" }, { status: 500 });
  }

  const data = await response.json();

  if (format === "csv") {
    const headers = ["id", "user_id", "headgate_id", "measurement", "unit", "notes", "created_at"];
    const csvRows = [headers.join(",")];
    for (const row of data) {
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

  return NextResponse.json(data);
}
