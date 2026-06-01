-- =============================================================================
-- Communication Center V1.1 — Contacts + Import Foundation
-- Fully idempotent: safe to re-run after partial failure
-- Additive over V1 (migration 016):
--   - Adds communication_contacts table
--   - Adds DB trigger to auto-create contacts from orders
--   - Adds new RPCs for contact CRUD, import, and opt-out
--   - Rewrites preview_campaign_audience to use communication_contacts as primary
--   - Updates send_campaign to resolve through communication_contacts
--   - Updates opt_out_customer to also set unsubscribed_at on contacts
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Table ────────────────────────────────────────────────────────────────────
-- Uses CREATE TABLE IF NOT EXISTS so this is safe to re-run — no data loss.

CREATE TABLE IF NOT EXISTS public.communication_contacts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id          UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  email             TEXT,
  phone             TEXT,
  first_name        TEXT,
  last_name         TEXT,
  full_name         TEXT,
  source            TEXT        NOT NULL,  -- 'order' | 'import' | 'manual' | 'admin'
  external_id       TEXT,
  customer_id       UUID,
  email_opt_in      BOOLEAN     NOT NULL DEFAULT true,
  sms_opt_in        BOOLEAN     NOT NULL DEFAULT false,
  email_opt_in_at   TIMESTAMPTZ,
  sms_opt_in_at     TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  tags              TEXT[]      DEFAULT '{}',
  metadata          JSONB       DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_has_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_brand_email_unique
  ON public.communication_contacts(brand_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_brand_phone_unique
  ON public.communication_contacts(brand_id, phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_contacts_brand
  ON public.communication_contacts(brand_id);

CREATE INDEX IF NOT EXISTS idx_communication_contacts_customer
  ON public.communication_contacts(customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_contacts_unsubscribed
  ON public.communication_contacts(brand_id, unsubscribed_at)
  WHERE unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_communication_contacts_source
  ON public.communication_contacts(brand_id, source);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.communication_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admin can read communication_contacts"
  ON public.communication_contacts;
CREATE POLICY "Platform admin can read communication_contacts"
  ON public.communication_contacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));

DROP POLICY IF EXISTS "Brand admin can read own brand communication_contacts"
  ON public.communication_contacts;
CREATE POLICY "Brand admin can read own brand communication_contacts"
  ON public.communication_contacts FOR SELECT TO authenticated
  USING (brand_id IN (
    SELECT brand_id FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'brand_admin'
  ));

-- ── SECURITY DEFINER RPCs ────────────────────────────────────────────────────

-- 1. Trigger function for auto-creating contact from order
-- PostgreSQL trigger functions MUST use RETURNS TRIGGER and access NEW/OLD directly.
DROP FUNCTION IF EXISTS public.upsert_contact_from_order();
CREATE OR REPLACE FUNCTION public.upsert_contact_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- Skip if no email (can't upsert without a key)
  IF NEW.customer_email IS NULL OR NEW.customer_email = '' THEN
    RETURN NEW;
  END IF;

  -- Resolve brand_id from the stop
  SELECT brand_id INTO v_brand_id FROM public.stops WHERE id = NEW.stop_id;
  IF NOT FOUND THEN
    RETURN NEW;  -- stop not found; skip silently
  END IF;

  INSERT INTO public.communication_contacts
    (brand_id, email, phone, full_name, source, customer_id, email_opt_in, metadata)
  VALUES (
    v_brand_id,
    NEW.customer_email,
    NEW.customer_phone,
    NEW.customer_name,
    'order',
    NEW.customer_id,
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
  -- NOTE: email_opt_in, unsubscribed_at, sms_opt_in are intentionally NOT
  -- updated here — we preserve the existing opt-out status.

  RETURN NEW;
END;
$$;

-- 2. Trigger on orders INSERT
-- Trigger functions receive NEW implicitly; no arguments after func name.
DROP TRIGGER IF EXISTS trg_create_contact_from_order ON public.orders;
CREATE TRIGGER trg_create_contact_from_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_contact_from_order();

-- 3. upsert_communication_contact (general upsert by email or phone)
DROP FUNCTION IF EXISTS public.upsert_communication_contact(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT[], JSONB
);
CREATE OR REPLACE FUNCTION public.upsert_communication_contact(
  p_id           UUID,
  p_brand_id     UUID,
  p_email        TEXT,
  p_phone        TEXT,
  p_first_name   TEXT,
  p_last_name    TEXT,
  p_full_name    TEXT,
  p_source       TEXT,
  p_external_id  TEXT,
  p_customer_id  UUID,
  p_email_opt_in BOOLEAN,
  p_sms_opt_in   BOOLEAN,
  p_tags         TEXT[],
  p_metadata     JSONB
)
RETURNS communication_contacts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result communication_contacts;
  v_id     UUID;
BEGIN
  v_id := coalesce(p_id, uuid_generate_v4());

  IF p_email IS NOT NULL AND p_email != '' THEN
    INSERT INTO public.communication_contacts
      (id, brand_id, email, phone, first_name, last_name, full_name, source,
       external_id, customer_id, email_opt_in, sms_opt_in, tags, metadata,
       email_opt_in_at, sms_opt_in_at)
    VALUES
      (v_id, p_brand_id, p_email, p_phone, p_first_name, p_last_name,
       p_full_name, p_source, p_external_id, p_customer_id,
       coalesce(p_email_opt_in, true), coalesce(p_sms_opt_in, false),
       coalesce(p_tags, '{}'), coalesce(p_metadata, '{}'),
       CASE WHEN p_email_opt_in = true  THEN now() ELSE NULL END,
       CASE WHEN p_sms_opt_in  = true  THEN now() ELSE NULL END)
    ON CONFLICT (brand_id, email) WHERE email IS NOT NULL DO UPDATE SET
      phone         = COALESCE(EXCLUDED.phone, communication_contacts.phone),
      first_name    = COALESCE(EXCLUDED.first_name, communication_contacts.first_name),
      last_name     = COALESCE(EXCLUDED.last_name, communication_contacts.last_name),
      full_name     = COALESCE(EXCLUDED.full_name, communication_contacts.full_name),
      source        = COALESCE(EXCLUDED.source, communication_contacts.source),
      external_id   = COALESCE(EXCLUDED.external_id, communication_contacts.external_id),
      customer_id   = COALESCE(EXCLUDED.customer_id, communication_contacts.customer_id),
      email_opt_in = CASE
        WHEN communication_contacts.unsubscribed_at IS NOT NULL
          THEN communication_contacts.email_opt_in
        ELSE COALESCE(EXCLUDED.email_opt_in, communication_contacts.email_opt_in)
      END,
      sms_opt_in   = CASE
        WHEN communication_contacts.unsubscribed_at IS NOT NULL
          THEN communication_contacts.sms_opt_in
        ELSE COALESCE(EXCLUDED.sms_opt_in, communication_contacts.sms_opt_in)
      END,
      tags          = COALESCE(EXCLUDED.tags, communication_contacts.tags),
      metadata      = communication_contacts.metadata || COALESCE(EXCLUDED.metadata, '{}'),
      updated_at    = now()
    RETURNING * INTO v_result;

  ELSIF p_phone IS NOT NULL AND p_phone != '' THEN
    INSERT INTO public.communication_contacts
      (id, brand_id, email, phone, first_name, last_name, full_name, source,
       external_id, customer_id, email_opt_in, sms_opt_in, tags, metadata,
       email_opt_in_at, sms_opt_in_at)
    VALUES
      (v_id, p_brand_id, NULL, p_phone, p_first_name, p_last_name,
       p_full_name, p_source, p_external_id, p_customer_id,
       coalesce(p_email_opt_in, true), coalesce(p_sms_opt_in, false),
       coalesce(p_tags, '{}'), coalesce(p_metadata, '{}'),
       CASE WHEN p_email_opt_in = true  THEN now() ELSE NULL END,
       CASE WHEN p_sms_opt_in  = true  THEN now() ELSE NULL END)
    ON CONFLICT (brand_id, phone) WHERE phone IS NOT NULL DO UPDATE SET
      email        = COALESCE(EXCLUDED.email, communication_contacts.email),
      first_name   = COALESCE(EXCLUDED.first_name, communication_contacts.first_name),
      last_name    = COALESCE(EXCLUDED.last_name, communication_contacts.last_name),
      full_name    = COALESCE(EXCLUDED.full_name, communication_contacts.full_name),
      source       = COALESCE(EXCLUDED.source, communication_contacts.source),
      external_id  = COALESCE(EXCLUDED.external_id, communication_contacts.external_id),
      customer_id  = COALESCE(EXCLUDED.customer_id, communication_contacts.customer_id),
      email_opt_in = CASE
        WHEN communication_contacts.unsubscribed_at IS NOT NULL
          THEN communication_contacts.email_opt_in
        ELSE COALESCE(EXCLUDED.email_opt_in, communication_contacts.email_opt_in)
      END,
      sms_opt_in  = CASE
        WHEN communication_contacts.unsubscribed_at IS NOT NULL
          THEN communication_contacts.sms_opt_in
        ELSE COALESCE(EXCLUDED.sms_opt_in, communication_contacts.sms_opt_in)
      END,
      tags         = COALESCE(EXCLUDED.tags, communication_contacts.tags),
      metadata     = communication_contacts.metadata || COALESCE(EXCLUDED.metadata, '{}'),
      updated_at   = now()
    RETURNING * INTO v_result;
  ELSE
    RETURN NULL;
  END IF;

  RETURN v_result;
END;
$$;

-- 4. get_communication_contacts (paginated list with search)
DROP FUNCTION IF EXISTS public.get_communication_contacts(UUID, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_communication_contacts(
  p_brand_id  UUID,
  p_search    TEXT DEFAULT NULL,
  p_source    TEXT DEFAULT NULL,
  p_limit     INTEGER DEFAULT 100,
  p_offset    INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_contacts JSONB;
  v_total    INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.communication_contacts c
  WHERE (p_brand_id IS NULL OR c.brand_id = p_brand_id)
    AND (p_source IS NULL OR c.source = p_source)
    AND (
      p_search IS NULL
      OR c.email ILIKE '%' || p_search || '%'
      OR c.full_name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
    );

  SELECT COALESCE(jsonb_agg(c ORDER BY c.created_at DESC), '[]'::JSONB) INTO v_contacts
  FROM (
    SELECT c.*
    FROM public.communication_contacts c
    WHERE (p_brand_id IS NULL OR c.brand_id = p_brand_id)
      AND (p_source IS NULL OR c.source = p_source)
      AND (
        p_search IS NULL
        OR c.email ILIKE '%' || p_search || '%'
        OR c.full_name ILIKE '%' || p_search || '%'
        OR c.phone ILIKE '%' || p_search || '%'
      )
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) c;

  RETURN jsonb_build_object(
    'contacts', v_contacts,
    'total',    v_total,
    'limit',    p_limit,
    'offset',   p_offset
  );
END;
$$;

-- 5. import_communication_contacts_batch (bulk CSV upsert)
-- Returns: { created: n, updated: n, skipped: n, errors: [...] }
-- tags are stored as TEXT[]; CSV string "tag1;tag2" is split with string_to_array.
DROP FUNCTION IF EXISTS public.import_communication_contacts_batch(UUID, JSONB, BOOLEAN);
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
              metadata      = communication_contacts.metadata || jsonb_build_object(
                'imported_at', now()::TEXT
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
            jsonb_build_object('imported_at', now()::TEXT)
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

-- 6. opt_out_contact (unsubscribe by email — public-facing, no auth required)
DROP FUNCTION IF EXISTS public.opt_out_contact(TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.opt_out_contact(
  p_email    TEXT,
  p_brand_id UUID,
  p_method   TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_method = 'email' THEN
    UPDATE public.communication_contacts SET
      email_opt_in    = false,
      email_opt_in_at = now(),
      unsubscribed_at = now(),
      updated_at      = now()
    WHERE brand_id = p_brand_id AND email = p_email;
  ELSIF p_method = 'sms' THEN
    UPDATE public.communication_contacts SET
      sms_opt_in      = false,
      sms_opt_in_at   = now(),
      unsubscribed_at = now(),
      updated_at      = now()
    WHERE brand_id = p_brand_id AND (email = p_email OR phone = p_email);
  END IF;
END;
$$;

-- 7. delete_communication_contact
DROP FUNCTION IF EXISTS public.delete_communication_contact(UUID);
CREATE OR REPLACE FUNCTION public.delete_communication_contact(p_id UUID)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.communication_contacts WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- ── Rewrite preview_campaign_audience to use communication_contacts ───────────
-- Primary source: communication_contacts (opted-in, not unsubscribed)
-- Orders-based targeting still works but final recipient resolution is via contacts.

DROP FUNCTION IF EXISTS public.preview_campaign_audience(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.preview_campaign_audience(
  p_brand_id       UUID,
  p_audience_rules JSONB
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target     TEXT;
  v_stop_id   UUID;
  v_date_from TIMESTAMPTZ;
  v_date_to   TIMESTAMPTZ;
  v_city      TEXT;
  v_order_hist TEXT;
  v_days_back INTEGER;
  v_product_id UUID;
  v_count     INTEGER;
  v_contacts  JSONB;
BEGIN
  v_target := p_audience_rules->>'target';

  -- Stop-based targeting: find orders for stop+date range, resolve to contacts
  IF v_target = 'stop' THEN
    v_stop_id   := nullif(p_audience_rules->>'stop_id', '')::UUID;
    v_date_from := nullif(p_audience_rules->>'date_from', '')::TIMESTAMPTZ;
    v_date_to   := nullif(p_audience_rules->>'date_to', '')::TIMESTAMPTZ;

    SELECT COUNT(DISTINCT c.id),
           jsonb_agg(DISTINCT jsonb_build_object(
             'id', c.id, 'email', c.email, 'name', c.full_name,
             'phone', c.phone, 'source', c.source
           ) ORDER BY c.full_name)
    INTO v_count, v_contacts
    FROM (
      SELECT DISTINCT o.customer_email
      FROM orders o
      JOIN stops s ON s.id = o.stop_id
      WHERE s.brand_id = p_brand_id
        AND o.status NOT IN ('canceled')
        AND (v_stop_id IS NULL OR o.stop_id = v_stop_id)
        AND (v_date_from IS NULL OR o.created_at >= v_date_from)
        AND (v_date_to IS NULL OR o.created_at <= v_date_to)
        AND o.customer_email IS NOT NULL AND o.customer_email != ''
    ) o_emails
    JOIN communication_contacts c ON c.email = o_emails.customer_email
      AND c.brand_id = p_brand_id
      AND c.email_opt_in = true
      AND c.unsubscribed_at IS NULL;

  -- ZIP / city targeting (placeholder — ZIP requires customer_zip column in orders)
  ELSIF v_target = 'zip_code' THEN
    SELECT COUNT(*),
           jsonb_agg(jsonb_build_object(
             'id', c.id, 'email', c.email, 'name', c.full_name,
             'phone', c.phone, 'source', c.source
           ) ORDER BY c.full_name)
    INTO v_count, v_contacts
    FROM communication_contacts c
    WHERE c.brand_id = p_brand_id
      AND c.email_opt_in = true
      AND c.unsubscribed_at IS NULL;

  -- Customer history targeting
  ELSIF v_target = 'customer_history' THEN
    v_order_hist := p_audience_rules->>'order_history';
    v_days_back  := (p_audience_rules->>'days_back')::INTEGER;

    IF v_order_hist = 'first_order' THEN
      WITH first_order_emails AS (
        SELECT o.customer_email
        FROM orders o
        JOIN stops s ON s.id = o.stop_id
        WHERE s.brand_id = p_brand_id
          AND o.status NOT IN ('canceled')
          AND o.customer_email IS NOT NULL AND o.customer_email != ''
          AND (v_days_back IS NULL OR o.created_at >= now() - (v_days_back || ' days')::INTERVAL)
        GROUP BY o.customer_email
        HAVING COUNT(*) = 1
      )
      SELECT COUNT(*),
             jsonb_agg(jsonb_build_object(
               'id', c.id, 'email', c.email, 'name', c.full_name,
               'phone', c.phone, 'source', c.source
             ) ORDER BY c.full_name)
      INTO v_count, v_contacts
      FROM first_order_emails fe
      JOIN communication_contacts c ON c.email = fe.customer_email
        AND c.brand_id = p_brand_id
        AND c.email_opt_in = true
        AND c.unsubscribed_at IS NULL;

    ELSIF v_order_hist = 'repeat' THEN
      WITH repeat_emails AS (
        SELECT o.customer_email
        FROM orders o
        JOIN stops s ON s.id = o.stop_id
        WHERE s.brand_id = p_brand_id
          AND o.status NOT IN ('canceled')
          AND o.customer_email IS NOT NULL AND o.customer_email != ''
          AND (v_days_back IS NULL OR o.created_at >= now() - (v_days_back || ' days')::INTERVAL)
        GROUP BY o.customer_email
        HAVING COUNT(*) > 1
      )
      SELECT COUNT(*),
             jsonb_agg(jsonb_build_object(
               'id', c.id, 'email', c.email, 'name', c.full_name,
               'phone', c.phone, 'source', c.source
             ) ORDER BY c.full_name)
      INTO v_count, v_contacts
      FROM repeat_emails re
      JOIN communication_contacts c ON c.email = re.customer_email
        AND c.brand_id = p_brand_id
        AND c.email_opt_in = true
        AND c.unsubscribed_at IS NULL;

    ELSE
      WITH all_order_emails AS (
        SELECT DISTINCT o.customer_email
        FROM orders o
        JOIN stops s ON s.id = o.stop_id
        WHERE s.brand_id = p_brand_id
          AND o.status NOT IN ('canceled')
          AND o.customer_email IS NOT NULL AND o.customer_email != ''
          AND (v_days_back IS NULL OR o.created_at >= now() - (v_days_back || ' days')::INTERVAL)
      )
      SELECT COUNT(*),
             jsonb_agg(jsonb_build_object(
               'id', c.id, 'email', c.email, 'name', c.full_name,
               'phone', c.phone, 'source', c.source
             ) ORDER BY c.full_name)
      INTO v_count, v_contacts
      FROM all_order_emails aoe
      JOIN communication_contacts c ON c.email = aoe.customer_email
        AND c.brand_id = p_brand_id
        AND c.email_opt_in = true
        AND c.unsubscribed_at IS NULL;
    END IF;

  -- Product-based targeting
  ELSIF v_target = 'product' THEN
    v_product_id := nullif(p_audience_rules->>'product_id', '')::UUID;
    WITH product_order_emails AS (
      SELECT DISTINCT o.customer_email
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN stops s ON s.id = o.stop_id
      WHERE s.brand_id = p_brand_id
        AND o.status NOT IN ('canceled')
        AND (v_product_id IS NULL OR oi.product_id = v_product_id)
        AND o.customer_email IS NOT NULL AND o.customer_email != ''
    )
    SELECT COUNT(*),
           jsonb_agg(jsonb_build_object(
             'id', c.id, 'email', c.email, 'name', c.full_name,
             'phone', c.phone, 'source', c.source
           ) ORDER BY c.full_name)
    INTO v_count, v_contacts
    FROM product_order_emails poe
    JOIN communication_contacts c ON c.email = poe.customer_email
      AND c.brand_id = p_brand_id
      AND c.email_opt_in = true
      AND c.unsubscribed_at IS NULL;

  -- Explicit customer ID list
  ELSIF v_target = 'customer_ids' THEN
    SELECT COUNT(*),
           jsonb_agg(jsonb_build_object(
             'id', c.id, 'email', c.email, 'name', c.full_name,
             'phone', c.phone, 'source', c.source
           ) ORDER BY c.full_name)
    INTO v_count, v_contacts
    FROM communication_contacts c
    WHERE c.brand_id = p_brand_id
      AND c.email_opt_in = true
      AND c.unsubscribed_at IS NULL
      AND c.customer_id IN (
        SELECT jsonb_array_elements_text(p_audience_rules->'customer_ids')::UUID
      );

  -- all_customers: all opted-in, not-unsubscribed contacts
  ELSE
    SELECT COUNT(*),
           jsonb_agg(jsonb_build_object(
             'id', c.id, 'email', c.email, 'name', c.full_name,
             'phone', c.phone, 'source', c.source
           ) ORDER BY c.full_name)
    INTO v_count, v_contacts
    FROM communication_contacts c
    WHERE c.brand_id = p_brand_id
      AND c.email_opt_in = true
      AND c.unsubscribed_at IS NULL;
  END IF;

  -- Cap sample at 20
  SELECT jsonb_agg(x ORDER BY x->>'name') INTO v_contacts
  FROM (
    SELECT * FROM jsonb_array_elements(coalesce(v_contacts, '[]'::jsonb))
    LIMIT 20
  ) t(x);

  RETURN jsonb_build_object('count', v_count, 'sample_customers', v_contacts);
END;
$$;

-- ── Update send_campaign to use communication_contacts ──────────────────────

DROP FUNCTION IF EXISTS public.send_campaign(UUID);
CREATE OR REPLACE FUNCTION public.send_campaign(p_campaign_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign communication_campaigns;
  v_settings communication_settings;
  v_audience JSONB;
  v_entry    JSONB;
  v_entries  JSONB := '[]'::JSONB;
  v_count    INTEGER := 0;
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
      'brand_id',       v_campaign.brand_id,
      'campaign_id',    p_campaign_id,
      'customer_id',   nullif(v_entry->>'id', ''),
      'customer_email', v_entry->>'email',
      'delivery_method','email',
      'subject',        v_campaign.subject,
      'body_preview',   left(v_campaign.body_text, 500),
      'status',         'queued'
    ));
    v_count := v_count + 1;
  END LOOP;

  PERFORM log_communication_messages(v_entries);

  UPDATE communication_campaigns
    SET status = 'sent', sent_at = now(), updated_at = now()
    WHERE id = p_campaign_id;

  RETURN jsonb_build_object('success', true, 'messages_logged', v_count);
END;
$$;

-- ── Update opt_out_customer to also set unsubscribed_at on contacts ───────────

DROP FUNCTION IF EXISTS public.opt_out_customer(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.opt_out_customer(
  p_customer_id UUID,
  p_brand_id    UUID,
  p_method      TEXT
)
RETURNS customer_communication_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result customer_communication_preferences;
BEGIN
  INSERT INTO public.customer_communication_preferences
    (customer_id, brand_id, email_opt_in, sms_opt_in, email_opt_in_at, sms_opt_in_at)
  VALUES (
    p_customer_id, p_brand_id,
    CASE WHEN p_method = 'email' THEN false ELSE true END,
    CASE WHEN p_method = 'sms'   THEN false ELSE true END,
    CASE WHEN p_method = 'email' THEN now() ELSE NULL END,
    CASE WHEN p_method = 'sms'   THEN now() ELSE NULL END
  )
  ON CONFLICT (customer_id, brand_id) DO UPDATE SET
    email_opt_in    = CASE WHEN p_method = 'email' THEN false ELSE customer_communication_preferences.email_opt_in END,
    sms_opt_in      = CASE WHEN p_method = 'sms'   THEN false ELSE customer_communication_preferences.sms_opt_in END,
    email_opt_in_at = CASE WHEN p_method = 'email' THEN now() ELSE email_opt_in_at END,
    sms_opt_in_at   = CASE WHEN p_method = 'sms'   THEN now() ELSE sms_opt_in_at END,
    updated_at      = now()
  RETURNING * INTO v_result;

  -- Also set unsubscribed_at on communication_contacts
  IF p_method = 'email' THEN
    UPDATE public.communication_contacts SET
      email_opt_in    = false,
      email_opt_in_at = now(),
      unsubscribed_at = now(),
      updated_at      = now()
    WHERE customer_id = p_customer_id
      AND brand_id = p_brand_id
      AND unsubscribed_at IS NULL;
  ELSIF p_method = 'sms' THEN
    UPDATE public.communication_contacts SET
      sms_opt_in      = false,
      sms_opt_in_at   = now(),
      unsubscribed_at = now(),
      updated_at      = now()
    WHERE customer_id = p_customer_id
      AND brand_id = p_brand_id
      AND unsubscribed_at IS NULL;
  END IF;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';
