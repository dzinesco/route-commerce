-- Migration 064: Seed wholesale_settings for existing brands + fix RLS for service role
-- Also creates a seed function that bypasses RLS for initial setup

BEGIN;

-- Create a SECURITY DEFINER function that inserts wholesale_settings without RLS
-- This is only for initial seeding — not used in normal operation
CREATE OR REPLACE FUNCTION public.seed_wholesale_settings(
  p_brand_id UUID,
  p_require_approval BOOLEAN DEFAULT true,
  p_wholesale_enabled BOOLEAN DEFAULT true,
  p_pickup_location TEXT DEFAULT NULL,
  p_from_email TEXT DEFAULT NULL,
  p_invoice_business_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO wholesale_settings (
    brand_id, require_approval, wholesale_enabled,
    pickup_location, from_email, invoice_business_name
  )
  VALUES (
    p_brand_id,
    COALESCE(p_require_approval, true),
    COALESCE(p_wholesale_enabled, true),
    p_pickup_location,
    p_from_email,
    p_invoice_business_name
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    require_approval      = COALESCE(p_require_approval, wholesale_settings.require_approval),
    wholesale_enabled     = COALESCE(p_wholesale_enabled, wholesale_settings.wholesale_enabled),
    pickup_location        = COALESCE(p_pickup_location, wholesale_settings.pickup_location),
    from_email             = COALESCE(p_from_email, wholesale_settings.from_email),
    invoice_business_name = COALESCE(p_invoice_business_name, wholesale_settings.invoice_business_name),
    updated_at             = now()
  RETURNING jsonb_build_object('success', true, 'brand_id', brand_id);
END;
$$;

-- Update register_wholesale_customer to auto-create settings if missing
-- This ensures new brands always get settings on first registration
CREATE OR REPLACE FUNCTION public.register_wholesale_customer(
  p_brand_id          UUID DEFAULT NULL,
  p_company_name      TEXT DEFAULT NULL,
  p_contact_name      TEXT DEFAULT NULL,
  p_email             TEXT DEFAULT NULL,
  p_phone             TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id        UUID;
  v_req_app   BOOLEAN := true;
BEGIN
  -- Reject duplicate email for this brand
  IF EXISTS (SELECT 1 FROM wholesale_customers WHERE brand_id = p_brand_id AND email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this email already exists.');
  END IF;

  -- Auto-create wholesale_settings row if it doesn't exist for this brand
  -- Uses SECURITY DEFINER to bypass RLS — so it works even without service role
  IF NOT EXISTS (SELECT 1 FROM wholesale_settings WHERE brand_id = p_brand_id) THEN
    INSERT INTO wholesale_settings (brand_id, require_approval, wholesale_enabled, pickup_location)
    VALUES (p_brand_id, true, true, 'See your order confirmation for pickup details')
    ON CONFLICT (brand_id) DO NOTHING;
  END IF;

  -- Read require_approval setting for this brand
  BEGIN
    SELECT require_approval INTO v_req_app
    FROM wholesale_settings
    WHERE brand_id = p_brand_id;
  EXCEPTION WHEN OTHERS THEN
    v_req_app := true;
  END;

  INSERT INTO wholesale_customers (
    brand_id, company_name, contact_name, email, phone,
    account_status, role
  ) VALUES (
    p_brand_id,
    p_company_name,
    p_contact_name,
    p_email,
    p_phone,
    CASE WHEN COALESCE(v_req_app, true) THEN 'pending_approval' ELSE 'active' END,
    'buyer'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_id,
    'requires_approval', COALESCE(v_req_app, true)
  );
END;
$$;

-- Also fix get_wholesale_settings to return defaults if no settings exist
-- This prevents 406 errors when settings are missing
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
    'wholesale_enabled', COALESCE(wholesale_enabled, true),
    'pickup_location', COALESCE(pickup_location, 'Contact us for pickup details'),
    'fob_location', fob_location,
    'from_email', from_email,
    'invoice_business_name', COALESCE(invoice_business_name, 'Wholesale'),
    'invoice_business_address', invoice_business_address,
    'invoice_business_phone', invoice_business_phone,
    'invoice_business_email', invoice_business_email,
    'invoice_business_website', invoice_business_website,
    'last_invoice_number', last_invoice_number
  ) INTO v_result
  FROM wholesale_settings
  WHERE brand_id = p_brand_id;

  -- If still null, return safe defaults so client code doesn't break
  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'id', NULL,
      'brand_id', p_brand_id,
      'portal_page_id', NULL,
      'price_sheet_page_id', NULL,
      'require_approval', true,
      'min_order_amount', 0,
      'online_payment_enabled', false,
      'wholesale_enabled', true,
      'pickup_location', 'Contact us for pickup details',
      'fob_location', NULL,
      'from_email', NULL,
      'invoice_business_name', 'Wholesale',
      'invoice_business_address', NULL,
      'invoice_business_phone', NULL,
      'invoice_business_email', NULL,
      'invoice_business_website', NULL,
      'last_invoice_number', 0
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';