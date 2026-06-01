-- Migration 069: Brand Scoping Phase 2 — RLS Fixes + RPC Validation
-- 1. Fix wholesale_order_items RLS — add brand check via JOIN
-- 2. Fix wholesale_deposits RLS — add brand check via JOIN
-- 3. Fix get_wholesale_orders/customers/products NULL handling (platform_admin = all)
-- 4. Add brand validation to update_shipping_order
-- 5. Add brand validation to water log mutating RPCs

BEGIN;

-- ── 1. Fix wholesale_order_items RLS ─────────────────────────────────────────
-- Current policy has no brand check. Add one via JOIN to wholesale_orders.
DROP POLICY IF EXISTS "brand_admin_manage_wholesale_order_items" ON wholesale_order_items;
ALTER TABLE wholesale_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_admin_manage_wholesale_order_items" ON wholesale_order_items
  FOR ALL USING (
    -- platform_admin can do anything
    current_setting('app.settings.role', true)::TEXT = 'platform_admin'
    OR (
      -- brand_admin must match the order's brand via JOIN
      current_setting('app.settings.role', true)::TEXT = 'brand_admin'
      AND EXISTS (
        SELECT 1 FROM wholesale_orders wo
        WHERE wo.id = wholesale_order_items.wholesale_order_id
          AND wo.brand_id = current_setting('app.settings.brand_id', true)::UUID
      )
    )
  );

-- ── 2. Fix wholesale_deposits RLS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "brand_admin_manage_wholesale_deposits" ON wholesale_deposits;
ALTER TABLE wholesale_deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_admin_manage_wholesale_deposits" ON wholesale_deposits
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT = 'platform_admin'
    OR (
      current_setting('app.settings.role', true)::TEXT = 'brand_admin'
      AND EXISTS (
        SELECT 1 FROM wholesale_orders wo
        WHERE wo.id = wholesale_deposits.wholesale_order_id
          AND wo.brand_id = current_setting('app.settings.brand_id', true)::UUID
      )
    )
  );

-- ── 3. Fix get_wholesale_orders NULL handling ────────────────────────────────
-- NULL brand_id should return ALL orders (platform_admin); set brand returns scoped.
CREATE OR REPLACE FUNCTION public.get_wholesale_orders(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at DESC) INTO v_result
  FROM (
    SELECT
      wo.id,
      wo.status,
      wo.fulfillment_status,
      wo.payment_status,
      wo.anticipated_pickup_date,
      wo.subtotal,
      wo.deposit_required,
      wo.deposit_paid,
      wo.balance_due,
      wo.invoice_number,
      wo.invoice_token,
      wo.checkout_session_id,
      wo.created_at,
      wo.updated_at,
      wo.fulfilled_at,
      wo.notes,
      wc.company_name,
      wc.contact_name,
      wc.email AS customer_email,
      wc.phone AS customer_phone,
      COALESCE(
        (SELECT jsonb_agg(
          CASE WHEN woi.id IS NOT NULL THEN
            jsonb_build_object(
              'id', woi.id,
              'product_name', wp.name,
              'quantity', woi.quantity,
              'unit_price', woi.unit_price,
              'line_total', woi.line_total
            )
          END
        )
        FROM wholesale_order_items woi
        LEFT JOIN wholesale_products wp ON woi.product_id = wp.id
        WHERE woi.wholesale_order_id = wo.id),
        '[]'::JSONB
      ) AS items
    FROM wholesale_orders wo
    JOIN wholesale_customers wc ON wo.customer_id = wc.id
    WHERE (
      -- NULL brand_id = platform_admin = all brands
      p_brand_id IS NULL
      OR wo.brand_id = p_brand_id
    )
    ORDER BY wo.created_at DESC
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 4. Fix get_wholesale_customers NULL handling ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_wholesale_customers(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.company_name ASC) INTO v_result
  FROM (
    SELECT
      id,
      user_id,
      company_name,
      contact_name,
      email,
      phone,
      account_status,
      role,
      brand_id,
      credit_limit,
      outstanding_balance,
      created_at,
      updated_at
    FROM wholesale_customers
    WHERE p_brand_id IS NULL OR brand_id = p_brand_id
    ORDER BY company_name ASC
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 5. Fix get_wholesale_products NULL handling ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_wholesale_products(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.name ASC) INTO v_result
  FROM (
    SELECT
      id,
      brand_id,
      name,
      description,
      unit_type,
      availability,
      qty_available,
      hp_sku,
      created_at,
      updated_at,
      price_tiers
    FROM wholesale_products
    WHERE p_brand_id IS NULL OR brand_id = p_brand_id
    ORDER BY name ASC
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 6. Add brand validation to update_shipping_order ─────────────────────────
CREATE OR REPLACE FUNCTION public.update_shipping_order(
  p_order_id       UUID,
  p_shipping_status TEXT,
  p_tracking_number TEXT DEFAULT NULL,
  p_brand_id       UUID DEFAULT NULL  -- NEW: for brand validation
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Fetch order and validate brand access
  SELECT id, brand_id INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Brand validation: brand_admin can only update orders for their brand
  IF p_brand_id IS NOT NULL AND v_order.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update this order');
  END IF;

  UPDATE orders SET
    shipping_status = p_shipping_status,
    tracking_number = COALESCE(p_tracking_number, tracking_number),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'shipping_status', p_shipping_status,
    'tracking_number', COALESCE(p_tracking_number, tracking_number)
  );
END;
$$;

-- ── 7. Add brand validation to water log mutating RPCs ──────────────────────

-- update_water_entry: add p_brand_id, validate
CREATE OR REPLACE FUNCTION public.update_water_entry(
  p_entry_id       UUID,
  p_measurement    NUMERIC,
  p_notes          TEXT DEFAULT NULL,
  p_unit           TEXT DEFAULT NULL,
  p_brand_id       UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT we.id, we.brand_id INTO v_entry
  FROM water_log_entries we
  WHERE we.id = p_entry_id AND we.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  -- Brand validation
  IF p_brand_id IS NOT NULL AND v_entry.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update this entry');
  END IF;

  UPDATE water_log_entries SET
    measurement = p_measurement,
    notes = COALESCE(p_notes, notes),
    unit = COALESCE(p_unit, unit),
    updated_at = now()
  WHERE id = p_entry_id;

  RETURN jsonb_build_object('success', true, 'entry_id', p_entry_id);
END;
$$;

-- delete_water_entry: add p_brand_id
CREATE OR REPLACE FUNCTION public.delete_water_entry(
  p_entry_id UUID,
  p_brand_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT id, brand_id INTO v_entry
  FROM water_log_entries
  WHERE id = p_entry_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_entry.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to delete this entry');
  END IF;

  UPDATE water_log_entries SET deleted_at = now() WHERE id = p_entry_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- update_water_headgate: add p_brand_id
CREATE OR REPLACE FUNCTION public.update_water_headgate(
  p_headgate_id UUID,
  p_name         TEXT,
  p_active       BOOLEAN DEFAULT true,
  p_unit         TEXT DEFAULT NULL,
  p_brand_id     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hg RECORD;
BEGIN
  SELECT id, brand_id INTO v_hg
  FROM water_headgates
  WHERE id = p_headgate_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Headgate not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_hg.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update this headgate');
  END IF;

  UPDATE water_headgates SET
    name = p_name,
    active = p_active,
    unit = COALESCE(p_unit, unit),
    updated_at = now()
  WHERE id = p_headgate_id;

  RETURN jsonb_build_object('success', true, 'headgate_id', p_headgate_id);
END;
$$;

-- delete_water_headgate: add p_brand_id
CREATE OR REPLACE FUNCTION public.delete_water_headgate(
  p_headgate_id UUID,
  p_brand_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hg RECORD;
BEGIN
  SELECT id, brand_id INTO v_hg
  FROM water_headgates
  WHERE id = p_headgate_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Headgate not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_hg.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to delete this headgate');
  END IF;

  UPDATE water_headgates SET deleted_at = now() WHERE id = p_headgate_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- update_water_user: add p_brand_id
CREATE OR REPLACE FUNCTION public.update_water_user(
  p_user_id   UUID,
  p_name      TEXT DEFAULT NULL,
  p_active    BOOLEAN DEFAULT NULL,
  p_lang      TEXT DEFAULT NULL,
  p_role      TEXT DEFAULT NULL,
  p_brand_id  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, brand_id INTO v_user
  FROM water_users
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_user.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update this user');
  END IF;

  UPDATE water_users SET
    name       = COALESCE(p_name, name),
    active     = COALESCE(p_active, active),
    lang       = COALESCE(p_lang, lang),
    role       = COALESCE(p_role, role),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- delete_water_user: add p_brand_id
CREATE OR REPLACE FUNCTION public.delete_water_user(
  p_user_id  UUID,
  p_brand_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, brand_id INTO v_user
  FROM water_users
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_user.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to delete this user');
  END IF;

  UPDATE water_users SET deleted_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- reset_water_irrigator_pin: add p_brand_id via join check
CREATE OR REPLACE FUNCTION public.reset_water_irrigator_pin(
  p_user_id   UUID,
  p_brand_id  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, brand_id INTO v_user
  FROM water_users
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_user.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to reset this PIN');
  END IF;

  UPDATE water_users SET
    pin_hash = NULL,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- reset_water_irrigator_pin: add p_brand_id via join check
CREATE OR REPLACE FUNCTION public.reset_water_irrigator_pin(
  p_user_id   UUID,
  p_brand_id  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, brand_id INTO v_user
  FROM water_users
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_user.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to reset this PIN');
  END IF;

  UPDATE water_users SET
    pin_hash = NULL,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 8. Add brand validation to record_wholesale_deposit ────────────────────
CREATE OR REPLACE FUNCTION public.record_wholesale_deposit(
  p_order_id    UUID,
  p_amount      NUMERIC,
  p_method      TEXT DEFAULT 'cash',
  p_reference   TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL,
  p_brand_id    UUID DEFAULT NULL  -- NEW
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, brand_id INTO v_order
  FROM wholesale_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF p_brand_id IS NOT NULL AND v_order.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to record deposit for this order');
  END IF;

  INSERT INTO wholesale_deposits (wholesale_order_id, amount, method, reference, recorded_by)
  VALUES (p_order_id, p_amount, p_method, p_reference, p_recorded_by);

  UPDATE wholesale_orders SET
    deposit_paid = deposit_paid + p_amount,
    payment_status = CASE
      WHEN deposit_paid + p_amount >= deposit_required THEN 'deposit_paid'
      ELSE 'partial_deposit'
    END,
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'amount', p_amount);
END;
$$;

-- ── 9. Add brand validation to bulk_fulfill_wholesale_orders ─────────────────
CREATE OR REPLACE FUNCTION public.bulk_fulfill_wholesale_orders(
  p_order_ids UUID[],
  p_by        UUID DEFAULT NULL,
  p_brand_id   UUID DEFAULT NULL  -- NEW
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Brand scoping: if brand_id provided, validate all orders belong to it
  IF p_brand_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM wholesale_orders
    WHERE id = ANY(p_order_ids) AND brand_id != p_brand_id;
    IF v_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized to fulfill these orders');
    END IF;
  END IF;

  UPDATE wholesale_orders SET
    fulfillment_status = 'fulfilled',
    fulfilled_at = now(),
    fulfilled_by = p_by,
    updated_at = now()
  WHERE id = ANY(p_order_ids) AND fulfillment_status != 'fulfilled';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

-- ── 10. Add brand validation to bulk_record_wholesale_deposit ───────────────
CREATE OR REPLACE FUNCTION public.bulk_record_wholesale_deposit(
  p_order_ids  UUID[],
  p_amount     NUMERIC,
  p_method     TEXT DEFAULT 'cash',
  p_reference  TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL,
  p_brand_id    UUID DEFAULT NULL  -- NEW
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_order RECORD;
BEGIN
  -- Brand scoping
  IF p_brand_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM wholesale_orders
    WHERE id = ANY(p_order_ids) AND brand_id != p_brand_id;
    IF v_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized to record deposits for these orders');
    END IF;
  END IF;

  INSERT INTO wholesale_deposits (wholesale_order_id, amount, method, reference, recorded_by)
  SELECT o.id, p_amount, p_method, p_reference, p_recorded_by
  FROM wholesale_orders o
  WHERE o.id = ANY(p_order_ids);

  UPDATE wholesale_orders SET
    deposit_paid = deposit_paid + p_amount,
    payment_status = CASE
      WHEN deposit_paid + p_amount >= deposit_required THEN 'deposit_paid'
      ELSE 'partial_deposit'
    END,
    updated_at = now()
  WHERE id = ANY(p_order_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';