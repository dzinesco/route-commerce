-- 0001_init.sql
--
-- Route Commerce SaaS schema. Single migration, idempotent, no DROP.
-- Follows CLAUDE.md conventions:
--   - Status enums as TEXT with CHECK (no PG ENUM type)
--   - TIMESTAMPTZ everywhere
--   - gen_random_uuid() for PKs
--   - CREATE OR REPLACE FUNCTION for helpers
--
-- Multi-tenancy: every business table has `tenant_id` and an RLS policy
-- that compares it to `current_setting('app.current_tenant_id')`. The
-- application MUST set this GUC (transaction-local) before any query
-- against a tenant-scoped table. See `db/client.ts` for the wrapper.
--
-- Platform admin (sees all tenants) sets `app.platform_admin = 'true'`
-- instead. RLS policies allow that to bypass the tenant filter.

BEGIN;

-- ════════════════════════════════════════════════════════════════════════
-- 0. Extensions
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════════════════
-- 1. Tenancy + auth
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'churned')),
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  image TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'dev'
    CHECK (auth_provider IN ('dev', 'google', 'email')),
  auth_subject TEXT,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_subject_idx
  ON users (auth_provider, auth_subject)
  WHERE auth_subject IS NOT NULL;

CREATE TABLE IF NOT EXISTS tenant_users (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'brand_admin'
    CHECK (role IN ('platform_admin', 'brand_admin', 'store_employee')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS tenant_users_user_idx ON tenant_users (user_id);

-- ════════════════════════════════════════════════════════════════════════
-- 2. Billing
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE
    CHECK (code IN ('starter', 'farm', 'enterprise')),
  name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  max_users INTEGER NOT NULL,
  max_products INTEGER NOT NULL,
  max_stops_monthly INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE
    CHECK (code IN (
      'wholesale_portal',
      'harvest_reach',
      'ai_tools',
      'water_log',
      'square_sync',
      'sms_campaigns'
    )),
  name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_add_ons (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  add_on_id UUID NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, add_on_id)
);

-- ════════════════════════════════════════════════════════════════════════
-- 3. Products
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  inventory INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_tenant_idx ON products (tenant_id);
CREATE INDEX IF NOT EXISTS products_active_idx ON products (tenant_id, active);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_idx
  ON product_images (product_id, position);

-- ════════════════════════════════════════════════════════════════════════
-- 4. Stops
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stops_tenant_idx ON stops (tenant_id);
CREATE INDEX IF NOT EXISTS stops_status_idx ON stops (tenant_id, status);

-- ════════════════════════════════════════════════════════════════════════
-- 5. Customers
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  sms_opt_in BOOLEAN NOT NULL DEFAULT false,
  email_opt_in BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_tenant_idx ON customers (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_email_idx
  ON customers (tenant_id, email)
  WHERE email IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════
-- 6. Orders
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'fulfilled', 'canceled')),
  fulfillment TEXT NOT NULL
    CHECK (fulfillment IN ('pickup', 'ship', 'mixed')),
  notes TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_tenant_idx ON orders (tenant_id);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (tenant_id, status);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  fulfillment TEXT NOT NULL
    CHECK (fulfillment IN ('pickup', 'ship'))
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- ════════════════════════════════════════════════════════════════════════
-- 7. Brand settings
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS brand_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  tagline TEXT,
  about_html TEXT,
  primary_color TEXT DEFAULT '#0F766E',
  logo_storage_key TEXT,
  hero_storage_key TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  custom_footer_text TEXT,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════
-- 8. Marketing
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_templates_tenant_idx ON email_templates (tenant_id);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'canceled')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_tenant_idx ON campaigns (tenant_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns (tenant_id, status);

-- ════════════════════════════════════════════════════════════════════════
-- 9. Files
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  purpose TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS files_tenant_idx ON files (tenant_id);

-- ════════════════════════════════════════════════════════════════════════
-- 10. Audit log
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_tenant_idx
  ON audit_log (tenant_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════
-- 11. RLS helpers
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.platform_admin', true), ''), 'false') = 'true';
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 12. Enable RLS on tenant-scoped tables
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS does not apply to the table owner by default. We FORCE it so the
-- application (which connects as the same user that owns the tables in
-- dev) cannot accidentally bypass tenant isolation. In production, the
-- application should connect as a non-owner role; this is belt-and-
-- suspenders for the dev/local case.
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE product_images FORCE ROW LEVEL SECURITY;
ALTER TABLE stops FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE brand_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE email_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════
-- 13. RLS policies: tenant match OR platform admin
-- ════════════════════════════════════════════════════════════════════════

-- Drop existing policies (idempotent — same migration may be re-applied)
DROP POLICY IF EXISTS tenant_isolation ON products;
DROP POLICY IF EXISTS tenant_isolation ON product_images;
DROP POLICY IF EXISTS tenant_isolation ON stops;
DROP POLICY IF EXISTS tenant_isolation ON customers;
DROP POLICY IF EXISTS tenant_isolation ON orders;
DROP POLICY IF EXISTS tenant_isolation ON order_items;
DROP POLICY IF EXISTS tenant_isolation ON brand_settings;
DROP POLICY IF EXISTS tenant_isolation ON email_templates;
DROP POLICY IF EXISTS tenant_isolation ON campaigns;
DROP POLICY IF EXISTS tenant_isolation ON files;
DROP POLICY IF EXISTS tenant_isolation ON audit_log;

CREATE POLICY tenant_isolation ON products
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_isolation ON product_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
        AND (p.tenant_id = current_tenant_id() OR is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
        AND (p.tenant_id = current_tenant_id() OR is_platform_admin())
    )
  );

CREATE POLICY tenant_isolation ON stops
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_isolation ON customers
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_isolation ON orders
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_isolation ON order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.tenant_id = current_tenant_id() OR is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.tenant_id = current_tenant_id() OR is_platform_admin())
    )
  );

CREATE POLICY tenant_isolation ON brand_settings
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_isolation ON email_templates
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_isolation ON campaigns
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin());

CREATE POLICY tenant_isolation ON files
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin() OR tenant_id IS NULL)
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin() OR tenant_id IS NULL);

CREATE POLICY tenant_isolation ON audit_log
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_platform_admin() OR tenant_id IS NULL)
  WITH CHECK (tenant_id = current_tenant_id() OR is_platform_admin() OR tenant_id IS NULL);

-- ════════════════════════════════════════════════════════════════════════
-- 14. updated_at triggers
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS stops_updated_at ON stops;
CREATE TRIGGER stops_updated_at BEFORE UPDATE ON stops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS brand_settings_updated_at ON brand_settings;
CREATE TRIGGER brand_settings_updated_at BEFORE UPDATE ON brand_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
