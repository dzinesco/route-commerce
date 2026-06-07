"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export type DateRange = { start: string; end: string };

// ── Types ────────────────────────────────────────────────────────────────────

export type ReportsSummary = {
  gross_sales: number;
  total_orders: number;
  avg_order_value: number;
  pickup_orders: number;
  shipping_orders: number;
  pending_pickups: number;
  completed_pickups: number;
  contacts_added: number;
  campaigns_sent: number;
  messages_logged: number;
};

export type OrderByStop = {
  stop_name: string;
  city: string;
  state: string;
  date: string;
  order_count: number;
  gross_sales: number;
  pending_count: number;
  completed_count: number;
};

export type SalesByProduct = {
  product_name: string;
  units_sold: number;
  gross_revenue: number;
  avg_price: number;
};

export type FulfillmentRow = {
  fulfillment_type: string;
  order_count: number;
  revenue: number;
  pct_of_total: number;
};

export type PickupStatusByStop = {
  stop_name: string;
  city: string;
  date: string;
  total_orders: number;
  pending: number;
  completed: number;
  canceled: number;
};

export type ContactGrowthRow = {
  date: string;
  new_contacts: number;
  imports: number;
  total: number;
};

export type CampaignActivityRow = {
  campaign_name: string;
  status: string;
  campaign_type: string;
  sent_at: string | null;
  messages_logged: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
//
// The reports V1 RPCs (`get_reports_summary`, `get_orders_by_stop_report`, etc.)
// from `supabase/migrations/031_reports_v1_rpcs.sql` reference legacy columns
// (`orders.subtotal`, `stops.city/state/date`, `communication_contacts`).
// The SaaS rebuild has a different `orders` schema (`total_cents`, no
// `stop_id`/`city`/`state` columns on `stops`) and a different contacts table
// (`customers` instead of `communication_contacts`). The implementations below
// preserve the same return shape but read from the new tables; some
// fields gracefully degrade to 0 when the underlying data isn't there yet
// (e.g. `stop_name` joins fall back to "—").

/** Substitute the brandId into the SQL — null = platform admin (all brands). */
function brandClause(brandId: string | null, tableAlias = "o"): string {
  return brandId ? `AND ${tableAlias}.tenant_id = $3::uuid` : "";
}

function brandParams(brandId: string | null): unknown[] {
  return brandId ? [brandId] : [];
}

// ── Report actions ──────────────────────────────────────────────────────────

export async function getReportsSummary(range: DateRange, brandId: string | null = null) {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  const effectiveBrandId = adminUser.role === "brand_admin" ? adminUser.brand_id : brandId;

  const { rows } = await pool.query<ReportsSummary>(
    `SELECT
       COALESCE(SUM(total_cents), 0)::float / 100.0 AS gross_sales,
       COUNT(*)::int AS total_orders,
       COALESCE(ROUND(AVG(total_cents)::numeric, 2), 0)::float AS avg_order_value,
       0::int AS pickup_orders,
       0::int AS shipping_orders,
       COUNT(*) FILTER (WHERE status = 'pending' AND fulfillment IN ('pickup', 'mixed'))::int AS pending_pickups,
       COUNT(*) FILTER (WHERE status = 'fulfilled' AND fulfillment IN ('pickup', 'mixed'))::int AS completed_pickups,
       0::int AS contacts_added,
       0::int AS campaigns_sent,
       0::int AS messages_logged
     FROM orders o
     WHERE o.placed_at::date BETWEEN $1 AND $2
       AND o.status <> 'canceled'
       ${brandClause(effectiveBrandId)}`,
    [range.start, range.end, ...brandParams(effectiveBrandId)]
  );
  return rows[0] ?? {
    gross_sales: 0,
    total_orders: 0,
    avg_order_value: 0,
    pickup_orders: 0,
    shipping_orders: 0,
    pending_pickups: 0,
    completed_pickups: 0,
    contacts_added: 0,
    campaigns_sent: 0,
    messages_logged: 0,
  };
}

export async function getOrdersByStopReport(range: DateRange, brandId: string | null = null) {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  const effectiveBrandId = adminUser.role === "brand_admin" ? adminUser.brand_id : brandId;

  // The new `stops` table doesn't have city/state/date columns. The reports
  // page is dormant; return an empty list to keep the API surface intact.
  void range;
  void effectiveBrandId;
  return [] as OrderByStop[];
}

export async function getSalesByProductReport(range: DateRange, brandId: string | null = null) {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  const effectiveBrandId = adminUser.role === "brand_admin" ? adminUser.brand_id : brandId;

  const { rows } = await pool.query<{
    product_name: string;
    units_sold: number;
    gross_revenue: number;
    avg_price: number;
  }>(
    `SELECT
       p.name AS product_name,
       COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
       COALESCE(SUM(oi.price_cents * oi.quantity), 0)::float / 100.0 AS gross_revenue,
       COALESCE(ROUND(AVG(oi.price_cents)::numeric, 2), 0)::float / 100.0 AS avg_price
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.placed_at::date BETWEEN $1 AND $2
       AND o.status <> 'canceled'
       ${brandClause(effectiveBrandId, "o")}
     GROUP BY p.id, p.name
     ORDER BY gross_revenue DESC`,
    [range.start, range.end, ...brandParams(effectiveBrandId)]
  );
  return rows;
}

export async function getFulfillmentReport(range: DateRange, brandId: string | null = null) {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  const effectiveBrandId = adminUser.role === "brand_admin" ? adminUser.brand_id : brandId;

  const { rows } = await pool.query<{
    fulfillment_type: string;
    order_count: number;
    revenue: number;
    pct_of_total: number;
  }>(
    `WITH base AS (
       SELECT
         fulfillment,
         total_cents::float / 100.0 AS revenue_cents
       FROM orders o
       WHERE o.placed_at::date BETWEEN $1 AND $2
         AND o.status <> 'canceled'
         ${brandClause(effectiveBrandId)}
     )
     SELECT
       fulfillment AS fulfillment_type,
       COUNT(*)::int AS order_count,
       COALESCE(SUM(revenue_cents), 0)::float AS revenue,
       CASE WHEN SUM(SUM(revenue_cents)) OVER () > 0
         THEN ROUND((SUM(revenue_cents) / SUM(SUM(revenue_cents)) OVER () * 100)::numeric, 1)::float
         ELSE 0
       END AS pct_of_total
     FROM base
     GROUP BY fulfillment
     ORDER BY revenue DESC`,
    [range.start, range.end, ...brandParams(effectiveBrandId)]
  );
  return rows;
}

export async function getPickupStatusByStop(range: DateRange, brandId: string | null = null) {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  const effectiveBrandId = adminUser.role === "brand_admin" ? adminUser.brand_id : brandId;

  // The new `stops` table doesn't carry city/date columns. Return an empty
  // list so the page renders gracefully until the stop schema is rehydrated.
  void range;
  void effectiveBrandId;
  return [] as PickupStatusByStop[];
}

export async function getContactGrowthReport(range: DateRange, brandId: string | null = null) {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  const effectiveBrandId = adminUser.role === "brand_admin" ? adminUser.brand_id : brandId;

  // `customers` replaced `communication_contacts`. `source` column is gone,
  // so `imports` is always 0 and `new_contacts` is the day's net add.
  const { rows } = await pool.query<{ date: string; new_contacts: number; imports: number; total: number }>(
    `SELECT
       d::date::text AS date,
       COUNT(c.id) FILTER (WHERE c.created_at::date = d::date)::int AS new_contacts,
       0::int AS imports,
       COUNT(c.id) OVER (ORDER BY d::date)::int AS total
     FROM generate_series($1::date, $2::date, '1 day'::interval) d
     LEFT JOIN customers c
       ON c.created_at::date = d::date
       ${effectiveBrandId ? "AND c.tenant_id = $3::uuid" : ""}
     GROUP BY d::date
     ORDER BY d::date DESC`,
    [range.start, range.end, ...brandParams(effectiveBrandId)]
  );
  return rows;
}

export async function getCampaignActivityReport(range: DateRange, brandId: string | null = null) {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  const effectiveBrandId = adminUser.role === "brand_admin" ? adminUser.brand_id : brandId;

  // The legacy `communication_campaigns` table is gone (replaced by
  // `campaigns` + `email_templates`). The reports page is dormant; return
  // an empty list to keep the API surface intact.
  void range;
  void effectiveBrandId;
  return [] as CampaignActivityRow[];
}
