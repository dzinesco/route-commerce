-- ============================================================
-- Checkout Hardening Migration
-- ============================================================
-- 1. Add idempotency_key column to orders (UUID, unique)
-- 2. Index on idempotency_key for fast idempotency checks
-- 3. RPC function for atomic order + order_items creation
-- 4. Returns JSONB — no post-checkout SELECT needed

-- 1. Idempotency key column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;

-- 1b. Add fulfillment column to order_items for mixed pickup/ship orders
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS fulfillment TEXT DEFAULT 'pickup';

-- 2. Index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);

-- 3. Atomic checkout RPC function
-- Validates stop, products, quantities, pickup eligibility
-- Computes subtotal server-side from current DB prices
-- Returns JSONB with order + items — caller never needs a separate SELECT
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_idempotency_key   UUID,
  p_customer_name     TEXT,
  p_customer_email    TEXT,
  p_customer_phone    TEXT,
  p_stop_id          UUID,
  p_items            JSONB  -- [{id: uuid, quantity: int, fulfillment: text}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id         UUID;
  v_item             JSONB;
  v_product_id       UUID;
  v_quantity         INT;
  v_fulfillment     TEXT;
  v_product_price    NUMERIC;
  v_computed_total   NUMERIC := 0;
  v_stop_active      BOOLEAN;
  v_stop_brand_id   UUID;
  v_stop_city       TEXT;
  v_stop_state      TEXT;
  v_stop_date       TEXT;
  v_stop_time       TEXT;
  v_stop_location   TEXT;
  v_product_active   BOOLEAN;
  v_product_brand_id UUID;
  v_product_name     TEXT;
  v_is_pickup       BOOLEAN;
  v_order           JSONB;
  v_order_items     JSONB := '[]'::JSONB;
BEGIN
  -- ── Idempotency guard ──────────────────────────────────────
  -- If this key was already used, return the existing order + items.
  -- Safe for retries: the order is real, the user just didn't see the success page.
  SELECT jsonb_build_object(
    'id', o.id,
    'customer_name', o.customer_name,
    'customer_email', o.customer_name,
    'customer_phone', o.customer_phone,
    'subtotal', o.subtotal,
    'status', o.status,
    'stop_id', o.stop_id,
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
  JOIN stops s ON o.stop_id = s.id
  WHERE o.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_order IS NOT NULL THEN
    RETURN v_order;
  END IF;

  -- ── Validate stop ──────────────────────────────────────────
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

  -- ── Validate items and compute subtotal ────────────────────
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

    IF v_product_brand_id != v_stop_brand_id THEN
      RAISE EXCEPTION 'Product % does not belong to the stop brand', v_product_id;
    END IF;

    IF NOT v_product_active THEN
      RAISE EXCEPTION 'Product is not active: %', v_product_id;
    END IF;

    IF v_quantity < 1 THEN
      RAISE EXCEPTION 'Quantity must be at least 1 for product: %', v_product_id;
    END IF;

    IF v_is_pickup THEN
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

  -- ── Create order ────────────────────────────────────────────
  INSERT INTO orders (
    idempotency_key, customer_name, customer_email, customer_phone,
    stop_id, subtotal, status
  ) VALUES (
    p_idempotency_key, p_customer_name, p_customer_email, p_customer_phone,
    p_stop_id, v_computed_total, 'pending'
  )
  RETURNING id INTO v_order_id;

  -- ── Insert order items and build return value ───────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id  := (v_item->>'id')::UUID;
    v_quantity    := (v_item->>'quantity')::INT;
    v_fulfillment := v_item->>'fulfillment';

    SELECT price, name INTO v_product_price, v_product_name FROM products WHERE id = v_product_id;

    INSERT INTO order_items (order_id, product_id, quantity, fulfillment, price)
    VALUES (v_order_id, v_product_id, v_quantity, v_fulfillment, v_product_price);

    -- Append to items array
    v_order_items := v_order_items || jsonb_build_object(
      'product_id', v_product_id,
      'product_name', v_product_name,
      'quantity', v_quantity,
      'price', v_product_price,
      'fulfillment', v_fulfillment
    );
  END LOOP;

  -- ── Build and return full order object ──────────────────────
  RETURN jsonb_build_object(
    'id', v_order_id,
    'customer_name', p_customer_name,
    'customer_email', p_customer_email,
    'customer_phone', p_customer_phone,
    'subtotal', v_computed_total,
    'status', 'pending',
    'stop_id', p_stop_id,
    'stop_city', v_stop_city,
    'stop_state', v_stop_state,
    'stop_date', v_stop_date,
    'stop_time', v_stop_time,
    'stop_location', v_stop_location,
    'items', v_order_items
  );
END;
$$;