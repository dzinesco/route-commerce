-- =====================================================================
-- SYNTHESIZED BASE SCHEMA - TEMPORARY
-- =====================================================================
-- This is a synthesized base schema derived from migration column
-- references. It exists to give the local DB a workable structure
-- BEFORE the real Supabase data dump arrives.
--
-- WHEN the brother removes the Supabase spend cap and the user gets
-- the real pg_dump, this entire file should be DROPPED and replaced
-- with the real schema from the dump. Do NOT rely on this for prod.
--
-- Pattern: every table has id (UUID PK), created_at, updated_at.
-- Columns confirmed by migrations are added with proper types.
-- For data we don't know about, a payload JSONB column holds it
-- so the dump can be loaded without constraint failures.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============== BRANDS ==============
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name TEXT,
  owner_user_id UUID,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT DEFAULT 'inactive',
  stripe_current_period_end TIMESTAMPTZ,
  plan_tier TEXT DEFAULT 'starter',
  max_users INT DEFAULT 1,
  max_stops_monthly INT DEFAULT 25,
  max_products INT DEFAULT 50,
  logo_url TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== BRAND SETTINGS ==============
CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  hero_tagline TEXT,
  hero_image_url TEXT,
  about_headline TEXT,
  about_subheadline TEXT,
  custom_footer_text TEXT,
  show_wholesale_link BOOLEAN DEFAULT true,
  show_zip_search BOOLEAN DEFAULT true,
  show_schedule_pdf BOOLEAN DEFAULT true,
  show_text_alerts BOOLEAN DEFAULT false,
  schedule_pdf_notes TEXT,
  brand_primary_color TEXT DEFAULT '#16a34a',
  brand_secondary_color TEXT DEFAULT '#f5f5f4',
  brand_bg_color TEXT DEFAULT '#fafaf9',
  brand_text_color TEXT DEFAULT '#1c1917',
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== BRAND FEATURES (add-ons) ==============
CREATE TABLE IF NOT EXISTS brand_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  feature_key TEXT,
  enabled BOOLEAN DEFAULT false,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== PRODUCTS ==============
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC(12,2),
  image_url TEXT,
  is_taxable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== STOPS ==============
CREATE TABLE IF NOT EXISTS stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  address TEXT,
  zip TEXT,
  city TEXT,
  state TEXT,
  datetime TIMESTAMPTZ,
  cutoff_time TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  deleted_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== ORDERS ==============
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  stop_id UUID,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  total_amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending',
  fulfillment_type TEXT,
  shipping_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  idempotency_key UUID UNIQUE,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== ORDER ITEMS ==============
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  product_id UUID,
  quantity INT DEFAULT 1,
  price NUMERIC(12,2),
  fulfillment TEXT DEFAULT 'pickup',
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== PRODUCT STOPS (junction) ==============
CREATE TABLE IF NOT EXISTS product_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  stop_id UUID,
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== CUSTOMERS ==============
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== ADMIN USERS ==============
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  brand_id UUID,
  email TEXT,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== WHOLESALE TABLES ==============
CREATE TABLE IF NOT EXISTS wholesale_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  wholesale_enabled BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC(12,2),
  rc_product_id UUID,
  is_active BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  customer_id UUID,
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC(12,2),
  cart_snapshot JSONB,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesale_order_id UUID,
  product_id UUID,
  customer_id UUID,
  quantity INT,
  price NUMERIC(12,2),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  customer_id UUID,
  order_id UUID,
  amount NUMERIC(12,2),
  payment_method TEXT,
  status TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_customer_product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  product_id UUID,
  price NUMERIC(12,2),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wholesale_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== COMMUNICATIONS ==============
CREATE TABLE IF NOT EXISTS communication_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'draft',
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  subject TEXT,
  body TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  email TEXT,
  name TEXT,
  sms_opt_in BOOLEAN DEFAULT false,
  email_opt_in BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  campaign_id UUID,
  contact_id UUID,
  channel TEXT,
  customer_email TEXT,
  subject TEXT,
  body TEXT,
  event_id TEXT,
  status TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  definition JSONB,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== HARVEST LOTS ==============
CREATE TABLE IF NOT EXISTS harvest_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  product_id UUID,
  lot_number TEXT,
  quantity_lbs NUMERIC(12,2),
  quantity_used_lbs NUMERIC(12,2) DEFAULT 0,
  harvest_date DATE,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harvest_lot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID,
  event_type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== WATER LOG ==============
CREATE TABLE IF NOT EXISTS water_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  email TEXT,
  name TEXT,
  pin TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_headgates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  token TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_irrigators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  pin TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  headgate_id UUID,
  irrigator_id UUID,
  logged_by UUID,
  gallons NUMERIC(12,2),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== TIME TRACKING ==============
CREATE TABLE IF NOT EXISTS time_tracking_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  pin TEXT,
  is_active BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_tracking_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  worker_id UUID,
  task_id UUID,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_tracking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_tracking_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  worker_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== REFERRALS ==============
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  code TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  referral_code_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== PAYMENTS / SETTINGS ==============
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  order_id UUID,
  amount NUMERIC(12,2),
  reason TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS square_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS square_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== API KEYS ==============
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  key TEXT,
  name TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== ONBOARDING / ACTIVITY ==============
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  user_id UUID,
  step TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  user_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  user_email TEXT,
  cart JSONB,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  user_id UUID,
  action TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  admin_user_id UUID,
  action TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  user_id UUID,
  action TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operational_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  event_type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== WELCOME / ABANDONED CART ==============
CREATE TABLE IF NOT EXISTS welcome_email_sequence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS abandoned_cart_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============== CHANGELOGS ==============
CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  title TEXT,
  body TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS changelog_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changelog_id UUID,
  user_id UUID,
  read_at TIMESTAMPTZ DEFAULT now()
);

-- ============== FOUNDER / MISC ==============
CREATE TABLE IF NOT EXISTS founder_pain_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== VIEWS (used in some RPCs) ==============
CREATE TABLE IF NOT EXISTS completed_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pending_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pickup_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Done. 65 base tables synthesized.
