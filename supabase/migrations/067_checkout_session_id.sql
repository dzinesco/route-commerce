-- Migration 067: Checkout idempotency for wholesale orders
-- Adds checkout_session_id UUID to wholesale_orders for safe retry/double-submit protection.
-- UNIQUE constraint (null-excluding) ensures each session maps to at most one order.
-- The create_wholesale_order RPC checks this key before inserting to prevent duplicates.

BEGIN;

ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS checkout_session_id UUID;

COMMENT ON COLUMN wholesale_orders.checkout_session_id IS
  'Set by submitWholesaleOrder at start of checkout. Prevents duplicate order creation from double-click, back-button, or network retry. UNIQUE WHERE NOT NULL.';

-- Fast lookup for idempotency checks in create_wholesale_order
CREATE UNIQUE INDEX IF NOT EXISTS idx_wholesale_orders_checkout_session_id
  ON wholesale_orders(checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

-- Update create_wholesale_order to accept + enforce checkout_session_id
DROP FUNCTION IF EXISTS public.create_wholesale_order(
  UUID, UUID, DATE, JSONB, INTEGER, TEXT
);
CREATE OR REPLACE FUNCTION public.create_wholesale_order(
  p_brand_id               UUID DEFAULT NULL,
  p_customer_id            UUID DEFAULT NULL,
  p_anticipated_pickup_date DATE DEFAULT NULL,
  p_items                  JSONB DEFAULT '[]'::JSONB,
  p_deposit_percentage     INTEGER DEFAULT NULL,
  p_notes                  TEXT DEFAULT NULL,
  p_checkout_session_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id       UUID;
  v_subtotal       NUMERIC(10,2);
  v_dep_required   NUMERIC(10,2) := 0;
  v_customer       RECORD;
  v_settings       RECORD;
  v_inv_number     TEXT;
  v_inv_token      TEXT;
  v_status         TEXT;
  v_outstanding    NUMERIC(10,2);
  v_existing_id    UUID;
BEGIN
  -- ── Idempotency guard ──────────────────────────────────────────────────────
  -- If a checkout_session_id was provided and an order already exists with
  -- that key, return the existing order instead of creating a duplicate.
  IF p_checkout_session_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM wholesale_orders
    WHERE checkout_session_id = p_checkout_session_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      SELECT jsonb_build_object(
        'success', true,
        'order_id', v_existing_id,
        'invoice_number', invoice_number,
        'status', status,
        'deposit_required', deposit_required,
        'subtotal', subtotal,
        'idempotent', true,
        'note', 'Order already exists — returning existing record'
      ) INTO v_existing_id
      FROM wholesale_orders
      WHERE id = v_existing_id;
      RETURN v_existing_id;
    END IF;
  END IF;

  -- ── 1. Resolve customer: credit_limit + deposit rules ──────────────────────
  SELECT credit_limit, deposits_enabled, deposit_threshold, deposit_percentage
  INTO v_customer
  FROM wholesale_customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- ── 2. Calculate subtotal ──────────────────────────────────────────────────
  v_subtotal := COALESCE(
    (SELECT SUM(
      ((item->>'quantity')::NUMERIC) * ((item->>'unit_price')::NUMERIC)
    )
    FROM jsonb_array_elements(p_items) AS item),
    0
  );

  -- ── 3. Credit limit enforcement ────────────────────────────────────────────
  IF v_customer.credit_limit > 0 THEN
    SELECT COALESCE(SUM(balance_due), 0) INTO v_outstanding
    FROM wholesale_orders
    WHERE customer_id = p_customer_id AND status != 'fulfilled';

    IF v_outstanding + v_subtotal > v_customer.credit_limit THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Order exceeds available credit',
        'credit_limit', v_customer.credit_limit,
        'outstanding_balance', v_outstanding,
        'order_total', v_subtotal
      );
    END IF;
  END IF;

  -- ── 4. Generate TC-XXXXXX invoice + md5 token ──────────────────────────────
  v_inv_number := 'TC-' || LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
  v_inv_token := md5(random()::text || clock_timestamp()::text || now()::text || p_brand_id::text);

  -- ── 5. Deposit logic ───────────────────────────────────────────────────────
  IF v_customer.deposits_enabled THEN
    IF v_customer.deposit_threshold IS NULL OR v_subtotal >= v_customer.deposit_threshold THEN
      v_dep_required := ROUND(v_subtotal * COALESCE(v_customer.deposit_percentage, 0) / 100.0, 2);
    END IF;
  END IF;

  v_status := CASE WHEN v_dep_required > 0 THEN 'awaiting_deposit' ELSE 'pending' END;

  -- ── 6. Insert order ─────────────────────────────────────────────────────────
  INSERT INTO wholesale_orders (
    brand_id, customer_id, status, anticipated_pickup_date,
    subtotal, deposit_required, deposit_paid, balance_due,
    deposit_percentage, internal_notes, invoice_number, invoice_token,
    checkout_session_id
  ) VALUES (
    p_brand_id, p_customer_id, v_status, p_anticipated_pickup_date,
    v_subtotal, v_dep_required, 0, v_subtotal,
    p_deposit_percentage, p_notes, v_inv_number, v_inv_token,
    p_checkout_session_id
  ) RETURNING id INTO v_order_id;

  -- ── 7. Insert line items ───────────────────────────────────────────────────
  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, unit_price, line_total)
    SELECT v_order_id,
      (item->>'product_id')::UUID,
      (item->>'quantity')::NUMERIC,
      (item->>'unit_price')::NUMERIC,
      ((item->>'quantity')::NUMERIC) * ((item->>'unit_price')::NUMERIC)
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'invoice_number', v_inv_number,
    'status', v_status,
    'deposit_required', v_dep_required,
    'subtotal', v_subtotal,
    'idempotent', false
  );
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';