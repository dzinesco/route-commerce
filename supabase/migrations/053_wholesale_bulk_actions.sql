-- Migration 053: Wholesale Bulk Actions
-- Bulk fulfill and bulk deposit record RPCs for admin order management.

BEGIN;

-- ── Bulk fulfill: mark multiple orders as fulfilled in one call ─────────────────
DROP FUNCTION IF EXISTS public.bulk_fulfill_wholesale_orders(UUID[], UUID);
CREATE OR REPLACE FUNCTION public.bulk_fulfill_wholesale_orders(
  p_order_ids UUID[] DEFAULT NULL,
  p_by        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE wholesale_orders
  SET
    fulfillment_status = 'fulfilled',
    payment_status    = CASE WHEN balance_due <= 0 THEN 'paid' ELSE payment_status END,
    status            = 'fulfilled',
    fulfilled_at      = now(),
    fulfilled_by      = p_by,
    updated_at        = now()
  WHERE id = ANY(p_order_ids)
    AND fulfillment_status != 'fulfilled';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

-- ── Bulk record deposit: record a deposit on multiple orders ─────────────────────
DROP FUNCTION IF EXISTS public.bulk_record_wholesale_deposit(UUID[], NUMERIC, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.bulk_record_wholesale_deposit(
  p_order_ids  UUID[]   DEFAULT NULL,
  p_amount     NUMERIC  DEFAULT NULL,
  p_method     TEXT     DEFAULT 'cash',
  p_reference  TEXT     DEFAULT NULL,
  p_recorded_by UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_new_paid NUMERIC(10,2);
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT id, subtotal, deposit_paid, deposit_required, balance_due
    FROM wholesale_orders
    WHERE id = ANY(p_order_ids)
      AND status != 'fulfilled'
  LOOP
    -- Compute new deposit_paid before the update so balance_due uses the correct value
    v_new_paid := v_order.deposit_paid + p_amount;

    -- Record deposit
    INSERT INTO wholesale_deposits (wholesale_order_id, amount, payment_method, reference, recorded_by)
    VALUES (v_order.id, p_amount, p_method, p_reference, p_recorded_by);

    -- Update order
    UPDATE wholesale_orders
    SET
      deposit_paid   = v_new_paid,
      balance_due   = GREATEST(subtotal - v_new_paid, 0),
      payment_status = CASE
        WHEN subtotal - v_new_paid <= 0 THEN 'paid'
        ELSE payment_status
      END,
      updated_at    = now()
    WHERE id = v_order.id;

    -- Advance from awaiting_deposit if deposit now covers requirement
    UPDATE wholesale_orders
    SET status = 'pending'
    WHERE id = v_order.id
      AND status = 'awaiting_deposit'
      AND v_new_paid >= deposit_required;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
