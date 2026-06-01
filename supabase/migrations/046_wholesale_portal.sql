-- Migration 046: Wholesale Portal Tables
-- Core wholesale ordering portal for Route Commerce.
-- Idempotent — all statements use IF NOT EXISTS / CREATE OR REPLACE.

BEGIN;

-- ── 1. Wholesale Customers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_customers (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID,                                      -- FK added after auth.users exists
  brand_id            UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  company_name        TEXT,
  contact_name        TEXT,
  email               TEXT,
  phone               TEXT,
  billing_address     TEXT,
  shipping_address    TEXT,
  account_status      TEXT        NOT NULL DEFAULT 'active',
  credit_limit        NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposits_enabled    BOOLEAN     NOT NULL DEFAULT false,
  deposit_threshold   NUMERIC(10,2),
  deposit_percentage  INTEGER     CHECK (deposit_percentage IS NULL OR deposit_percentage BETWEEN 1 AND 100),
  order_email         TEXT,
  invoice_email       TEXT,
  admin_notes         TEXT,
  role                TEXT        NOT NULL DEFAULT 'buyer',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add the FK after the table exists. Use DO block so it's idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_customers_user_id_fkey'
  ) THEN
    ALTER TABLE public.wholesale_customers
      ADD CONSTRAINT wholesale_customers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Individual unique constraint on user_id (allows FK reference from other tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_customers_user_id_unique'
  ) THEN
    ALTER TABLE public.wholesale_customers
      ADD CONSTRAINT wholesale_customers_user_id_unique
      UNIQUE (user_id);
  END IF;
END $$;

-- Composite unique: one user + one brand (still useful for the upsert ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_customers_brand_user_unique'
  ) THEN
    ALTER TABLE public.wholesale_customers
      ADD CONSTRAINT wholesale_customers_brand_user_unique
      UNIQUE (brand_id, user_id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.wholesale_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_admin_manage_wholesale_customers" ON wholesale_customers;
CREATE POLICY "brand_admin_manage_wholesale_customers" ON wholesale_customers
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
    AND (
      current_setting('app.settings.role', true)::TEXT = 'platform_admin'
      OR brand_id = current_setting('app.settings.brand_id', true)::UUID
    )
  );

DROP POLICY IF EXISTS "wholesale_customer_read_own" ON wholesale_customers;
CREATE POLICY "wholesale_customer_read_own" ON wholesale_customers
  FOR SELECT USING (
    current_setting('app.settings.role', true)::TEXT = 'wholesale_customer'
    AND user_id = current_setting('app.settings.user_id', true)::UUID
  );

-- ── 2. Wholesale Products ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_products (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id                UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  rc_product_id           UUID        REFERENCES products(id) ON DELETE SET NULL,
  name                    TEXT        NOT NULL,
  description             TEXT,
  unit_type                TEXT        NOT NULL DEFAULT 'each',
  unit_type_custom        TEXT,
  availability            TEXT        NOT NULL DEFAULT 'unavailable',
  qty_available           NUMERIC(10,2) DEFAULT 0,
  season_start            DATE,
  season_end              DATE,
  price_tiers             JSONB       NOT NULL DEFAULT '[]',
  hp_sku                  TEXT,
  hp_item_id              TEXT,
  internal_notes          TEXT,
  handling_instructions   TEXT,
  transport_temp          TEXT,
  storage_warning         TEXT,
  loading_notes           TEXT,
  product_label           TEXT,
  pack_style              TEXT,
  container_type          TEXT,
  container_size_code     TEXT,
  units_per_container     INTEGER,
  container_notes         TEXT,
  default_pickup_location TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_admin_manage_wholesale_products" ON wholesale_products;
CREATE POLICY "brand_admin_manage_wholesale_products" ON wholesale_products
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
    AND (
      current_setting('app.settings.role', true)::TEXT = 'platform_admin'
      OR brand_id = current_setting('app.settings.brand_id', true)::UUID
    )
  );

-- ── 3. Wholesale Orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_orders (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id                UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  customer_id             UUID        NOT NULL,  -- FK added below after customers table exists
  wc_order_id             BIGINT,
  status                  TEXT        NOT NULL DEFAULT 'pending',
  fulfillment_status      TEXT        NOT NULL DEFAULT 'unfulfilled',
  payment_status          TEXT        NOT NULL DEFAULT 'unpaid',
  anticipated_pickup_date DATE,
  subtotal                NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_required        NUMERIC(10,2) DEFAULT 0,
  deposit_paid            NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_due             NUMERIC(10,2) NOT NULL DEFAULT 0,
  assigned_employee_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  fulfillment_notes       TEXT,
  internal_notes          TEXT,
  invoice_number          TEXT,
  invoice_pdf_path        TEXT,
  invoice_token           TEXT,
  invoice_type            TEXT,
  deposit_percentage      INTEGER,
  fulfilled_at            TIMESTAMPTZ,
  fulfilled_by            UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add customer FK now that customers table definitely exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_orders_customer_id_fkey'
  ) THEN
    ALTER TABLE public.wholesale_orders
      ADD CONSTRAINT wholesale_orders_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES wholesale_customers(id) ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_admin_manage_wholesale_orders" ON wholesale_orders;
CREATE POLICY "brand_admin_manage_wholesale_orders" ON wholesale_orders
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
    AND (
      current_setting('app.settings.role', true)::TEXT = 'platform_admin'
      OR brand_id = current_setting('app.settings.brand_id', true)::UUID
    )
  );

-- ── 4. Wholesale Order Items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_order_items (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wholesale_order_id UUID        NOT NULL,  -- FK added below
  product_id          UUID        NOT NULL,  -- FK added below
  quantity            NUMERIC(10,2) NOT NULL,
  unit_price          NUMERIC(10,2) NOT NULL,
  line_total           NUMERIC(10,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_order_items_order_id_fkey'
  ) THEN
    ALTER TABLE public.wholesale_order_items
      ADD CONSTRAINT wholesale_order_items_order_id_fkey
      FOREIGN KEY (wholesale_order_id) REFERENCES wholesale_orders(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_order_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.wholesale_order_items
      ADD CONSTRAINT wholesale_order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES wholesale_products(id) ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.wholesale_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_admin_manage_wholesale_order_items" ON wholesale_order_items;
CREATE POLICY "brand_admin_manage_wholesale_order_items" ON wholesale_order_items
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
  );

-- ── 5. Deposit Transactions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_deposits (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wholesale_order_id  UUID        NOT NULL,  -- FK added below
  amount              NUMERIC(10,2) NOT NULL,
  payment_method      TEXT,
  reference           TEXT,
  recorded_by         UUID        NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_deposits_order_id_fkey'
  ) THEN
    ALTER TABLE public.wholesale_deposits
      ADD CONSTRAINT wholesale_deposits_order_id_fkey
      FOREIGN KEY (wholesale_order_id) REFERENCES wholesale_orders(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.wholesale_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_admin_manage_deposits" ON wholesale_deposits;
CREATE POLICY "brand_admin_manage_deposits" ON wholesale_deposits
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
  );

-- ── 6. Wholesale Settings ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_settings (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id              UUID        NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
  portal_page_id        UUID,
  price_sheet_page_id   UUID,
  require_approval       BOOLEAN     NOT NULL DEFAULT true,
  min_order_amount      NUMERIC(10,2),
  online_payment_enabled BOOLEAN     NOT NULL DEFAULT false,
  pickup_location        TEXT,
  fob_location           TEXT,
  from_email             TEXT,
  invoice_business_name  TEXT,
  last_invoice_number    INTEGER     NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_admin_manage_wholesale_settings" ON wholesale_settings;
CREATE POLICY "brand_admin_manage_wholesale_settings" ON wholesale_settings
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
    AND (
      current_setting('app.settings.role', true)::TEXT = 'platform_admin'
      OR brand_id = current_setting('app.settings.brand_id', true)::UUID
    )
  );

DROP FUNCTION IF EXISTS public.get_wholesale_orders(UUID);
DROP FUNCTION IF EXISTS public.upsert_wholesale_settings(UUID,UUID,UUID,BOOLEAN,NUMERIC,BOOLEAN,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.get_wholesale_settings(UUID);
DROP FUNCTION IF EXISTS public.get_wholesale_customers(UUID);
DROP FUNCTION IF EXISTS public.upsert_wholesale_customer(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC,BOOLEAN,NUMERIC,INTEGER,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.get_wholesale_products(UUID);
DROP FUNCTION IF EXISTS public.upsert_wholesale_product(UUID,UUID,TEXT,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID,UUID);
DROP FUNCTION IF EXISTS public.create_wholesale_order(UUID,UUID,DATE,JSONB,INTEGER,TEXT);
DROP FUNCTION IF EXISTS public.record_wholesale_deposit(UUID,NUMERIC,TEXT,TEXT,UUID);
DROP FUNCTION IF EXISTS public.mark_wholesale_order_fulfilled(UUID,UUID);

-- ── 7. RPCs ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_wholesale_orders(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at DESC) INTO v_result
  FROM (
    SELECT
      wo.id, wo.status, wo.fulfillment_status, wo.payment_status,
      wo.anticipated_pickup_date, wo.subtotal, wo.deposit_required,
      wo.deposit_paid, wo.balance_due, wo.created_at, wo.updated_at,
      wo.invoice_number, wo.assigned_employee_id,
      wc.company_name, wc.contact_name, wc.email AS customer_email,
      COALESCE(jsonb_agg(CASE WHEN woi.id IS NOT NULL THEN jsonb_build_object(
        'id', woi.id,
        'product_name', wp.name,
        'quantity', woi.quantity,
        'unit_price', woi.unit_price,
        'line_total', woi.line_total
      ) END), '[]'::JSONB) AS items,
      wo.fulfilled_at
    FROM wholesale_orders wo
    JOIN wholesale_customers wc ON wo.customer_id = wc.id
    LEFT JOIN wholesale_order_items woi ON woi.wholesale_order_id = wo.id
    LEFT JOIN wholesale_products wp ON woi.product_id = wp.id
    WHERE wo.brand_id = p_brand_id
    GROUP BY wo.id, wc.id
    ORDER BY wo.created_at DESC
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_wholesale_settings(
  p_brand_id               UUID DEFAULT NULL,
  p_portal_page_id         UUID DEFAULT NULL,
  p_price_sheet_page_id    UUID DEFAULT NULL,
  p_require_approval        BOOLEAN DEFAULT NULL,
  p_min_order_amount       NUMERIC DEFAULT NULL,
  p_online_payment_enabled BOOLEAN DEFAULT NULL,
  p_pickup_location        TEXT DEFAULT NULL,
  p_fob_location           TEXT DEFAULT NULL,
  p_from_email             TEXT DEFAULT NULL,
  p_invoice_business_name  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO wholesale_settings (
    brand_id, portal_page_id, price_sheet_page_id,
    require_approval, min_order_amount, online_payment_enabled,
    pickup_location, fob_location, from_email, invoice_business_name
  )
  VALUES (
    p_brand_id, p_portal_page_id, p_price_sheet_page_id,
    COALESCE(p_require_approval, true),
    p_min_order_amount, COALESCE(p_online_payment_enabled, false),
    p_pickup_location, p_fob_location, p_from_email, p_invoice_business_name
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    portal_page_id           = COALESCE(p_portal_page_id, wholesale_settings.portal_page_id),
    price_sheet_page_id      = COALESCE(p_price_sheet_page_id, wholesale_settings.price_sheet_page_id),
    require_approval          = COALESCE(p_require_approval, wholesale_settings.require_approval),
    min_order_amount         = COALESCE(p_min_order_amount, wholesale_settings.min_order_amount),
    online_payment_enabled   = COALESCE(p_online_payment_enabled, wholesale_settings.online_payment_enabled),
    pickup_location          = COALESCE(p_pickup_location, wholesale_settings.pickup_location),
    fob_location             = COALESCE(p_fob_location, wholesale_settings.fob_location),
    from_email               = COALESCE(p_from_email, wholesale_settings.from_email),
    invoice_business_name    = COALESCE(p_invoice_business_name, wholesale_settings.invoice_business_name),
    updated_at               = now()
  RETURNING jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wholesale_settings(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'portal_page_id', portal_page_id,
    'price_sheet_page_id', price_sheet_page_id,
    'require_approval', require_approval,
    'min_order_amount', min_order_amount,
    'online_payment_enabled', online_payment_enabled,
    'pickup_location', pickup_location,
    'fob_location', fob_location,
    'from_email', from_email,
    'invoice_business_name', invoice_business_name,
    'last_invoice_number', last_invoice_number
  ) INTO v_result
  FROM wholesale_settings
  WHERE brand_id = p_brand_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wholesale_customers(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.company_name NULLS LAST) INTO v_result
  FROM (
    SELECT
      id, user_id, company_name, contact_name, email, phone,
      account_status, credit_limit,
      deposits_enabled, deposit_threshold, deposit_percentage,
      order_email, invoice_email, admin_notes, role,
      created_at
    FROM wholesale_customers
    WHERE brand_id = p_brand_id
    ORDER BY company_name NULLS LAST
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_wholesale_customer(
  p_brand_id          UUID DEFAULT NULL,
  p_user_id           UUID DEFAULT NULL,
  p_company_name       TEXT DEFAULT NULL,
  p_contact_name      TEXT DEFAULT NULL,
  p_email             TEXT DEFAULT NULL,
  p_phone             TEXT DEFAULT NULL,
  p_account_status    TEXT DEFAULT NULL,
  p_credit_limit      NUMERIC DEFAULT NULL,
  p_deposits_enabled  BOOLEAN DEFAULT NULL,
  p_deposit_threshold  NUMERIC DEFAULT NULL,
  p_deposit_percentage INTEGER DEFAULT NULL,
  p_order_email       TEXT DEFAULT NULL,
  p_invoice_email     TEXT DEFAULT NULL,
  p_admin_notes       TEXT DEFAULT NULL,
  p_role              TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO wholesale_customers (
    brand_id, user_id, company_name, contact_name, email, phone,
    account_status, credit_limit, deposits_enabled, deposit_threshold,
    deposit_percentage, order_email, invoice_email, admin_notes, role
  )
  VALUES (
    p_brand_id, p_user_id, p_company_name, p_contact_name, p_email, p_phone,
    COALESCE(p_account_status, 'active'),
    COALESCE(p_credit_limit, 0),
    COALESCE(p_deposits_enabled, false),
    p_deposit_threshold, p_deposit_percentage,
    p_order_email, p_invoice_email, p_admin_notes,
    COALESCE(p_role, 'buyer')
  )
  ON CONFLICT (brand_id, user_id) DO UPDATE SET
    company_name      = COALESCE(p_company_name, wholesale_customers.company_name),
    contact_name      = COALESCE(p_contact_name, wholesale_customers.contact_name),
    email             = COALESCE(p_email, wholesale_customers.email),
    phone             = COALESCE(p_phone, wholesale_customers.phone),
    account_status    = COALESCE(p_account_status, wholesale_customers.account_status),
    credit_limit      = COALESCE(p_credit_limit, wholesale_customers.credit_limit),
    deposits_enabled  = COALESCE(p_deposits_enabled, wholesale_customers.deposits_enabled),
    deposit_threshold  = COALESCE(p_deposit_threshold, wholesale_customers.deposit_threshold),
    deposit_percentage= COALESCE(p_deposit_percentage, wholesale_customers.deposit_percentage),
    order_email       = COALESCE(p_order_email, wholesale_customers.order_email),
    invoice_email     = COALESCE(p_invoice_email, wholesale_customers.invoice_email),
    admin_notes       = COALESCE(p_admin_notes, wholesale_customers.admin_notes),
    role              = COALESCE(p_role, wholesale_customers.role),
    updated_at        = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wholesale_products(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.name) INTO v_result
  FROM (
    SELECT
      id, name, description, unit_type, unit_type_custom,
      availability, qty_available, season_start, season_end,
      price_tiers, hp_sku, hp_item_id,
      handling_instructions, storage_warning, loading_notes,
      product_label, pack_style, container_type, container_size_code,
      units_per_container, default_pickup_location,
      created_at
    FROM wholesale_products
    WHERE brand_id = p_brand_id
    ORDER BY name
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_wholesale_product(
  p_brand_id                 UUID DEFAULT NULL,
  p_id                       UUID DEFAULT NULL,
  p_name                     TEXT DEFAULT NULL,
  p_description              TEXT DEFAULT NULL,
  p_unit_type                TEXT DEFAULT NULL,
  p_unit_type_custom          TEXT DEFAULT NULL,
  p_availability             TEXT DEFAULT NULL,
  p_qty_available            NUMERIC DEFAULT NULL,
  p_season_start             DATE DEFAULT NULL,
  p_season_end               DATE DEFAULT NULL,
  p_price_tiers              JSONB DEFAULT NULL,
  p_hp_sku                   TEXT DEFAULT NULL,
  p_hp_item_id               TEXT DEFAULT NULL,
  p_internal_notes           TEXT DEFAULT NULL,
  p_handling_instructions     TEXT DEFAULT NULL,
  p_storage_warning          TEXT DEFAULT NULL,
  p_loading_notes            TEXT DEFAULT NULL,
  p_product_label            TEXT DEFAULT NULL,
  p_pack_style               TEXT DEFAULT NULL,
  p_container_type           TEXT DEFAULT NULL,
  p_container_size_code       TEXT DEFAULT NULL,
  p_units_per_container      INTEGER DEFAULT NULL,
  p_default_pickup_location   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE wholesale_products SET
      name                     = COALESCE(p_name, name),
      description              = COALESCE(p_description, description),
      unit_type                = COALESCE(p_unit_type, unit_type),
      unit_type_custom         = COALESCE(p_unit_type_custom, unit_type_custom),
      availability             = COALESCE(p_availability, availability),
      qty_available            = COALESCE(p_qty_available, qty_available),
      season_start             = COALESCE(p_season_start, season_start),
      season_end               = COALESCE(p_season_end, season_end),
      price_tiers              = COALESCE(p_price_tiers, price_tiers),
      hp_sku                   = COALESCE(p_hp_sku, hp_sku),
      hp_item_id               = COALESCE(p_hp_item_id, hp_item_id),
      internal_notes           = COALESCE(p_internal_notes, internal_notes),
      handling_instructions    = COALESCE(p_handling_instructions, handling_instructions),
      storage_warning          = COALESCE(p_storage_warning, storage_warning),
      loading_notes            = COALESCE(p_loading_notes, loading_notes),
      product_label           = COALESCE(p_product_label, product_label),
      pack_style               = COALESCE(p_pack_style, pack_style),
      container_type           = COALESCE(p_container_type, container_type),
      container_size_code      = COALESCE(p_container_size_code, container_size_code),
      units_per_container      = COALESCE(p_units_per_container, units_per_container),
      default_pickup_location  = COALESCE(p_default_pickup_location, default_pickup_location),
      updated_at               = now()
    WHERE id = p_id AND brand_id = p_brand_id
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO wholesale_products (
      brand_id, name, description, unit_type, unit_type_custom,
      availability, qty_available, season_start, season_end,
      price_tiers, hp_sku, hp_item_id, internal_notes,
      handling_instructions, storage_warning, loading_notes,
      product_label, pack_style, container_type, container_size_code,
      units_per_container, default_pickup_location
    ) VALUES (
      p_brand_id, p_name, p_description,
      COALESCE(p_unit_type, 'each'),
      p_unit_type_custom,
      COALESCE(p_availability, 'unavailable'),
      COALESCE(p_qty_available, 0),
      p_season_start, p_season_end,
      COALESCE(p_price_tiers, '[]'::JSONB),
      p_hp_sku, p_hp_item_id, p_internal_notes,
      p_handling_instructions, p_storage_warning, p_loading_notes,
      p_product_label, p_pack_style, p_container_type, p_container_size_code,
      p_units_per_container, p_default_pickup_location
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_wholesale_order(
  p_brand_id               UUID DEFAULT NULL,
  p_customer_id            UUID DEFAULT NULL,
  p_anticipated_pickup_date  DATE DEFAULT NULL,
  p_items                   JSONB DEFAULT '[]'::JSONB,
  p_deposit_percentage      INTEGER DEFAULT NULL,
  p_notes                   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id     UUID;
  v_subtotal     NUMERIC(10,2);
  v_dep_required NUMERIC(10,2) := 0;
  v_customer     RECORD;
  v_settings     RECORD;
  v_next_inv     INTEGER;
  v_status       TEXT;
BEGIN
  -- Resolve customer deposit rules
  SELECT deposits_enabled, deposit_threshold, deposit_percentage
  INTO v_customer
  FROM wholesale_customers
  WHERE id = p_customer_id;

  -- Resolve invoice counter
  SELECT COALESCE(last_invoice_number, 0) INTO v_settings
  FROM wholesale_settings
  WHERE brand_id = p_brand_id;

  -- Calculate subtotal
  v_subtotal := COALESCE(
    (SELECT SUM(
      ((item->>'quantity')::NUMERIC) * ((item->>'unit_price')::NUMERIC)
     ) FROM jsonb_array_elements(p_items) AS item),
    0
  );

  -- Determine if deposit required
  IF v_customer.deposits_enabled THEN
    IF v_customer.deposit_threshold IS NULL OR v_subtotal >= v_customer.deposit_threshold THEN
      v_dep_required := ROUND(v_subtotal * COALESCE(v_customer.deposit_percentage, 0) / 100.0, 2);
    END IF;
  END IF;

  v_status   := CASE WHEN v_dep_required > 0 THEN 'awaiting_deposit' ELSE 'pending' END;
  v_next_inv := COALESCE(v_settings.last_invoice_number, 0) + 1;

  INSERT INTO wholesale_orders (
    brand_id, customer_id, status, anticipated_pickup_date,
    subtotal, deposit_required, deposit_paid, balance_due,
    deposit_percentage, internal_notes, invoice_number
  ) VALUES (
    p_brand_id, p_customer_id, v_status, p_anticipated_pickup_date,
    v_subtotal, v_dep_required, 0, v_subtotal,
    p_deposit_percentage, p_notes,
    'INV-' || LPAD(v_next_inv::TEXT, 5, '0')
  ) RETURNING id INTO v_order_id;

  -- Insert line items
  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, unit_price, line_total)
    SELECT
      v_order_id,
      (item->>'product_id')::UUID,
      (item->>'quantity')::NUMERIC,
      (item->>'unit_price')::NUMERIC,
      ((item->>'quantity')::NUMERIC) * ((item->>'unit_price')::NUMERIC)
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  -- Advance invoice counter
  UPDATE wholesale_settings
  SET last_invoice_number = v_next_inv, updated_at = now()
  WHERE brand_id = p_brand_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'status', v_status,
    'deposit_required', v_dep_required,
    'subtotal', v_subtotal
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_wholesale_deposit(
  p_order_id   UUID DEFAULT NULL,
  p_amount     NUMERIC DEFAULT NULL,
  p_method     TEXT DEFAULT 'cash',
  p_reference  TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_paid NUMERIC(10,2);
BEGIN
  -- Compute new deposit_paid first so balance_due uses the correct updated value
  SELECT deposit_paid + p_amount INTO v_new_paid
  FROM wholesale_orders
  WHERE id = p_order_id;

  UPDATE wholesale_orders
  SET
    deposit_paid = v_new_paid,
    balance_due   = subtotal - v_new_paid,
    updated_at    = now()
  WHERE id = p_order_id;

  INSERT INTO wholesale_deposits (wholesale_order_id, amount, payment_method, reference, recorded_by)
  VALUES (p_order_id, p_amount, p_method, p_reference, p_recorded_by);

  -- Advance to pending once deposit covers requirement
  UPDATE wholesale_orders
  SET status = 'pending'
  WHERE id = p_order_id
    AND v_new_paid >= deposit_required
    AND status = 'awaiting_deposit';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_wholesale_order_fulfilled(
  p_order_id UUID DEFAULT NULL,
  p_by       UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE wholesale_orders
  SET
    fulfillment_status = 'fulfilled',
    payment_status     = CASE WHEN balance_due <= 0 THEN 'paid' ELSE payment_status END,
    status            = 'fulfilled',
    fulfilled_at      = now(),
    fulfilled_by      = p_by,
    updated_at        = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';