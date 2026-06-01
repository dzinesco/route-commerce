-- Migration 062: Webhook dispatcher for wholesale events
-- Adds webhook_settings table, sync_log table, enqueue RPC, and dispatch route

BEGIN;

-- ── 1. wholesale_webhook_settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_webhook_settings (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id    UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  secret      TEXT        NOT NULL,                      -- HMAC signing secret
  enabled     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id)
);

ALTER TABLE public.wholesale_webhook_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_manage_webhook_settings" ON public.wholesale_webhook_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.brand_id = wholesale_webhook_settings.brand_id
        AND au.role IN ('platform_admin', 'brand_admin')
    )
  );

-- ── 2. wholesale_sync_log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_sync_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id     UUID        NOT NULL,
  event_type   TEXT        NOT NULL,   -- order_created | order_fulfilled | deposit_recorded | order_paid
  order_id    UUID,
  payload     JSONB,
  status      TEXT        NOT NULL DEFAULT 'pending',  -- pending | sent | failed | retrying
  response    TEXT,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  next_retry   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_sync_log" ON public.wholesale_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.brand_id = wholesale_sync_log.brand_id
        AND au.role IN ('platform_admin', 'brand_admin', 'store_employee')
    )
  );

-- ── 3. enqueue_wholesale_webhook RPC ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.enqueue_wholesale_webhook(TEXT, UUID, JSONB, UUID);
CREATE OR REPLACE FUNCTION public.enqueue_wholesale_webhook(
  p_event_type  TEXT,
  p_order_id    UUID DEFAULT NULL,
  p_payload     JSONB DEFAULT NULL,
  p_brand_id    UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_log_id  UUID;
  v_brand_id UUID;
BEGIN
  -- Use provided brand_id, or fall back to the first brand with webhooks enabled
  IF p_brand_id IS NOT NULL THEN
    SELECT brand_id INTO v_brand_id
    FROM public.wholesale_webhook_settings
    WHERE brand_id = p_brand_id AND enabled = true AND url IS NOT NULL AND url != ''
    LIMIT 1;
  ELSE
    SELECT brand_id INTO v_brand_id
    FROM public.wholesale_webhook_settings
    WHERE enabled = true AND url IS NOT NULL AND url != ''
    LIMIT 1;
  END IF;

  IF NOT FOUND OR v_brand_id IS NULL THEN
    -- Webhooks not enabled — silent no-op
    RETURN NULL;
  END IF;

  INSERT INTO public.wholesale_sync_log (brand_id, event_type, order_id, payload, status)
    VALUES (v_brand_id, p_event_type, p_order_id, p_payload, 'pending')
    RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ── 4. get_pending_webhooks RPC ────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_pending_webhooks(INTEGER);
CREATE OR REPLACE FUNCTION public.get_pending_webhooks(p_limit INTEGER DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(r ORDER BY r.created_at ASC)
      FROM (
        SELECT
          wsl.id,
          wsl.brand_id,
          wsl.event_type,
          wsl.order_id,
          wsl.payload,
          wsl.attempts,
          wsl.status,
          ws.url,
          ws.secret
        FROM wholesale_sync_log wsl
        JOIN wholesale_webhook_settings ws ON ws.brand_id = wsl.brand_id AND ws.enabled = true
        WHERE wsl.status IN ('pending', 'retrying')
          AND (wsl.next_retry IS NULL OR wsl.next_retry <= now())
        ORDER BY wsl.created_at ASC
        LIMIT p_limit
      ) r
    ),
    '[]'::JSONB
  );
END;
$$;

-- ── 5. mark_webhook_sent RPC ───────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_webhook_sent(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.mark_webhook_sent(p_log_id UUID, p_response TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE wholesale_sync_log
    SET status = 'sent', response = p_response, attempts = attempts + 1
    WHERE id = p_log_id;
END;
$$;

-- ── 6. mark_webhook_failed RPC ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_webhook_failed(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.mark_webhook_failed(p_log_id UUID, p_response TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_attempts INTEGER;
BEGIN
  SELECT attempts INTO v_attempts FROM wholesale_sync_log WHERE id = p_log_id FOR UPDATE;
  IF v_attempts >= 3 THEN
    UPDATE wholesale_sync_log
      SET status = 'failed', response = p_response, attempts = attempts + 1
      WHERE id = p_log_id;
  ELSE
    UPDATE wholesale_sync_log
      SET status = 'retrying',
          response = p_response,
          attempts = attempts + 1,
          next_retry = now() + (attempts + 1 || ' hours')::INTERVAL
      WHERE id = p_log_id;
  END IF;
END;
$$;

-- ── 7. upsert_wholesale_webhook_settings RPC ─────────────────────────────────
DROP FUNCTION IF EXISTS public.upsert_wholesale_webhook_settings(UUID, TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.upsert_wholesale_webhook_settings(
  p_brand_id  UUID,
  p_url       TEXT,
  p_secret    TEXT,
  p_enabled   BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.wholesale_webhook_settings (brand_id, url, secret, enabled)
    VALUES (p_brand_id, p_url, p_secret, p_enabled)
    ON CONFLICT (brand_id) DO UPDATE SET
      url = EXCLUDED.url,
      secret = EXCLUDED.secret,
      enabled = EXCLUDED.enabled,
      updated_at = now()
    RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
