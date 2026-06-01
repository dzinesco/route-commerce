-- Migration 050: Wholesale Online Payment
-- - Adds checkout_session_id and payment_intent_id to wholesale_orders
-- - Adds record_wholesale_payment RPC for Stripe webhook to call

BEGIN;

-- ── 1. Add Stripe payment tracking columns ───────────────────────────────────
ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- ── 2. RPC: Record a Stripe payment against a wholesale order ─────────────────
DROP FUNCTION IF EXISTS public.record_wholesale_payment(UUID, NUMERIC, TEXT);
CREATE OR REPLACE FUNCTION public.record_wholesale_payment(
  p_order_id           UUID DEFAULT NULL,
  p_amount             NUMERIC DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_new_paid NUMERIC(10,2);
BEGIN
  -- Fetch current order state
  SELECT id, subtotal, deposit_paid, deposit_required, balance_due
  INTO v_order
  FROM wholesale_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Compute new deposit_paid before the update so balance_due uses the correct value
  v_new_paid := v_order.deposit_paid + p_amount;

  -- Record the payment in the deposits table
  INSERT INTO wholesale_deposits (wholesale_order_id, amount, payment_method, reference, recorded_by)
  VALUES (
    p_order_id,
    p_amount,
    'stripe',
    p_stripe_payment_intent_id,
    auth.uid()
  );

  -- Update order
  UPDATE wholesale_orders
  SET
    deposit_paid      = v_new_paid,
    balance_due       = GREATEST(subtotal - v_new_paid, 0),
    payment_status    = CASE
      WHEN subtotal - v_new_paid <= 0 THEN 'paid'
      ELSE 'partial'
    END,
    stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
    updated_at        = now()
  WHERE id = p_order_id;

  -- Advance status from awaiting_deposit if deposit now covers requirement
  UPDATE wholesale_orders
  SET status = 'pending'
  WHERE id = p_order_id
    AND status = 'awaiting_deposit'
    AND v_new_paid >= deposit_required;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance_due', GREATEST(v_order.subtotal - v_new_paid, 0)
  );
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
