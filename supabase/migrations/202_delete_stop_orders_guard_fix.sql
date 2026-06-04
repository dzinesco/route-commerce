-- Migration 202: Fix delete_stop RPC — orders table has no deleted_at column
--
-- The delete_stop RPC added in migration 075 guards against deleting a stop
-- that has active orders:
--
--   SELECT COUNT(*) INTO v_active_order_count
--   FROM orders o JOIN stops s ON o.stop_id = s.id
--   WHERE s.id = p_stop_id
--     AND o.pickup_complete = false
--     AND o.deleted_at IS NULL;     -- <-- column does not exist on orders
--
-- The orders table never got a deleted_at column, so the SELECT raises
-- "column o.deleted_at does not exist" and the RPC returns HTTP 400 from
-- PostgREST. Stop deletion has been silently broken since 075 landed.
--
-- Fix: drop the o.deleted_at IS NULL clause. The pickup_complete = false
-- guard is sufficient for now (no soft-deleted orders can exist).
-- If/when orders get a deleted_at column, re-add the clause.
--
-- This migration only touches the function. Schema is unchanged.

CREATE OR REPLACE FUNCTION public.delete_stop(p_stop_id UUID, p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop RECORD;
  v_active_order_count INT;
BEGIN
  -- Lock the stop row for update
  SELECT * INTO v_stop FROM stops WHERE id = p_stop_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Brand scoping: brand_admin can only delete their own stops
  IF p_brand_id IS NOT NULL AND v_stop.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  ELSIF p_brand_id IS NULL AND v_stop.brand_id IS NOT NULL THEN
    -- Caller didn't pass brand_id but stop has one — guard against platform admin accident
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Guard: refuse to delete a stop that still has active (un-picked-up) orders.
  -- Note: orders has no deleted_at column (hard delete pattern) so we only
  -- check pickup_complete. Re-add `AND o.deleted_at IS NULL` if/when orders
  -- grows a soft-delete column.
  SELECT COUNT(*) INTO v_active_order_count
  FROM orders o
  JOIN stops s ON o.stop_id = s.id
  WHERE s.id = p_stop_id
    AND o.pickup_complete = false;

  IF v_active_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete stop — it has ' || v_active_order_count || ' active order(s). Mark orders as picked up first.'
    );
  END IF;

  -- Soft delete
  UPDATE stops SET deleted_at = NOW() WHERE id = p_stop_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grants are inherited from 075; verify they're present (no-op if so).
GRANT EXECUTE ON FUNCTION public.delete_stop(UUID, UUID) TO anon, authenticated, service_role;
