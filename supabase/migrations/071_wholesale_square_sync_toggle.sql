-- Migration 071: Add square_sync_enabled to wholesale_settings
-- - Adds square_sync_enabled BOOLEAN column (default false)
-- - Updates upsert_wholesale_settings RPC to accept p_square_sync_enabled
-- - Updates enqueue_square_sync to respect wholesale_settings.square_sync_enabled

BEGIN;

-- ── 1. Add square_sync_enabled column ────────────────────────────────────────
ALTER TABLE public.wholesale_settings
  ADD COLUMN IF NOT EXISTS square_sync_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Update enqueue_square_sync to check wholesale_settings ────────────────
-- Only enqueue if square_sync_enabled = true for the brand.
-- If no wholesale_settings record exists, skip (auto-sync disabled until configured).
DROP FUNCTION IF EXISTS public.enqueue_square_sync(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.enqueue_square_sync(
  p_brand_id  UUID,
  p_sync_type TEXT DEFAULT 'products'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Guard: only enqueue if square_sync_enabled for this brand
  IF NOT EXISTS (
    SELECT 1 FROM wholesale_settings ws
    WHERE ws.brand_id = p_brand_id
      AND ws.square_sync_enabled = true
  ) THEN
    RETURN;  -- sync disabled for this brand
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM square_sync_queue
    WHERE brand_id = p_brand_id
      AND sync_type = p_sync_type
      AND status IN ('pending', 'processing')
  ) THEN
    INSERT INTO square_sync_queue (brand_id, sync_type, status)
    VALUES (p_brand_id, p_sync_type, 'pending');
  END IF;
END;
$$;

-- ── 3. Update upsert_wholesale_settings RPC ───────────────────────────────────
-- Drop first to avoid "cannot remove parameter defaults" error.
DROP FUNCTION IF EXISTS public.upsert_wholesale_settings(
  UUID, BOOLEAN, NUMERIC, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN
);
CREATE OR REPLACE FUNCTION public.upsert_wholesale_settings(
  p_brand_id                 UUID,
  p_require_approval         BOOLEAN DEFAULT NULL,
  p_min_order_amount         NUMERIC DEFAULT NULL,
  p_online_payment_enabled   BOOLEAN DEFAULT NULL,
  p_wholesale_enabled        BOOLEAN DEFAULT NULL,
  p_pickup_location          TEXT DEFAULT NULL,
  p_fob_location             TEXT DEFAULT NULL,
  p_from_email               TEXT DEFAULT NULL,
  p_invoice_business_name    TEXT DEFAULT NULL,
  p_invoice_business_address TEXT DEFAULT NULL,
  p_invoice_business_phone   TEXT DEFAULT NULL,
  p_invoice_business_email   TEXT DEFAULT NULL,
  p_invoice_business_website TEXT DEFAULT NULL,
  p_notification_email       TEXT DEFAULT NULL,
  p_notification_recipients  JSONB DEFAULT NULL,
  p_square_sync_enabled      BOOLEAN DEFAULT NULL  -- NEW
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO wholesale_settings (
    brand_id, require_approval, min_order_amount, online_payment_enabled,
    wholesale_enabled, pickup_location, fob_location, from_email,
    invoice_business_name, invoice_business_address, invoice_business_phone,
    invoice_business_email, invoice_business_website,
    notification_email, notification_recipients, square_sync_enabled
  )
  VALUES (
    p_brand_id, COALESCE(p_require_approval, true), p_min_order_amount,
    COALESCE(p_online_payment_enabled, false), COALESCE(p_wholesale_enabled, true),
    p_pickup_location, p_fob_location, p_from_email,
    p_invoice_business_name, p_invoice_business_address, p_invoice_business_phone,
    p_invoice_business_email, p_invoice_business_website,
    p_notification_email, COALESCE(p_notification_recipients, '[]'::JSONB),
    COALESCE(p_square_sync_enabled, false)
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    require_approval          = COALESCE(p_require_approval, wholesale_settings.require_approval),
    min_order_amount         = COALESCE(p_min_order_amount, wholesale_settings.min_order_amount),
    online_payment_enabled   = COALESCE(p_online_payment_enabled, wholesale_settings.online_payment_enabled),
    wholesale_enabled        = COALESCE(p_wholesale_enabled, wholesale_settings.wholesale_enabled),
    pickup_location          = COALESCE(p_pickup_location, wholesale_settings.pickup_location),
    fob_location             = COALESCE(p_fob_location, wholesale_settings.fob_location),
    from_email               = COALESCE(p_from_email, wholesale_settings.from_email),
    invoice_business_name    = COALESCE(p_invoice_business_name, wholesale_settings.invoice_business_name),
    invoice_business_address = COALESCE(p_invoice_business_address, wholesale_settings.invoice_business_address),
    invoice_business_phone   = COALESCE(p_invoice_business_phone, wholesale_settings.invoice_business_phone),
    invoice_business_email   = COALESCE(p_invoice_business_email, wholesale_settings.invoice_business_email),
    invoice_business_website = COALESCE(p_invoice_business_website, wholesale_settings.invoice_business_website),
    notification_email       = COALESCE(p_notification_email, wholesale_settings.notification_email),
    notification_recipients   = COALESCE(p_notification_recipients, wholesale_settings.notification_recipients),
    square_sync_enabled      = COALESCE(p_square_sync_enabled, wholesale_settings.square_sync_enabled),
    updated_at               = now()
  RETURNING jsonb_build_object(
    'success', true,
    'brand_id', brand_id,
    'square_sync_enabled', square_sync_enabled
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── 4. Update get_wholesale_settings to return square_sync_enabled ──────────
DROP FUNCTION IF EXISTS public.get_wholesale_settings(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_settings(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ws.id,
    'brand_id', ws.brand_id,
    'portal_page_id', ws.portal_page_id,
    'price_sheet_page_id', ws.price_sheet_page_id,
    'require_approval', ws.require_approval,
    'min_order_amount', ws.min_order_amount,
    'online_payment_enabled', ws.online_payment_enabled,
    'wholesale_enabled', ws.wholesale_enabled,
    'pickup_location', ws.pickup_location,
    'fob_location', ws.fob_location,
    'from_email', ws.from_email,
    'invoice_business_name', ws.invoice_business_name,
    'invoice_business_address', ws.invoice_business_address,
    'invoice_business_phone', ws.invoice_business_phone,
    'invoice_business_email', ws.invoice_business_email,
    'invoice_business_website', ws.invoice_business_website,
    'notification_email', ws.notification_email,
    'notification_recipients', COALESCE(ws.notification_recipients, '[]'::JSONB),
    'square_sync_enabled', ws.square_sync_enabled,
    'last_invoice_number', ws.last_invoice_number
  ) INTO v_result
  FROM wholesale_settings ws
  WHERE ws.brand_id = p_brand_id;

  -- Fallback: return safe defaults if no record exists yet
  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'id', NULL,
      'brand_id', p_brand_id,
      'require_approval', true,
      'wholesale_enabled', true,
      'online_payment_enabled', false,
      'square_sync_enabled', false,
      'pickup_location', '',
      'fob_location', '',
      'from_email', '',
      'invoice_business_name', '',
      'invoice_business_address', NULL,
      'invoice_business_phone', NULL,
      'invoice_business_email', NULL,
      'invoice_business_website', NULL,
      'notification_email', NULL,
      'notification_recipients', '[]'::JSONB,
      'last_invoice_number', 0
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';