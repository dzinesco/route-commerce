-- ───────────────────────────────────────────
-- 018_contact_import_metadata.sql
-- ───────────────────────────────────────────
-- =============================================================================
-- Communication Center V1.2 — Import Metadata Storage
-- Fully idempotent: additive changes only
-- Updates import_communication_contacts_batch to store ignored CSV columns
-- in metadata.imported_raw so no context is lost from arbitrary extra columns.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Update email path — add imported_raw to metadata on UPDATE ───────────────
-- Lines ~400-402 in migration 017: UPDATE path for existing email contact

CREATE OR REPLACE FUNCTION public.import_communication_contacts_batch(
  p_brand_id              UUID,
  p_contacts              JSONB,
  p_allow_opt_in_override BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry    JSONB;
  v_result   JSONB := '{"created": 0, "updated": 0, "skipped": 0, "errors": []}'::JSONB;
  v_existing communication_contacts%ROWTYPE;
  v_email   TEXT;
  v_phone   TEXT;
  v_tags    TEXT[];
  v_raw_meta JSONB;
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_email := nullif(v_entry->>'email', '');
    v_phone := nullif(v_entry->>'phone', '');

    -- Parse tags: CSV sends "tag1;tag2" as a plain string; split into TEXT[]
    IF (v_entry->>'tags') IS NOT NULL AND (v_entry->>'tags') != '' THEN
      v_tags := coalesce(
        (SELECT array_agg(trim(x)) FROM unnest(string_to_array(v_entry->>'tags', ';')) AS x WHERE trim(x) != ''),
        '{}'
      );
    ELSE
      v_tags := '{}';
    END IF;

    -- Build imported_raw from any _metadata key (ignored CSV columns)
    v_raw_meta := nullif(v_entry->>'_metadata', '')::JSONB;

    BEGIN
      IF v_email IS NOT NULL AND v_email != '' THEN
        SELECT * INTO v_existing
        FROM public.communication_contacts
        WHERE brand_id = p_brand_id AND email = v_email;

        IF FOUND THEN
          -- Existing contact
          IF v_existing.unsubscribed_at IS NOT NULL AND
             coalesce((v_entry->>'email_opt_in')::BOOLEAN, false) = true AND
             p_allow_opt_in_override = false THEN
            v_result := jsonb_set(v_result, '{skipped}',
              to_jsonb((v_result->>'skipped')::INTEGER + 1));
          ELSE
            UPDATE public.communication_contacts SET
              phone         = COALESCE(nullif(v_entry->>'phone', ''), phone),
              first_name    = COALESCE(nullif(v_entry->>'first_name', ''), first_name),
              last_name     = COALESCE(nullif(v_entry->>'last_name', ''), last_name),
              full_name     = COALESCE(nullif(v_entry->>'full_name', ''), full_name),
              source        = 'import',
              external_id  = COALESCE(nullif(v_entry->>'external_id', ''), external_id),
              email_opt_in = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.email_opt_in
                ELSE coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                )
              END,
              sms_opt_in   = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.sms_opt_in
                ELSE coalesce(
                  (v_entry->>'sms_opt_in')::BOOLEAN,
                  communication_contacts.sms_opt_in,
                  false
                )
              END,
              email_opt_in_at = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN email_opt_in_at
                WHEN coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                ) = true THEN now()
                ELSE email_opt_in_at
              END,
              tags          = CASE
                WHEN v_tags != '{}' THEN v_tags
                ELSE communication_contacts.tags
              END,
              metadata      = communication_contacts.metadata ||
                jsonb_build_object(
                  'imported_at', now()::TEXT,
                  'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
                ),
              updated_at    = now()
            WHERE brand_id = p_brand_id AND email = v_email;

            v_result := jsonb_set(v_result, '{updated}',
              to_jsonb((v_result->>'updated')::INTEGER + 1));
          END IF;

        ELSE
          -- Insert new
          INSERT INTO public.communication_contacts
            (brand_id, email, phone, first_name, last_name, full_name, source,
             external_id, email_opt_in, sms_opt_in, email_opt_in_at, sms_opt_in_at,
             tags, metadata)
          VALUES (
            p_brand_id,
            v_email,
            nullif(v_entry->>'phone', ''),
            nullif(v_entry->>'first_name', ''),
            nullif(v_entry->>'last_name', ''),
            nullif(v_entry->>'full_name', ''),
            'import',
            nullif(v_entry->>'external_id', ''),
            coalesce((v_entry->>'email_opt_in')::BOOLEAN, true),
            coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false),
            CASE WHEN coalesce((v_entry->>'email_opt_in')::BOOLEAN, true) = true THEN now() ELSE NULL END,
            CASE WHEN coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false) = true THEN now() ELSE NULL END,
            v_tags,
            jsonb_build_object(
              'imported_at', now()::TEXT,
              'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
            )
          );
          v_result := jsonb_set(v_result, '{created}',
            to_jsonb((v_result->>'created')::INTEGER + 1));
        END IF;

      ELSIF v_phone IS NOT NULL AND v_phone != '' THEN
        -- Upsert by phone
        SELECT * INTO v_existing
        FROM public.communication_contacts
        WHERE brand_id = p_brand_id AND phone = v_phone;

        IF FOUND THEN
          IF v_existing.unsubscribed_at IS NOT NULL AND
             coalesce((v_entry->>'email_opt_in')::BOOLEAN, false) = true AND
             p_allow_opt_in_override = false THEN
            v_result := jsonb_set(v_result, '{skipped}',
              to_jsonb((v_result->>'skipped')::INTEGER + 1));
          ELSE
            UPDATE public.communication_contacts SET
              email        = COALESCE(nullif(v_entry->>'email', ''), email),
              first_name   = COALESCE(nullif(v_entry->>'first_name', ''), first_name),
              last_name    = COALESCE(nullif(v_entry->>'last_name', ''), last_name),
              full_name    = COALESCE(nullif(v_entry->>'full_name', ''), full_name),
              source       = 'import',
              email_opt_in = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.email_opt_in
                ELSE coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                )
              END,
              tags         = CASE WHEN v_tags != '{}' THEN v_tags ELSE communication_contacts.tags END,
              metadata     = communication_contacts.metadata ||
                jsonb_build_object(
                  'imported_at', now()::TEXT,
                  'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
                ),
              updated_at   = now()
            WHERE brand_id = p_brand_id AND phone = v_phone;

            v_result := jsonb_set(v_result, '{updated}',
              to_jsonb((v_result->>'updated')::INTEGER + 1));
          END IF;
        ELSE
          INSERT INTO public.communication_contacts
            (brand_id, email, phone, first_name, last_name, full_name, source,
             email_opt_in, sms_opt_in, tags, metadata)
          VALUES (
            p_brand_id,
            nullif(v_entry->>'email', ''),
            v_phone,
            nullif(v_entry->>'first_name', ''),
            nullif(v_entry->>'last_name', ''),
            nullif(v_entry->>'full_name', ''),
            'import',
            coalesce((v_entry->>'email_opt_in')::BOOLEAN, true),
            coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false),
            v_tags,
            jsonb_build_object(
              'imported_at', now()::TEXT,
              'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
            )
          );
          v_result := jsonb_set(v_result, '{created}',
            to_jsonb((v_result->>'created')::INTEGER + 1));
        END IF;

      ELSE
        -- No email or phone
        v_result := jsonb_set(
          v_result, '{errors}',
          v_result->'errors' || jsonb_build_array(
            jsonb_build_object('row', v_entry, 'error', 'No email or phone provided')
          )
        );
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_set(
        v_result, '{errors}',
        v_result->'errors' || jsonb_build_array(
          jsonb_build_object('row', v_entry, 'error', SQLERRM)
        )
      );
    END;
  END LOOP;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────
-- 019_customers_table.sql
-- ───────────────────────────────────────────
-- =============================================================================
-- V1.2 Stage 1 — Canonical Customers Table
-- Fully idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
-- Purely additive: no changes to orders, communication_contacts, or checkout
--
-- STAGE 2 NOTE: When upserting customers in Stage 2, normalize BEFORE upsert:
--   - email: lowercase + trim
--   - phone: strip formatting chars [\s\-().[\]], preserve original if uncertain
-- This ensures consistent matching across orders, imports, and contacts.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  primary_email   TEXT,
  primary_phone   TEXT,
  first_name      TEXT,
  last_name       TEXT,
  source          TEXT        NOT NULL DEFAULT 'system',
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_email_or_phone CHECK (
    primary_email IS NOT NULL OR primary_phone IS NOT NULL
  )
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customers_brand
  ON public.customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_customers_email
  ON public.customers(primary_email) WHERE primary_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON public.customers(primary_phone) WHERE primary_phone IS NOT NULL;

-- Partial unique indexes: enforce one customer per brand per email/phone
-- PostgreSQL requires CREATE UNIQUE INDEX rather than CONSTRAINT for partial unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_brand_email_unique
  ON public.customers(brand_id, primary_email)
  WHERE primary_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_brand_phone_unique
  ON public.customers(brand_id, primary_phone)
  WHERE primary_phone IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand admin can read customers"
  ON public.customers;
CREATE POLICY "Brand admin can read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (brand_id IN (
    SELECT brand_id FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'brand_admin'
  ));

DROP POLICY IF EXISTS "Platform admin can read customers"
  ON public.customers;
CREATE POLICY "Platform admin can read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────
-- 020_order_customer_linking.sql
-- ───────────────────────────────────────────
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

-- ───────────────────────────────────────────
-- 021_shipping_only_brand.sql
-- ───────────────────────────────────────────
-- =============================================================================
-- V1.2 Stage 3 — Shipping-Only Brand Resolution
-- Fully idempotent: CREATE OR REPLACE FUNCTION, ALTER TABLE ADD COLUMN IF NOT EXISTS
--
-- DEPENDENCY: Requires 020_order_customer_linking.sql to be applied first.
--   Raises an exception if the trigger function does not exist.
--
-- CHANGES:
--   1. Add brand_id column to orders (nullable, no FK — aligned to products.brand_id)
--   2. Modify create_order_with_items to accept NULL stop_id for shipping-only
--   3. Update upsert_contact_from_order trigger to resolve brand from NEW.brand_id
--      first, falling back to stop lookup — supports both pickup and shipping orders
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.proname = 'upsert_contact_from_order'
  ) THEN
    RAISE EXCEPTION 'Migration 020_order_customer_linking.sql must be applied before 021_shipping_only_brand.sql';
  END IF;
END;
$$;

-- ── 1. Add brand_id to orders ────────────────────────────────────────────────
-- Allows the order/contact trigger to resolve brand without needing a stop_id.
-- For shipping-only orders, brand is derived from the first product.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS brand_id UUID;

-- ── 2. Modify create_order_with_items for shipping-only ────────────────────
-- stop_id is now nullable. When NULL (shipping-only), brand is derived from
-- the first product's brand and no stop validation occurs.

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_idempotency_key   UUID,
  p_customer_name     TEXT,
  p_customer_email    TEXT,
  p_customer_phone   TEXT,
  p_stop_id          UUID,       -- nullable for shipping-only
  p_items            JSONB       -- [{id: uuid, quantity: int, fulfillment: text}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id          UUID;
  v_item              JSONB;
  v_product_id        UUID;
  v_quantity          INT;
  v_fulfillment       TEXT;
  v_product_price     NUMERIC;
  v_computed_total    NUMERIC := 0;
  v_stop_active      BOOLEAN;
  v_stop_brand_id    UUID;
  v_stop_city        TEXT;
  v_stop_state       TEXT;
  v_stop_date        TEXT;
  v_stop_time        TEXT;
  v_stop_location    TEXT;
  v_product_active   BOOLEAN;
  v_product_brand_id UUID;
  v_product_name     TEXT;
  v_is_pickup        BOOLEAN;
  v_order            JSONB;
  v_order_items      JSONB := '[]'::JSONB;
  v_brand_id         UUID;
BEGIN
  -- ── Idempotency guard ─────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'id', o.id,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'subtotal', o.subtotal,
    'status', o.status,
    'stop_id', o.stop_id,
    'brand_id', o.brand_id,
    'stop_city', s.city,
    'stop_state', s.state,
    'stop_date', s.date,
    'stop_time', s.time,
    'stop_location', s.location,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id,
        'product_name', p.name,
        'quantity', oi.quantity,
        'price', oi.price,
        'fulfillment', oi.fulfillment
      ))
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = o.id
    ), '[]'::JSONB)
  )
  INTO v_order
  FROM orders o
  LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_order IS NOT NULL THEN
    RETURN v_order;
  END IF;

  -- ── Resolve brand_id ──────────────────────────────────────────────────────
  -- For shipping-only orders (p_stop_id IS NULL), derive from the first product.
  -- For pickup orders, derive from the stop.
  IF p_stop_id IS NOT NULL THEN
    SELECT active, brand_id, city, state, date, time, location
      INTO v_stop_active, v_stop_brand_id, v_stop_city, v_stop_state, v_stop_date, v_stop_time, v_stop_location
    FROM stops
    WHERE id = p_stop_id;

    IF v_stop_brand_id IS NULL THEN
      RAISE EXCEPTION 'Stop not found: %', p_stop_id;
    END IF;

    IF NOT v_stop_active THEN
      RAISE EXCEPTION 'Stop is not active: %', p_stop_id;
    END IF;

    v_brand_id := v_stop_brand_id;
  ELSE
    -- Shipping-only: resolve brand from first product in the order
    v_product_id := (jsonb_array_elements(p_items)->>'id')::UUID;

    SELECT brand_id INTO v_brand_id
    FROM products
    WHERE id = v_product_id;

    IF v_brand_id IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;
  END IF;

  -- ── Validate items and compute subtotal ─────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id  := (v_item->>'id')::UUID;
    v_quantity    := (v_item->>'quantity')::INT;
    v_fulfillment := v_item->>'fulfillment';
    v_is_pickup   := (v_fulfillment = 'pickup');

    SELECT active, brand_id, price, name
      INTO v_product_active, v_product_brand_id, v_product_price, v_product_name
    FROM products
    WHERE id = v_product_id;

    IF v_product_brand_id IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;

    IF v_product_brand_id != v_brand_id THEN
      RAISE EXCEPTION 'Product % does not belong to brand %', v_product_id, v_brand_id;
    END IF;

    IF NOT v_product_active THEN
      RAISE EXCEPTION 'Product is not active: %', v_product_id;
    END IF;

    IF v_is_pickup THEN
      -- Pickup items require a valid stop assignment
      IF p_stop_id IS NULL THEN
        RAISE EXCEPTION 'Pickup item % requires a stop selection', v_product_id;
      END IF;

      PERFORM 1
      FROM product_stops
      WHERE product_id = v_product_id AND stop_id = p_stop_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Pickup product % is not available at stop %', v_product_id, p_stop_id;
      END IF;
    END IF;

    v_computed_total := v_computed_total + (v_product_price * v_quantity);
  END LOOP;

  -- ── Create order (with brand_id) ─────────────────────────────────────────
  INSERT INTO orders (
    idempotency_key, customer_name, customer_email, customer_phone,
    stop_id, brand_id, subtotal, status
  ) VALUES (
    p_idempotency_key, p_customer_name, p_customer_email, p_customer_phone,
    p_stop_id, v_brand_id, v_computed_total, 'pending'
  )
  RETURNING id INTO v_order_id;

  -- ── Insert order items and build return value ─────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id  := (v_item->>'id')::UUID;
    v_quantity    := (v_item->>'quantity')::INT;
    v_fulfillment := v_item->>'fulfillment';

    SELECT price, name INTO v_product_price, v_product_name FROM products WHERE id = v_product_id;

    INSERT INTO order_items (order_id, product_id, quantity, fulfillment, price)
    VALUES (v_order_id, v_product_id, v_quantity, v_fulfillment, v_product_price);

    v_order_items := v_order_items || jsonb_build_object(
      'product_id', v_product_id,
      'product_name', v_product_name,
      'quantity', v_quantity,
      'price', v_product_price,
      'fulfillment', v_fulfillment
    );
  END LOOP;

  -- ── Build and return full order object ───────────────────────────────────
  RETURN jsonb_build_object(
    'id', v_order_id,
    'customer_name', p_customer_name,
    'customer_email', p_customer_email,
    'customer_phone', p_customer_phone,
    'subtotal', v_computed_total,
    'status', 'pending',
    'stop_id', p_stop_id,
    'brand_id', v_brand_id,
    'stop_city', v_stop_city,
    'stop_state', v_stop_state,
    'stop_date', v_stop_date,
    'stop_time', v_stop_time,
    'stop_location', v_stop_location,
    'items', v_order_items
  );
END;
$$;

-- ── 3. Update trigger to resolve brand from NEW.brand_id first ───────────────
-- NEW.brand_id is the primary source (always set by create_order_with_items).
-- Stop lookup is the fallback (for pre-existing orders that lack brand_id).

DROP TRIGGER IF EXISTS trg_create_contact_from_order ON public.orders;
DROP FUNCTION IF EXISTS public.upsert_contact_from_order();

CREATE OR REPLACE FUNCTION public.upsert_contact_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_brand_id    UUID;
  v_customer_id UUID;
BEGIN
  -- Primary: resolve brand_id from the order itself (NEW.brand_id, always set in Stage 3+)
  IF NEW.brand_id IS NOT NULL THEN
    v_brand_id := NEW.brand_id;
  ELSE
    -- Fallback: resolve via stop (for pre-Stage 3 orders without brand_id)
    SELECT brand_id INTO v_brand_id
    FROM public.stops
    WHERE id = NEW.stop_id;
    IF NOT FOUND THEN
      RETURN NEW;  -- cannot resolve brand: skip customer/contact linking
    END IF;
  END IF;

  -- No email AND no phone: nothing to upsert
  IF (NEW.customer_email IS NULL OR NEW.customer_email = '') AND
     (NEW.customer_phone IS NULL OR NEW.customer_phone = '') THEN
    RETURN NEW;
  END IF;

  -- Step 1: upsert canonical customer
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

CREATE TRIGGER trg_create_contact_from_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_contact_from_order();

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────
-- 022_operational_events.sql
-- ───────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 022: Operational Events
-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only event layer for recording important platform actions.
-- Scope: table + indexes + RLS + helpers + 4 initial emitters.
-- What NOT included: automation, queues, webhooks, retries, cron jobs.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. operational_events table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.operational_events (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,
  actor_type      TEXT,
  actor_id        UUID,
  source          TEXT        NOT NULL DEFAULT 'system',
  payload         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT operational_events_event_type CHECK (
    event_type ~ '^[a-z][a-z0-9_]*$'
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Indexes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_oe_brand_id ON operational_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_oe_event_type ON operational_events(event_type);
CREATE INDEX IF NOT EXISTS idx_oe_entity ON operational_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_oe_created_at ON operational_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oe_brand_type ON operational_events(brand_id, event_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RLS policies
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE operational_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand admin can read operational_events" ON operational_events;
CREATE POLICY "Brand admin can read operational_events"
  ON operational_events FOR SELECT TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'brand_admin'
    )
  );

DROP POLICY IF EXISTS "Platform admin can read operational_events" ON operational_events;
CREATE POLICY "Platform admin can read operational_events"
  ON operational_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'platform_admin'
    )
  );

-- Writes go through SECURITY DEFINER helpers only.
-- No INSERT granted to authenticated roles.

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. record_operational_event helper — bypasses RLS, all emitters call this
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_operational_event(
  p_brand_id    UUID,
  p_event_type  TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_actor_type  TEXT,
  p_actor_id    UUID,
  p_source      TEXT,
  p_payload     JSONB
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO operational_events (
    brand_id, event_type, entity_type, entity_id,
    actor_type, actor_id, source, payload
  ) VALUES (
    p_brand_id, p_event_type, p_entity_type, p_entity_id,
    p_actor_type, p_actor_id, p_source, p_payload
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. record_pickup_completed_event helper — called from TypeScript action
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_pickup_completed_event(
  p_order_id UUID,
  p_brand_id UUID,
  p_actor_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'subtotal', subtotal,
    'customer_name', customer_name
  ) INTO v_order_data
  FROM orders
  WHERE id = p_order_id;

  PERFORM record_operational_event(
    p_brand_id,
    'pickup_completed',
    'order',
    p_order_id,
    'admin',
    p_actor_id,
    'system',
    coalesce(v_order_data, '{}'::JSONB)
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. create_order_with_items — with order_placed emitter
--    (explicit replace; same signature as migration 021)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_idempotency_key   UUID,
  p_customer_name     TEXT,
  p_customer_email    TEXT,
  p_customer_phone   TEXT,
  p_stop_id          UUID,
  p_items            JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id          UUID;
  v_item              JSONB;
  v_product_id        UUID;
  v_quantity          INT;
  v_fulfillment       TEXT;
  v_product_price     NUMERIC;
  v_computed_total    NUMERIC := 0;
  v_stop_active       BOOLEAN;
  v_stop_brand_id     UUID;
  v_stop_city         TEXT;
  v_stop_state        TEXT;
  v_stop_date         TEXT;
  v_stop_time         TEXT;
  v_stop_location     TEXT;
  v_product_active    BOOLEAN;
  v_product_brand_id   UUID;
  v_product_name      TEXT;
  v_is_pickup         BOOLEAN;
  v_has_pickup        BOOLEAN := false;
  v_order             JSONB;
  v_order_items       JSONB := '[]'::JSONB;
  v_brand_id          UUID;
BEGIN
  -- ── Idempotency guard ─────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'id', o.id,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'subtotal', o.subtotal,
    'status', o.status,
    'stop_id', o.stop_id,
    'brand_id', o.brand_id,
    'stop_city', s.city,
    'stop_state', s.state,
    'stop_date', s.date,
    'stop_time', s.time,
    'stop_location', s.location,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id,
        'product_name', p.name,
        'quantity', oi.quantity,
        'price', oi.price,
        'fulfillment', oi.fulfillment
      ))
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = o.id
    ), '[]'::JSONB)
  )
  INTO v_order
  FROM orders o
  LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_order IS NOT NULL THEN
    RETURN v_order;
  END IF;

  -- ── Resolve brand_id ──────────────────────────────────────────────────────
  IF p_stop_id IS NOT NULL THEN
    SELECT active, brand_id, city, state, date, time, location
      INTO v_stop_active, v_stop_brand_id, v_stop_city, v_stop_state, v_stop_date, v_stop_time, v_stop_location
    FROM stops
    WHERE id = p_stop_id;

    IF v_stop_brand_id IS NULL THEN
      RAISE EXCEPTION 'Stop not found: %', p_stop_id;
    END IF;

    IF NOT v_stop_active THEN
      RAISE EXCEPTION 'Stop is not active: %', p_stop_id;
    END IF;

    v_brand_id := v_stop_brand_id;
  ELSE
    v_product_id := (jsonb_array_elements(p_items)->>'id')::UUID;

    SELECT brand_id INTO v_brand_id
    FROM products
    WHERE id = v_product_id;

    IF v_brand_id IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;
  END IF;

  -- ── Validate items and compute subtotal ─────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id  := (v_item->>'id')::UUID;
    v_quantity    := (v_item->>'quantity')::INT;
    v_fulfillment := v_item->>'fulfillment';
    v_is_pickup   := (v_fulfillment = 'pickup');

    IF v_is_pickup THEN
      v_has_pickup := true;
    END IF;

    SELECT active, brand_id, price, name
      INTO v_product_active, v_product_brand_id, v_product_price, v_product_name
    FROM products
    WHERE id = v_product_id;

    IF v_product_brand_id IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;

    IF v_product_brand_id != v_brand_id THEN
      RAISE EXCEPTION 'Product % does not belong to brand %', v_product_id, v_brand_id;
    END IF;

    IF NOT v_product_active THEN
      RAISE EXCEPTION 'Product is not active: %', v_product_id;
    END IF;

    IF v_is_pickup THEN
      IF p_stop_id IS NULL THEN
        RAISE EXCEPTION 'Pickup item % requires a stop selection', v_product_id;
      END IF;

      PERFORM 1
      FROM product_stops
      WHERE product_id = v_product_id AND stop_id = p_stop_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Pickup product % is not available at stop %', v_product_id, p_stop_id;
      END IF;
    END IF;

    v_computed_total := v_computed_total + (v_product_price * v_quantity);
  END LOOP;

  -- ── Create order (with brand_id) ─────────────────────────────────────────
  INSERT INTO orders (
    idempotency_key, customer_name, customer_email, customer_phone,
    stop_id, brand_id, subtotal, status
  ) VALUES (
    p_idempotency_key, p_customer_name, p_customer_email, p_customer_phone,
    p_stop_id, v_brand_id, v_computed_total, 'pending'
  )
  RETURNING id INTO v_order_id;

  -- ── Insert order items and build return value ─────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id  := (v_item->>'id')::UUID;
    v_quantity    := (v_item->>'quantity')::INT;
    v_fulfillment := v_item->>'fulfillment';

    SELECT price, name INTO v_product_price, v_product_name FROM products WHERE id = v_product_id;

    INSERT INTO order_items (order_id, product_id, quantity, fulfillment, price)
    VALUES (v_order_id, v_product_id, v_quantity, v_fulfillment, v_product_price);

    v_order_items := v_order_items || jsonb_build_object(
      'product_id', v_product_id,
      'product_name', v_product_name,
      'quantity', v_quantity,
      'price', v_product_price,
      'fulfillment', v_fulfillment
    );
  END LOOP;

  -- ── Emit order_placed event ───────────────────────────────────────────────
  PERFORM record_operational_event(
    v_brand_id,
    'order_placed',
    'order',
    v_order_id,
    'customer',
    NULL,
    'system',
    jsonb_build_object(
      'subtotal', v_computed_total,
      'item_count', jsonb_array_length(p_items),
      'has_pickup', v_has_pickup
    )
  );

  -- ── Build and return full order object ───────────────────────────────────
  RETURN jsonb_build_object(
    'id', v_order_id,
    'customer_name', p_customer_name,
    'customer_email', p_customer_email,
    'customer_phone', p_customer_phone,
    'subtotal', v_computed_total,
    'status', 'pending',
    'stop_id', p_stop_id,
    'brand_id', v_brand_id,
    'stop_city', v_stop_city,
    'stop_state', v_stop_state,
    'stop_date', v_stop_date,
    'stop_time', v_stop_time,
    'stop_location', v_stop_location,
    'items', v_order_items
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. import_communication_contacts_batch — with contact_imported emitter
--    (explicit replace; same signature as migrations 017/018)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.import_communication_contacts_batch(
  p_brand_id              UUID,
  p_contacts              JSONB,
  p_allow_opt_in_override BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry    JSONB;
  v_result   JSONB := '{"created": 0, "updated": 0, "skipped": 0, "errors": []}'::JSONB;
  v_existing communication_contacts%ROWTYPE;
  v_email    TEXT;
  v_phone    TEXT;
  v_tags     TEXT[];
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_email := nullif(v_entry->>'email', '');
    v_phone := nullif(v_entry->>'phone', '');

    IF (v_entry->>'tags') IS NOT NULL AND (v_entry->>'tags') != '' THEN
      v_tags := coalesce(
        (SELECT array_agg(trim(x)) FROM unnest(string_to_array(v_entry->>'tags', ';')) AS x WHERE trim(x) != ''),
        '{}'
      );
    ELSE
      v_tags := '{}';
    END IF;

    BEGIN
      IF v_email IS NOT NULL AND v_email != '' THEN
        SELECT * INTO v_existing
        FROM public.communication_contacts
        WHERE brand_id = p_brand_id AND email = v_email;

        IF FOUND THEN
          IF v_existing.unsubscribed_at IS NOT NULL AND
             coalesce((v_entry->>'email_opt_in')::BOOLEAN, false) = true AND
             p_allow_opt_in_override = false THEN
            v_result := jsonb_set(v_result, '{skipped}',
              to_jsonb((v_result->>'skipped')::INTEGER + 1));
          ELSE
            UPDATE public.communication_contacts SET
              phone         = COALESCE(nullif(v_entry->>'phone', ''), phone),
              first_name    = COALESCE(nullif(v_entry->>'first_name', ''), first_name),
              last_name     = COALESCE(nullif(v_entry->>'last_name', ''), last_name),
              full_name     = COALESCE(nullif(v_entry->>'full_name', ''), full_name),
              source        = 'import',
              external_id   = COALESCE(nullif(v_entry->>'external_id', ''), external_id),
              email_opt_in = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.email_opt_in
                ELSE coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                )
              END,
              sms_opt_in   = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.sms_opt_in
                ELSE coalesce(
                  (v_entry->>'sms_opt_in')::BOOLEAN,
                  communication_contacts.sms_opt_in,
                  false
                )
              END,
              email_opt_in_at = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN email_opt_in_at
                WHEN coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                ) = true THEN now()
                ELSE email_opt_in_at
              END,
              tags          = CASE
                WHEN v_tags != '{}' THEN v_tags
                ELSE communication_contacts.tags
              END,
              metadata      = communication_contacts.metadata || jsonb_build_object(
                'imported_at', now()::TEXT
              ),
              updated_at    = now()
            WHERE brand_id = p_brand_id AND email = v_email;

            v_result := jsonb_set(v_result, '{updated}',
              to_jsonb((v_result->>'updated')::INTEGER + 1));
          END IF;

        ELSE
          INSERT INTO public.communication_contacts
            (brand_id, email, phone, first_name, last_name, full_name, source,
             external_id, email_opt_in, sms_opt_in, email_opt_in_at, sms_opt_in_at,
             tags, metadata)
          VALUES (
            p_brand_id,
            v_email,
            nullif(v_entry->>'phone', ''),
            nullif(v_entry->>'first_name', ''),
            nullif(v_entry->>'last_name', ''),
            nullif(v_entry->>'full_name', ''),
            'import',
            nullif(v_entry->>'external_id', ''),
            coalesce((v_entry->>'email_opt_in')::BOOLEAN, true),
            coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false),
            CASE WHEN coalesce((v_entry->>'email_opt_in')::BOOLEAN, true) = true THEN now() ELSE NULL END,
            CASE WHEN coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false) = true THEN now() ELSE NULL END,
            v_tags,
            jsonb_build_object('imported_at', now()::TEXT)
          );
          v_result := jsonb_set(v_result, '{created}',
            to_jsonb((v_result->>'created')::INTEGER + 1));
        END IF;

      ELSIF v_phone IS NOT NULL AND v_phone != '' THEN
        SELECT * INTO v_existing
        FROM public.communication_contacts
        WHERE brand_id = p_brand_id AND phone = v_phone;

        IF FOUND THEN
          IF v_existing.unsubscribed_at IS NOT NULL AND
             coalesce((v_entry->>'email_opt_in')::BOOLEAN, false) = true AND
             p_allow_opt_in_override = false THEN
            v_result := jsonb_set(v_result, '{skipped}',
              to_jsonb((v_result->>'skipped')::INTEGER + 1));
          ELSE
            UPDATE public.communication_contacts SET
              email        = COALESCE(nullif(v_entry->>'email', ''), email),
              first_name   = COALESCE(nullif(v_entry->>'first_name', ''), first_name),
              last_name    = COALESCE(nullif(v_entry->>'last_name', ''), last_name),
              full_name    = COALESCE(nullif(v_entry->>'full_name', ''), full_name),
              source       = 'import',
              email_opt_in = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.email_opt_in
                ELSE coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                )
              END,
              tags         = CASE WHEN v_tags != '{}' THEN v_tags ELSE communication_contacts.tags END,
              metadata     = communication_contacts.metadata || jsonb_build_object(
                'imported_at', now()::TEXT
              ),
              updated_at   = now()
            WHERE brand_id = p_brand_id AND phone = v_phone;

            v_result := jsonb_set(v_result, '{updated}',
              to_jsonb((v_result->>'updated')::INTEGER + 1));
          END IF;
        ELSE
          INSERT INTO public.communication_contacts
            (brand_id, email, phone, first_name, last_name, full_name, source,
             email_opt_in, sms_opt_in, tags, metadata)
          VALUES (
            p_brand_id,
            nullif(v_entry->>'email', ''),
            v_phone,
            nullif(v_entry->>'first_name', ''),
            nullif(v_entry->>'last_name', ''),
            nullif(v_entry->>'full_name', ''),
            'import',
            coalesce((v_entry->>'email_opt_in')::BOOLEAN, true),
            coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false),
            v_tags,
            jsonb_build_object('imported_at', now()::TEXT)
          );
          v_result := jsonb_set(v_result, '{created}',
            to_jsonb((v_result->>'created')::INTEGER + 1));
        END IF;

      ELSE
        v_result := jsonb_set(
          v_result, '{errors}',
          v_result->'errors' || jsonb_build_array(
            jsonb_build_object('row', v_entry, 'error', 'No email or phone provided')
          )
        );
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_set(
        v_result, '{errors}',
        v_result->'errors' || jsonb_build_array(
          jsonb_build_object('row', v_entry, 'error', SQLERRM)
        )
      );
    END;
  END LOOP;

  -- ── Emit contact_imported event ──────────────────────────────────────────
  PERFORM record_operational_event(
    p_brand_id,
    'contact_imported',
    NULL,
    NULL,
    'admin',
    NULL,
    'system',
    jsonb_build_object(
      'created', (v_result->>'created')::INTEGER,
      'updated', (v_result->>'updated')::INTEGER,
      'skipped', (v_result->>'skipped')::INTEGER,
      'total',
        (v_result->>'created')::INTEGER
      + (v_result->>'updated')::INTEGER
      + (v_result->>'skipped')::INTEGER
    )
  );

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. send_campaign — with campaign_sent emitter
--    (explicit replace; same body as migration 017)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.send_campaign(p_campaign_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign  communication_campaigns;
  v_settings  communication_settings;
  v_audience  JSONB;
  v_entry     JSONB;
  v_entries   JSONB := '[]'::JSONB;
  v_count     INTEGER := 0;
BEGIN
  SELECT * INTO v_campaign FROM communication_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  SELECT * INTO v_settings FROM communication_settings WHERE brand_id = v_campaign.brand_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No communication settings for brand');
  END IF;

  v_audience := preview_campaign_audience(v_campaign.brand_id, v_campaign.audience_rules);

  FOR v_entry IN SELECT * FROM jsonb_array_elements(coalesce(v_audience->'sample_customers', '[]'::jsonb))
  LOOP
    CONTINUE WHEN (v_entry->>'email') IS NULL OR (v_entry->>'email') = '';

    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'brand_id',        v_campaign.brand_id,
      'campaign_id',     p_campaign_id,
      'customer_id',    nullif(v_entry->>'id', ''),
      'customer_email', v_entry->>'email',
      'delivery_method','email',
      'subject',         v_campaign.subject,
      'body_preview',   left(v_campaign.body_text, 500),
      'status',          'queued'
    ));
    v_count := v_count + 1;
  END LOOP;

  PERFORM log_communication_messages(v_entries);

  UPDATE communication_campaigns
    SET status = 'sent', sent_at = now(), updated_at = now()
    WHERE id = p_campaign_id;

  -- ── Emit campaign_sent event ────────────────────────────────────────────
  PERFORM record_operational_event(
    v_campaign.brand_id,
    'campaign_sent',
    'campaign',
    p_campaign_id,
    'system',
    NULL,
    'system',
    jsonb_build_object(
      'messages_logged', v_count,
      'subject', v_campaign.subject
    )
  );

  RETURN jsonb_build_object('success', true, 'messages_logged', v_count);
END;
$$;
-- ───────────────────────────────────────────
-- 023_cart_availability_check.sql
-- ───────────────────────────────────────────
-- Migration 023: Fix cart availability check
-- Replaces unreliable client-side product_stops query with a
-- SECURITY DEFINER RPC that bypasses RLS and returns structured availability.
--
-- The cart page's availability check was:
-- 1. Unreliable — anon/frontend query may be blocked by RLS or return empty
-- 2. Conflating "no rows" with "product is unavailable"
-- 3. Blocking all stops even when the query itself failed
--
-- This adds: check_stop_product_availability(p_stop_id, p_product_ids)
-- Returns: { product_id, is_available }[] for each requested product.
-- The cart page uses this to show truly incompatible items separately
-- from query errors.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. check_stop_product_availability RPC
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_stop_product_availability(
  p_stop_id      UUID,
  p_product_ids  UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_pid    UUID;
BEGIN
  FOR v_pid IN SELECT unnest(p_product_ids)
  LOOP
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'product_id',   v_pid,
      'is_available', EXISTS(
        SELECT 1 FROM product_stops
        WHERE stop_id = p_stop_id AND product_id = v_pid
      )
    ));
  END LOOP;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Update cart/page.tsx to use the RPC + show query errors distinctly
--    (done in the application code, not the migration)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Changes to src/app/cart/page.tsx:
-- - handleStopSelect: POST to check_stop_product_availability RPC instead of
--   direct product_stops query. Handle errors distinctly from unavailability.
-- - Add availabilityError state — if RPC fails, show "Unable to verify
--   availability" but allow checkout to proceed (server will catch true errors).
-- - Add per-product availabilityError flag to distinguish query failure
--   from confirmed unavailability.
-- ───────────────────────────────────────────
-- 024_stop_product_assignment_rpcs.sql
-- ───────────────────────────────────────────
-- Migration 024: Stop-product assignment via SECURITY DEFINER RPCs
-- Replaces direct INSERT/DELETE on product_stops (blocked by RLS)
-- with admin-authorized RPCs that validate brand alignment.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop
-- Idempotent: if row already exists, returns the existing row.
-- Validates: stop exists, product exists, brands match.
-- Authorizes: platform_admin (all brands) or brand_admin (own brand only).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id    UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id   UUID;
  v_product_brand_id UUID;
  v_existing        UUID;
  v_result          JSONB;
BEGIN
  -- Verify stop exists and get its brand
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product exists and get its brand
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Brand alignment check
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand — cross-brand assignment not allowed'
    );
  END IF;

  -- Authorization: must be platform_admin or brand_admin for this brand
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'platform_admin' OR (role = 'brand_admin' AND brand_id = v_stop_brand_id))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to assign products to this stop');
  END IF;

  -- Idempotent insert: check if row already exists
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  -- Insert new row
  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop
-- Deletes the product_stop row. Safe — no side effects if row doesn't exist.
-- Authorizes: platform_admin (all brands) or brand_admin (own brand only).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
BEGIN
  -- Verify stop exists and get its brand
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Authorization: must be platform_admin or brand_admin for this brand
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'platform_admin' OR (role = 'brand_admin' AND brand_id = v_stop_brand_id))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to unassign products from this stop');
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_stop_products
-- Returns all products assigned to a stop, with product details.
-- Used by admin UI to refresh the list after assign/unassign.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('products', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ps.id,
        'product_id', ps.product_id,
        'name', p.name,
        'type', p.type,
        'price', p.price
      )
    ), '[]'::JSONB)
    FROM product_stops ps
    JOIN products p ON p.id = ps.product_id
    WHERE ps.stop_id = p_stop_id
  ));
END;
$$;
-- ───────────────────────────────────────────
-- 025_fix_assignment_rpc_auth.sql
-- ───────────────────────────────────────────
-- Migration 025: Fix admin assignment RPC authorization
--
-- Problem: auth.uid() is NULL when RPC is called via REST (anon key).
-- SECURITY DEFINER runs as postgres, but auth.uid() reflects the session user.
-- A direct REST call has no authenticated session → auth.uid() = NULL.
--
-- Fix: accept p_caller_uid as an explicit parameter from the admin UI.
-- The UI already knows the current user from getAdminUser().
-- The RPC validates authorization by looking up admin_users with p_caller_uid.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop (corrected auth)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  UUID    -- explicitly passed by the admin UI
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id    UUID;
  v_product_brand_id UUID;
  v_existing          UUID;
  v_admin_role       TEXT;
  v_admin_brand_id    UUID;
  v_result            JSONB;
BEGIN
  -- Verify stop exists and get its brand
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product exists and get its brand
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Brand alignment check
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand — cross-brand assignment not allowed'
    );
  END IF;

  -- Look up the admin user with the explicitly-passed caller UID
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as an admin user');
  END IF;

  -- Authorization: platform_admin can manage any stop; brand_admin only their brand
  IF v_admin_role = 'platform_admin' THEN
    -- platform_admin: allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- brand_admin for this brand: allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to assign products to this stop — requires platform_admin or brand_admin for this brand'
    );
  END IF;

  -- Idempotent: if already assigned, return existing row
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  -- Insert new row
  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop (corrected auth)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
  v_admin_role    TEXT;
  v_admin_brand_id UUID;
BEGIN
  -- Verify stop exists and get its brand
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Look up admin user
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as an admin user');
  END IF;

  -- Authorization
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to unassign products from this stop'
    );
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_stop_products — no auth needed for product list (reads data only)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('products', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ps.id,
        'product_id', ps.product_id,
        'name', p.name,
        'type', p.type,
        'price', p.price
      )
    ), '[]'::JSONB)
    FROM product_stops ps
    JOIN products p ON p.id = ps.product_id
    WHERE ps.stop_id = p_stop_id
  ));
END;
$$;
-- ───────────────────────────────────────────
-- 026_debug_assignment_rpc.sql
-- ───────────────────────────────────────────
-- Migration 026: Debug stop-product assignment
-- Temporary diagnostic RPC to reveal exactly why assignment authorization fails.
-- Remove this after the bug is fixed.

-- ═══════════════════════════════════════════════════════════════════════════
-- debug_stop_product_assignment
-- Returns a detailed diagnostics object so we can see which check failed.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_stop_product_assignment(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id     UUID;
  v_product_brand_id  UUID;
  v_admin_role        TEXT;
  v_admin_brand_id     UUID;
  v_admin_found       BOOLEAN := false;
  v_stop_found        BOOLEAN := false;
  v_product_found     BOOLEAN := false;
  v_brand_match       BOOLEAN;
  v_authorized        BOOLEAN := false;
  v_reason            TEXT := 'not checked';
BEGIN
  -- Check stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF FOUND THEN
    v_stop_found := true;
  ELSE
    v_reason := 'stop not found';
  END IF;

  -- Check product
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF FOUND THEN
    v_product_found := true;
  ELSE
    v_reason := 'product not found';
  END IF;

  -- Check admin_users
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid;

  IF FOUND THEN
    v_admin_found := true;
  ELSE
    v_reason := 'admin user not found in admin_users table';
  END IF;

  -- Brand match
  IF v_stop_found AND v_product_found THEN
    v_brand_match := (v_stop_brand_id = v_product_brand_id);
    IF NOT v_brand_match THEN
      v_reason := 'brand mismatch between stop and product';
    END IF;
  END IF;

  -- Authorization decision
  IF v_admin_found AND v_stop_found AND v_product_found AND v_brand_match THEN
    IF v_admin_role = 'platform_admin' THEN
      v_authorized := true;
      v_reason := 'authorized as platform_admin';
    ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
      v_authorized := true;
      v_reason := 'authorized as brand_admin for this brand';
    ELSE
      v_authorized := false;
      v_reason := 'admin role "' || v_admin_role || '" with brand_id "' ||
                  COALESCE(v_admin_brand_id::TEXT, 'NULL') ||
                  '" does not match stop brand "' || COALESCE(v_stop_brand_id::TEXT, 'NULL') || '"';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'caller_uid',       p_caller_uid,
    'admin_found',     v_admin_found,
    'admin_role',       v_admin_role,
    'admin_brand_id',   v_admin_brand_id,
    'stop_found',       v_stop_found,
    'stop_brand_id',    v_stop_brand_id,
    'product_found',    v_product_found,
    'product_brand_id', v_product_brand_id,
    'brand_match',     v_brand_match,
    'authorized',      v_authorized,
    'reason',          v_reason
  );
END;
$$;
-- ───────────────────────────────────────────
-- 027_fix_rpc_signature_conflict.sql
-- ───────────────────────────────────────────
-- Migration 027: Fix assignment RPC signature conflict
--
-- Root cause: Migration 024 created assign_product_to_stop(p_stop_id, p_product_id)
-- with 2 params. Migration 025 tried to CREATE OR REPLACE it with 3 params,
-- but CREATE OR REPLACE cannot change parameter count — the replacement failed
-- and the stale 2-param version remains in the schema.
--
-- Frontend calls with 3 params (p_caller_uid), but PostgreSQL matches the
-- 2-param overload and returns "function does not exist" (400) because the
-- 3-param call has no match.
--
-- Fix:
-- 1. DROP the old 2-param overloads explicitly
-- 2. CREATE the 3-param versions cleanly
-- 3. Notify PostgREST schema cache to reload
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop stale 2-param versions (migrations 024)
DROP FUNCTION IF EXISTS public.assign_product_to_stop(UUID, UUID);
DROP FUNCTION IF EXISTS public.unassign_product_from_stop(UUID, UUID);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop (3-param, SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id    UUID;
  v_product_brand_id UUID;
  v_existing          UUID;
  v_admin_role       TEXT;
  v_admin_brand_id    UUID;
  v_result            JSONB;
BEGIN
  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Cross-brand check
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand'
    );
  END IF;

  -- Look up caller in admin_users
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization: platform_admin OR brand_admin for this brand
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized — requires platform_admin or brand_admin for this brand'
    );
  END IF;

  -- Idempotent insert
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop (3-param, SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
  v_admin_role     TEXT;
  v_admin_brand_id UUID;
BEGIN
  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Look up caller
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_stop_products (no auth, product list)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('products', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', ps.id, 'product_id', ps.product_id,
                          'name', p.name, 'type', p.type, 'price', p.price)
    ), '[]'::JSONB)
    FROM product_stops ps
    JOIN products p ON p.id = ps.product_id
    WHERE ps.stop_id = p_stop_id
  ));
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Refresh PostgREST schema cache so it picks up the new signatures
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
-- ───────────────────────────────────────────
-- 028_fix_caller_uid_type.sql
-- ───────────────────────────────────────────
-- Migration 028: Fix dev-user UUID mismatch and clean up RPC signatures
--
-- Root cause: p_caller_uid was defined as UUID, but the dev session
-- (getAdminUser) returns user_id = 'dev-user-00000000-...' which is not
-- a valid UUID. PostgreSQL rejects it with "invalid input syntax for type uuid".
--
-- Fix: change p_caller_uid to TEXT — comparison with admin_users.user_id
-- (UUID column) works fine since PostgreSQL casts TEXT to UUID implicitly.
--
-- Also cleans up: drops stale 2-param overloads so PostgREST has no ambiguity.

-- ═══════════════════════════════════════════════════════════════════════════
-- Drop stale 2-param overloads from migrations 024/025
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.assign_product_to_stop(UUID, UUID);
DROP FUNCTION IF EXISTS public.unassign_product_from_stop(UUID, UUID);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop (p_caller_uid is TEXT to accept dev-user format)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  TEXT    -- TEXT to accept both UUIDs and "dev-user-..." strings
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id    UUID;
  v_product_brand_id UUID;
  v_existing          UUID;
  v_admin_role       TEXT;
  v_admin_brand_id    UUID;
  v_result            JSONB;
BEGIN
  -- Verify stop exists
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product exists
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Cross-brand guard
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand — cross-brand assignment not allowed'
    );
  END IF;

  -- Look up admin by user_id (admin_users.user_id is UUID; TEXT cast works)
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid::UUID
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization: platform_admin OR brand_admin for this brand
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized — requires platform_admin or brand_admin for this brand'
    );
  END IF;

  -- Idempotent insert
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop (p_caller_uid is TEXT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
  v_admin_role     TEXT;
  v_admin_brand_id UUID;
BEGIN
  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Look up admin
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid::UUID
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. debug_stop_product_assignment (p_caller_uid is TEXT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_stop_product_assignment(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id     UUID;
  v_product_brand_id  UUID;
  v_admin_role        TEXT;
  v_admin_brand_id    UUID;
  v_admin_found       BOOLEAN := false;
  v_stop_found        BOOLEAN := false;
  v_product_found     BOOLEAN := false;
  v_brand_match       BOOLEAN;
  v_authorized        BOOLEAN := false;
  v_reason            TEXT := 'not checked';
BEGIN
  -- Check stop
  SELECT brand_id INTO v_stop_brand_id FROM stops WHERE id = p_stop_id;
  IF FOUND THEN v_stop_found := true; END IF;

  -- Check product
  SELECT brand_id INTO v_product_brand_id FROM products WHERE id = p_product_id;
  IF FOUND THEN v_product_found := true; END IF;

  -- Check admin_users
  BEGIN
    SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
    FROM admin_users
    WHERE user_id = p_caller_uid::UUID;
    IF FOUND THEN v_admin_found := true; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_reason := 'admin lookup failed: ' || SQLERRM;
  END;

  -- Brand match
  IF v_stop_found AND v_product_found THEN
    v_brand_match := (v_stop_brand_id = v_product_brand_id);
  END IF;

  -- Authorization decision
  IF v_admin_found AND v_stop_found AND v_product_found THEN
    IF v_brand_match THEN
      IF v_admin_role = 'platform_admin' THEN
        v_authorized := true; v_reason := 'authorized as platform_admin';
      ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
        v_authorized := true; v_reason := 'authorized as brand_admin for this brand';
      ELSE
        v_authorized := false;
        v_reason := 'role "' || v_admin_role || '" with brand_id "' ||
                     COALESCE(v_admin_brand_id::TEXT, 'NULL') ||
                     '" does not match stop brand "' || COALESCE(v_stop_brand_id::TEXT, 'NULL') || '"';
      END IF;
    ELSE
      v_reason := 'brand mismatch: stop=' || COALESCE(v_stop_brand_id::TEXT, 'NULL') ||
                  ', product=' || COALESCE(v_product_brand_id::TEXT, 'NULL');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'caller_uid',       p_caller_uid,
    'admin_found',      v_admin_found,
    'admin_role',       v_admin_role,
    'admin_brand_id',   v_admin_brand_id,
    'stop_found',        v_stop_found,
    'stop_brand_id',     v_stop_brand_id,
    'product_found',     v_product_found,
    'product_brand_id',  v_product_brand_id,
    'brand_match',       v_brand_match,
    'authorized',        v_authorized,
    'reason',           v_reason
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
-- ───────────────────────────────────────────
-- 029_drop_stale_overloads.sql
-- ───────────────────────────────────────────
-- Migration 029: Remove all stale overloads, keep only TEXT caller_uid versions
--
-- Root cause: Migration 028 changed p_caller_uid to TEXT in the CREATE OR REPLACE
-- body, but the 3-param UUID overload (from migrations 024/025/027) was never
-- dropped. PostgreSQL now has TWO valid candidates:
--   assign_product_to_stop(uuid, uuid, text)  -- migration 028
--   assign_product_to_stop(uuid, uuid, uuid)  -- migration 027
-- PostgREST cannot resolve which to call → "Could not choose the best candidate".
--
-- Fix: DROP all old signatures explicitly, then CREATE ONLY the TEXT versions.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Drop ALL stale overloads for each function
-- ═══════════════════════════════════════════════════════════════════════════

-- assign_product_to_stop
DROP FUNCTION IF EXISTS public.assign_product_to_stop(UUID, UUID);
DROP FUNCTION IF EXISTS public.assign_product_to_stop(UUID, UUID, UUID);

-- unassign_product_from_stop
DROP FUNCTION IF EXISTS public.unassign_product_from_stop(UUID, UUID);
DROP FUNCTION IF EXISTS public.unassign_product_from_stop(UUID, UUID, UUID);

-- debug_stop_product_assignment
DROP FUNCTION IF EXISTS public.debug_stop_product_assignment(UUID, UUID, UUID);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop (TEXT caller_uid)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id    UUID;
  v_product_brand_id UUID;
  v_existing          UUID;
  v_admin_role       TEXT;
  v_admin_brand_id    UUID;
  v_result            JSONB;
BEGIN
  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Cross-brand guard
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand — cross-brand assignment not allowed'
    );
  END IF;

  -- Look up admin by user_id (admin_users.user_id is UUID; TEXT cast works)
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid::UUID
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization: platform_admin OR brand_admin for this brand
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized — requires platform_admin or brand_admin for this brand'
    );
  END IF;

  -- Idempotent insert
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop (TEXT caller_uid)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
  v_admin_role     TEXT;
  v_admin_brand_id UUID;
BEGIN
  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Look up admin
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid::UUID
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. debug_stop_product_assignment (TEXT caller_uid)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_stop_product_assignment(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id     UUID;
  v_product_brand_id  UUID;
  v_admin_role        TEXT;
  v_admin_brand_id    UUID;
  v_admin_found       BOOLEAN := false;
  v_stop_found        BOOLEAN := false;
  v_product_found     BOOLEAN := false;
  v_brand_match       BOOLEAN;
  v_authorized        BOOLEAN := false;
  v_reason            TEXT := 'not checked';
BEGIN
  -- Check stop
  SELECT brand_id INTO v_stop_brand_id FROM stops WHERE id = p_stop_id;
  IF FOUND THEN v_stop_found := true; END IF;

  -- Check product
  SELECT brand_id INTO v_product_brand_id FROM products WHERE id = p_product_id;
  IF FOUND THEN v_product_found := true; END IF;

  -- Check admin_users
  BEGIN
    SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
    FROM admin_users
    WHERE user_id = p_caller_uid::UUID;
    IF FOUND THEN v_admin_found := true; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_reason := 'admin lookup failed: ' || SQLERRM;
  END;

  -- Brand match
  IF v_stop_found AND v_product_found THEN
    v_brand_match := (v_stop_brand_id = v_product_brand_id);
  END IF;

  -- Authorization decision
  IF v_admin_found AND v_stop_found AND v_product_found THEN
    IF v_brand_match THEN
      IF v_admin_role = 'platform_admin' THEN
        v_authorized := true; v_reason := 'authorized as platform_admin';
      ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
        v_authorized := true; v_reason := 'authorized as brand_admin for this brand';
      ELSE
        v_authorized := false;
        v_reason := 'role "' || v_admin_role || '" with brand_id "' ||
                     COALESCE(v_admin_brand_id::TEXT, 'NULL') ||
                     '" does not match stop brand "' || COALESCE(v_stop_brand_id::TEXT, 'NULL') || '"';
      END IF;
    ELSE
      v_reason := 'brand mismatch: stop=' || COALESCE(v_stop_brand_id::TEXT, 'NULL') ||
                  ', product=' || COALESCE(v_product_brand_id::TEXT, 'NULL');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'caller_uid',       p_caller_uid,
    'admin_found',      v_admin_found,
    'admin_role',       v_admin_role,
    'admin_brand_id',   v_admin_brand_id,
    'stop_found',        v_stop_found,
    'stop_brand_id',     v_stop_brand_id,
    'product_found',     v_product_found,
    'product_brand_id',  v_product_brand_id,
    'brand_match',       v_brand_match,
    'authorized',        v_authorized,
    'reason',           v_reason
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verify: confirm only TEXT signatures remain
-- ═══════════════════════════════════════════════════════════════════════════

SELECT proname, oidvectortypes(proargtypes) AS arg_types
FROM pg_proc
WHERE proname IN ('assign_product_to_stop', 'unassign_product_from_stop', 'debug_stop_product_assignment')
  AND pronamespace = 'public'::regnamespace;

-- ═══════════════════════════════════════════════════════════════════════════
-- Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
-- ───────────────────────────────────────────
-- 030_normalize_dev_user_caller_uid.sql
-- ───────────────────────────────────────────
-- Migration 030: Normalize dev-user prefix before UUID cast in admin lookup
--
-- Root cause: p_caller_uid = 'dev-user-00000000-...' is not a valid UUID string.
-- p_caller_uid::UUID throws "invalid input syntax for type uuid" before the
-- admin_users lookup can run. The lookup fails even for valid admin UUIDs because
-- the cast throws first.
--
-- Fix: normalize p_caller_uid before casting:
--   - If it starts with 'dev-user-', strip that prefix then cast to UUID
--   - Otherwise cast directly
-- This lets the existing NOT FOUND handling catch the dev-user case gracefully.
--
-- Also adds exception handling around the cast so invalid strings don't crash
-- the function — the IF NOT FOUND path handles it.
--
-- Applies to: assign_product_to_stop, unassign_product_from_stop, debug_stop_product_assignment
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id    UUID;
  v_product_brand_id UUID;
  v_existing          UUID;
  v_admin_role       TEXT;
  v_admin_brand_id    UUID;
  v_result            JSONB;
  v_lookup_uid        UUID;
BEGIN
  -- Normalize: strip 'dev-user-' prefix before UUID cast
  IF p_caller_uid LIKE 'dev-user-%' THEN
    v_lookup_uid := replace(p_caller_uid, 'dev-user-', '')::UUID;
  ELSE
    v_lookup_uid := p_caller_uid::UUID;
  END IF;

  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Cross-brand guard
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand — cross-brand assignment not allowed'
    );
  END IF;

  -- Look up admin by normalized user_id
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = v_lookup_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization: platform_admin OR brand_admin for this brand
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized — requires platform_admin or brand_admin for this brand'
    );
  END IF;

  -- Idempotent insert
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
  v_admin_role     TEXT;
  v_admin_brand_id UUID;
  v_lookup_uid     UUID;
BEGIN
  -- Normalize: strip 'dev-user-' prefix before UUID cast
  IF p_caller_uid LIKE 'dev-user-%' THEN
    v_lookup_uid := replace(p_caller_uid, 'dev-user-', '')::UUID;
  ELSE
    v_lookup_uid := p_caller_uid::UUID;
  END IF;

  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Look up admin
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = v_lookup_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. debug_stop_product_assignment
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_stop_product_assignment(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id     UUID;
  v_product_brand_id  UUID;
  v_admin_role        TEXT;
  v_admin_brand_id    UUID;
  v_admin_found       BOOLEAN := false;
  v_stop_found        BOOLEAN := false;
  v_product_found     BOOLEAN := false;
  v_brand_match       BOOLEAN;
  v_authorized        BOOLEAN := false;
  v_reason            TEXT := 'not checked';
  v_lookup_uid        UUID;
BEGIN
  -- Normalize: strip 'dev-user-' prefix before UUID cast
  IF p_caller_uid LIKE 'dev-user-%' THEN
    v_lookup_uid := replace(p_caller_uid, 'dev-user-', '')::UUID;
  ELSE
    v_lookup_uid := p_caller_uid::UUID;
  END IF;

  -- Check stop
  SELECT brand_id INTO v_stop_brand_id FROM stops WHERE id = p_stop_id;
  IF FOUND THEN v_stop_found := true; END IF;

  -- Check product
  SELECT brand_id INTO v_product_brand_id FROM products WHERE id = p_product_id;
  IF FOUND THEN v_product_found := true; END IF;

  -- Check admin_users
  BEGIN
    SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
    FROM admin_users
    WHERE user_id = v_lookup_uid;
    IF FOUND THEN v_admin_found := true; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_reason := 'admin lookup failed: ' || SQLERRM;
  END;

  -- Brand match
  IF v_stop_found AND v_product_found THEN
    v_brand_match := (v_stop_brand_id = v_product_brand_id);
  END IF;

  -- Authorization decision
  IF v_admin_found AND v_stop_found AND v_product_found THEN
    IF v_brand_match THEN
      IF v_admin_role = 'platform_admin' THEN
        v_authorized := true; v_reason := 'authorized as platform_admin';
      ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
        v_authorized := true; v_reason := 'authorized as brand_admin for this brand';
      ELSE
        v_authorized := false;
        v_reason := 'role "' || v_admin_role || '" with brand_id "' ||
                     COALESCE(v_admin_brand_id::TEXT, 'NULL') ||
                     '" does not match stop brand "' || COALESCE(v_stop_brand_id::TEXT, 'NULL') || '"';
      END IF;
    ELSE
      v_reason := 'brand mismatch: stop=' || COALESCE(v_stop_brand_id::TEXT, 'NULL') ||
                  ', product=' || COALESCE(v_product_brand_id::TEXT, 'NULL');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'caller_uid',       p_caller_uid,
    'lookup_uid',       v_lookup_uid::TEXT,
    'admin_found',      v_admin_found,
    'admin_role',       v_admin_role,
    'admin_brand_id',   v_admin_brand_id,
    'stop_found',        v_stop_found,
    'stop_brand_id',     v_stop_brand_id,
    'product_found',     v_product_found,
    'product_brand_id',  v_product_brand_id,
    'brand_match',       v_brand_match,
    'authorized',        v_authorized,
    'reason',           v_reason
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
-- ───────────────────────────────────────────
-- 031_reports_v1_rpcs.sql
-- ───────────────────────────────────────────
-- Migration 031: Reports V1 — Operational Reporting RPCs
-- SECURITY DEFINER — bypasses RLS, enforces brand scoping in SQL
-- All functions accept p_brand_id NULL = platform_admin sees all brands
-- brand_admin is filtered at the page level via getAdminUser()

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. get_reports_summary — 10 KPI cards
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_reports_summary(
  p_brand_id     UUID,
  p_start_date   DATE,
  p_end_date     DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Base WHERE: always filter by brand if provided, always filter by date
  -- Status filter: exclude canceled orders from all revenue/order counts

  WITH date_orders AS (
    SELECT o.id, o.subtotal, o.status, o.brand_id,
           CASE WHEN EXISTS (
             SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'pickup'
           ) THEN true ELSE false END AS has_pickup,
           CASE WHEN EXISTS (
             SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'shipping'
           ) THEN true ELSE false END AS has_shipping
    FROM orders o
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND o.status != 'canceled'
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
  ),
  pickup_orders AS (
    SELECT COUNT(DISTINCT id) AS cnt FROM date_orders WHERE has_pickup
  ),
  shipping_orders AS (
    SELECT COUNT(DISTINCT id) AS cnt FROM date_orders WHERE has_shipping
  ),
  pending_pickups AS (
    SELECT COUNT(DISTINCT o.id) AS cnt
    FROM date_orders o
    WHERE o.has_pickup AND o.status = 'pending'
  ),
  completed_pickups AS (
    SELECT COUNT(DISTINCT o.id) AS cnt
    FROM date_orders o
    WHERE o.has_pickup AND o.status = 'completed'
  ),
  contacts_added AS (
    SELECT COUNT(*) AS cnt
    FROM communication_contacts cc
    WHERE cc.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND cc.source = 'import'
      AND (p_brand_id IS NULL OR cc.brand_id = p_brand_id)
  ),
  campaigns_sent AS (
    SELECT COUNT(*) AS cnt
    FROM communication_campaigns cc
    WHERE cc.sent_at::DATE BETWEEN p_start_date AND p_end_date
      AND cc.status = 'sent'
      AND (p_brand_id IS NULL OR cc.brand_id = p_brand_id)
  ),
  messages_logged AS (
    SELECT COUNT(*) AS cnt
    FROM communication_message_logs ml
    WHERE ml.sent_at::DATE BETWEEN p_start_date AND p_end_date
      AND (p_brand_id IS NULL OR ml.brand_id = p_brand_id)
  )
  SELECT jsonb_build_object(
    'gross_sales',       COALESCE(SUM(subtotal), 0),
    'total_orders',      COUNT(DISTINCT id),
    'avg_order_value',   CASE WHEN COUNT(id) > 0 THEN ROUND(AVG(subtotal), 2) ELSE 0 END,
    'pickup_orders',     COALESCE((SELECT cnt FROM pickup_orders), 0),
    'shipping_orders',   COALESCE((SELECT cnt FROM shipping_orders), 0),
    'pending_pickups',   COALESCE((SELECT cnt FROM pending_pickups), 0),
    'completed_pickups', COALESCE((SELECT cnt FROM completed_pickups), 0),
    'contacts_added',    COALESCE((SELECT cnt FROM contacts_added), 0),
    'campaigns_sent',    COALESCE((SELECT cnt FROM campaigns_sent), 0),
    'messages_logged',   COALESCE((SELECT cnt FROM messages_logged), 0)
  ) INTO v_result
  FROM date_orders;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. get_orders_by_stop_report — orders grouped by stop
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_orders_by_stop_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'stop_name',       r.stop_name,
      'city',           r.city,
      'state',          r.state,
      'date',           r.date,
      'order_count',    r.order_count,
      'gross_sales',    r.gross_sales,
      'pending_count',  r.pending_count,
      'completed_count', r.completed_count
    ) ORDER BY r.date DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      s.city || ', ' || s.state AS stop_name,
      s.city,
      s.state,
      s.date,
      COUNT(DISTINCT o.id) AS order_count,
      COALESCE(SUM(o.subtotal), 0) AS gross_sales,
      COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) AS pending_count,
      COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed_count
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND o.status != 'canceled'
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    GROUP BY s.id, s.city, s.state, s.date
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_sales_by_product_report — product revenue
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_sales_by_product_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'product_name', r.product_name,
      'units_sold',   r.units_sold,
      'gross_revenue', r.gross_revenue,
      'avg_price',    r.avg_price
    ) ORDER BY r.gross_revenue DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      p.name AS product_name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.price * oi.quantity) AS gross_revenue,
      ROUND(AVG(oi.price), 2) AS avg_price
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND o.status != 'canceled'
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    GROUP BY p.id, p.name
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. get_fulfillment_report — pickup / shipping / mixed breakdown
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_fulfillment_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(o.subtotal), 0) INTO v_total
  FROM orders o
  WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND o.status != 'canceled'
    AND (p_brand_id IS NULL OR o.brand_id = p_brand_id);

  RETURN COALESCE(jsonb_agg(sub ORDER BY revenue DESC), '[]'::JSONB)
  FROM (
    SELECT
      CASE
        WHEN has_pickup AND has_shipping THEN 'mixed'
        WHEN has_pickup THEN 'pickup'
        ELSE 'shipping'
      END AS fulfillment_type,
      COUNT(DISTINCT o.id) AS order_count,
      SUM(o.subtotal) AS revenue,
      CASE WHEN v_total > 0 THEN ROUND(100.0 * SUM(o.subtotal) / v_total, 1) ELSE 0 END AS pct_of_total
    FROM (
      SELECT o.id, o.subtotal,
        EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'pickup') AS has_pickup,
        EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'shipping') AS has_shipping
      FROM orders o
      WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
        AND o.status != 'canceled'
        AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    ) o
    GROUP BY fulfillment_type
  ) sub;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. get_pickup_status_by_stop — per-stop pickup status
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_pickup_status_by_stop(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'stop_name',     r.stop_name,
      'city',          r.city,
      'date',          r.date,
      'total_orders',  r.total_orders,
      'pending',       r.pending,
      'completed',     r.completed,
      'canceled',      r.canceled
    ) ORDER BY r.date DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      s.city || ', ' || s.state AS stop_name,
      s.city,
      s.date,
      COUNT(DISTINCT o.id) AS total_orders,
      COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) AS pending,
      COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed,
      COUNT(DISTINCT CASE WHEN o.status = 'canceled' THEN o.id END) AS canceled
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'pickup')
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    GROUP BY s.id, s.city, s.state, s.date
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. get_contact_growth_report — new contacts over time
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_contact_growth_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'date',         r.date,
      'new_contacts', r.new_contacts,
      'imports',      r.imports,
      'total',        r.total
    ) ORDER BY r.date DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      d::DATE AS date,
      COALESCE(SUM(CASE WHEN cc.source IS DISTINCT FROM 'import' THEN 1 ELSE 0 END), 0) AS new_contacts,
      COALESCE(SUM(CASE WHEN cc.source = 'import' THEN 1 ELSE 0 END), 0) AS imports,
      COUNT(cc.*) AS total
    FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL) d
    LEFT JOIN communication_contacts cc
      ON cc.created_at::DATE = d::DATE
      AND (p_brand_id IS NULL OR cc.brand_id = p_brand_id)
    GROUP BY d::DATE
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. get_campaign_activity_report — campaign status and message counts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_campaign_activity_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'campaign_name',  c.name,
      'status',         c.status,
      'campaign_type',  c.campaign_type,
      'sent_at',        c.sent_at,
      'messages_logged', COALESCE(ml.sent_count, 0)
    ) ORDER BY c.sent_at DESC NULLS LAST
  ), '[]'::JSONB)
  FROM communication_campaigns c
  LEFT JOIN (
    SELECT campaign_id, COUNT(*) AS sent_count
    FROM communication_message_logs
    WHERE sent_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY campaign_id
  ) ml ON ml.campaign_id = c.id
  WHERE c.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND (p_brand_id IS NULL OR c.brand_id = p_brand_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
-- ───────────────────────────────────────────
-- 032_store_employee_role.sql
-- ───────────────────────────────────────────
-- Migration 032: Store Employee Role
--
-- Add store_employee to the platform's role model. No new columns —
-- admin_users.role already exists with values 'platform_admin', 'brand_admin'.
-- store_employee just adds a third recognized role.
--
-- RLS: store_employee can read orders for their brand (brand_id scoped).
-- SQL RPCs: get_admin_orders + get_admin_order_detail add store_employee brand scoping.
-- No changes to product/stop/communications/settings RLS — store_employee shouldn't
-- be granted those tables in RLS at all (they go through existing SECURITY DEFINER RPCs
-- with explicit can_manage_* guard checks in TypeScript actions).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. RLS policy: store_employee can read their brand's orders
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Store employee can read their brand orders" ON orders;
CREATE POLICY "Store employee can read their brand orders"
  ON orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'store_employee'
      AND admin_users.brand_id = (
        SELECT brand_id FROM stops WHERE stops.id = orders.stop_id
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. get_admin_orders — add store_employee brand scoping
--    (SECURITY DEFINER, no RLS — add explicit brand_id check for store_employee)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_orders(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders JSONB;
  v_stops JSONB;
  v_effective_brand_id UUID;
BEGIN
  -- Resolve effective brand: use p_brand_id if non-null,
  -- otherwise fall back to store_employee's own brand
  IF p_brand_id IS NOT NULL THEN
    v_effective_brand_id := p_brand_id;
  ELSE
    -- For store_employee with no p_brand_id, use their own brand_id
    -- (caller must pass brand_id for store_employee to avoid cross-brand data)
    v_effective_brand_id := NULL;
  END IF;

  IF v_effective_brand_id IS NULL THEN
    -- platform_admin or no brand scoping — return all orders
    SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::JSONB)
    INTO v_orders
    FROM (
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
             o.stop_id, o.status, o.subtotal, o.pickup_complete,
             o.pickup_completed_at, o.pickup_completed_by, o.created_at,
             CASE WHEN o.stop_id IS NOT NULL THEN jsonb_build_object(
               'id', s.id, 'city', s.city, 'state', s.state,
               'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
             ) END as stops
      FROM orders o LEFT JOIN stops s ON o.stop_id = s.id
      WHERE o.stop_id IS NOT NULL
      LIMIT 500
    ) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'city', city, 'state', state,
      'date', date, 'time', time, 'location', location, 'brand_id', brand_id
    ) ORDER BY date), '[]'::JSONB)
    INTO v_stops FROM stops WHERE active = true;
  ELSE
    -- brand-scoped query (brand_admin, store_employee, or platform_admin filtering)
    SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::JSONB)
    INTO v_orders
    FROM (
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
             o.stop_id, o.status, o.subtotal, o.pickup_complete,
             o.pickup_completed_at, o.pickup_completed_by, o.created_at,
             jsonb_build_object(
               'id', s.id, 'city', s.city, 'state', s.state,
               'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
             ) as stops
      FROM orders o JOIN stops s ON o.stop_id = s.id
      WHERE s.brand_id = v_effective_brand_id
      LIMIT 500
    ) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'city', city, 'state', state,
      'date', date, 'time', time, 'location', location, 'brand_id', brand_id
    ) ORDER BY date), '[]'::JSONB)
    INTO v_stops FROM stops WHERE active = true AND brand_id = v_effective_brand_id;
  END IF;

  RETURN jsonb_build_object('orders', v_orders, 'stops', v_stops);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_admin_order_detail — brand scoping (already SECURITY DEFINER,
--    add check that store_employee can only view orders in their brand)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_order_detail(p_order_id UUID, p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order JSONB;
  v_order_brand_id UUID;
  v_stop_brand_id UUID;
BEGIN
  -- Resolve order's brand_id (from order.brand_id or stop.brand_id)
  SELECT
    COALESCE(o.brand_id, s.brand_id),
    s.brand_id
  INTO v_order_brand_id, v_stop_brand_id
  FROM orders o
  LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.id = p_order_id;

  -- Brand scoping: if p_brand_id is provided, restrict to that brand
  IF p_brand_id IS NOT NULL AND v_order_brand_id IS NOT NULL AND v_order_brand_id != p_brand_id THEN
    RETURN jsonb_build_object('error', 'Order not found or access denied');
  END IF;

  SELECT jsonb_build_object(
    'id', o.id,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'stop_id', o.stop_id,
    'status', o.status,
    'subtotal', o.subtotal,
    'pickup_complete', o.pickup_complete,
    'pickup_completed_at', o.pickup_completed_at,
    'pickup_completed_by', o.pickup_completed_by,
    'created_at', o.created_at,
    'stops', CASE WHEN o.stop_id IS NOT NULL THEN jsonb_build_object(
      'id', s.id, 'city', s.city, 'state', s.state,
      'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
    ) END,
    'order_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id, 'product_id', oi.product_id, 'product_name', p.name,
        'quantity', oi.quantity, 'price', oi.price, 'fulfillment', oi.fulfillment,
        'products', jsonb_build_object('name', p.name)
      ))
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = o.id
    ), '[]'::JSONB)
  )
  INTO v_order
  FROM orders o
  LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.id = p_order_id;

  RETURN v_order;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
-- ───────────────────────────────────────────
-- 033_admin_users_crud.sql
-- ───────────────────────────────────────────
-- Migration 033: Admin Users CRUD
--
-- RPC functions for listing, creating, updating, and deactivating admin_users.
-- Security constraints enforced at SQL level:
--   - platform_admin: can manage all users and any brand
--   - brand_admin with can_manage_users: can only manage users within their brand,
--     cannot create platform_admin, cannot assign foreign brand_id
--   - store_employee: cannot access these functions (guarded at TS route level)
--
-- Display name: joins auth.users raw_user_meta_data -> display_name | name, falls back to email.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. get_admin_users — list users, optionally filtered by brand
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_admin_users(UUID);
CREATE OR REPLACE FUNCTION get_admin_users(p_brand_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  brand_name TEXT,
  can_manage_products BOOLEAN,
  can_manage_stops BOOLEAN,
  can_manage_orders BOOLEAN,
  can_manage_pickup BOOLEAN,
  can_manage_messages BOOLEAN,
  can_manage_refunds BOOLEAN,
  can_manage_users BOOLEAN,
  can_manage_water_log BOOLEAN,
  can_manage_reports BOOLEAN,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      (au.raw_user_meta_data->>'full_name')::TEXT,
      u.email
    ) AS display_name,
    u.email,
    au.role::TEXT,
    au.brand_id,
    b.name AS brand_name,
    au.can_manage_products,
    au.can_manage_stops,
    au.can_manage_orders,
    au.can_manage_pickup,
    au.can_manage_messages,
    au.can_manage_refunds,
    au.can_manage_users,
    au.can_manage_water_log,
    COALESCE(au.can_manage_reports, false) AS can_manage_reports,
    au.active,
    au.created_at,
    au.last_login
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  LEFT JOIN brands b ON au.brand_id = b.id
  WHERE
    -- platform_admin sees all; brand_admin sees only their brand
    (
      EXISTS (
        SELECT 1 FROM admin_users caller
        WHERE caller.user_id = auth.uid()
        AND caller.role = 'platform_admin'
      )
      OR
      (
        EXISTS (
          SELECT 1 FROM admin_users caller
          WHERE caller.user_id = auth.uid()
          AND caller.role = 'brand_admin'
          AND caller.can_manage_users = true
        )
        AND (p_brand_id IS NULL OR au.brand_id = p_brand_id)
        AND (
          EXISTS (
            SELECT 1 FROM admin_users caller
            WHERE caller.user_id = auth.uid()
            AND caller.brand_id = au.brand_id
          )
        )
      )
    )
  ORDER BY au.created_at DESC;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. create_admin_user — create a new admin user record
--
-- p_email: must already have a Supabase auth account
-- p_role: 'platform_admin' | 'brand_admin' | 'store_employee'
-- p_brand_id: required for brand_admin and store_employee
-- p_flags: JSONB with individual can_manage_* booleans
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, UUID, JSONB);
CREATE OR REPLACE FUNCTION create_admin_user(
  p_email TEXT,
  p_role TEXT,
  p_brand_id UUID DEFAULT NULL,
  p_flags JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_brand_id UUID;
  v_caller_can_manage_users BOOLEAN;
  v_target_user_id UUID;
  v_new_id UUID;
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look up caller
  SELECT role, brand_id, can_manage_users
  INTO v_caller_role, v_caller_brand_id, v_caller_can_manage_users
  FROM admin_users
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  -- Security: brand_admin cannot create platform_admin
  IF v_caller_role = 'brand_admin' AND p_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
  END IF;

  -- Security: brand_admin can only create users in their own brand
  IF v_caller_role = 'brand_admin' THEN
    IF p_brand_id IS DISTINCT FROM v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to create a user for another brand';
    END IF;
    IF p_brand_id IS NULL AND p_role = 'platform_admin' THEN
      RAISE EXCEPTION 'brand_admin cannot create platform_admin';
    END IF;
  END IF;

  -- Find the auth user by email
  BEGIN
    SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END IF;

  -- Check no existing admin_users record for this user
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_target_user_id) THEN
    RAISE EXCEPTION 'Admin user with email % already exists', p_email;
  END IF;

  -- Insert new admin user
  INSERT INTO admin_users (
    user_id, role, brand_id,
    can_manage_products, can_manage_stops, can_manage_orders, can_manage_pickup,
    can_manage_messages, can_manage_refunds, can_manage_users, can_manage_water_log,
    can_manage_reports, active
  ) VALUES (
    v_target_user_id, p_role, p_brand_id,
    COALESCE((p_flags->>'can_manage_products')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_stops')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_orders')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_pickup')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_messages')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_refunds')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_users')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_water_log')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_reports')::BOOLEAN, false),
    true
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY
  SELECT
    au.id, au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      (au.raw_user_meta_data->>'full_name')::TEXT,
      u.email
    ) AS display_name,
    u.email, au.role::TEXT, au.brand_id, au.active, au.created_at
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.id = v_new_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. update_admin_user — update role, brand, flags, or active status
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS update_admin_user(UUID, TEXT, UUID, JSONB, BOOLEAN);
CREATE OR REPLACE FUNCTION update_admin_user(
  p_id UUID,
  p_role TEXT DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_flags JSONB DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  active BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_brand_id UUID;
  v_caller_can_manage_users BOOLEAN;
  v_target_role TEXT;
  v_target_brand_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, brand_id, can_manage_users
  INTO v_caller_role, v_caller_brand_id, v_caller_can_manage_users
  FROM admin_users
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  -- Cannot update your own account's role
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = p_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Cannot update your own admin account';
  END IF;

  -- Look up target
  SELECT role, brand_id INTO v_target_role, v_target_brand_id
  FROM admin_users WHERE id = p_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Security: brand_admin cannot demote/promote platform_admin
  IF v_caller_role = 'brand_admin' AND v_target_role = 'platform_admin' AND p_role IS NOT NULL THEN
    RAISE EXCEPTION 'Insufficient permissions to modify a platform_admin';
  END IF;

  -- Security: brand_admin cannot give platform_admin role
  IF v_caller_role = 'brand_admin' AND p_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
  END IF;

  -- Security: brand_admin can only affect users in their brand
  IF v_caller_role = 'brand_admin' THEN
    IF v_target_brand_id != v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to modify a user from another brand';
    END IF;
    IF p_brand_id IS NOT NULL AND p_brand_id != v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to assign a user to another brand';
    END IF;
    IF p_role = 'platform_admin' THEN
      RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
    END IF;
  END IF;

  -- Apply updates
  UPDATE admin_users SET
    role = COALESCE(p_role, role),
    brand_id = COALESCE(p_brand_id, brand_id),
    can_manage_products = COALESCE((p_flags->>'can_manage_products')::BOOLEAN, can_manage_products),
    can_manage_stops = COALESCE((p_flags->>'can_manage_stops')::BOOLEAN, can_manage_stops),
    can_manage_orders = COALESCE((p_flags->>'can_manage_orders')::BOOLEAN, can_manage_orders),
    can_manage_pickup = COALESCE((p_flags->>'can_manage_pickup')::BOOLEAN, can_manage_pickup),
    can_manage_messages = COALESCE((p_flags->>'can_manage_messages')::BOOLEAN, can_manage_messages),
    can_manage_refunds = COALESCE((p_flags->>'can_manage_refunds')::BOOLEAN, can_manage_refunds),
    can_manage_users = COALESCE((p_flags->>'can_manage_users')::BOOLEAN, can_manage_users),
    can_manage_water_log = COALESCE((p_flags->>'can_manage_water_log')::BOOLEAN, can_manage_water_log),
    can_manage_reports = COALESCE((p_flags->>'can_manage_reports')::BOOLEAN, can_manage_reports),
    active = COALESCE(p_active, active)
  WHERE id = p_id;

  RETURN QUERY
  SELECT
    au.id, au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      (au.raw_user_meta_data->>'full_name')::TEXT,
      u.email
    ) AS display_name,
    u.email, au.role::TEXT, au.brand_id, au.active, NOW() AS updated_at
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.id = p_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. delete_admin_user — remove admin user record
--    Cannot delete your own account.
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS delete_admin_user(UUID);
CREATE OR REPLACE FUNCTION delete_admin_user(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM admin_users WHERE user_id = auth.uid();
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  -- Cannot delete self
  SELECT user_id INTO v_target_user_id FROM admin_users WHERE id = p_id;
  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own admin account';
  END IF;

  -- brand_admin can only delete users in their brand
  IF v_caller_role = 'brand_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = p_id AND brand_id = (SELECT brand_id FROM admin_users WHERE user_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to delete this user';
    END IF;
  END IF;

  DELETE FROM admin_users WHERE id = p_id;
  RETURN true;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
-- ───────────────────────────────────────────
-- 034_password_change_flow.sql
-- ───────────────────────────────────────────
-- Migration: 034_password_change_flow
-- Adds must_change_password column to admin_users if not exists
-- Adds phone_number column to admin_users if not exists
-- Creates RPC to clear must_change_password after password update

alter table admin_users add column if not exists must_change_password boolean not null default false;
alter table admin_users add column if not exists phone_number text;

-- RPC: clear must_change_password for the authenticated user
create or replace function clear_must_change_password()
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update admin_users
  set must_change_password = false
  where user_id = auth.uid()
    and must_change_password = true;

  return true;
end;
$$;

-- ───────────────────────────────────────────
-- 035_admin_action_logs.sql
-- ───────────────────────────────────────────
-- Migration: 035_admin_action_logs
-- Dedicated audit trail for admin user management actions

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type       TEXT NOT NULL,  -- 'create' | 'update' | 'delete'
  admin_id          UUID,            -- auth.uid() of the admin performing the action
  admin_email       TEXT,
  affected_user_id  UUID,            -- the admin_users.id being modified
  brand_id          UUID,
  details           JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by acting admin
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
-- Index for fast lookups by affected user
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_affected_user ON admin_action_logs(affected_user_id);
-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at DESC);

-- RLS: platform_admin can read all; brand_admin reads only their brand
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_read_all_admin_action_logs" ON admin_action_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
    )
  );

CREATE POLICY "brand_admin_read_own_brand_admin_action_logs" ON admin_action_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'brand_admin'
        AND au.brand_id = admin_action_logs.brand_id
    )
  );

-- Append-only: any authenticated admin user can insert (enforced at RPC level)
CREATE POLICY "admin_action_logs_insert" ON admin_action_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- log_admin_action — SECURITY DEFINER, bypasses RLS
-- Called by admin user CRUD actions to record what changed.
-- Payload: { action_type, admin_id, admin_email, affected_user_id, brand_id, details }
-- ============================================================
CREATE OR REPLACE FUNCTION log_admin_action(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_action_logs (
    action_type, admin_id, admin_email, affected_user_id, brand_id, details
  ) VALUES (
    p_payload->>'action_type',
    CASE WHEN (p_payload->>'admin_id') IS NULL THEN NULL ELSE (p_payload->>'admin_id')::UUID END,
    p_payload->>'admin_email',
    CASE WHEN (p_payload->>'affected_user_id') IS NULL THEN NULL ELSE (p_payload->>'affected_user_id')::UUID END,
    CASE WHEN (p_payload->>'brand_id') IS NULL THEN NULL ELSE (p_payload->>'brand_id')::UUID END,
    COALESCE(p_payload->'details', '{}'::JSONB)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================
-- log_user_activity — SECURITY DEFINER, bypasses RLS
-- Tracks per-user activities: logins, password changes, profile updates.
-- Payload: { user_id, activity_type, details, ip_address, user_agent }
-- ============================================================
CREATE OR REPLACE FUNCTION log_user_activity(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_activity_logs (
    user_id, activity_type, details, ip_address, user_agent
  ) VALUES (
    CASE WHEN (p_payload->>'user_id') IS NULL THEN NULL ELSE (p_payload->>'user_id')::UUID END,
    p_payload->>'activity_type',
    COALESCE(p_payload->'details', '{}'::JSONB),
    p_payload->>'ip_address',
    p_payload->>'user_agent'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


-- ───────────────────────────────────────────
-- 036_user_activity_logs.sql
-- ───────────────────────────────────────────
-- Migration: 036_user_activity_logs
-- Tracks per-user activities: logins, password changes, profile updates

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  activity_type  TEXT NOT NULL,  -- 'login' | 'logout' | 'password_change' | 'profile_update' | 'email_change'
  details        JSONB DEFAULT '{}',
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-user log lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
-- Index for time-based queries per user
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);

-- RLS: user can read own logs; platform_admin can read all
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_activity_logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "platform_admin_read_all_user_activity_logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
    )
  );

-- Any authenticated user can insert their own log entries
CREATE POLICY "user_insert_own_activity_logs" ON user_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ───────────────────────────────────────────
-- 037_update_admin_user_profile.sql
-- ───────────────────────────────────────────
-- Migration: 037_update_admin_user_profile
-- Extends update_admin_user to accept display_name and phone_number.
-- Updates admin_users and syncs auth.users raw_user_meta_data.
-- After update, writes to admin_action_logs.

DROP FUNCTION IF EXISTS update_admin_user(UUID, TEXT, UUID, JSONB, BOOLEAN, TEXT, TEXT);
CREATE OR REPLACE FUNCTION update_admin_user(
  p_id UUID,
  p_role TEXT DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_flags JSONB DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  active BOOLEAN,
  phone_number TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_brand_id UUID;
  v_caller_can_manage_users BOOLEAN;
  v_target_role TEXT;
  v_target_brand_id UUID;
  v_target_user_id UUID;
  v_admin_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, brand_id, can_manage_users
  INTO v_caller_role, v_caller_brand_id, v_caller_can_manage_users
  FROM admin_users
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  -- Cannot update your own account's role
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = p_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Cannot update your own admin account';
  END IF;

  -- Look up target
  SELECT role, brand_id, user_id INTO v_target_role, v_target_brand_id, v_target_user_id
  FROM admin_users WHERE id = p_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Security: brand_admin cannot demote/promote platform_admin
  IF v_caller_role = 'brand_admin' AND v_target_role = 'platform_admin' AND p_role IS NOT NULL THEN
    RAISE EXCEPTION 'Insufficient permissions to modify a platform_admin';
  END IF;

  -- Security: brand_admin cannot give platform_admin role
  IF v_caller_role = 'brand_admin' AND p_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
  END IF;

  -- Security: brand_admin can only affect users in their brand
  IF v_caller_role = 'brand_admin' THEN
    IF v_target_brand_id != v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to modify a user from another brand';
    END IF;
    IF p_brand_id IS NOT NULL AND p_brand_id != v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to assign a user to another brand';
    END IF;
    IF p_role = 'platform_admin' THEN
      RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
    END IF;
  END IF;

  -- Get caller email for audit log
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  -- Apply updates to admin_users
  UPDATE admin_users SET
    role = COALESCE(p_role, role),
    brand_id = COALESCE(p_brand_id, brand_id),
    can_manage_products = COALESCE((p_flags->>'can_manage_products')::BOOLEAN, can_manage_products),
    can_manage_stops = COALESCE((p_flags->>'can_manage_stops')::BOOLEAN, can_manage_stops),
    can_manage_orders = COALESCE((p_flags->>'can_manage_orders')::BOOLEAN, can_manage_orders),
    can_manage_pickup = COALESCE((p_flags->>'can_manage_pickup')::BOOLEAN, can_manage_pickup),
    can_manage_messages = COALESCE((p_flags->>'can_manage_messages')::BOOLEAN, can_manage_messages),
    can_manage_refunds = COALESCE((p_flags->>'can_manage_refunds')::BOOLEAN, can_manage_refunds),
    can_manage_users = COALESCE((p_flags->>'can_manage_users')::BOOLEAN, can_manage_users),
    can_manage_water_log = COALESCE((p_flags->>'can_manage_water_log')::BOOLEAN, can_manage_water_log),
    can_manage_reports = COALESCE((p_flags->>'can_manage_reports')::BOOLEAN, can_manage_reports),
    active = COALESCE(p_active, active),
    display_name = COALESCE(p_display_name, display_name),
    phone_number = COALESCE(p_phone_number, phone_number)
  WHERE id = p_id;

  -- Sync display_name / phone_number to auth.users raw_user_meta_data
  IF p_display_name IS NOT NULL OR p_phone_number IS NOT NULL THEN
    UPDATE auth.users SET
      raw_user_meta_data = jsonb_strip_nulls(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{display_name}',
          to_jsonb(p_display_name)
        ) ||
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{phone_number}',
          to_jsonb(p_phone_number)
        )
      )
    WHERE id = v_target_user_id;
  END IF;

  -- Audit log: record the action
  PERFORM log_admin_action(jsonb_build_object(
    'action_type', 'update',
    'admin_id', auth.uid(),
    'admin_email', v_admin_email,
    'affected_user_id', v_target_user_id,
    'brand_id', COALESCE(p_brand_id, v_target_brand_id),
    'details', jsonb_build_object(
      'changed_fields', ARRAY_REMOVE(ARRAY[
        CASE WHEN p_role IS NOT NULL THEN 'role' ELSE NULL END,
        CASE WHEN p_brand_id IS NOT NULL THEN 'brand_id' ELSE NULL END,
        CASE WHEN p_flags IS NOT NULL THEN 'flags' ELSE NULL END,
        CASE WHEN p_active IS NOT NULL THEN 'active' ELSE NULL END,
        CASE WHEN p_display_name IS NOT NULL THEN 'display_name' ELSE NULL END,
        CASE WHEN p_phone_number IS NOT NULL THEN 'phone_number' ELSE NULL END
      ], NULL)
    )
  ));

  RETURN QUERY
  SELECT
    au.id, au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      u.email
    ) AS display_name,
    u.email, au.role::TEXT, au.brand_id, au.active,
    au.phone_number, NOW() AS updated_at
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.id = p_id;
END;
$$;

-- Update create_admin_user to also log
CREATE OR REPLACE FUNCTION create_admin_user(
  p_email TEXT,
  p_role TEXT,
  p_brand_id UUID DEFAULT NULL,
  p_flags JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_brand_id UUID;
  v_caller_can_manage_users BOOLEAN;
  v_target_user_id UUID;
  v_new_id UUID;
  v_admin_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, brand_id, can_manage_users
  INTO v_caller_role, v_caller_brand_id, v_caller_can_manage_users
  FROM admin_users
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  IF v_caller_role = 'brand_admin' AND p_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
  END IF;

  IF v_caller_role = 'brand_admin' THEN
    IF p_brand_id IS DISTINCT FROM v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to create a user for another brand';
    END IF;
    IF p_brand_id IS NULL AND p_role = 'platform_admin' THEN
      RAISE EXCEPTION 'brand_admin cannot create platform_admin';
    END IF;
  END IF;

  BEGIN
    SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END IF;

  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_target_user_id) THEN
    RAISE EXCEPTION 'Admin user with email % already exists', p_email;
  END IF;

  -- Get caller email for audit log
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO admin_users (
    user_id, role, brand_id,
    can_manage_products, can_manage_stops, can_manage_orders, can_manage_pickup,
    can_manage_messages, can_manage_refunds, can_manage_users, can_manage_water_log,
    can_manage_reports, active
  ) VALUES (
    v_target_user_id, p_role, p_brand_id,
    COALESCE((p_flags->>'can_manage_products')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_stops')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_orders')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_pickup')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_messages')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_refunds')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_users')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_water_log')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_reports')::BOOLEAN, false),
    true
  )
  RETURNING id INTO v_new_id;

  -- Audit log: record the creation
  PERFORM log_admin_action(jsonb_build_object(
    'action_type', 'create',
    'admin_id', auth.uid(),
    'admin_email', v_admin_email,
    'affected_user_id', v_target_user_id,
    'brand_id', p_brand_id,
    'details', jsonb_build_object('new_role', p_role)
  ));

  RETURN QUERY
  SELECT
    au.id, au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      (au.raw_user_meta_data->>'full_name')::TEXT,
      u.email
    ) AS display_name,
    u.email, au.role::TEXT, au.brand_id, au.active, au.created_at
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.id = v_new_id;
END;
$$;

-- Update delete_admin_user to also log
CREATE OR REPLACE FUNCTION delete_admin_user(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_user_id UUID;
  v_admin_email TEXT;
  v_target_brand_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM admin_users WHERE user_id = auth.uid();
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  SELECT user_id, brand_id INTO v_target_user_id, v_target_brand_id
  FROM admin_users WHERE id = p_id;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own admin account';
  END IF;

  IF v_caller_role = 'brand_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = p_id AND brand_id = (SELECT brand_id FROM admin_users WHERE user_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to delete this user';
    END IF;
  END IF;

  -- Audit log: record the deletion
  PERFORM log_admin_action(jsonb_build_object(
    'action_type', 'delete',
    'admin_id', auth.uid(),
    'admin_email', v_admin_email,
    'affected_user_id', v_target_user_id,
    'brand_id', v_target_brand_id,
    'details', jsonb_build_object('deleted_admin_id', p_id)
  ));

  DELETE FROM admin_users WHERE id = p_id;
  RETURN true;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────
-- 038_product_images.sql
-- ───────────────────────────────────────────
-- Migration 038: Product Images + Public Site Polish
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION

-- ── 1. Add image_url to products ───────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── 2. Update get_stop_products to include image_url ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('products', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ps.id,
        'product_id', ps.product_id,
        'name', p.name,
        'type', p.type,
        'price', p.price,
        'image_url', p.image_url
      )
    ), '[]'::JSONB)
    FROM product_stops ps
    JOIN products p ON p.id = ps.product_id
    WHERE ps.stop_id = p_stop_id
  ));
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────
-- 039_shipping_fulfillment.sql
-- ───────────────────────────────────────────
-- Migration 039: Shipping Fulfillment Fields
-- Idempotent: ADD COLUMN IF NOT EXISTS

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

COMMENT ON COLUMN orders.shipping_status IS 'pending | label_created | shipped | delivered | returned';
COMMENT ON COLUMN orders.tracking_number IS 'Carrier tracking number';

-- ───────────────────────────────────────────
-- 040_shipping_fulfillment_rpcs.sql
-- ───────────────────────────────────────────
-- Migration 040: Shipping Fulfillment RPCs
-- Idempotent: CREATE OR REPLACE FUNCTION

-- ── 1. update_shipping_order ──────────────────────────────────────────────────
-- Updates shipping_status and tracking_number for an order.
-- Requires can_manage_orders permission (checked in server action via getAdminUser).

CREATE OR REPLACE FUNCTION public.update_shipping_order(
  p_order_id         UUID,
  p_shipping_status  TEXT,
  p_tracking_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE orders SET
    shipping_status  = p_shipping_status,
    tracking_number  = p_tracking_number,
    updated_at       = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 2. get_shipping_orders ───────────────────────────────────────────────────
-- Returns orders that contain at least one shipping-line item.
-- Filtered by brand_id when p_brand_id is provided.

CREATE OR REPLACE FUNCTION public.get_shipping_orders(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'customer_name', o.customer_name,
      'customer_email', o.customer_email,
      'customer_phone', o.customer_phone,
      'status', o.status,
      'subtotal', o.subtotal,
      'shipping_status', o.shipping_status,
      'tracking_number', o.tracking_number,
      'created_at', o.created_at,
      'brand_id', o.brand_id,
      'order_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'price', oi.price,
          'fulfillment', oi.fulfillment,
          'products', jsonb_build_object('name', p.name)
        ))
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND oi.fulfillment = 'shipping'
      ), '[]'::JSONB)
    )
  )
  INTO v_result
  FROM orders o
  WHERE o.id IN (
    SELECT DISTINCT oi.order_id
    FROM order_items oi
    WHERE oi.fulfillment = 'shipping'
  )
  AND (
    p_brand_id IS NULL
    OR o.brand_id = p_brand_id
  )
  ORDER BY o.created_at DESC;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────
-- 041_payment_settings.sql
-- ───────────────────────────────────────────
-- Migration 041: Payment Settings
-- Creates payment_settings table and RPCs for provider configuration.

-- ── 1. payment_settings table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id                  UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  provider                  TEXT,                                          -- stripe | square | manual
  stripe_publishable_key    TEXT,
  stripe_secret_key         TEXT,
  square_access_token      TEXT,
  square_location_id       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand admin can read payment_settings" ON public.payment_settings;
CREATE POLICY "Brand admin can read payment_settings"
  ON public.payment_settings FOR SELECT TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'brand_admin'
    )
  );

DROP POLICY IF EXISTS "Platform admin can read payment_settings" ON public.payment_settings;
CREATE POLICY "Platform admin can read payment_settings"
  ON public.payment_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'platform_admin'
    )
  );

-- Writes go through SECURITY DEFINER helpers only.

-- ── 3. get_payment_settings ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_payment_settings(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'provider', provider,
    'stripe_publishable_key', stripe_publishable_key,
    'stripe_secret_key', stripe_secret_key,
    'square_access_token', square_access_token,
    'square_location_id', square_location_id,
    'updated_at', updated_at::TEXT
  ) INTO v_result
  FROM payment_settings
  WHERE brand_id = p_brand_id;

  RETURN v_result;
END;
$$;

-- ── 4. upsert_payment_settings ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_payment_settings(
  p_brand_id              UUID,
  p_provider              TEXT,
  p_stripe_publishable_key TEXT DEFAULT NULL,
  p_stripe_secret_key     TEXT DEFAULT NULL,
  p_square_access_token   TEXT DEFAULT NULL,
  p_square_location_id    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_settings (
    brand_id, provider,
    stripe_publishable_key, stripe_secret_key,
    square_access_token, square_location_id
  )
  VALUES (
    p_brand_id, p_provider,
    p_stripe_publishable_key, p_stripe_secret_key,
    p_square_access_token, p_square_location_id
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    provider                  = EXCLUDED.provider,
    stripe_publishable_key   = EXCLUDED.stripe_publishable_key,
    stripe_secret_key        = EXCLUDED.stripe_secret_key,
    square_access_token      = EXCLUDED.square_access_token,
    square_location_id       = EXCLUDED.square_location_id,
    updated_at               = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────
-- 042_product_import_rpc.sql
-- ───────────────────────────────────────────
-- Migration 042: Product Import RPC + upsert_product
-- Idempotent: CREATE OR REPLACE FUNCTION

-- ── 1. upsert_product ─────────────────────────────────────────────────────────
-- Upserts a single product by name (within brand). Returns the product id.
-- Used by the CSV import tool to create or update products in bulk.

CREATE OR REPLACE FUNCTION public.upsert_product(
  p_brand_id    UUID,
  p_name        TEXT,
  p_price       NUMERIC,
  p_type        TEXT,
  p_description TEXT DEFAULT '',
  p_active      BOOLEAN DEFAULT true,
  p_image_url   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_is_update  BOOLEAN := false;
BEGIN
  -- Check if product with same name exists in this brand
  SELECT id INTO v_product_id
  FROM products
  WHERE brand_id = p_brand_id AND name = p_name
  LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    -- Update existing
    UPDATE products SET
      name        = p_name,
      description = p_description,
      price       = p_price,
      type        = p_type,
      active      = p_active,
      image_url   = COALESCE(p_image_url, image_url),
      updated_at  = now()
    WHERE id = v_product_id
    RETURNING id INTO v_product_id;
    v_is_update := true;
  ELSE
    -- Insert new
    INSERT INTO products (brand_id, name, description, price, type, active, image_url)
    VALUES (p_brand_id, p_name, p_description, p_price, p_type, p_active, p_image_url)
    RETURNING id INTO v_product_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_product_id,
    'is_update', v_is_update,
    'name', p_name
  );
END;
$$;

-- ── 2. bulk_upsert_products ──────────────────────────────────────────────────
-- Takes an array of product records and upserts them all within a brand.
-- Returns a summary: { created, updated, errors }.

CREATE OR REPLACE FUNCTION public.bulk_upsert_products(
  p_brand_id UUID,
  p_products JSONB  -- array of { name, description, price, type, active, image_url }
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry  JSONB;
  v_result JSONB := '{"created": 0, "updated": 0, "errors": []}'::JSONB;
  v_name   TEXT;
  v_desc   TEXT;
  v_price  NUMERIC;
  v_type   TEXT;
  v_active BOOLEAN;
  v_img    TEXT;
  v_was_new BOOLEAN;
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      v_name   := nullif(v_entry->>'name', '');
      v_desc   := coalesce(nullif(v_entry->>'description', ''), '');
      v_price  := nullif((v_entry->>'price')::TEXT, '')::NUMERIC;
      v_type   := nullif(v_entry->>'type', '');
      v_active := coalesce((v_entry->>'active')::BOOLEAN, true);
      v_img    := nullif(v_entry->>'image_url', '');

      IF v_name IS NULL OR v_name = '' THEN
        RAISE EXCEPTION 'Product name is required';
      END IF;

      IF v_price IS NULL OR v_price < 0 THEN
        RAISE EXCEPTION 'Invalid price for product: %', v_name;
      END IF;

      IF v_type NOT IN ('Pickup', 'Shipping', 'Pickup & Shipping') THEN
        RAISE EXCEPTION 'Invalid type for product: %. Must be Pickup, Shipping, or Pickup & Shipping', v_name;
      END IF;

      v_was_new := NOT EXISTS (
        SELECT 1 FROM products WHERE brand_id = p_brand_id AND name = v_name
      );

      PERFORM upsert_product(p_brand_id, v_name, v_desc, v_price, v_type, v_active, v_img);

      IF v_was_new THEN
        v_result := jsonb_set(v_result, '{created}',
          to_jsonb((v_result->>'created')::INTEGER + 1));
      ELSE
        v_result := jsonb_set(v_result, '{updated}',
          to_jsonb((v_result->>'updated')::INTEGER + 1));
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_set(
        v_result, '{errors}',
        v_result->'errors' || jsonb_build_array(
          jsonb_build_object('product', v_name, 'error', SQLERRM)
        )
      );
    END;
  END LOOP;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';

