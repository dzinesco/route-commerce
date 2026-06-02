// Zod schemas for API validation across the application

import { z } from "zod";

// Common validation patterns
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email();
const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone number");
const urlSchema = z.string().url().optional();

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Brand/Admin User
export const brandIdSchema = z.object({
  brand_id: z.string().uuid().optional(),
});

// Orders
export const createOrderSchema = z.object({
  brand_id: uuidSchema,
  customer_email: emailSchema.optional(),
  customer_name: z.string().min(1).max(255).optional(),
  customer_phone: phoneSchema.optional(),
  customer_address: z.string().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    product_id: uuidSchema,
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    fulfillment: z.enum(["pickup", "ship"]).default("pickup"),
  })).min(1),
  fulfillment: z.enum(["pickup", "ship", "mixed"]).optional(),
  stop_id: uuidSchema.optional(),
});

export const updateOrderSchema = z.object({
  order_id: uuidSchema,
  status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]).optional(),
  notes: z.string().max(1000).optional(),
  tracking_number: z.string().optional(),
  payment_status: z.enum(["pending", "paid", "refunded", "failed"]).optional(),
});

export const orderFiltersSchema = z.object({
  brand_id: uuidSchema.optional(),
  status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]).optional(),
  fulfillment: z.enum(["pickup", "ship", "mixed"]).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  customer_email: emailSchema.optional(),
  stop_id: uuidSchema.optional(),
});

// Products
export const createProductSchema = z.object({
  brand_id: uuidSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  price: z.number().positive(),
  unit: z.string().min(1).max(50).optional(),
  category: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  is_active: z.boolean().default(true),
  is_taxable: z.boolean().default(true),
  inventory_quantity: z.number().int().nonnegative().optional(),
  image_url: urlSchema.optional(),
});

export const updateProductSchema = z.object({
  product_id: uuidSchema,
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().positive().optional(),
  unit: z.string().min(1).max(50).optional(),
  category: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
  is_taxable: z.boolean().optional(),
  inventory_quantity: z.number().int().nonnegative().optional(),
  image_url: urlSchema.optional(),
});

export const productFiltersSchema = z.object({
  brand_id: uuidSchema.optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  min_price: z.number().positive().optional(),
  max_price: z.number().positive().optional(),
});

// Stops
export const createStopSchema = z.object({
  brand_id: uuidSchema,
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  scheduled_at: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  product_ids: z.array(uuidSchema).optional(),
});

export const updateStopSchema = z.object({
  stop_id: uuidSchema,
  name: z.string().min(1).max(255).optional(),
  address: z.string().min(1).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postal_code: z.string().max(20).optional(),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().max(1000).optional(),
  product_ids: z.array(uuidSchema).optional(),
});

export const stopFiltersSchema = z.object({
  brand_id: uuidSchema.optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// Communication Campaigns
export const createCampaignSchema = z.object({
  brand_id: uuidSchema,
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  template_id: uuidSchema.optional(),
  content: z.string().min(1),
  type: z.enum(["email", "sms"]).default("email"),
  segment_id: uuidSchema.optional(),
  contact_ids: z.array(uuidSchema).optional(),
  scheduled_at: z.string().datetime().optional(),
});

export const updateCampaignSchema = z.object({
  campaign_id: uuidSchema,
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "cancelled"]).optional(),
  scheduled_at: z.string().datetime().optional(),
});

// Communication Contacts
export const createContactSchema = z.object({
  brand_id: uuidSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  company: z.string().max(255).optional(),
  tags: z.array(z.string().max(50)).optional(),
  email_opt_in: z.boolean().default(true),
  sms_opt_in: z.boolean().default(false),
});

export const updateContactSchema = z.object({
  contact_id: uuidSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  company: z.string().max(255).optional(),
  tags: z.array(z.string().max(50)).optional(),
  email_opt_in: z.boolean().optional(),
  sms_opt_in: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

// Communication Templates
export const createTemplateSchema = z.object({
  brand_id: uuidSchema,
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500).optional(),
  content: z.string().min(1),
  type: z.enum(["email", "sms"]).default("email"),
  category: z.string().max(100).optional(),
});

export const updateTemplateSchema = z.object({
  template_id: uuidSchema,
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

// Water Log
export const createWaterLogSchema = z.object({
  brand_id: uuidSchema,
  field_id: uuidSchema.optional(),
  field_name: z.string().max(255).optional(),
  gallons: z.number().positive(),
  duration_minutes: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  logged_at: z.string().datetime().optional(),
});

export const updateWaterLogSchema = z.object({
  log_id: uuidSchema,
  gallons: z.number().positive().optional(),
  duration_minutes: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const waterLogFiltersSchema = z.object({
  brand_id: uuidSchema.optional(),
  field_id: uuidSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// Wholesale
export const createWholesaleOrderSchema = z.object({
  brand_id: uuidSchema,
  customer_id: uuidSchema,
  items: z.array(z.object({
    product_id: uuidSchema,
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1),
  pickup_stop_id: uuidSchema.optional(),
  notes: z.string().max(1000).optional(),
  deposit_amount: z.number().nonnegative().optional(),
  payment_method: z.enum(["stripe", "square", "invoice"]).default("invoice"),
});

export const updateWholesaleCustomerSchema = z.object({
  customer_id: uuidSchema,
  company_name: z.string().max(255).optional(),
  contact_name: z.string().max(255).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  credit_limit: z.number().nonnegative().optional(),
  payment_terms: z.enum(["prepay", "net15", "net30", "net60"]).optional(),
  is_active: z.boolean().optional(),
});

// Billing / Subscriptions
export const createSubscriptionSchema = z.object({
  brand_id: uuidSchema,
  plan_tier: z.enum(["starter", "farm", "enterprise"]),
  interval: z.enum(["monthly", "annual"]).default("monthly"),
  payment_method_id: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  subscription_id: z.string(),
  plan_tier: z.enum(["starter", "farm", "enterprise"]).optional(),
  interval: z.enum(["monthly", "annual"]).optional(),
  status: z.enum(["active", "cancelled", "past_due", "trialing"]).optional(),
});

// Admin Users
export const createAdminUserSchema = z.object({
  email: emailSchema,
  role: z.enum(["platform_admin", "brand_admin", "store_employee"]),
  brand_id: uuidSchema.optional(),
  can_manage_products: z.boolean().default(false),
  can_manage_stops: z.boolean().default(false),
  can_manage_orders: z.boolean().default(false),
  can_manage_pickup: z.boolean().default(false),
  can_manage_messages: z.boolean().default(false),
  can_manage_refunds: z.boolean().default(false),
  can_manage_users: z.boolean().default(false),
  can_manage_water_log: z.boolean().default(false),
  can_manage_reports: z.boolean().default(false),
  can_manage_settings: z.boolean().default(false),
});

export const updateAdminUserSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(["platform_admin", "brand_admin", "store_employee"]).optional(),
  can_manage_products: z.boolean().optional(),
  can_manage_stops: z.boolean().optional(),
  can_manage_orders: z.boolean().optional(),
  can_manage_pickup: z.boolean().optional(),
  can_manage_messages: z.boolean().optional(),
  can_manage_refunds: z.boolean().optional(),
  can_manage_users: z.boolean().optional(),
  can_manage_water_log: z.boolean().optional(),
  can_manage_reports: z.boolean().optional(),
  can_manage_settings: z.boolean().optional(),
  active: z.boolean().optional(),
});

// Reports
export const reportFiltersSchema = z.object({
  brand_id: uuidSchema.optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  group_by: z.enum(["day", "week", "month"]).default("day"),
});

// Feature Flags
export const featureToggleSchema = z.object({
  brand_id: uuidSchema,
  feature_key: z.string().min(1),
  enabled: z.boolean(),
});

// Referral
export const referralSchema = z.object({
  referrer_id: uuidSchema,
  referral_code: z.string().min(6).max(50),
  referred_email: emailSchema,
  campaign_id: z.string().optional(),
});

// Cart
export const cartItemSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().positive(),
  fulfillment: z.enum(["pickup", "ship"]).default("pickup"),
  stop_id: uuidSchema.optional(),
});

// Checkout
export const checkoutSchema = z.object({
  items: z.array(cartItemSchema),
  customer_email: emailSchema,
  customer_name: z.string().min(1).max(255),
  customer_phone: phoneSchema.optional(),
  customer_address: z.string().optional(),
  notes: z.string().max(1000).optional(),
  payment_method: z.enum(["stripe", "square"]).default("stripe"),
  promo_code: z.string().optional(),
});