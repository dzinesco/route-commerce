import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_reports) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const brandId = searchParams.get("brand_id") ?? adminUser.brand_id;

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Fetch orders report data
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_orders_report?`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }

  const data = await response.json();

  if (format === "csv") {
    const rows = data.orders ?? [];
    const headers = ["id", "customer_name", "customer_email", "status", "subtotal", "created_at"];
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      csvRows.push([
        row.id,
        `"${(row.customer_name ?? "").replace(/"/g, '""')}"`,
        row.customer_email ?? "",
        row.status ?? "",
        row.subtotal ?? 0,
        row.created_at ?? "",
      ].join(","));
    }
    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}