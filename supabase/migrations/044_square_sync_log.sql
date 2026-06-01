-- Migration 044: Square Sync Log
-- Append-only log of all Square sync events

CREATE TABLE IF NOT EXISTS public.square_sync_log (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id      UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  event_type    TEXT        NOT NULL,
  -- 'oauth_connected' | 'oauth_disconnected' | 'product_synced' | 'order_synced' | 'inventory_synced' | 'error'
  direction     TEXT,
  -- 'rc_to_square' | 'square_to_rc'
  entity_type   TEXT,
  -- 'product' | 'order' | 'inventory'
  entity_id     UUID,
  status        TEXT        NOT NULL,
  -- 'success' | 'error' | 'partial'
  message      TEXT,
  details       JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_square_sync_log_brand_created
  ON square_sync_log(brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_square_sync_log_event_type
  ON square_sync_log(event_type, created_at DESC);

-- SECURITY DEFINER function to record sync log entries
-- Bypasses RLS since operational events use the same pattern
CREATE OR REPLACE FUNCTION public.record_square_sync_event(
  p_brand_id    UUID,
  p_event_type  TEXT,
  p_direction   TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_status      TEXT,
  p_message     TEXT,
  p_details     JSONB DEFAULT '{}'::JSONB
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO square_sync_log (
    brand_id, event_type, direction, entity_type, entity_id, status, message, details
  ) VALUES (
    p_brand_id, p_event_type, p_direction, p_entity_type, p_entity_id, p_status, p_message, p_details
  );
END;
$$;

-- RLS: brands can read their own sync logs; platform_admin can read all
ALTER TABLE square_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_admin_read_own_sync_log" ON square_sync_log
  FOR SELECT USING (
    (current_setting('app.settings.role', true)::TEXT = 'brand_admin' AND brand_id = current_setting('app.settings.brand_id', true)::UUID)
    OR current_setting('app.settings.role', true)::TEXT = 'platform_admin'
  );

CREATE POLICY "service_insert_sync_log" ON square_sync_log
  FOR INSERT WITH CHECK (true); -- service role bypasses RLS via SECURITY DEFINER

NOTIFY pgrst, 'reload schema';
