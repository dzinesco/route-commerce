-- 097: Extend create_order_with_items with tax fields
-- Adds p_tax_amount, p_tax_rate, p_tax_location params to the retail order RPC

BEGIN;

-- Get the current signature to understand the parameter list
-- create_order_with_items is in migrations 001, 021, 022
-- It currently accepts: p_idempotency_key, p_customer_name, p_customer_email,
-- p_customer_phone, p_stop_id, p_items

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_idempotency_key UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_stop_id UUID,
  p_items JSONB,
  p_tax_amount NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 0,
  p_tax_location TEXT DEFAULT NULL
) RETURNS JSONB
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

  IF p_stop_id IS NOT NULL AND (v_stop_active IS NULL OR v_stop_active IS FALSE) THEN
    RAISE EXCEPTION 'Stop not found or inactive';
  END IF;

  -- ── Validate products & build items list ───────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'id')::UUID;
    v_quantity := (v_item->>'quantity')::INT;
    v_fulfillment := COALESCE(v_item->>'fulfillment', 'pickup');

    SELECT active, brand_id, name, price
      INTO v_product_active, v_product_brand_id, v_product_name, v_product_price
    FROM products
    WHERE id = v_product_id;

    IF v_product_active IS FALSE THEN
      RAISE EXCEPTION 'Product % is not active', v_product_id;
    END IF;

    v_computed_total := v_computed_total + (v_product_price * v_quantity);

    v_order_items := v_order_items || jsonb_build_object(
      'product_id', v_product_id,
      'product_name', v_product_name,
      'quantity', v_quantity,
      'price', v_product_price,
      'fulfillment', v_fulfillment
    );
  END LOOP;

  -- ── Determine brand ────────────────────────────────────────
  -- Use stop's brand if stop_id set, otherwise require brand from products
  IF p_stop_id IS NOT NULL THEN
    -- brand from stop verified above
    NULL;
  ELSE
    -- shipping-only: brand must come from first product
    v_product_brand_id := v_product_brand_id; -- already selected in loop
  END IF;

  v_is_pickup := v_fulfillment = 'pickup';

  -- ── Create order ────────────────────────────────────────────
  INSERT INTO orders (
    idempotency_key, customer_name, customer_email, customer_phone,
    stop_id, subtotal, status,
    brand_id,
    -- Tax fields
    tax_amount, tax_rate, tax_location,
    pickup_complete
  ) VALUES (
    p_idempotency_key, p_customer_name, p_customer_email, p_customer_phone,
    p_stop_id, v_computed_total, 'pending',
    v_stop_brand_id,
    -- Tax fields
    p_tax_amount, p_tax_rate, p_tax_location,
    FALSE
  )
  RETURNING id INTO v_order_id;

  -- ── Insert order items ──────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'id')::UUID;
    v_quantity := (v_item->>'quantity')::INT;
    v_fulfillment := COALESCE(v_item->>'fulfillment', 'pickup');

    SELECT price INTO v_product_price FROM products WHERE id = v_product_id;

    INSERT INTO order_items (order_id, product_id, quantity, price, fulfillment)
    VALUES (v_order_id, v_product_id, v_quantity, v_product_price, v_fulfillment);
  END LOOP;

  -- ── Emit order_placed event ────────────────────────────────
  PERFORM pg_notify('order_placed', jsonb_build_object(
    'order_id', v_order_id,
    'brand_id', v_stop_brand_id,
    'customer_name', p_customer_name,
    'subtotal', v_computed_total,
    'fulfillment', CASE WHEN p_stop_id IS NOT NULL THEN 'pickup' ELSE 'ship' END
  )::TEXT);

  -- ── Return order ────────────────────────────────────────────
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

COMMIT;