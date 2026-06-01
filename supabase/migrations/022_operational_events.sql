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