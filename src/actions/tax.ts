"use server";

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { withTenant } from "@/db/client";
import { brandSettings } from "@/db/schema";
import { pool } from "@/lib/db";

export type TaxCalculationResult = {
  taxAmount: number;
  taxRate: number;
  taxLocation: string;
};

/**
 * Tax settings are stored on `brand_settings.feature_flags` (jsonb).
 * The SaaS rebuild uses the same keys the legacy `get_brand_settings`
 * RPC exposed: `collect_sales_tax` (boolean) and `nexus_states`
 * (string[] of US state codes). Reading them out of the JSON column
 * avoids a per-brand settings table for a few toggle fields.
 */
type BrandTaxSettings = {
  collect_sales_tax: boolean | null;
  nexus_states: string[] | null;
};

export async function calculateOrderTax(params: {
  brandId: string;
  subtotal: number;
  items: Array<{ id: string; quantity: number; price: number; name?: string; is_taxable?: boolean }>;
  fulfillment: "pickup" | "ship";
  shippingAddress?: { state: string; postal_code: string; city?: string };
}): Promise<TaxCalculationResult> {
  // 1. If not collecting tax, return zero
  const taxSettings = await getBrandTaxSettings(params.brandId);
  if (!taxSettings?.collect_sales_tax) {
    return { taxAmount: 0, taxRate: 0, taxLocation: "" };
  }

  // 2. Pickup orders are not taxable in most states
  if (params.fulfillment === "pickup") {
    return { taxAmount: 0, taxRate: 0, taxLocation: "" };
  }

  // 3. Must have a shipping address in nexus states
  if (!params.shippingAddress?.state) {
    return { taxAmount: 0, taxRate: 0, taxLocation: "" };
  }

  const nexus = taxSettings.nexus_states ?? [];
  const shipState = params.shippingAddress.state.toUpperCase();

  if (!nexus.map((s) => s.toUpperCase()).includes(shipState)) {
    return { taxAmount: 0, taxRate: 0, taxLocation: "" };
  }

  // 4. Stripe Tax calculation
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { taxAmount: 0, taxRate: 0, taxLocation: "" };
  }

  try {
    const stripe = new Stripe(stripeKey);

    // Build Stripe line items for tax calculation — only taxable items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: any[] = params.items
      .filter((item) => item.is_taxable !== false)
      .map((item) => ({
        amount: Math.round(item.price * item.quantity * 100), // cents
        reference: item.id,
        tax_behavior: "exclusive",
      }));

    // If no taxable items, return zero tax
    if (lineItems.length === 0) {
      return { taxAmount: 0, taxRate: 0, taxLocation: `STATE:${shipState}` };
    }

    const calculation = await stripe.tax.calculations.create({
      currency: "usd",
      line_items: lineItems,
      customer_details: {
        address: {
          state: shipState,
          postal_code: params.shippingAddress.postal_code,
          city: params.shippingAddress.city,
          country: "US",
        },
        address_source: "shipping",
      },
    });

    if (!calculation.tax_amount_exclusive) {
      return { taxAmount: 0, taxRate: 0, taxLocation: `STATE:${shipState}` };
    }

    const taxAmount = calculation.tax_amount_exclusive / 100;

    // Derive effective rate from subtotal
    const taxRate = params.subtotal > 0 ? taxAmount / params.subtotal : 0;

    return {
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate: Math.round(taxRate * 10000) / 10000,
      taxLocation: `STATE:${shipState}`,
    };
  } catch (err) {
    return { taxAmount: 0, taxRate: 0, taxLocation: "" };
  }
}

/**
 * Read tax-related feature flags for a brand. The two flags
 * (`collect_sales_tax`, `nexus_states`) used to live in a dedicated
 * `get_brand_settings` SECURITY DEFINER RPC; in the SaaS rebuild they
 * live in `brand_settings.feature_flags` (jsonb). Tolerant of missing
 * / malformed JSON by falling back to `null`.
 */
async function getBrandTaxSettings(brandId: string): Promise<BrandTaxSettings | null> {
  try {
    const rows = await withTenant(brandId, async (db) =>
      db
        .select({ featureFlags: brandSettings.featureFlags })
        .from(brandSettings)
        .where(eq(brandSettings.tenantId, brandId))
        .limit(1),
    );
    const flags = rows[0]?.featureFlags as
      | Partial<{
          collect_sales_tax: boolean;
          nexus_states: string[];
        }>
      | null
      | undefined;
    if (!flags) return null;
    return {
      collect_sales_tax:
        typeof flags.collect_sales_tax === "boolean"
          ? flags.collect_sales_tax
          : null,
      nexus_states: Array.isArray(flags.nexus_states)
        ? flags.nexus_states.filter((s): s is string => typeof s === "string")
        : null,
    };
  } catch {
    return null;
  }
}

// ── Tax Dashboard read-side actions ───────────────────────────────────────────
//
// TODO(migration): the tax dashboard reads from the legacy `orders`
// table via the `get_tax_summary` and `get_taxable_orders` SECURITY
// DEFINER RPCs (supabase/migrations/095). Both the table and the RPCs
// still exist; we call the RPCs through `pool.query` rather than the
// Supabase REST gateway. When the SaaS rebuild's orders table grows a
// `tax_amount` column or the tax dashboard is rebuilt against the new
// schema, these helpers should be rewritten against the Drizzle
// `orders` table directly.

export type TaxByStateRow = {
  state: string;
  total_tax: number;
  gross_sales: number;
  order_count: number;
};

export type TaxSummaryData = {
  total_tax_collected: number;
  total_gross_sales: number;
  order_count: number;
  tax_by_state: TaxByStateRow[];
};

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

export type GetTaxSummaryResult =
  | { success: true; data: TaxSummaryData }
  | { success: false; error: string };

export type GetTaxableOrdersResult =
  | { success: true; data: TaxOrderRow[] }
  | { success: false; error: string };

export async function getTaxSummaryAction(params: {
  brandId: string;
  startDate: string;
  endDate: string;
}): Promise<GetTaxSummaryResult> {
  if (!params.brandId) return { success: false, error: "Brand required" };
  try {
    const { rows } = await pool.query<{
      total_tax_collected: number | string;
      total_gross_sales: number | string;
      order_count: number | string;
      tax_by_state: TaxByStateRow[] | null;
    }>(
      "SELECT * FROM get_tax_summary($1::uuid, $2::date, $3::date)",
      [params.brandId, params.startDate, params.endDate]
    );
    const row = rows[0];
    if (!row) return { success: false, error: "No data" };
    return {
      success: true,
      data: {
        total_tax_collected: Number(row.total_tax_collected ?? 0),
        total_gross_sales: Number(row.total_gross_sales ?? 0),
        order_count: Number(row.order_count ?? 0),
        tax_by_state: Array.isArray(row.tax_by_state) ? row.tax_by_state : [],
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load tax summary",
    };
  }
}

export async function getTaxableOrdersAction(params: {
  brandId: string;
  startDate: string;
  endDate: string;
}): Promise<GetTaxableOrdersResult> {
  if (!params.brandId) return { success: false, error: "Brand required" };
  try {
    const { rows } = await pool.query<{
      order_id: string;
      date: string;
      customer_name: string | null;
      city: string | null;
      state: string | null;
      taxable_amount: number | string;
      tax_amount: number | string;
      tax_rate: number | string;
      tax_location: string | null;
    }>(
      "SELECT * FROM get_taxable_orders($1::uuid, $2::date, $3::date)",
      [params.brandId, params.startDate, params.endDate]
    );
    return {
      success: true,
      data: rows.map((r) => ({
        order_id: String(r.order_id ?? ""),
        date: String(r.date ?? ""),
        customer_name: String(r.customer_name ?? ""),
        city: String(r.city ?? ""),
        state: String(r.state ?? ""),
        taxable_amount: Number(r.taxable_amount ?? 0),
        tax_amount: Number(r.tax_amount ?? 0),
        tax_rate: Number(r.tax_rate ?? 0),
        tax_location: String(r.tax_location ?? ""),
      })),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load taxable orders",
    };
  }
}
