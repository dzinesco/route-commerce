-- Migration 048: Add wholesale_enabled to wholesale_settings + update upsert RPC
-- Allows admins to enable/disable the Wholesale Portal per brand.

BEGIN;

-- Add wholesale_enabled column
ALTER TABLE public.wholesale_settings
  ADD COLUMN IF NOT EXISTS wholesale_enabled BOOLEAN NOT NULL DEFAULT true;

-- Update upsert function to handle wholesale_enabled
DROP FUNCTION IF EXISTS public.upsert_wholesale_settings(
  UUID, UUID, UUID, BOOLEAN, NUMERIC, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.upsert_wholesale_settings(
  p_brand_id               UUID DEFAULT NULL,
  p_portal_page_id         UUID DEFAULT NULL,
  p_price_sheet_page_id    UUID DEFAULT NULL,
  p_require_approval        BOOLEAN DEFAULT NULL,
  p_min_order_amount       NUMERIC DEFAULT NULL,
  p_online_payment_enabled BOOLEAN DEFAULT NULL,
  p_wholesale_enabled      BOOLEAN DEFAULT NULL,
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
    wholesale_enabled, pickup_location, fob_location, from_email, invoice_business_name
  )
  VALUES (
    p_brand_id, p_portal_page_id, p_price_sheet_page_id,
    COALESCE(p_require_approval, true),
    p_min_order_amount, COALESCE(p_online_payment_enabled, false),
    COALESCE(p_wholesale_enabled, true),
    p_pickup_location, p_fob_location, p_from_email, p_invoice_business_name
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    portal_page_id           = COALESCE(p_portal_page_id, wholesale_settings.portal_page_id),
    price_sheet_page_id      = COALESCE(p_price_sheet_page_id, wholesale_settings.price_sheet_page_id),
    require_approval         = COALESCE(p_require_approval, wholesale_settings.require_approval),
    min_order_amount         = COALESCE(p_min_order_amount, wholesale_settings.min_order_amount),
    online_payment_enabled   = COALESCE(p_online_payment_enabled, wholesale_settings.online_payment_enabled),
    wholesale_enabled        = COALESCE(p_wholesale_enabled, wholesale_settings.wholesale_enabled),
    pickup_location          = COALESCE(p_pickup_location, wholesale_settings.pickup_location),
    fob_location             = COALESCE(p_fob_location, wholesale_settings.fob_location),
    from_email               = COALESCE(p_from_email, wholesale_settings.from_email),
    invoice_business_name    = COALESCE(p_invoice_business_name, wholesale_settings.invoice_business_name),
    updated_at               = now()
  RETURNING jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';