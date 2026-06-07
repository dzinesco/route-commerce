"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

export async function registerWholesaleCustomer(params: {
  brandId: string;
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string; requiresApproval?: boolean }> {
  try {
    const { rows } = await pool.query<{
      success: boolean;
      error?: string;
      requires_approval?: boolean;
    }>(
      `SELECT * FROM register_wholesale_customer($1, $2, $3, $4, $5)`,
      [
        params.brandId,
        params.companyName,
        params.contactName ?? null,
        params.email,
        params.phone ?? null,
      ]
    );
    const result = Array.isArray(rows) ? rows[0] : rows;
    if (!result?.success) {
      return { success: false, error: result?.error ?? "Registration failed." };
    }
    return {
      success: true,
      requiresApproval: result.requires_approval ?? false,
    };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    return { success: false, error: err || "Registration failed." };
  }
}

export async function getPendingWholesaleRegistrations(brandId: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (!adminUser.can_manage_orders) return [];

  try {
    const { rows } = await pool.query(
      "SELECT * FROM get_pending_wholesale_registrations($1)",
      [brandId]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function approveWholesaleRegistration(
  registrationId: string,
  brandId: string,
  action: "approve" | "reject"
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };
  try {
    assertBrandAccess(adminUser, brandId);
  } catch {
    return { success: false, error: "Not authorized to operate on this brand" };
  }

  try {
    const { rows } = await pool.query<{ success: boolean; error?: string }>(
      "SELECT * FROM approve_wholesale_registration($1, $2, $3)",
      [registrationId, brandId, action]
    );
    const result = Array.isArray(rows) ? rows[0] : rows;
    if (!result?.success) {
      return { success: false, error: result?.error ?? "Failed to process registration." };
    }
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to process registration." };
  }
}

export async function getWholesaleCustomerByUser(
  brandId: string,
  userId: string
): Promise<{
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  account_status: string;
  role: string;
  brand_id: string;
} | null> {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM get_wholesale_customer_by_user($1, $2)",
      [brandId, userId]
    );
    return (rows[0] as {
      id: string;
      user_id: string;
      company_name: string;
      contact_name: string;
      email: string;
      phone: string;
      account_status: string;
      role: string;
      brand_id: string;
    } | undefined) ?? null;
  } catch {
    return null;
  }
}

// Fetch a wholesale customer directly by their customer ID (used for admin preview mode)
export async function getWholesaleCustomer(
  customerId: string
): Promise<{
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  account_status: string;
  role: string;
  brand_id: string;
} | null> {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, company_name, contact_name, email, phone, account_status, role, brand_id
       FROM wholesale_customers
       WHERE id = $1
       LIMIT 1`,
      [customerId]
    );
    return (rows[0] as {
      id: string;
      user_id: string;
      company_name: string;
      contact_name: string;
      email: string;
      phone: string;
      account_status: string;
      role: string;
      brand_id: string;
    } | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function getWholesaleProducts(brandId: string) {
  // Uses SECURITY DEFINER RPC — no auth required for admins, anon key works for customers too
  try {
    const { rows } = await pool.query(
      "SELECT * FROM get_wholesale_products($1)",
      [brandId]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function submitWholesaleOrder(params: {
  brandId: string;
  customerId: string;
  anticipatedPickupDate?: string;
  items: Array<{ product_id: string; quantity: number; unit_price: number }>;
  notes?: string;
  checkoutSessionId?: string; // pass explicitly for caller-generated UUID
}): Promise<{
  success: boolean;
  error?: string;
  orderId?: string;
  invoiceNumber?: string;
  status?: string;
  depositRequired?: number;
  creditLimit?: number;
  outstandingBalance?: number;
  orderTotal?: number;
  idempotent?: boolean;
}> {
  // Generate UUID at the start of checkout — before RPC call for true idempotency
  const checkoutSessionId = params.checkoutSessionId ?? crypto.randomUUID();

  const itemsJson = params.items.map(i => ({
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }));

  let result: {
    success?: boolean;
    error?: string;
    order_id?: string;
    invoice_number?: string | null;
    status?: string;
    deposit_required?: number;
    credit_limit?: number;
    outstanding_balance?: number;
    order_total?: number;
    idempotent?: boolean;
  } | null = null;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM create_wholesale_order($1, $2, $3, $4::jsonb, $5, $6)`,
      [
        params.brandId,
        params.customerId,
        params.anticipatedPickupDate ?? null,
        JSON.stringify(itemsJson),
        params.notes ?? null,
        checkoutSessionId,
      ]
    );
    result = Array.isArray(rows) ? rows[0] : rows;
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create order." };
  }

  if (!result?.success) {
    return {
      success: false,
      error: result?.error ?? "Failed to create order.",
      creditLimit: result?.credit_limit,
      outstandingBalance: result?.outstanding_balance,
      orderTotal: result?.order_total,
    };
  }

  // Fire webhook — fire-and-forget, don't block the response
  enqueueWholesaleWebhookForOrderCreated(
    result.order_id!,
    params.brandId,
    params.customerId,
    result.invoice_number ?? null,
    Number(result.deposit_required) || 0
  ).catch(() => {});

  return {
    success: true,
    orderId: result.order_id,
    invoiceNumber: result.invoice_number ?? undefined,
    status: result.status,
    depositRequired: result.deposit_required,
    idempotent: result.idempotent ?? false,
  };
}

export async function enqueueWholesaleWebhookForOrderCreated(orderId: string, brandId: string, customerId: string, invoiceNumber: string | null, subtotal: number) {
  try {
    await pool.query(
      "SELECT enqueue_wholesale_webhook($1, $2, $3, $4::jsonb)",
      [
        "order_created",
        orderId,
        brandId,
        JSON.stringify({ order_id: orderId, brand_id: brandId, customer_id: customerId, invoice_number: invoiceNumber, subtotal }),
      ]
    );
  } catch (_) {}
}

export type WholesaleProduct = {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  availability: string;
  qty_available: number;
  price_tiers: Array<{ min_qty: number; max_qty: number; price: number }>;
  hp_sku: string | null;
  created_at: string;
};

export type WholesaleCustomerOrder = {
  id: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  anticipated_pickup_date: string | null;
  subtotal: number;
  deposit_required: number;
  deposit_paid: number;
  balance_due: number;
  invoice_number: string | null;
  invoice_token: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

export type WholesalePricingOverride = {
  product_id: string;
  custom_unit_price: number;
  product_name: string;
};

export async function getWholesaleCustomerPricing(customerId: string): Promise<WholesalePricingOverride[]> {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM get_wholesale_customer_pricing($1)",
      [customerId]
    );
    return rows as WholesalePricingOverride[];
  } catch {
    return [];
  }
}

export async function upsertWholesaleCustomerPricing(params: {
  customerId: string;
  productId: string;
  customUnitPrice: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await pool.query(
      "SELECT upsert_wholesale_customer_pricing($1, $2, $3)",
      [params.customerId, params.productId, params.customUnitPrice]
    );
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save pricing override" };
  }
}

export async function deleteWholesaleCustomerPricing(params: {
  customerId: string;
  productId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await pool.query(
      "SELECT delete_wholesale_customer_pricing($1, $2)",
      [params.customerId, params.productId]
    );
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete pricing override" };
  }
}

export async function getWholesaleCustomerOrders(customerId: string): Promise<WholesaleCustomerOrder[]> {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM get_wholesale_customer_orders($1)",
      [customerId]
    );
    return rows as WholesaleCustomerOrder[];
  } catch {
    return [];
  }
}