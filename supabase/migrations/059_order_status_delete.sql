-- Migration 059: Order status update + delete RPCs
-- Needed by the redesigned Actions column dropdown in WholesaleClient.tsx

BEGIN;

-- ── update_wholesale_order_status ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_wholesale_order_status(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.update_wholesale_order_status(
  p_order_id UUID,
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, status INTO v_order FROM wholesale_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status = 'fulfilled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change status of a fulfilled order');
  END IF;

  UPDATE wholesale_orders
  SET status = p_status, updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── delete_wholesale_order ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_wholesale_order(UUID);
CREATE OR REPLACE FUNCTION public.delete_wholesale_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, status INTO v_order FROM wholesale_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status = 'fulfilled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete a fulfilled order');
  END IF;

  DELETE FROM wholesale_order_items WHERE wholesale_order_id = p_order_id;
  DELETE FROM wholesale_notifications WHERE order_id = p_order_id;
  DELETE FROM wholesale_orders WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
