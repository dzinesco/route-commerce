"use server";

import Stripe from "stripe";
import { svcHeaders } from "@/lib/svc-headers";

export type TaxCalculationResult = {
  taxAmount: number;
  taxRate: number;
  taxLocation: string;
};

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

async function getBrandTaxSettings(brandId: string): Promise<BrandTaxSettings | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_brand_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return {
    collect_sales_tax: data?.collect_sales_tax ?? null,
    nexus_states: data?.nexus_states ?? null,
  };
}