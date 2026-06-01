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
