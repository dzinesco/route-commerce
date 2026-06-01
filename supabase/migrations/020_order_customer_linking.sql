-- =============================================================================
-- V1.2 Stage 2 — Order/Contact/Customer Linking
-- Fully idempotent: CREATE OR REPLACE FUNCTION, no destructive operations
-- Purely additive behavior: no changes to orders schema, no FKs, no backfill
--
-- DEPENDENCY: Requires 019_customers_table.sql to be applied first.
--   Raises an exception if the customers table does not exist.
--
-- TRANSITIONAL ARCHITECTURE NOTE:
--   orders.customer_id and customers.id are separate ID namespaces today.
--   communication_contacts.customer_id links to customers.id for new order-created
--   contacts (via this migration), but orders.customer_id is NOT yet aligned.
--
--   A future stage (Stage 3+) should consider:
--     - backfilling customers from existing orders/communication_contacts
--     - aligning orders.customer_id to canonical customers.id
--     - adding proper FK constraints only after data is cleaned
--     - avoiding permanent dual customer ID namespaces
--
-- STAGE 2 NORMALIZATION:
--   email: trim(lower(...)) before match/upsert
--   phone: regexp_replace(... '[\s\-().[\]]' '' 'g') before match/upsert
--   This is consistent with frontend normalizeEmail/normalizePhone.
-- =============================================================================

-- ── Dependency guard ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.customers') IS NULL THEN
    RAISE EXCEPTION 'Migration 019_customers_table.sql must be applied before 020_order_customer_linking.sql';
  END IF;
END;
$$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Safe teardown order: trigger → functions ────────────────────────────────
-- PostgreSQL requires dropping a trigger before dropping the function it uses.
-- Order: DROP TRIGGER → DROP FUNCTION (helper) → DROP FUNCTION (trigger)

DROP TRIGGER IF EXISTS trg_create_contact_from_order ON public.orders;
DROP FUNCTION IF EXISTS public.upsert_customer_from_order(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_contact_from_order();

-- ─────────────────────────────────────────────────────────────────────────────
-- upsert_customer_from_order
--
-- Resolves or creates a canonical customers record for a given order.
-- Returns the customers.id for linking, or NULL if no contact method exists.
--
-- Upsert order: email first → phone fallback (email is more stable identity)
-- Brand separation: brand_id is the scoping key throughout.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_customer_from_order(
  p_brand_id         UUID,
  p_customer_email TEXT,
  p_customer_phone  TEXT,
  p_customer_name   TEXT,
  p_source          TEXT DEFAULT 'order'
)
RETURNS UUID  -- customers.id
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_norm_email  TEXT := trim(lower(p_customer_email));
  v_norm_phone TEXT := regexp_replace(p_customer_phone, '[\s\-().[\]]', '', 'g');
  v_cust_id    UUID;
BEGIN
  -- No email AND no phone: nothing to upsert
  IF (v_norm_email IS NULL OR v_norm_email = '') AND
     (v_norm_phone IS NULL OR v_norm_phone = '') THEN
    RETURN NULL;
  END IF;

  -- Try email match first (within brand)
  IF v_norm_email IS NOT NULL AND v_norm_email != '' THEN
    SELECT id INTO v_cust_id
    FROM public.customers
    WHERE brand_id = p_brand_id
      AND primary_email = v_norm_email;

    IF FOUND THEN
      UPDATE public.customers SET
        primary_phone = COALESCE(NULLIF(v_norm_phone, ''), primary_phone),
        first_name    = COALESCE(
          NULLIF(split_part(p_customer_name, ' ', 1), ''),
          customers.first_name
        ),
        last_name     = COALESCE(
          NULLIF(substring(p_customer_name from position(' ' in p_customer_name) + 1
                  for length(p_customer_name)), ''),
          customers.last_name
        ),
        source        = CASE
          WHEN customers.source = 'system' THEN p_source ELSE customers.source
        END,
        updated_at    = now()
      WHERE id = v_cust_id;
      RETURN v_cust_id;
    END IF;
  END IF;

  -- Phone fallback (only if email didn't find a match)
  IF v_cust_id IS NULL AND v_norm_phone IS NOT NULL AND v_norm_phone != '' THEN
    SELECT id INTO v_cust_id
    FROM public.customers
    WHERE brand_id = p_brand_id
      AND primary_phone = v_norm_phone;

    IF FOUND THEN
      UPDATE public.customers SET
        primary_email = COALESCE(NULLIF(v_norm_email, ''), primary_email),
        first_name    = COALESCE(
          NULLIF(split_part(p_customer_name, ' ', 1), ''),
          customers.first_name
        ),
        last_name     = COALESCE(
          NULLIF(substring(p_customer_name from position(' ' in p_customer_name) + 1
                  for length(p_customer_name)), ''),
          customers.last_name
        ),
        source        = CASE
          WHEN customers.source = 'system' THEN p_source ELSE customers.source
        END,
        updated_at    = now()
      WHERE id = v_cust_id;
      RETURN v_cust_id;
    END IF;
  END IF;

  -- Insert new customer
  INSERT INTO public.customers
    (brand_id, primary_email, primary_phone, first_name, last_name, source)
  VALUES (
    p_brand_id,
    NULLIF(v_norm_email, ''),
    NULLIF(v_norm_phone, ''),
    NULLIF(split_part(p_customer_name, ' ', 1), ''),
    NULLIF(substring(p_customer_name from position(' ' in p_customer_name) + 1
            for length(p_customer_name)), ''),
    p_source
  )
  RETURNING id INTO v_cust_id;

  RETURN v_cust_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- upsert_contact_from_order trigger
--
-- NOW DOES TWO THINGS:
--   1. Call upsert_customer_from_order() to get/create customers.id
--   2. Use that customers.id as communication_contacts.customer_id (linking)
--
-- OPT-OUT PRESERVATION: email_opt_in, sms_opt_in, unsubscribed_at are NOT
--   updated on conflict — this behavior is unchanged from V1.1.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_contact_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_brand_id    UUID;
  v_customer_id UUID;
BEGIN
  -- Resolve brand_id from the stop
  SELECT brand_id INTO v_brand_id
  FROM public.stops
  WHERE id = NEW.stop_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Step 1: upsert canonical customer (NEW.customer_id not referenced —
  -- orders table does not have that column; use only email/phone/name)
  v_customer_id := upsert_customer_from_order(
    v_brand_id,
    NEW.customer_email,
    NEW.customer_phone,
    NEW.customer_name,
    'order'
  );

  -- Step 2: upsert communication contact, linked to customers.id
  INSERT INTO public.communication_contacts
    (brand_id, email, phone, full_name, source, customer_id, email_opt_in, metadata)
  VALUES (
    v_brand_id,
    NEW.customer_email,
    NEW.customer_phone,
    NEW.customer_name,
    'order',
    v_customer_id,
    true,
    jsonb_build_object(
      'last_order_id',  NEW.id,
      'last_order_at',  now()::TEXT,
      'stop_id',        NEW.stop_id::TEXT
    )
  )
  ON CONFLICT (brand_id, email) WHERE email IS NOT NULL DO UPDATE SET
    full_name   = COALESCE(EXCLUDED.full_name, communication_contacts.full_name),
    phone       = COALESCE(EXCLUDED.phone, communication_contacts.phone),
    customer_id = COALESCE(EXCLUDED.customer_id, communication_contacts.customer_id),
    metadata    = jsonb_build_object(
      'last_order_id',  communication_contacts.metadata->>'last_order_id',
      'last_order_at',  communication_contacts.metadata->>'last_order_at',
      'stop_id',        NEW.stop_id::TEXT
    ),
    updated_at  = now();
  -- email_opt_in, sms_opt_in, unsubscribed_at intentionally NOT updated (preserve opt-out)

  RETURN NEW;
END;
$$;

-- ── Recreate trigger ─────────────────────────────────────────────────────────
CREATE TRIGGER trg_create_contact_from_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_contact_from_order();

NOTIFY pgrst, 'reload schema';
