-- Migration 054: Wholesale Email Notifications
-- Notification queue: stores email intents to be processed by an external
-- email service (Resend, SendGrid, etc.) or a cron webhook.

BEGIN;

-- ── 1. Notification types enum ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wholesale_notification_type') THEN
    CREATE TYPE wholesale_notification_type AS ENUM (
      'order_confirmation',
      'deposit_received',
      'order_fulfilled'
    );
  END IF;
END $$;

-- ── 2. Notifications table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_notifications (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id      UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  customer_id   UUID        NOT NULL REFERENCES wholesale_customers(id) ON DELETE CASCADE,
  order_id      UUID        REFERENCES wholesale_orders(id) ON DELETE SET NULL,
  type          wholesale_notification_type NOT NULL,
  email_to      TEXT        NOT NULL,
  email_cc     TEXT,
  subject       TEXT        NOT NULL,
  body_html     TEXT,
  body_text     TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'sent' | 'failed' | 'skipped'
  sent_at       TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_admin_manage_notifications" ON wholesale_notifications;
CREATE POLICY "brand_admin_manage_notifications" ON wholesale_notifications
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
    AND (
      current_setting('app.settings.role', true)::TEXT = 'platform_admin'
      OR brand_id = current_setting('app.settings.brand_id', true)::UUID
    )
  );

-- ── 3. RPC: Enqueue a wholesale notification ─────────────────────────────────
DROP FUNCTION IF EXISTS public.enqueue_wholesale_notification(
  UUID, UUID, UUID, wholesale_notification_type, TEXT, TEXT, TEXT, TEXT, TEXT
);
CREATE OR REPLACE FUNCTION public.enqueue_wholesale_notification(
  p_brand_id       UUID DEFAULT NULL,
  p_customer_id    UUID DEFAULT NULL,
  p_order_id      UUID DEFAULT NULL,
  p_type          wholesale_notification_type DEFAULT NULL,
  p_email_to      TEXT DEFAULT NULL,
  p_email_cc     TEXT DEFAULT NULL,
  p_subject       TEXT DEFAULT NULL,
  p_body_html     TEXT DEFAULT NULL,
  p_body_text     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO wholesale_notifications (
    brand_id, customer_id, order_id, type,
    email_to, email_cc, subject, body_html, body_text
  )
  VALUES (
    p_brand_id, p_customer_id, p_order_id, p_type,
    p_email_to, p_email_cc, p_subject, p_body_html, p_body_text
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ── 4. RPC: Get pending notifications (for external processor / cron) ───────────
DROP FUNCTION IF EXISTS public.get_wholesale_pending_notifications(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_wholesale_pending_notifications(
  p_brand_id UUID DEFAULT NULL,
  p_limit   INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at ASC) INTO v_result
  FROM (
    SELECT
      wn.id, wn.type, wn.email_to, wn.email_cc,
      wn.subject, wn.body_html, wn.body_text,
      wn.brand_id, wn.customer_id, wn.order_id,
      ws.invoice_business_name, ws.invoice_business_email
    FROM wholesale_notifications wn
    LEFT JOIN wholesale_settings ws ON ws.brand_id = wn.brand_id
    WHERE wn.status = 'pending'
      AND (p_brand_id IS NULL OR wn.brand_id = p_brand_id)
    ORDER BY wn.created_at ASC
    LIMIT p_limit
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 5. RPC: Mark notification as sent ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_wholesale_notification_sent(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.mark_wholesale_notification_sent(
  p_notification_id UUID DEFAULT NULL,
  p_error          TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE wholesale_notifications
  SET
    status    = CASE WHEN p_error IS NULL THEN 'sent' ELSE 'failed' END,
    error_message = p_error,
    sent_at   = CASE WHEN p_error IS NULL THEN now() ELSE sent_at END,
    updated_at = now()
  WHERE id = p_notification_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 6. RPC: Get notification stats per brand ──────────────────────────────────
DROP FUNCTION IF EXISTS public.get_wholesale_notification_stats(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_notification_stats(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pending',  (SELECT COUNT(*) FROM wholesale_notifications WHERE brand_id = p_brand_id AND status = 'pending'),
    'sent',    (SELECT COUNT(*) FROM wholesale_notifications WHERE brand_id = p_brand_id AND status = 'sent'),
    'failed',  (SELECT COUNT(*) FROM wholesale_notifications WHERE brand_id = p_brand_id AND status = 'failed'),
    'total',   (SELECT COUNT(*) FROM wholesale_notifications WHERE brand_id = p_brand_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
