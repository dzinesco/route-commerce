-- Migration 063: Auto-create wholesale_settings on first registration
-- Ensures new brands get a default wholesale_settings row automatically

BEGIN;

-- Update register_wholesale_customer to auto-create wholesale_settings if missing
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
  -- This ensures new brands always have settings before registration proceeds
  IF NOT EXISTS (SELECT 1 FROM wholesale_settings WHERE brand_id = p_brand_id) THEN
    INSERT INTO wholesale_settings (brand_id, require_approval, wholesale_enabled, pickup_location)
    VALUES (p_brand_id, true, true, 'See your order confirmation for pickup details')
    ON CONFLICT (brand_id) DO NOTHING;
  END IF;

  -- Read require_approval setting for this brand (now guaranteed to exist)
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

COMMIT;

NOTIFY pgrst, 'reload schema';