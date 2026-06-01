-- Migration 052: Credit Limit Enforcement
-- Blocks wholesale orders that would exceed the customer's credit limit.

BEGIN;

-- ── Update create_wholesale_order to enforce credit limits ───────────────────────
-- Adds: credit_limit check, outstanding balance calculation, rejection if exceeded
DROP FUNCTION IF EXISTS public.create_wholesale_order(
  UUID, UUID, DATE, JSONB, INTEGER, TEXT
);

CREATE OR REPLACE FUNCTION public.create_wholesale_order(
  p_brand_id               UUID DEFAULT NULL,
  p_customer_id            UUID DEFAULT NULL,
  p_anticipated_pickup_date DATE DEFAULT NULL,
  p_items                  JSONB DEFAULT '[]'::JSONB,
  p_deposit_percentage     INTEGER DEFAULT NULL,
  p_notes                  TEXT DEFAULT NULL
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
BEGIN
  -- Resolve customer: credit limit + deposit rules
  SELECT
    credit_limit,
    deposits_enabled,
    deposit_threshold,
    deposit_percentage
  INTO v_customer
  FROM wholesale_customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Calculate subtotal
  v_subtotal := COALESCE(
    (SELECT SUM(
      ((item->>'quantity')::NUMERIC) * ((item->>'unit_price')::NUMERIC)
     ) FROM jsonb_array_elements(p_items) AS item),
    0
  );

  -- Credit limit enforcement: reject if order would exceed limit
  IF v_customer.credit_limit > 0 THEN
    SELECT COALESCE(SUM(balance_due), 0) INTO v_outstanding
    FROM wholesale_orders
    WHERE customer_id = p_customer_id
      AND status != 'fulfilled';

    IF v_outstanding + v_subtotal > v_customer.credit_limit THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Order exceeds available credit. Please reduce the order size or pay outstanding balance.',
        'credit_limit', v_customer.credit_limit,
        'outstanding_balance', v_outstanding,
        'order_total', v_subtotal
      );
    END IF;
  END IF;

  -- Generate TC-XXXXXX invoice number using RANDOM()
  v_inv_number := 'TC-' || LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
  -- Generate a 32-char hex invoice token using md5 of random + timestamp
  v_inv_token := md5(random()::text || clock_timestamp()::text || now()::text || p_brand_id::text);

  -- Determine if deposit required
  IF v_customer.deposits_enabled THEN
    IF v_customer.deposit_threshold IS NULL OR v_subtotal >= v_customer.deposit_threshold THEN
      v_dep_required := ROUND(v_subtotal * COALESCE(v_customer.deposit_percentage, 0) / 100.0, 2);
    END IF;
  END IF;

  v_status := CASE WHEN v_dep_required > 0 THEN 'awaiting_deposit' ELSE 'pending' END;

  INSERT INTO wholesale_orders (
    brand_id, customer_id, status, anticipated_pickup_date,
    subtotal, deposit_required, deposit_paid, balance_due,
    deposit_percentage, internal_notes, invoice_number, invoice_token
  ) VALUES (
    p_brand_id, p_customer_id, v_status, p_anticipated_pickup_date,
    v_subtotal, v_dep_required, 0, v_subtotal,
    p_deposit_percentage, p_notes,
    v_inv_number, v_inv_token
  ) RETURNING id INTO v_order_id;

  -- Insert line items
  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, unit_price, line_total)
    SELECT
      v_order_id,
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
    'subtotal', v_subtotal
  );
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
