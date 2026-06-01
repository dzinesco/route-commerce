-- Migration 049: Invoice Settings + TC Invoice Numbers + Secure Token
-- - Adds invoice business contact fields to wholesale_settings
-- - Updates create_wholesale_order to generate TC-XXXXXX format + secure token
-- - Updates upsert_wholesale_settings to persist the new invoice fields

BEGIN;

-- ── 1. Add invoice business contact columns to wholesale_settings ────────────
ALTER TABLE public.wholesale_settings
  ADD COLUMN IF NOT EXISTS invoice_business_address TEXT,
  ADD COLUMN IF NOT EXISTS invoice_business_phone  TEXT,
  ADD COLUMN IF NOT EXISTS invoice_business_email  TEXT,
  ADD COLUMN IF NOT EXISTS invoice_business_website TEXT;

-- ── 2. Update upsert_wholesale_settings RPC to handle new invoice fields ─────
DROP FUNCTION IF EXISTS public.upsert_wholesale_settings(
  UUID, UUID, UUID, BOOLEAN, NUMERIC, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.upsert_wholesale_settings(
  p_brand_id                  UUID DEFAULT NULL,
  p_portal_page_id            UUID DEFAULT NULL,
  p_price_sheet_page_id       UUID DEFAULT NULL,
  p_require_approval          BOOLEAN DEFAULT NULL,
  p_min_order_amount          NUMERIC DEFAULT NULL,
  p_online_payment_enabled    BOOLEAN DEFAULT NULL,
  p_wholesale_enabled         BOOLEAN DEFAULT NULL,
  p_pickup_location           TEXT DEFAULT NULL,
  p_fob_location              TEXT DEFAULT NULL,
  p_from_email                TEXT DEFAULT NULL,
  p_invoice_business_name     TEXT DEFAULT NULL,
  p_invoice_business_address  TEXT DEFAULT NULL,
  p_invoice_business_phone    TEXT DEFAULT NULL,
  p_invoice_business_email    TEXT DEFAULT NULL,
  p_invoice_business_website  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO wholesale_settings (
    brand_id, portal_page_id, price_sheet_page_id,
    require_approval, min_order_amount, online_payment_enabled,
    wholesale_enabled, pickup_location, fob_location, from_email,
    invoice_business_name, invoice_business_address,
    invoice_business_phone, invoice_business_email, invoice_business_website
  )
  VALUES (
    p_brand_id, p_portal_page_id, p_price_sheet_page_id,
    COALESCE(p_require_approval, true),
    p_min_order_amount, COALESCE(p_online_payment_enabled, false),
    COALESCE(p_wholesale_enabled, true),
    p_pickup_location, p_fob_location, p_from_email,
    p_invoice_business_name, p_invoice_business_address,
    p_invoice_business_phone, p_invoice_business_email, p_invoice_business_website
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    portal_page_id             = COALESCE(p_portal_page_id, wholesale_settings.portal_page_id),
    price_sheet_page_id        = COALESCE(p_price_sheet_page_id, wholesale_settings.price_sheet_page_id),
    require_approval           = COALESCE(p_require_approval, wholesale_settings.require_approval),
    min_order_amount           = COALESCE(p_min_order_amount, wholesale_settings.min_order_amount),
    online_payment_enabled     = COALESCE(p_online_payment_enabled, wholesale_settings.online_payment_enabled),
    wholesale_enabled          = COALESCE(p_wholesale_enabled, wholesale_settings.wholesale_enabled),
    pickup_location            = COALESCE(p_pickup_location, wholesale_settings.pickup_location),
    fob_location               = COALESCE(p_fob_location, wholesale_settings.fob_location),
    from_email                 = COALESCE(p_from_email, wholesale_settings.from_email),
    invoice_business_name      = COALESCE(p_invoice_business_name, wholesale_settings.invoice_business_name),
    invoice_business_address   = COALESCE(p_invoice_business_address, wholesale_settings.invoice_business_address),
    invoice_business_phone     = COALESCE(p_invoice_business_phone, wholesale_settings.invoice_business_phone),
    invoice_business_email     = COALESCE(p_invoice_business_email, wholesale_settings.invoice_business_email),
    invoice_business_website   = COALESCE(p_invoice_business_website, wholesale_settings.invoice_business_website),
    updated_at                 = now();
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 3. Update create_wholesale_order to generate TC-XXXXXX + invoice_token ───
DROP FUNCTION IF EXISTS public.create_wholesale_order(
  UUID, UUID, DATE, JSONB, INTEGER, TEXT
);

CREATE OR REPLACE FUNCTION public.create_wholesale_order(
  p_brand_id               UUID DEFAULT NULL,
  p_customer_id            UUID DEFAULT NULL,
  p_anticipated_pickup_date DATE DEFAULT NULL,
  p_items                  JSONB DEFAULT '[]'::JSONB,
  p_deposit_percentage     INTEGER DEFAULT NULL,
  p_notes                  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id       UUID;
  v_subtotal       NUMERIC(10,2);
  v_dep_required   NUMERIC(10,2) := 0;
  v_customer       RECORD;
  v_settings       RECORD;
  v_inv_number     TEXT;
  v_inv_token      TEXT;
  v_status         TEXT;
BEGIN
  -- Resolve customer deposit rules
  SELECT deposits_enabled, deposit_threshold, deposit_percentage
  INTO v_customer
  FROM wholesale_customers
  WHERE id = p_customer_id;

  -- Generate TC-XXXXXX invoice number using RANDOM()
  v_inv_number := 'TC-' || LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
  -- Generate a 32-char hex invoice token using md5 of random + timestamp
  v_inv_token := md5(random()::text || clock_timestamp()::text || now()::text || p_brand_id::text);

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

  v_status := CASE WHEN v_dep_required > 0 THEN 'awaiting_deposit' ELSE 'pending' END;

  INSERT INTO wholesale_orders (
    brand_id, customer_id, status, anticipated_pickup_date,
    subtotal, deposit_required, deposit_paid, balance_due,
    deposit_percentage, internal_notes, invoice_number, invoice_token
  ) VALUES (
    p_brand_id, p_customer_id, v_status, p_anticipated_pickup_date,
    v_subtotal, v_dep_required, 0, v_subtotal,
    p_deposit_percentage, p_notes,
    v_inv_number, v_inv_token
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

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'invoice_number', v_inv_number,
    'status', v_status,
    'deposit_required', v_dep_required,
    'subtotal', v_subtotal
  );
END;
$$;

-- ── 4. RPC: Get wholesale orders for a customer (customer-facing order history) ──
DROP FUNCTION IF EXISTS public.get_wholesale_customer_orders(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_customer_orders(p_customer_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at DESC) INTO v_result
  FROM (
    SELECT
      wo.id,
      wo.status,
      wo.fulfillment_status,
      wo.payment_status,
      wo.anticipated_pickup_date,
      wo.subtotal,
      wo.deposit_required,
      wo.deposit_paid,
      wo.balance_due,
      wo.invoice_number,
      wo.invoice_token,
      wo.created_at,
      wo.updated_at,
      COALESCE(jsonb_agg(CASE WHEN woi.id IS NOT NULL THEN jsonb_build_object(
        'id', woi.id,
        'product_name', wp.name,
        'quantity', woi.quantity,
        'unit_price', woi.unit_price,
        'line_total', woi.line_total
      ) END), '[]'::JSONB) AS items
    FROM wholesale_orders wo
    LEFT JOIN wholesale_order_items woi ON woi.wholesale_order_id = wo.id
    LEFT JOIN wholesale_products wp ON woi.product_id = wp.id
    WHERE wo.customer_id = p_customer_id
    GROUP BY wo.id
    ORDER BY wo.created_at DESC
    LIMIT 100
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
