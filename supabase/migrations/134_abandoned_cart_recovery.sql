-- Abandoned Cart Recovery tracking table
CREATE TABLE IF NOT EXISTS abandoned_cart_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES wholesale_customers(id) ON DELETE SET NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  cart_snapshot JSONB NOT NULL, -- { items: [{name, quantity, unit_price}], subtotal, item_count }
  brand_name TEXT,
  locale TEXT DEFAULT 'en',

  -- Sequence tracking
  sequence_step INTEGER DEFAULT 0, -- 0=detected, 1=email1_sent, 2=email2_sent, 3=email3_sent
  last_email_sent_at TIMESTAMPTZ,
  next_email_at TIMESTAMPTZ,

  -- Resolution
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'recovered', 'expired', 'manually_closed')),
  recovered_order_id UUID REFERENCES wholesale_orders(id) ON DELETE SET NULL,
  recovered_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  manually_closed_at TIMESTAMPTZ,
  manually_closed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX abandoned_cart_recovery_brand_id_idx ON abandoned_cart_recovery(brand_id);
CREATE INDEX abandoned_cart_recovery_status_idx ON abandoned_cart_recovery(status);
CREATE INDEX abandoned_cart_recovery_next_email_at_idx ON abandoned_cart_recovery(next_email_at) WHERE status = 'active';

-- Welcome Email Sequence tracking table
CREATE TABLE IF NOT EXISTS welcome_email_sequence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES communication_contacts(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  brand_name TEXT,
  locale TEXT DEFAULT 'en',

  -- Sequence tracking
  sequence_step INTEGER DEFAULT 0, -- 0=enrolled, 1=welcome_sent, 2=email2_sent, 3=email3_sent, 4=final_sent
  last_email_sent_at TIMESTAMPTZ,
  next_email_at TIMESTAMPTZ,

  -- Resolution
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'unsubscribed', 'bounced')),
  completed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX welcome_email_sequence_brand_id_idx ON welcome_email_sequence(brand_id);
CREATE INDEX welcome_email_sequence_status_idx ON welcome_email_sequence(status);
CREATE INDEX welcome_email_sequence_next_email_at_idx ON welcome_email_sequence(next_email_at) WHERE status = 'active';

-- Function to enroll contact in welcome sequence
CREATE OR REPLACE FUNCTION enroll_welcome_sequence(p_brand_id UUID, p_contact_id UUID, p_email TEXT, p_name TEXT DEFAULT NULL, p_locale TEXT DEFAULT 'en')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_brand_name TEXT;
BEGIN
  SELECT name INTO v_brand_name FROM brands WHERE id = p_brand_id;

  INSERT INTO welcome_email_sequence (brand_id, contact_id, contact_email, contact_name, brand_name, locale, sequence_step, next_email_at, status)
  VALUES (p_brand_id, p_contact_id, p_email, p_name, v_brand_name, p_locale, 0, now() + INTERVAL '1 hour', 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Function to get abandoned carts for a brand (detects recoverable abandoned carts)
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wo.id AS order_id,
    wo.customer_id,
    wc.email AS contact_email,
    COALESCE(wc.contact_name, wc.company_name) AS contact_name,
    wo.cart_snapshot,
    wo.checkout_session_id,
    wo.created_at,
    EXTRACT(EPOCH FROM (now() - wo.created_at)) / 60 AS minutes_elapsed
  FROM wholesale_orders wo
  JOIN wholesale_customers wc ON wc.id = wo.customer_id
  LEFT JOIN abandoned_cart_recovery acr ON acr.recovered_order_id = wo.id AND acr.status = 'recovered'
  WHERE wo.brand_id = p_brand_id
    AND wo.payment_status = 'pending'
    AND wo.status NOT IN ('cancelled', ' fulfilled', 'recovered')
    AND wo.checkout_session_id IS NOT NULL
    AND acr.id IS NULL
    AND wo.created_at > now() - INTERVAL '7 days'
  ORDER BY wo.created_at ASC;
END;
$$;

-- Updated wholesale_orders to include cart_snapshot
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS cart_snapshot JSONB;
