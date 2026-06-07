/**
 * Orders report export endpoint.
 *
 * The legacy `get_orders_report` RPC is not in the database; this
 * endpoint assembles an equivalent orders report directly from the
 * `orders` + `customers` tables via a single Drizzle query, and
 * returns it as either JSON or CSV.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { withDb, withPlatformAdmin } from "@/db/client";
import { orders } from "@/db/schema/orders";
import { customers } from "@/db/schema/customers";

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
  const brandId = searchParams.get("brand_id") ?? adminUser.brand_id ?? null;

  if (brandId) {
    try { assertBrandAccess(adminUser, brandId); } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // platform_admin with no brandId = cross-tenant report; everyone else
  // must pass a brandId matching their membership.
  const rows = brandId
    ? await withDb((db) =>
        db
          .select({
            id: orders.id,
            tenantId: orders.tenantId,
            customerId: orders.customerId,
            customerName: customers.name,
            customerEmail: customers.email,
            status: orders.status,
            totalCents: orders.totalCents,
            placedAt: orders.placedAt,
          })
          .from(orders)
          .leftJoin(customers, eq(customers.id, orders.customerId))
          .where(eq(orders.tenantId, brandId))
          .orderBy(desc(orders.placedAt))
          .limit(1000),
      )
    : await withPlatformAdmin((db) =>
        db
          .select({
            id: orders.id,
            tenantId: orders.tenantId,
            customerId: orders.customerId,
            customerName: customers.name,
            customerEmail: customers.email,
            status: orders.status,
            totalCents: orders.totalCents,
            placedAt: orders.placedAt,
          })
          .from(orders)
          .leftJoin(customers, eq(customers.id, orders.customerId))
          .orderBy(desc(orders.placedAt))
          .limit(1000),
      );

  if (format === "csv") {
    const headers = ["id", "customer_name", "customer_email", "status", "total_cents", "placed_at"];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      csvRows.push(
        [
          r.id,
          `"${(r.customerName ?? "").replace(/"/g, '""')}"`,
          r.customerEmail ?? "",
          r.status ?? "",
          r.totalCents ?? 0,
          r.placedAt instanceof Date ? r.placedAt.toISOString() : "",
        ].join(","),
      );
    }
    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ orders: rows });
}
