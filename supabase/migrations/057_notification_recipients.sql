-- Migration 057: Admin Notification Recipients
-- Stores notification recipient list per brand on wholesale_settings.
-- Safe to run multiple times; uses IF NOT EXISTS and COALESCE defaults.

BEGIN;

-- ── 1. Add notification_recipients column ─────────────────────────────────────
-- Uses IF NOT EXISTS so this is safe to run if column already exists.
ALTER TABLE public.wholesale_settings
  ADD COLUMN IF NOT EXISTS notification_recipients JSONB NOT NULL
  DEFAULT '[]'::JSONB;

-- ── 2. Update get_wholesale_settings ───────────────────────────────────────────
-- Always returns notification_recipients: [] instead of null (via COALESCE).
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
    'notification_recipients', COALESCE(notification_recipients, '[]'::JSONB),
    'last_invoice_number', last_invoice_number
  ) INTO v_result
  FROM wholesale_settings
  WHERE brand_id = p_brand_id;
  RETURN v_result;
END;
$$;

-- ── 3. Update upsert_wholesale_settings ───────────────────────────────────────
-- Adds p_notification_recipients (JSONB). Defaults to [] if not passed.
-- Safe to re-run: DROP IF EXISTS matches on exact signature.
DROP FUNCTION IF EXISTS public.upsert_wholesale_settings(
  UUID, UUID, UUID, BOOLEAN, NUMERIC, BOOLEAN, BOOLEAN,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
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
  p_invoice_business_website  TEXT DEFAULT NULL,
  p_notification_email        TEXT DEFAULT NULL,
  p_notification_recipients   JSONB DEFAULT NULL
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
    notification_email, notification_recipients
  )
  VALUES (
    p_brand_id, p_portal_page_id, p_price_sheet_page_id,
    COALESCE(p_require_approval, true),
    p_min_order_amount, COALESCE(p_online_payment_enabled, false),
    COALESCE(p_wholesale_enabled, true),
    p_pickup_location, p_fob_location, p_from_email,
    p_invoice_business_name, p_invoice_business_address,
    p_invoice_business_phone, p_invoice_business_email, p_invoice_business_website,
    p_notification_email,
    COALESCE(p_notification_recipients, '[]'::JSONB)
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    portal_page_id              = COALESCE(p_portal_page_id, wholesale_settings.portal_page_id),
    price_sheet_page_id         = COALESCE(p_price_sheet_page_id, wholesale_settings.price_sheet_page_id),
    require_approval            = COALESCE(p_require_approval, wholesale_settings.require_approval),
    min_order_amount            = COALESCE(p_min_order_amount, wholesale_settings.min_order_amount),
    online_payment_enabled      = COALESCE(p_online_payment_enabled, wholesale_settings.online_payment_enabled),
    wholesale_enabled           = COALESCE(p_wholesale_enabled, wholesale_settings.wholesale_enabled),
    pickup_location             = COALESCE(p_pickup_location, wholesale_settings.pickup_location),
    fob_location                = COALESCE(p_fob_location, wholesale_settings.fob_location),
    from_email                 = COALESCE(p_from_email, wholesale_settings.from_email),
    invoice_business_name       = COALESCE(p_invoice_business_name, wholesale_settings.invoice_business_name),
    invoice_business_address    = COALESCE(p_invoice_business_address, wholesale_settings.invoice_business_address),
    invoice_business_phone     = COALESCE(p_invoice_business_phone, wholesale_settings.invoice_business_phone),
    invoice_business_email     = COALESCE(p_invoice_business_email, wholesale_settings.invoice_business_email),
    invoice_business_website   = COALESCE(p_invoice_business_website, wholesale_settings.invoice_business_website),
    notification_email        = COALESCE(p_notification_email, wholesale_settings.notification_email),
    notification_recipients     = COALESCE(p_notification_recipients, wholesale_settings.notification_recipients),
    updated_at                 = now()
  RETURNING jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
