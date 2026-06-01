"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

// ── Internal fetch helper ────────────────────────────────────────────────────

async function reportRPC<T>(
  rpcName: string,
  params: { p_start_date: string; p_end_date: string },
  forceBrandId: string | null
): Promise<T> {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");

  // brand_admin: always enforce their assigned brand (ignore UI selection)
  // platform_admin: use forceBrandId (null = all brands)
  const brandId = adminUser.role === "brand_admin"
    ? adminUser.brand_id
    : forceBrandId;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_brand_id: brandId,
      p_start_date: params.p_start_date,
      p_end_date: params.p_end_date,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`RPC ${rpcName} failed: ${err}`);
  }

  return response.json() as Promise<T>;
}

// ── Report actions ──────────────────────────────────────────────────────────

export async function getReportsSummary(range: DateRange, brandId: string | null = null) {
  return reportRPC<ReportsSummary>("get_reports_summary", {
    p_start_date: range.start,
    p_end_date: range.end,
  }, brandId);
}

export async function getOrdersByStopReport(range: DateRange, brandId: string | null = null) {
  return reportRPC<OrderByStop[]>("get_orders_by_stop_report", {
    p_start_date: range.start,
    p_end_date: range.end,
  }, brandId);
}

export async function getSalesByProductReport(range: DateRange, brandId: string | null = null) {
  return reportRPC<SalesByProduct[]>("get_sales_by_product_report", {
    p_start_date: range.start,
    p_end_date: range.end,
  }, brandId);
}

export async function getFulfillmentReport(range: DateRange, brandId: string | null = null) {
  return reportRPC<FulfillmentRow[]>("get_fulfillment_report", {
    p_start_date: range.start,
    p_end_date: range.end,
  }, brandId);
}

export async function getPickupStatusByStop(range: DateRange, brandId: string | null = null) {
  return reportRPC<PickupStatusByStop[]>("get_pickup_status_by_stop", {
    p_start_date: range.start,
    p_end_date: range.end,
  }, brandId);
}

export async function getContactGrowthReport(range: DateRange, brandId: string | null = null) {
  return reportRPC<ContactGrowthRow[]>("get_contact_growth_report", {
    p_start_date: range.start,
    p_end_date: range.end,
  }, brandId);
}

export async function getCampaignActivityReport(range: DateRange, brandId: string | null = null) {
  return reportRPC<CampaignActivityRow[]>("get_campaign_activity_report", {
    p_start_date: range.start,
    p_end_date: range.end,
  }, brandId);
}