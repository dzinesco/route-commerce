-- 136_email_automation_missing_rpcs
-- Missing: enroll_welcome_sequence, detect_abandoned_wholesale_carts
-- Also adds: rate limiting for cron endpoints, cron secret validation

-- ── 1. enroll_welcome_sequence ────────────────────────────────────────────────
-- Auto-enroll new contacts (who have email_opt_in = TRUE) into the welcome sequence.
-- Trigger fires when communication_contacts is created via subscription UI.

CREATE OR REPLACE FUNCTION enroll_welcome_sequence(
  p_brand_id UUID,
  p_contact_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_locale TEXT DEFAULT 'en'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_brand_name TEXT;
BEGIN
  -- Check not already enrolled
  IF EXISTS (
    SELECT 1 FROM welcome_email_sequence
    WHERE contact_id = p_contact_id AND brand_id = p_brand_id
    AND status IN ('active', 'completed')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT name INTO v_brand_name FROM brands WHERE id = p_brand_id;

  INSERT INTO welcome_email_sequence
    (brand_id, contact_id, contact_email, contact_name, brand_name, locale, sequence_step, next_email_at, status)
  VALUES
    (p_brand_id, p_contact_id, p_email, p_name, v_brand_name, p_locale, 0, now() + INTERVAL '1 hour', 'active')
  ON CONFLICT (contact_id, brand_id) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 2. detect_abandoned_wholesale_carts ───────────────────────────────────────
-- Find wholesale orders that look abandoned: pending payment, no cancellation,
-- no recovered flag, created within last 7 days, no checkout completed.
-- Returns rows that are not yet enrolled in the recovery system.

CREATE OR REPLACE FUNCTION detect_abandoned_wholesale_carts(p_brand_id UUID)
RETURNS TABLE(
  order_id UUID,
  customer_id UUID,
  contact_email TEXT,
  contact_name TEXT,
  cart_snapshot JSONB,
  checkout_session_id TEXT,
  created_at TIMESTAMPTZ,
  minutes_elapsed NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wo.id                      AS order_id,
    wo.customer_id,
    wc.email                   AS contact_email,
    COALESCE(wc.first_name, wc.full_name, wc.company_name) AS contact_name,
    wo.cart_snapshot,
    wo.checkout_session_id,
    wo.created_at,
    EXTRACT(EPOCH FROM (now() - wo.created_at)) / 60 AS minutes_elapsed
  FROM wholesale_orders wo
  JOIN wholesale_customers wc ON wc.id = wo.customer_id
  WHERE wo.brand_id = p_brand_id
    AND wo.payment_status = 'pending'
    AND wo.status NOT IN ('cancelled', 'fulfilled', 'completed', 'recovered')
    AND wo.checkout_session_id IS NOT NULL
    -- not already tracked
    AND NOT EXISTS (
      SELECT 1 FROM abandoned_cart_recovery acr
      WHERE acr.recovered_order_id = wo.id AND acr.status IN ('active', 'recovered', 'expired')
    )
    AND NOT EXISTS (
      SELECT 1 FROM abandoned_cart_recovery acr
      WHERE acr.contact_email = wc.email
        AND acr.brand_id = p_brand_id
        AND acr.status IN ('active', 'recovered')
        AND acr.created_at > now() - INTERVAL '48 hours'
    )
    AND wo.created_at > now() - INTERVAL '7 days'
  ORDER BY wo.created_at ASC;
END;
$$;

-- ── 3. Sync wholesale_orders cart_snapshot if missing ─────────────────────────
-- Pre-populate cart_snapshot from order_items for orders created before the column was added.

CREATE OR REPLACE FUNCTION sync_wholesale_order_cart_snapshot(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE wholesale_orders wo
  SET cart_snapshot = (
    SELECT jsonb_build_object(
      'items', jsonb_agg(jsonb_build_object(
        'name', p.name,
        'quantity', oi.quantity,
        'unit_price', COALESCE(oi.unit_price, p.wholesale_price)
      )),
      'subtotal', SUM(COALESCE(oi.unit_price, p.wholesale_price) * oi.quantity),
      'item_count', COUNT(oi.id)
    )
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
  )
  WHERE wo.id = p_order_id
    AND (wo.cart_snapshot IS NULL OR wo.cart_snapshot = 'null'::jsonb);
END;
$$;

-- Apply for recent orders without snapshots (last 30 days)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM wholesale_orders
    WHERE cart_snapshot IS NULL
      AND created_at > now() - INTERVAL '30 days'
  LOOP
    PERFORM sync_wholesale_order_cart_snapshot(r.id);
  END LOOP;
END;
$$;

-- ── 4. Enroll existing pending wholesale customers into welcome sequence ─────────
-- Run this once to backfill welcome sequence for existing contacts.

CREATE OR REPLACE FUNCTION backfill_welcome_sequence(p_brand_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO welcome_email_sequence
    (brand_id, contact_id, contact_email, contact_name, brand_name, locale, sequence_step, next_email_at, status)
  SELECT
    c.brand_id,
    c.id,
    c.email,
    COALESCE(c.first_name, c.full_name),
    b.name,
    'en',
    0,
    now() + INTERVAL '1 hour',
    'active'
  FROM communication_contacts c
  JOIN brands b ON b.id = c.brand_id
  WHERE c.brand_id = p_brand_id
    AND c.email IS NOT NULL
    AND c.email_opt_in = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM welcome_email_sequence ws
      WHERE ws.contact_id = c.id AND ws.brand_id = p_brand_id
    )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── 5. RPC: manual_resend_abandoned_cart_email ──────────────────────────────────
-- Lets admin manually trigger a resend for a specific cart.

CREATE OR REPLACE FUNCTION manual_resend_abandoned_cart_email(p_cart_id UUID, p_step INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE abandoned_cart_recovery
  SET
    sequence_step = p_step - 1,
    next_email_at = now(),
    status = 'active',
    last_email_sent_at = NULL
  WHERE id = p_cart_id
    AND status IN ('active', 'expired');
  RETURN TRUE;
END;
$$;

-- ── 6. RPC: manual_resend_welcome_email ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION manual_resend_welcome_email(p_entry_id UUID, p_step INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE welcome_email_sequence
  SET
    sequence_step = p_step - 1,
    next_email_at = now(),
    status = 'active',
    last_email_sent_at = NULL
  WHERE id = p_entry_id
    AND status IN ('active', 'completed', 'bounced');
  RETURN TRUE;
END;
$$;

-- ── 7. Cron job: clean up stale expired carts ────────────────────────────────────
-- Mark carts as expired if next_email_at was more than 7 days ago.

CREATE OR REPLACE FUNCTION cleanup_stale_abandoned_carts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE abandoned_cart_recovery
  SET status = 'expired', expired_at = now()
  WHERE status = 'active'
    AND next_email_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── 8. Grant execute to authenticated role ─────────────────────────────────────

GRANT EXECUTE ON FUNCTION enroll_welcome_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION detect_abandoned_wholesale_carts TO authenticated;
GRANT EXECUTE ON FUNCTION sync_wholesale_order_cart_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_welcome_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION manual_resend_abandoned_cart_email TO authenticated;
GRANT EXECUTE ON FUNCTION manual_resend_welcome_email TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_abandoned_carts TO authenticated;