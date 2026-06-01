-- Migration 047: Wholesale Registration + Pending Approval Status
-- Adds self-service registration RPC and 'pending_approval' account status.
-- Idempotent — uses CREATE OR REPLACE and IF NOT EXISTS.

BEGIN;

-- Add pending_approval to the account_status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_customers_account_status_check'
  ) THEN
    ALTER TABLE public.wholesale_customers
      ADD CONSTRAINT wholesale_customers_account_status_check
      CHECK (account_status IN ('active', 'on_hold', 'disabled', 'pending_approval', 'rejected'));
  ELSE
    -- Drop and recreate the check constraint with the new value
    ALTER TABLE public.wholesale_customers
      DROP CONSTRAINT wholesale_customers_account_status_check;
    ALTER TABLE public.wholesale_customers
      ADD CONSTRAINT wholesale_customers_account_status_check
      CHECK (account_status IN ('active', 'on_hold', 'disabled', 'pending_approval', 'rejected'));
  END IF;
END $$;

-- Add rejected status to the check constraint (same pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_customers_account_status_check'
  ) THEN
    ALTER TABLE public.wholesale_customers
      ADD CONSTRAINT wholesale_customers_account_status_check
      CHECK (account_status IN ('active', 'on_hold', 'disabled', 'pending_approval', 'rejected'));
  END IF;
END $$;

-- ── Registration RPC ─────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.register_wholesale_customer(UUID, TEXT, TEXT, TEXT, TEXT);
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

-- ── Customer lookup by user_id (for portal auth) ──────────────────────────────

DROP FUNCTION IF EXISTS public.get_wholesale_customer_by_user(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_customer_by_user(
  p_brand_id UUID DEFAULT NULL,
  p_user_id   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- If brand_id is a zero UUID (placeholder), search across all brands
  IF p_brand_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
    RETURN (
      SELECT jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'company_name', company_name,
        'contact_name', contact_name,
        'email', email,
        'phone', phone,
        'account_status', account_status,
        'role', role,
        'brand_id', brand_id
      )
      FROM wholesale_customers
      WHERE user_id = p_user_id AND account_status = 'active'
      LIMIT 1
    );
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'company_name', company_name,
      'contact_name', contact_name,
      'email', email,
      'phone', phone,
      'account_status', account_status,
      'role', role,
      'brand_id', brand_id
    )
    FROM wholesale_customers
    WHERE brand_id = p_brand_id AND user_id = p_user_id
  );
END;
$$;

-- ── Pending registrations RPC (for admin approval queue) ──────────────────────

DROP FUNCTION IF EXISTS public.get_pending_wholesale_registrations(UUID);
CREATE OR REPLACE FUNCTION public.get_pending_wholesale_registrations(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at ASC) INTO v_result
  FROM (
    SELECT
      id, company_name, contact_name, email, phone,
      account_status, role, created_at, updated_at
    FROM wholesale_customers
    WHERE brand_id = p_brand_id
      AND account_status IN ('pending_approval', 'rejected')
    ORDER BY created_at ASC
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── Approve/reject registration RPC ───────────────────────────────────────────

DROP FUNCTION IF EXISTS public.approve_wholesale_registration(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.approve_wholesale_registration(
  p_registration_id UUID DEFAULT NULL,
  p_brand_id         UUID DEFAULT NULL,
  p_action           TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_action = 'approve' THEN
    UPDATE wholesale_customers
    SET account_status = 'active', updated_at = now()
    WHERE id = p_registration_id AND brand_id = p_brand_id
      AND account_status = 'pending_approval';
  ELSIF p_action = 'reject' THEN
    UPDATE wholesale_customers
    SET account_status = 'rejected', updated_at = now()
    WHERE id = p_registration_id AND brand_id = p_brand_id
      AND account_status = 'pending_approval';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action.');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Upsert wholesale customer (updated to allow linking user_id) ──────────────

-- Update existing upsert to handle user_id linking
-- The existing upsert_wholesale_customer is already set up to use brand_id+user_id as the ON CONFLICT target.
-- This just adds a note that it can also be used to link an existing customer to a auth.users account.

COMMIT;

NOTIFY pgrst, 'reload schema';