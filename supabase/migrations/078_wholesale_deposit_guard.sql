-- Migration 078: Over-deposit guard on wholesale deposits
-- Prevents recording a deposit that exceeds the remaining balance_due

CREATE OR REPLACE FUNCTION public.record_wholesale_deposit(
  p_order_id    UUID DEFAULT NULL,
  p_amount      NUMERIC DEFAULT NULL,
  p_method      TEXT DEFAULT 'cash',
  p_reference   TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_paid    NUMERIC(10,2);
  v_balance_due NUMERIC(10,2);
BEGIN
  -- Guard: amount must be positive
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit amount must be greater than zero.');
  END IF;

  -- Guard: cannot exceed remaining balance_due
  SELECT balance_due INTO v_balance_due
  FROM wholesale_orders
  WHERE id = p_order_id;

  IF v_balance_due IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;

  IF p_amount > v_balance_due THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deposit of $' || p_amount::TEXT || ' exceeds the remaining balance of $' || v_balance_due::TEXT || '.'
    );
  END IF;

  -- Compute new deposit_paid
  SELECT deposit_paid + p_amount INTO v_new_paid
  FROM wholesale_orders
  WHERE id = p_order_id;

  UPDATE wholesale_orders
  SET
    deposit_paid = v_new_paid,
    balance_due   = subtotal - v_new_paid,
    updated_at    = now()
  WHERE id = p_order_id;

  INSERT INTO wholesale_deposits (wholesale_order_id, amount, payment_method, reference, recorded_by)
  VALUES (p_order_id, p_amount, p_method, p_reference, p_recorded_by);

  -- Advance to pending once deposit covers requirement
  UPDATE wholesale_orders
  SET status = 'pending'
  WHERE id = p_order_id
    AND v_new_paid >= deposit_required
    AND status = 'awaiting_deposit';

  RETURN jsonb_build_object('success', true);
END;
$$;
