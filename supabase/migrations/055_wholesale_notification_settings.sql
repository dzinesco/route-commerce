-- Migration 055: Team Notification Email + Pickup Reminder Types
-- - Adds notification_email field to wholesale_settings (team inbox per brand)
-- - Adds pickup_reminder and unclaimed_pickup to wholesale_notification_type enum
-- - Updates get_wholesale_settings to return notification_email

BEGIN;

-- ── 1. Add notification_email column ─────────────────────────────────────────
ALTER TABLE public.wholesale_settings
  ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- ── 2. Extend notification type enum ────────────────────────────────────────────
ALTER TYPE wholesale_notification_type ADD VALUE IF NOT EXISTS 'pickup_reminder';
ALTER TYPE wholesale_notification_type ADD VALUE IF NOT EXISTS 'unclaimed_pickup';

-- ── 3. Update get_wholesale_settings to return all settings fields ──────────────
-- Recreate to include notification_email (new) and all invoice fields (from 049)
DROP FUNCTION IF EXISTS public.get_wholesale_settings(UUID);
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
    'wholesale_enabled', wholesale_enabled,
    'pickup_location', pickup_location,
    'fob_location', fob_location,
    'from_email', from_email,
    'invoice_business_name', invoice_business_name,
    'invoice_business_address', invoice_business_address,
    'invoice_business_phone', invoice_business_phone,
    'invoice_business_email', invoice_business_email,
    'invoice_business_website', invoice_business_website,
    'notification_email', notification_email,
    'last_invoice_number', last_invoice_number
  ) INTO v_result
  FROM wholesale_settings
  WHERE brand_id = p_brand_id;
  RETURN v_result;
END;
$$;

-- ── 4. Add get_wholesale_overdue_orders RPC ─────────────────────────────────────
-- Returns fulfilled orders past their anticipated pickup date with customer + settings info
CREATE OR REPLACE FUNCTION public.get_wholesale_overdue_orders()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t) INTO v_result
  FROM (
    SELECT
      wo.id,
      wo.brand_id,
      wo.customer_id,
      wo.invoice_number,
      wo.anticipated_pickup_date,
      wc.email AS customer_email,
      ws.pickup_location,
      ws.notification_email,
      ws.from_email,
      ws.invoice_business_email
    FROM wholesale_orders wo
    JOIN wholesale_customers wc ON wo.customer_id = wc.id
    LEFT JOIN wholesale_settings ws ON wo.brand_id = ws.brand_id
    WHERE wo.status = 'fulfilled'
      AND wo.fulfillment_status = 'fulfilled'
      AND wo.anticipated_pickup_date < CURRENT_DATE
    ORDER BY wo.anticipated_pickup_date ASC
    LIMIT 100
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 5. Update upsert_wholesale_settings to accept notification_email ──────────────
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
  p_invoice_business_email   TEXT DEFAULT NULL,
  p_invoice_business_website  TEXT DEFAULT NULL,
  p_notification_email       TEXT DEFAULT NULL
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
    invoice_business_phone, invoice_business_email, invoice_business_website,
    notification_email
  )
  VALUES (
    p_brand_id, p_portal_page_id, p_price_sheet_page_id,
    COALESCE(p_require_approval, true),
    p_min_order_amount, COALESCE(p_online_payment_enabled, false),
    COALESCE(p_wholesale_enabled, true),
    p_pickup_location, p_fob_location, p_from_email,
    p_invoice_business_name, p_invoice_business_address,
    p_invoice_business_phone, p_invoice_business_email, p_invoice_business_website,
    p_notification_email
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
    notification_email        = COALESCE(p_notification_email, wholesale_settings.notification_email),
    updated_at                 = now()
  RETURNING jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
