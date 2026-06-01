-- Abandoned cart RPCs

CREATE OR REPLACE FUNCTION get_abandoned_carts(p_brand_id UUID)
RETURNS TABLE(carts JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_agg(jsonb_build_object(
    'id', acr.id,
    'brand_id', acr.brand_id,
    'customer_id', acr.customer_id,
    'contact_email', acr.contact_email,
    'contact_name', acr.contact_name,
    'cart_snapshot', acr.cart_snapshot,
    'brand_name', acr.brand_name,
    'locale', acr.locale,
    'sequence_step', acr.sequence_step,
    'last_email_sent_at', acr.last_email_sent_at,
    'next_email_at', acr.next_email_at,
    'status', acr.status,
    'recovered_order_id', acr.recovered_order_id,
    'recovered_at', acr.recovered_at,
    'created_at', acr.created_at
  ) ORDER BY acr.created_at DESC)
  FROM abandoned_cart_recovery acr
  WHERE acr.brand_id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION enroll_abandoned_cart(
  p_brand_id UUID,
  p_customer_id UUID,
  p_contact_email TEXT,
  p_contact_name TEXT,
  p_cart_snapshot JSONB,
  p_brand_name TEXT,
  p_locale TEXT DEFAULT 'en',
  p_next_email_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO abandoned_cart_recovery (brand_id, customer_id, contact_email, contact_name, cart_snapshot, brand_name, locale, next_email_at, status)
  VALUES (p_brand_id, p_customer_id, p_contact_email, p_contact_name, p_cart_snapshot, p_brand_name, p_locale, p_next_email_at, 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_active_abandoned_carts(p_brand_id UUID)
RETURNS TABLE(carts JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_agg(jsonb_build_object(
    'id', acr.id,
    'brand_id', acr.brand_id,
    'customer_id', acr.customer_id,
    'contact_email', acr.contact_email,
    'contact_name', acr.contact_name,
    'cart_snapshot', acr.cart_snapshot,
    'brand_name', acr.brand_name,
    'locale', acr.locale,
    'sequence_step', acr.sequence_step,
    'last_email_sent_at', acr.last_email_sent_at,
    'next_email_at', acr.next_email_at,
    'status', acr.status,
    'created_at', acr.created_at
  ) ORDER BY acr.next_email_at ASC)
  FROM abandoned_cart_recovery acr
  WHERE acr.brand_id = p_brand_id
    AND acr.status = 'active'
    AND acr.next_email_at IS NOT NULL
    AND acr.next_email_at <= now();
END;
$$;

CREATE OR REPLACE FUNCTION update_abandoned_cart(
  p_id UUID,
  p_sequence_step INTEGER DEFAULT NULL,
  p_last_email_sent_at TIMESTAMPTZ DEFAULT NULL,
  p_next_email_at TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_expired_at TIMESTAMPTZ DEFAULT NULL,
  p_manually_closed_by UUID DEFAULT NULL,
  p_recovered_order_id UUID DEFAULT NULL,
  p_recovered_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE abandoned_cart_recovery SET
    sequence_step = COALESCE(p_sequence_step, sequence_step),
    last_email_sent_at = COALESCE(p_last_email_sent_at, last_email_sent_at),
    next_email_at = COALESCE(p_next_email_at, next_email_at),
    status = COALESCE(p_status, status),
    expired_at = COALESCE(p_expired_at, expired_at),
    manually_closed_at = CASE WHEN p_manually_closed_by IS NOT NULL THEN now() ELSE manually_closed_at END,
    manually_closed_by = COALESCE(p_manually_closed_by, manually_closed_by),
    recovered_order_id = COALESCE(p_recovered_order_id, recovered_order_id),
    recovered_at = COALESCE(p_recovered_at, recovered_at),
    updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Welcome sequence RPCs

CREATE OR REPLACE FUNCTION get_welcome_sequence(p_brand_id UUID)
RETURNS TABLE(entries JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_agg(jsonb_build_object(
    'id', ws.id,
    'brand_id', ws.brand_id,
    'contact_id', ws.contact_id,
    'contact_email', ws.contact_email,
    'contact_name', ws.contact_name,
    'brand_name', ws.brand_name,
    'locale', ws.locale,
    'sequence_step', ws.sequence_step,
    'last_email_sent_at', ws.last_email_sent_at,
    'next_email_at', ws.next_email_at,
    'status', ws.status,
    'created_at', ws.created_at
  ) ORDER BY ws.created_at DESC)
  FROM welcome_email_sequence ws
  WHERE ws.brand_id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_active_welcome_sequence(p_brand_id UUID)
RETURNS TABLE(entries JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_agg(jsonb_build_object(
    'id', ws.id,
    'brand_id', ws.brand_id,
    'contact_id', ws.contact_id,
    'contact_email', ws.contact_email,
    'contact_name', ws.contact_name,
    'brand_name', ws.brand_name,
    'locale', ws.locale,
    'sequence_step', ws.sequence_step,
    'last_email_sent_at', ws.last_email_sent_at,
    'next_email_at', ws.next_email_at,
    'status', ws.status,
    'created_at', ws.created_at
  ) ORDER BY ws.next_email_at ASC)
  FROM welcome_email_sequence ws
  WHERE ws.brand_id = p_brand_id
    AND ws.status = 'active'
    AND ws.next_email_at IS NOT NULL
    AND ws.next_email_at <= now();
END;
$$;

CREATE OR REPLACE FUNCTION update_welcome_sequence(
  p_id UUID,
  p_sequence_step INTEGER DEFAULT NULL,
  p_last_email_sent_at TIMESTAMPTZ DEFAULT NULL,
  p_next_email_at TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_completed_at TIMESTAMPTZ DEFAULT NULL,
  p_unsubscribed_at TIMESTAMPTZ DEFAULT NULL,
  p_bounced_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE welcome_email_sequence SET
    sequence_step = COALESCE(p_sequence_step, sequence_step),
    last_email_sent_at = COALESCE(p_last_email_sent_at, last_email_sent_at),
    next_email_at = COALESCE(p_next_email_at, next_email_at),
    status = COALESCE(p_status, status),
    completed_at = COALESCE(p_completed_at, completed_at),
    unsubscribed_at = COALESCE(p_unsubscribed_at, unsubscribed_at),
    bounced_at = COALESCE(p_bounced_at, bounced_at),
    updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Trigger: auto-enroll new wholesale customer contacts into welcome sequence
CREATE OR REPLACE FUNCTION on_new_wholesale_customer_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if contact has email and opted in
  IF NEW.email IS NOT NULL AND NEW.email_opt_in = TRUE THEN
    PERFORM enroll_welcome_sequence(
      NEW.brand_id,
      NEW.id,
      NEW.email,
      COALESCE(NEW.first_name, NEW.full_name, NEW.contact_name),
      'en'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Note: This trigger would be added to communication_contacts but requires
-- source tracking. For now, enrollment is handled manually or via the
-- communications subscription UI.
