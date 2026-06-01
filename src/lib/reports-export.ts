// Pure CSV export utilities — no server directives, safe for client import

export type ReportsSummary = {
  gross_sales: number; total_orders: number; avg_order_value: number;
  pickup_orders: number; shipping_orders: number;
  pending_pickups: number; completed_pickups: number;
  contacts_added: number; campaigns_sent: number; messages_logged: number;
};

export type DateRange = { start: string; end: string };

export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const headerRow = headers.join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCSVValue(row[h])).join(",")
  );
  return [headerRow, ...dataRows].join("\r\n");
}

export type OrderByStop = {
  stop_name: string; city: string; state: string; date: string;
  order_count: number; gross_sales: number; pending_count: number; completed_count: number;
};
export type SalesByProduct = {
  product_name: string; units_sold: number; gross_revenue: number; avg_price: number;
};
export type PickupStatusByStop = {
  stop_name: string; city: string; date: string;
  total_orders: number; pending: number; completed: number; canceled: number;
};
export type ContactGrowthRow = {
  date: string; new_contacts: number; imports: number; total: number;
};
export type FulfillmentRow = {
  fulfillment_type: string; order_count: number; revenue: number; pct_of_total: number;
};
export type CampaignActivityRow = {
  campaign_name: string; status: string; campaign_type: string;
  sent_at: string | null; messages_logged: number;
};

export function exportOrdersByStop(data: OrderByStop[]): string {
  return toCSV(["stop_name", "city", "state", "date", "order_count", "gross_sales", "pending_count", "completed_count"], data);
}
export function exportSalesByProduct(data: SalesByProduct[]): string {
  return toCSV(["product_name", "units_sold", "gross_revenue", "avg_price"], data);
}
export function exportPickupStatus(data: PickupStatusByStop[]): string {
  return toCSV(["stop_name", "city", "date", "total_orders", "pending", "completed", "canceled"], data);
}
export function exportContactGrowth(data: ContactGrowthRow[]): string {
  return toCSV(["date", "new_contacts", "imports", "total"], data);
}
export function exportFulfillment(data: FulfillmentRow[]): string {
  return toCSV(["fulfillment_type", "order_count", "revenue", "pct_of_total"], data);
}
export function exportCampaignActivity(data: CampaignActivityRow[]): string {
  return toCSV(["campaign_name", "status", "campaign_type", "sent_at", "messages_logged"], data);
}

// ── Tax reports ───────────────────────────────────────────────────────────────

export type TaxOrderRow = {
  order_id: string;
  date: string;
  customer_name: string;
  city: string;
  state: string;
  taxable_amount: number;
  tax_amount: number;
  tax_rate: number;
  tax_location: string;
};

export type TaxByStateRow = {
  state: string;
  total_tax: number;
  gross_sales: number;
  order_count: number;
};

export function exportTaxReport(data: TaxOrderRow[]): string {
  return toCSV(
    ["order_id", "date", "customer_name", "city", "state", "taxable_amount", "tax_amount", "tax_rate", "tax_location"],
    data
  );
}

export function exportTaxByState(data: TaxByStateRow[]): string {
  return toCSV(["state", "total_tax", "gross_sales", "order_count"], data);
}