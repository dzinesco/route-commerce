"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type WholesaleOrder = {
  id: string;
  customer_id: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  anticipated_pickup_date: string | null;
  subtotal: number;
  deposit_required: number;
  deposit_paid: number;
  balance_due: number;
  created_at: string;
  updated_at: string;
  invoice_number: string | null;
  assigned_employee_id: string | null;
  company_name: string;
  contact_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  fulfilled_at: string | null;
};

export type WholesaleCustomer = {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  account_status: string;
  credit_limit: number;
  deposits_enabled: boolean;
  deposit_threshold: number | null;
  deposit_percentage: number | null;
  order_email: string | null;
  invoice_email: string | null;
  admin_notes: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
};

export type WholesaleProduct = {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  unit_type_custom: string | null;
  availability: string;
  qty_available: number;
  season_start: string | null;
  season_end: string | null;
  price_tiers: Array<{ min_qty: number; max_qty: number; price: number }>;
  hp_sku: string | null;
  hp_item_id: string | null;
  handling_instructions: string | null;
  storage_warning: string | null;
  loading_notes: string | null;
  product_label: string | null;
  pack_style: string | null;
  container_type: string | null;
  container_size_code: string | null;
  units_per_container: number | null;
  default_pickup_location: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type NotificationRecipient = {
  email: string;
  name?: string;
  active: boolean;
  notification_types?: (
    | "order_confirmation"
    | "deposit_received"
    | "order_fulfilled"
    | "price_sheet"
    | "unclaimed_pickup"
  )[];
};

export type WholesaleSettings = {
  id: string;
  brand_id: string;
  portal_page_id: string | null;
  price_sheet_page_id: string | null;
  require_approval: boolean;
  min_order_amount: number | null;
  online_payment_enabled: boolean;
  wholesale_enabled: boolean;
  square_sync_enabled: boolean;
  pickup_location: string;
  fob_location: string;
  from_email: string;
  invoice_business_name: string;
  invoice_business_address: string | null;
  invoice_business_phone: string | null;
  invoice_business_email: string | null;
  invoice_business_website: string | null;
  notification_email: string | null;
  notification_recipients: NotificationRecipient[];
  last_invoice_number: number;
};

export type WholesaleDashboardStats = {
  open_orders: number;
  pickup_today: number;
  past_due: number;
  total_unpaid: number;
  awaiting_deposit: number;
  fulfilled_today: number;
};

/**
 * Resolves the effective brand_id for an action, enforcing brand scoping.
 *
 * platform_admin  → null (means "all brands" — passes to RPC unchanged)
 * brand_admin    → their own brand_id only; rejects attempts to operate on other brands
 * store_employee → their own brand_id
 * unauthenticated → null (actions should already bail out earlier)
 *
 * This prevents brand_admin from seeing or modifying another brand's data
 * even if they manually pass a different brandId to the action.
 */
function resolveBrandId(
  adminUser: Awaited<ReturnType<typeof getAdminUser>>,
  requestedBrandId?: string
): string | null {
  if (!adminUser) return null;

  if (adminUser.role === "platform_admin") {
    // platform_admin can operate on all brands — pass null (= all brands) to RPC
    return null;
  }

  // brand_admin and store_employee are scoped to their own brand
  const userBrand = adminUser.brand_id ?? null;

  if (requestedBrandId && requestedBrandId !== userBrand) {
    // Brand admin trying to operate on another brand's data — block it
    return null; // caller should check and return unauthorized
  }

  return userBrand;
}

/**
 * Like resolveBrandId but returns null for platform_admin AND throws an error
 * if a brand_admin tries to operate outside their brand.
 * Use for mutating actions (save, delete, fulfill) where cross-brand access must be blocked.
 */
function enforceBrandScope(
  adminUser: Awaited<ReturnType<typeof getAdminUser>>,
  requestedBrandId?: string
): { brandId: string | null; error?: string } {
  if (!adminUser) return { brandId: null, error: "Not authenticated" };

  if (adminUser.role === "platform_admin") {
    return { brandId: null }; // unrestricted
  }

  const userBrand = adminUser.brand_id ?? null;

  if (requestedBrandId && requestedBrandId !== userBrand) {
    return { brandId: null, error: "Not authorized to operate on this brand" };
  }

  return { brandId: userBrand };
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function getWholesaleOrders(brandId?: string): Promise<WholesaleOrder[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = resolveBrandId(adminUser, brandId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_orders`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: bid }),
    }
  );

  if (!response.ok) return [];
  return response.json();
}

export async function getWholesalePickupOrders(brandId?: string): Promise<WholesaleOrder[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = resolveBrandId(adminUser, brandId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_pickup_orders`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: bid }),
    }
  );

  if (!response.ok) return [];
  return response.json();
}

export async function getWholesaleDashboardStats(brandId?: string): Promise<WholesaleDashboardStats> {
  const orders = await getWholesaleOrders(brandId);
  const today = new Date().toISOString().split("T")[0];

  const open = orders.filter(o => ["pending", "awaiting_deposit", "confirmed"].includes(o.status));
  const pickupToday = orders.filter(o => o.anticipated_pickup_date === today && o.fulfillment_status !== "fulfilled");
  const pastDue = orders.filter(o => o.anticipated_pickup_date && o.anticipated_pickup_date < today && o.fulfillment_status !== "fulfilled");
  const totalUnpaid = open.reduce((sum, o) => sum + Number(o.balance_due), 0);
  const awaitingDep = orders.filter(o => o.status === "awaiting_deposit");
  const fulfilledToday = orders.filter(o => o.fulfillment_status === "fulfilled" && o.updated_at?.startsWith(today));

  return {
    open_orders: open.length,
    pickup_today: pickupToday.length,
    past_due: pastDue.length,
    total_unpaid: totalUnpaid,
    awaiting_deposit: awaitingDep.length,
    fulfilled_today: fulfilledToday.length,
  };
}

export async function markWholesaleOrderFulfilled(orderId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { brandId: resolved, error } = enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/mark_wholesale_order_fulfilled`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_order_id: orderId, p_by: adminUser.user_id }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to mark fulfilled" };

  enqueueWholesaleWebhookForOrderFulfilled(orderId, resolved ?? undefined).catch(() => {});

  return { success: true };
}

async function enqueueWholesaleWebhookForOrderFulfilled(orderId: string, brandId?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
  await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_webhook`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_event_type: "order_fulfilled",
      p_order_id: orderId,
      p_brand_id: brandId ?? null,
      p_payload: { order_id: orderId },
    }),
  });
}

export async function updateWholesaleOrderStatus(
  orderId: string,
  status: "pending" | "confirmed" | "cancelled",
  brandId?: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { error } = enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_wholesale_order_status`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_order_id: orderId, p_status: status }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to update order status" };
  return { success: true };
}

export async function deleteWholesaleOrder(orderId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { error } = enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_wholesale_order`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_order_id: orderId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to delete order" };
  return { success: true };
}

export async function deleteWholesaleCustomer(customerId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { error } = enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_wholesale_customer`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_customer_id: customerId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to delete customer" };
  const data = await response.json();
  if (!data.success) return { success: false, error: data.error ?? "Delete failed" };
  return { success: true };
}

export async function deleteWholesaleProduct(productId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products) return { success: false, error: "Not authorized" };

  const { error } = enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_wholesale_product`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_product_id: productId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to delete product" };
  const data = await response.json();
  if (!data.success) return { success: false, error: data.error ?? "Delete failed" };
  return { success: true };
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getWholesaleCustomers(brandId?: string): Promise<WholesaleCustomer[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = resolveBrandId(adminUser, brandId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_customers`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: bid }),
    }
  );

  if (!response.ok) return [];
  return response.json();
}

export async function saveWholesaleCustomer(params: {
  brandId: string;
  userId?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  accountStatus?: string;
  creditLimit?: number;
  depositsEnabled?: boolean;
  depositThreshold?: number;
  depositPercentage?: number;
  orderEmail?: string;
  invoiceEmail?: string;
  adminNotes?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { error } = enforceBrandScope(adminUser, params.brandId);
  if (error) return { success: false, error };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_wholesale_customer`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_user_id: params.userId ?? null,
        p_company_name: params.companyName ?? null,
        p_contact_name: params.contactName ?? null,
        p_email: params.email ?? null,
        p_phone: params.phone ?? null,
        p_account_status: params.accountStatus ?? "active",
        p_credit_limit: params.creditLimit ?? 0,
        p_deposits_enabled: params.depositsEnabled ?? false,
        p_deposit_threshold: params.depositThreshold ?? null,
        p_deposit_percentage: params.depositPercentage ?? null,
        p_order_email: params.orderEmail ?? null,
        p_invoice_email: params.invoiceEmail ?? null,
        p_admin_notes: params.adminNotes ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to save customer" };
  const data = await response.json();
  return { success: true, id: data.id };
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getWholesaleProducts(brandId?: string): Promise<WholesaleProduct[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = resolveBrandId(adminUser, brandId);

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
      body: JSON.stringify({ p_brand_id: bid }),
    }
  );

  if (!response.ok) return [];
  return response.json();
}

export async function saveWholesaleProduct(params: {
  brandId: string;
  id?: string;
  name: string;
  description?: string;
  unitType?: string;
  availability?: string;
  qtyAvailable?: number;
  priceTiers?: Array<{ min_qty: number; max_qty: number; price: number }>;
  hpSku?: string;
  hpItemId?: string;
  internalNotes?: string;
  handlingInstructions?: string;
  storageWarning?: string;
  productLabel?: string;
  packStyle?: string;
  containerType?: string;
  defaultPickupLocation?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products) return { success: false, error: "Not authorized" };

  const { error } = enforceBrandScope(adminUser, params.brandId);
  if (error) return { success: false, error };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_wholesale_product`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_id: params.id ?? null,
        p_name: params.name,
        p_description: params.description ?? null,
        p_unit_type: params.unitType ?? "each",
        p_availability: params.availability ?? "unavailable",
        p_qty_available: params.qtyAvailable ?? 0,
        p_price_tiers: JSON.stringify(params.priceTiers ?? []),
        p_hp_sku: params.hpSku ?? null,
        p_hp_item_id: params.hpItemId ?? null,
        p_internal_notes: params.internalNotes ?? null,
        p_handling_instructions: params.handlingInstructions ?? null,
        p_storage_warning: params.storageWarning ?? null,
        p_product_label: params.productLabel ?? null,
        p_pack_style: params.packStyle ?? null,
        p_container_type: params.containerType ?? null,
        p_default_pickup_location: params.defaultPickupLocation ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to save product" };
  const data = await response.json();
  return { success: true, id: data.id };
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getWholesaleSettings(brandId?: string): Promise<WholesaleSettings | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;
  const bid = brandId ?? adminUser.brand_id ?? null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_settings`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: bid }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data ?? null;
}

export async function saveWholesaleSettings(params: {
  brandId: string;
  requireApproval?: boolean;
  minOrderAmount?: number;
  onlinePaymentEnabled?: boolean;
  wholesaleEnabled?: boolean;
  squareSyncEnabled?: boolean;
  pickupLocation?: string;
  fobLocation?: string;
  fromEmail?: string;
  invoiceBusinessName?: string;
  invoiceBusinessAddress?: string;
  invoiceBusinessPhone?: string;
  invoiceBusinessEmail?: string;
  invoiceBusinessWebsite?: string;
  notificationEmail?: string;
  notificationRecipients?: NotificationRecipient[];
}): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_wholesale_settings`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_require_approval: params.requireApproval ?? null,
        p_min_order_amount: params.minOrderAmount ?? null,
        p_online_payment_enabled: params.onlinePaymentEnabled ?? null,
        p_wholesale_enabled: params.wholesaleEnabled ?? null,
        p_pickup_location: params.pickupLocation ?? null,
        p_fob_location: params.fobLocation ?? null,
        p_from_email: params.fromEmail ?? null,
        p_invoice_business_name: params.invoiceBusinessName ?? null,
        p_invoice_business_address: params.invoiceBusinessAddress ?? null,
        p_invoice_business_phone: params.invoiceBusinessPhone ?? null,
        p_invoice_business_email: params.invoiceBusinessEmail ?? null,
        p_invoice_business_website: params.invoiceBusinessWebsite ?? null,
        p_notification_email: params.notificationEmail ?? null,
        p_notification_recipients: params.notificationRecipients ?? null,
        p_square_sync_enabled: params.squareSyncEnabled ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to save settings" };
  return { success: true };
}

// ── Deposits ─────────────────────────────────────────────────────────────────

export async function recordWholesaleDeposit(
  orderId: string,
  amount: number,
  method: string = "cash",
  reference?: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/record_wholesale_deposit`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_order_id: orderId,
        p_amount: amount,
        p_method: method,
        p_reference: reference ?? null,
        p_recorded_by: adminUser.user_id,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to record deposit" };
  const data = await response.json();
  if (!data?.success) return { success: false, error: data?.error ?? "Failed to record deposit" };

  // Fire webhook — fire-and-forget
  enqueueWholesaleWebhookForDepositRecorded(orderId, amount, adminUser.brand_id ?? undefined).catch(() => {});

  return { success: true };
}

async function enqueueWholesaleWebhookForDepositRecorded(orderId: string, amount: number, brandId?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
  await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_webhook`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_event_type: "deposit_recorded",
      p_order_id: orderId,
      p_brand_id: brandId ?? null,
      p_payload: { order_id: orderId, amount },
    }),
  });
}

// ── Bulk Actions ──────────────────────────────────────────────────────────────

export async function bulkFulfillWholesaleOrders(
  orderIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/bulk_fulfill_wholesale_orders`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_order_ids: orderIds,
        p_by: adminUser.user_id,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to bulk fulfill orders" };
  const data = await response.json();
  if (!data?.success) return { success: false, error: data?.error ?? "Failed to bulk fulfill orders" };
  return { success: true, count: data.count };
}

export async function bulkRecordWholesaleDeposit(
  orderIds: string[],
  amount: number,
  method: string = "cash",
  reference?: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/bulk_record_wholesale_deposit`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_order_ids: orderIds,
        p_amount: amount,
        p_method: method,
        p_reference: reference ?? null,
        p_recorded_by: adminUser.user_id,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to bulk record deposits" };
  const data = await response.json();
  if (!data?.success) return { success: false, error: data?.error ?? "Failed to bulk record deposits" };
  return { success: true, count: data.count };
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type WholesaleNotification = {
  id: string;
  type: "order_confirmation" | "deposit_received" | "order_fulfilled";
  email_to: string;
  email_cc: string | null;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  brand_id: string;
  customer_id: string;
  order_id: string | null;
  status: string;
  invoice_business_name: string | null;
  invoice_business_email: string | null;
  created_at: string;
};

export async function getWholesaleNotificationStats(
  brandId: string
): Promise<{ pending: number; sent: number; failed: number; total: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_notification_stats`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return { pending: 0, sent: 0, failed: 0, total: 0 };
  return response.json();
}

export async function getWholesalePendingNotifications(
  brandId: string,
  limit = 50
): Promise<WholesaleNotification[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (!adminUser.can_manage_orders) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_pending_notifications`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_brand_id: brandId, p_limit: limit }),
    }
  );

  if (!response.ok) return [];
  return response.json();
}

export async function markWholesaleNotificationSent(
  notificationId: string,
  error?: string
): Promise<{ success: boolean }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false };
  if (!adminUser.can_manage_orders) return { success: false };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/mark_wholesale_notification_sent`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_notification_id: notificationId, p_error: error ?? null }),
    }
  );

  return { success: response.ok };
}

export async function enqueueWholesaleNotification(params: {
  brandId: string;
  customerId: string;
  orderId: string;
  type: "order_confirmation" | "deposit_received" | "order_fulfilled";
  emailTo: string;
  emailCc?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_notification`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_customer_id: params.customerId,
        p_order_id: params.orderId,
        p_type: params.type,
        p_email_to: params.emailTo,
        p_email_cc: params.emailCc ?? null,
        p_subject: params.subject,
        p_body_html: params.bodyHtml ?? null,
        p_body_text: params.bodyText ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to enqueue notification" };
  return { success: true };
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export type WebhookSettings = {
  id: string;
  brand_id: string;
  url: string;
  secret: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export async function getWebhookSettings(brandId: string): Promise<WebhookSettings | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/wholesale_webhook_settings?brand_id=eq.${brandId}&select=*`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data?.[0] ?? null;
}

export async function saveWebhookSettings(params: {
  brandId: string;
  url?: string;
  secret?: string;
  enabled?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const body: Record<string, unknown> = {
    brand_id: params.brandId,
    url: params.url ?? "",
    secret: params.secret ?? "",
    enabled: params.enabled ?? false,
  };

  // Upsert using service role key (RLS blocks direct writes)
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_wholesale_webhook_settings`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(serviceKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to save webhook settings" };
  return { success: true };
}

export async function enqueueWholesaleWebhook(
  eventType: "order_created" | "order_fulfilled" | "deposit_recorded" | "order_paid",
  orderId: string | null = null,
  payload: Record<string, unknown> | null = null,
  brandId?: string
): Promise<{ success: boolean; logId?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/enqueue_wholesale_webhook`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_event_type: eventType,
        p_order_id: orderId,
        p_payload: payload,
        p_brand_id: brandId ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false };
  const data = await response.json();
  return { success: true, logId: data };
}

export async function getRecentWebhookActivity(brandId: string, limit = 10): Promise<Array<{
  id: string;
  event_type: string;
  order_id: string | null;
  status: string;
  attempts: number;
  created_at: string;
  response: string | null;
}>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/wholesale_sync_log?brand_id=eq.${brandId}&order=created_at.desc&limit=${limit}`,
    {
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    }
  );
  if (!res.ok) return [];
  return res.json();
}