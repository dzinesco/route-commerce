"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

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
 * multi_brand_admin → active brand from cookie/URL/legacy, must be in brand_ids
 * unauthenticated → null (actions should already bail out earlier)
 *
 * This prevents brand_admin from seeing or modifying another brand's data
 * even if they manually pass a different brandId to the action.
 */
async function resolveBrandId(
  adminUser: Awaited<ReturnType<typeof getAdminUser>>,
  requestedBrandId?: string
): Promise<string | null> {
  if (!adminUser) return null;

  if (adminUser.role === "platform_admin") {
    // platform_admin can operate on all brands — pass null (= all brands) to RPC
    return null;
  }

  // For non-platform-admin: resolve the active brand (validates against brand_ids)
  const activeBrandId = await getActiveBrandId(adminUser, requestedBrandId);

  if (requestedBrandId && activeBrandId !== requestedBrandId) {
    // Brand admin trying to operate on another brand's data — block it
    return null; // caller should check and return unauthorized
  }

  return activeBrandId;
}

/**
 * Like resolveBrandId but returns null for platform_admin AND throws an error
 * if a brand_admin tries to operate outside their brand.
 * Use for mutating actions (save, delete, fulfill) where cross-brand access must be blocked.
 */
async function enforceBrandScope(
  adminUser: Awaited<ReturnType<typeof getAdminUser>>,
  requestedBrandId?: string
): Promise<{ brandId: string | null; error?: string }> {
  if (!adminUser) return { brandId: null, error: "Not authenticated" };

  if (adminUser.role === "platform_admin") {
    return { brandId: null }; // unrestricted
  }

  // For non-platform-admin: resolve the active brand (validates against brand_ids)
  const activeBrandId = await getActiveBrandId(adminUser, requestedBrandId);

  if (requestedBrandId && activeBrandId !== requestedBrandId) {
    return { brandId: null, error: "Not authorized to operate on this brand" };
  }

  return { brandId: activeBrandId };
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function getWholesaleOrders(brandId?: string): Promise<WholesaleOrder[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = await resolveBrandId(adminUser, brandId);

  try {
    const { rows } = await pool.query<WholesaleOrder>(
      "SELECT * FROM get_wholesale_orders($1)",
      [bid]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function getWholesalePickupOrders(brandId?: string): Promise<WholesaleOrder[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = await resolveBrandId(adminUser, brandId);

  try {
    const { rows } = await pool.query<WholesaleOrder>(
      "SELECT * FROM get_wholesale_pickup_orders($1)",
      [bid]
    );
    return rows;
  } catch {
    return [];
  }
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

  const { brandId: resolved, error } = await enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  try {
    const { rows } = await pool.query(
      "SELECT * FROM mark_wholesale_order_fulfilled($1, $2)",
      [orderId, adminUser.user_id]
    );
    if (!rows || rows.length === 0) {
      return { success: false, error: "Failed to mark fulfilled" };
    }
  } catch {
    return { success: false, error: "Failed to mark fulfilled" };
  }

  enqueueWholesaleWebhookForOrderFulfilled(orderId, resolved ?? undefined).catch(() => {});

  return { success: true };
}

async function enqueueWholesaleWebhookForOrderFulfilled(orderId: string, brandId?: string) {
  try {
    await pool.query(
      "SELECT enqueue_wholesale_webhook($1, $2, $3, $4::jsonb)",
      [
        "order_fulfilled",
        orderId,
        brandId ?? null,
        JSON.stringify({ order_id: orderId }),
      ]
    );
  } catch (_) {}
}

export async function updateWholesaleOrderStatus(
  orderId: string,
  status: "pending" | "confirmed" | "cancelled",
  brandId?: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { error } = await enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  try {
    await pool.query(
      "SELECT * FROM update_wholesale_order_status($1, $2)",
      [orderId, status]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update order status" };
  }
}

export async function deleteWholesaleOrder(orderId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { error } = await enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  try {
    await pool.query(
      "SELECT * FROM delete_wholesale_order($1)",
      [orderId]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete order" };
  }
}

export async function deleteWholesaleCustomer(customerId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const { error } = await enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  try {
    const { rows } = await pool.query<{ success: boolean; error?: string }>(
      "SELECT * FROM delete_wholesale_customer($1)",
      [customerId]
    );
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data?.success) {
      return { success: false, error: data?.error ?? "Delete failed" };
    }
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete customer" };
  }
}

export async function deleteWholesaleProduct(productId: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products) return { success: false, error: "Not authorized" };

  const { error } = await enforceBrandScope(adminUser, brandId);
  if (error) return { success: false, error };

  try {
    const { rows } = await pool.query<{ success: boolean; error?: string }>(
      "SELECT * FROM delete_wholesale_product($1)",
      [productId]
    );
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data?.success) {
      return { success: false, error: data?.error ?? "Delete failed" };
    }
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete product" };
  }
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getWholesaleCustomers(brandId?: string): Promise<WholesaleCustomer[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = await resolveBrandId(adminUser, brandId);

  try {
    const { rows } = await pool.query<WholesaleCustomer>(
      "SELECT * FROM get_wholesale_customers($1)",
      [bid]
    );
    return rows;
  } catch {
    return [];
  }
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

  const { error } = await enforceBrandScope(adminUser, params.brandId);
  if (error) return { success: false, error };

  try {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT * FROM upsert_wholesale_customer($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
      [
        params.brandId,
        params.userId ?? null,
        params.companyName ?? null,
        params.contactName ?? null,
        params.email ?? null,
        params.phone ?? null,
        params.accountStatus ?? "active",
        params.creditLimit ?? 0,
        params.depositsEnabled ?? false,
        params.depositThreshold ?? null,
        params.depositPercentage ?? null,
        params.orderEmail ?? null,
        params.invoiceEmail ?? null,
        params.adminNotes ?? null,
      ]
    );
    const data = Array.isArray(rows) ? rows[0] : rows;
    return { success: true, id: data?.id };
  } catch {
    return { success: false, error: "Failed to save customer" };
  }
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getWholesaleProducts(brandId?: string): Promise<WholesaleProduct[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  const bid = await resolveBrandId(adminUser, brandId);

  try {
    const { rows } = await pool.query<WholesaleProduct>(
      "SELECT * FROM get_wholesale_products($1)",
      [bid]
    );
    return rows;
  } catch {
    return [];
  }
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

  const { error } = await enforceBrandScope(adminUser, params.brandId);
  if (error) return { success: false, error };

  try {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT * FROM upsert_wholesale_product($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
      [
        params.brandId,
        params.id ?? null,
        params.name,
        params.description ?? null,
        params.unitType ?? "each",
        params.availability ?? "unavailable",
        params.qtyAvailable ?? 0,
        JSON.stringify(params.priceTiers ?? []),
        params.hpSku ?? null,
        params.hpItemId ?? null,
        params.internalNotes ?? null,
        params.handlingInstructions ?? null,
        params.storageWarning ?? null,
        params.productLabel ?? null,
        params.packStyle ?? null,
        params.containerType ?? null,
        params.defaultPickupLocation ?? null,
      ]
    );
    const data = Array.isArray(rows) ? rows[0] : rows;
    return { success: true, id: data?.id };
  } catch {
    return { success: false, error: "Failed to save product" };
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getWholesaleSettings(brandId?: string): Promise<WholesaleSettings | null> {
  const adminUser = await getAdminUser();
  if (!adminUser) return null;
  const bid = await getActiveBrandId(adminUser, brandId);
  if (!bid && adminUser.role !== "platform_admin") {
    return null;
  }

  try {
    const { rows } = await pool.query<WholesaleSettings>(
      "SELECT * FROM get_wholesale_settings($1)",
      [bid]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
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

  try {
    await pool.query(
      "SELECT upsert_wholesale_settings($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)",
      [
        params.brandId,
        params.requireApproval ?? null,
        params.minOrderAmount ?? null,
        params.onlinePaymentEnabled ?? null,
        params.wholesaleEnabled ?? null,
        params.pickupLocation ?? null,
        params.fobLocation ?? null,
        params.fromEmail ?? null,
        params.invoiceBusinessName ?? null,
        params.invoiceBusinessAddress ?? null,
        params.invoiceBusinessPhone ?? null,
        params.invoiceBusinessEmail ?? null,
        params.invoiceBusinessWebsite ?? null,
        params.notificationEmail ?? null,
        params.notificationRecipients ? JSON.stringify(params.notificationRecipients) : null,
        params.squareSyncEnabled ?? null,
      ]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save settings" };
  }
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

  const activeBrandId = await getActiveBrandId(adminUser);
  let data: { success?: boolean; error?: string } | null = null;
  try {
    const { rows } = await pool.query<{ success: boolean; error?: string }>(
      "SELECT * FROM record_wholesale_deposit($1, $2, $3, $4, $5, $6)",
      [orderId, amount, method, reference ?? null, adminUser.user_id, activeBrandId]
    );
    data = Array.isArray(rows) ? rows[0] : rows;
    if (!data?.success) {
      return { success: false, error: data?.error ?? "Failed to record deposit" };
    }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to record deposit" };
  }

  // Fire webhook — fire-and-forget
  enqueueWholesaleWebhookForDepositRecorded(orderId, amount, activeBrandId ?? undefined).catch(() => {});

  return { success: true };
}

async function enqueueWholesaleWebhookForDepositRecorded(orderId: string, amount: number, brandId?: string) {
  try {
    await pool.query(
      "SELECT enqueue_wholesale_webhook($1, $2, $3, $4::jsonb)",
      [
        "deposit_recorded",
        orderId,
        brandId ?? null,
        JSON.stringify({ order_id: orderId, amount }),
      ]
    );
  } catch (_) {}
}

// ── Bulk Actions ──────────────────────────────────────────────────────────────

export async function bulkFulfillWholesaleOrders(
  orderIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  try {
    const { rows } = await pool.query<{ success: boolean; count?: number; error?: string }>(
      "SELECT * FROM bulk_fulfill_wholesale_orders($1, $2, $3)",
      [orderIds, adminUser.user_id, await getActiveBrandId(adminUser)]
    );
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data?.success) {
      return { success: false, error: data?.error ?? "Failed to bulk fulfill orders" };
    }
    return { success: true, count: data.count };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to bulk fulfill orders" };
  }
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

  try {
    const { rows } = await pool.query<{ success: boolean; count?: number; error?: string }>(
      "SELECT * FROM bulk_record_wholesale_deposit($1, $2, $3, $4, $5, $6)",
      [orderIds, amount, method, reference ?? null, adminUser.user_id, await getActiveBrandId(adminUser)]
    );
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data?.success) {
      return { success: false, error: data?.error ?? "Failed to bulk record deposits" };
    }
    return { success: true, count: data.count };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to bulk record deposits" };
  }
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
  try {
    const { rows } = await pool.query<{ pending: number; sent: number; failed: number; total: number }>(
      "SELECT * FROM get_wholesale_notification_stats($1)",
      [brandId]
    );
    return rows[0] ?? { pending: 0, sent: 0, failed: 0, total: 0 };
  } catch {
    return { pending: 0, sent: 0, failed: 0, total: 0 };
  }
}

export async function getWholesalePendingNotifications(
  brandId: string,
  limit = 50
): Promise<WholesaleNotification[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (!adminUser.can_manage_orders) return [];

  try {
    const { rows } = await pool.query<WholesaleNotification>(
      "SELECT * FROM get_wholesale_pending_notifications($1, $2)",
      [brandId, limit]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function markWholesaleNotificationSent(
  notificationId: string,
  error?: string
): Promise<{ success: boolean }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false };
  if (!adminUser.can_manage_orders) return { success: false };

  try {
    await pool.query(
      "SELECT mark_wholesale_notification_sent($1, $2)",
      [notificationId, error ?? null]
    );
    return { success: true };
  } catch {
    return { success: false };
  }
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
  try {
    await pool.query(
      "SELECT enqueue_wholesale_notification($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        params.brandId,
        params.customerId,
        params.orderId,
        params.type,
        params.emailTo,
        params.emailCc ?? null,
        params.subject,
        params.bodyHtml ?? null,
        params.bodyText ?? null,
      ]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to enqueue notification" };
  }
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
  try {
    const { rows } = await pool.query<WebhookSettings>(
      "SELECT * FROM wholesale_webhook_settings WHERE brand_id = $1 LIMIT 1",
      [brandId]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
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

  try {
    await pool.query(
      "SELECT upsert_wholesale_webhook_settings($1::jsonb)",
      [
        JSON.stringify({
          brand_id: params.brandId,
          url: params.url ?? "",
          secret: params.secret ?? "",
          enabled: params.enabled ?? false,
        }),
      ]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save webhook settings" };
  }
}

export async function enqueueWholesaleWebhook(
  eventType: "order_created" | "order_fulfilled" | "deposit_recorded" | "order_paid",
  orderId: string | null = null,
  payload: Record<string, unknown> | null = null,
  brandId?: string
): Promise<{ success: boolean; logId?: string }> {
  try {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT enqueue_wholesale_webhook($1, $2, $3::jsonb, $4)",
      [eventType, orderId, payload ? JSON.stringify(payload) : null, brandId ?? null]
    );
    const data = Array.isArray(rows) ? rows[0] : rows;
    return { success: true, logId: data?.id };
  } catch {
    return { success: false };
  }
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
  try {
    const { rows } = await pool.query<{
      id: string;
      event_type: string;
      order_id: string | null;
      status: string;
      attempts: number;
      created_at: string;
      response: string | null;
    }>(
      "SELECT * FROM wholesale_sync_log WHERE brand_id = $1 ORDER BY created_at DESC LIMIT $2",
      [brandId, limit]
    );
    return rows;
  } catch {
    return [];
  }
}