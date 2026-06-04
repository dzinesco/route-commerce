"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { svcHeaders } from "@/lib/svc-headers";

export async function registerWholesaleCustomer(params: {
  brandId: string;
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string; requiresApproval?: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/register_wholesale_customer`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_company_name: params.companyName,
        p_contact_name: params.contactName ?? null,
        p_email: params.email,
        p_phone: params.phone ?? null,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    // Supabase error format: { "message": "...", "code": "...", ... }
    // Our RPC error format: { "success": false, "error": "..." }
    return { success: false, error: err.message ?? err.error ?? "Registration failed." };
  }
  const data = await response.json();
  // Normalize: RPC may return an array (single row) or a plain object
  const result = Array.isArray(data) ? data[0] : data;
  if (!result.success) {
    return { success: false, error: result.error ?? "Registration failed." };
  }
  return {
    success: true,
    requiresApproval: result.requires_approval ?? false,
  };
}

export async function getPendingWholesaleRegistrations(brandId: string) {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (!adminUser.can_manage_orders) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_pending_wholesale_registrations`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return [];
  return response.json();
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/approve_wholesale_registration`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_registration_id: registrationId,
        p_brand_id: brandId,
        p_action: action,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to process registration." };
  const data = await response.json();
  // Normalize array response (RETURNING single row) to plain object
  const result = Array.isArray(data) ? data[0] : data;
  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to process registration." };
  }
  return { success: true };
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_customer_by_user`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId, p_user_id: userId }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data ?? null;
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/wholesale_customers?id=eq.${customerId}&select=id,user_id,company_name,contact_name,email,phone,account_status,role,brand_id`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data?.[0] ?? null;
}

export async function getWholesaleProducts(brandId: string) {
  // Uses SECURITY DEFINER RPC — no auth required for admins, anon key works for customers too
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_products`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return [];
  return response.json();
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Generate UUID at the start of checkout — before RPC call for true idempotency
  const checkoutSessionId = params.checkoutSessionId ?? crypto.randomUUID();

  const itemsJson = params.items.map(i => ({
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }));

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/create_wholesale_order`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_customer_id: params.customerId,
        p_anticipated_pickup_date: params.anticipatedPickupDate ?? null,
        p_items: itemsJson,
        p_notes: params.notes ?? null,
        p_checkout_session_id: checkoutSessionId,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to create order." };
  const data = await response.json();
  // Normalize array response (RETURNING single row) to plain object
  const result = Array.isArray(data) ? data[0] : data;

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Failed to create order.",
      creditLimit: result.credit_limit,
      outstandingBalance: result.outstanding_balance,
      orderTotal: result.order_total,
    };
  }

  // Fire webhook — fire-and-forget, don't block the response
  enqueueWholesaleWebhookForOrderCreated(
    result.order_id,
    params.brandId,
    params.customerId,
    result.invoice_number,
    Number(result.deposit_required) || 0
  ).catch(() => {});

  return {
    success: true,
    orderId: result.order_id,
    invoiceNumber: result.invoice_number,
    status: result.status,
    depositRequired: result.deposit_required,
    idempotent: result.idempotent ?? false,
  };
}

export async function enqueueWholesaleWebhookForOrderCreated(orderId: string, brandId: string, customerId: string, invoiceNumber: string | null, subtotal: number) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
    await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_webhook`, {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_event_type: "order_created",
        p_order_id: orderId,
        p_brand_id: brandId,
        p_payload: { order_id: orderId, brand_id: brandId, customer_id: customerId, invoice_number: invoiceNumber, subtotal },
      }),
    });
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_customer_pricing`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_customer_id: customerId }),
    }
  );

  if (!response.ok) return [];
  return response.json();
}

export async function upsertWholesaleCustomerPricing(params: {
  customerId: string;
  productId: string;
  customUnitPrice: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_wholesale_customer_pricing`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_customer_id: params.customerId,
        p_product_id: params.productId,
        p_custom_unit_price: params.customUnitPrice,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to save pricing override" };
  return { success: true };
}

export async function deleteWholesaleCustomerPricing(params: {
  customerId: string;
  productId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_wholesale_customer_pricing`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_customer_id: params.customerId,
        p_product_id: params.productId,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to delete pricing override" };
  return { success: true };
}

export async function getWholesaleCustomerOrders(customerId: string): Promise<WholesaleCustomerOrder[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_customer_orders`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_customer_id: customerId }),
    }
  );

  if (!response.ok) return [];
  return response.json();
}