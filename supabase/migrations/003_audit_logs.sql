-- ============================================================
-- Audit Logging
-- ============================================================
-- Tracks critical admin mutations for compliance and debugging.
-- Lightweight: single insert per action, no triggers.

CREATE TABLE IF NOT EXISTS audit_logs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name         TEXT        NOT NULL,
  record_id          UUID        NOT NULL,
  action             TEXT        NOT NULL,  -- INSERT | UPDATE | DELETE
  old_data           JSONB,
  new_data           JSONB,
  performed_by       UUID,
  performed_by_email TEXT,
  brand_id           UUID,  -- for brand-scoped log reads
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by table + record
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON audit_logs(table_name, record_id);

-- Index for brand-scoped reads
CREATE INDEX IF NOT EXISTS idx_audit_logs_brand
  ON audit_logs(brand_id) WHERE brand_id IS NOT NULL;

-- Index for performed_by queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by
  ON audit_logs(performed_by);

-- RLS: no direct public access
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policies (platform_admin and brand_admin read their own logs)
-- Read policy: platform_admin sees all
CREATE POLICY "Platform admin reads all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'platform_admin'
    )
  );

-- Read policy: brand_admin sees only their brand's logs
CREATE POLICY "Brand admin reads own brand audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'brand_admin'
      AND admin_users.brand_id = audit_logs.brand_id
    )
  );

-- Write is handled exclusively via SECURITY DEFINER RPC (bypasses RLS)
-- No INSERT policy needed — the function bypasses RLS entirely.

-- ============================================================
-- log_audit_event — called by server actions to write audit records
-- Runs as postgres (SUPERUSER) so it bypasses RLS on audit_logs.
-- Accepts a JSONB payload with all audit fields.
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_event(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    table_name, record_id, action,
    old_data, new_data,
    performed_by, performed_by_email,
    brand_id
  ) VALUES (
    p_payload->>'table_name',
    (p_payload->>'record_id')::UUID,
    p_payload->>'action',
    p_payload->'old_data',
    p_payload->'new_data',
    CASE
      WHEN (p_payload->>'performed_by') IS NULL THEN NULL
      ELSE (p_payload->>'performed_by')::UUID
    END,
    p_payload->>'performed_by_email',
    CASE
      WHEN (p_payload->>'brand_id') IS NULL THEN NULL
      ELSE (p_payload->>'brand_id')::UUID
    END
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;
