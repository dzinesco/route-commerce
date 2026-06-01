-- Migration 075: Soft-delete for stops + brand scoping enforcement
-- 1. Add deleted_at to stops
-- 2. Create delete_stop RPC with order guard
-- 3. Update RLS to filter deleted_at IS NULL

-- ── 1. Add deleted_at column ───────────────────────────────────────────────────
ALTER TABLE stops ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ── 2. delete_stop RPC ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_stop(p_stop_id UUID, p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop RECORD;
  v_active_order_count INT;
  v_result JSONB;
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

  -- Guard: check for active or future orders at this stop
  SELECT COUNT(*) INTO v_active_order_count
  FROM orders o
  JOIN stops s ON o.stop_id = s.id
  WHERE s.id = p_stop_id
    AND o.pickup_complete = false
    AND o.deleted_at IS NULL;

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

-- ── 3. Update RLS — add deleted_at IS NULL to brand_admin read policy ──────────
-- drops are re-created in the same block to avoid breaking the audit SQL
DROP POLICY IF EXISTS "brand_admin_read_stops" ON stops;
DROP POLICY IF EXISTS "platform_admin_read_stops" ON stops;

-- Platform admin sees all non-deleted stops
CREATE POLICY "platform_admin_read_stops" ON stops
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'platform_admin'
    )
  );

-- Brand admin / store_employee sees only their brand's non-deleted stops
CREATE POLICY "brand_admin_read_stops" ON stops
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role IN ('brand_admin', 'store_employee')
      AND au.brand_id = stops.brand_id
    )
  );
