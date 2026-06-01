-- Migration: 035_admin_action_logs
-- Dedicated audit trail for admin user management actions

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type       TEXT NOT NULL,  -- 'create' | 'update' | 'delete'
  admin_id          UUID,            -- auth.uid() of the admin performing the action
  admin_email       TEXT,
  affected_user_id  UUID,            -- the admin_users.id being modified
  brand_id          UUID,
  details           JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by acting admin
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
-- Index for fast lookups by affected user
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_affected_user ON admin_action_logs(affected_user_id);
-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at DESC);

-- RLS: platform_admin can read all; brand_admin reads only their brand
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_read_all_admin_action_logs" ON admin_action_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
    )
  );

CREATE POLICY "brand_admin_read_own_brand_admin_action_logs" ON admin_action_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'brand_admin'
        AND au.brand_id = admin_action_logs.brand_id
    )
  );

-- Append-only: any authenticated admin user can insert (enforced at RPC level)
CREATE POLICY "admin_action_logs_insert" ON admin_action_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- log_admin_action — SECURITY DEFINER, bypasses RLS
-- Called by admin user CRUD actions to record what changed.
-- Payload: { action_type, admin_id, admin_email, affected_user_id, brand_id, details }
-- ============================================================
CREATE OR REPLACE FUNCTION log_admin_action(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_action_logs (
    action_type, admin_id, admin_email, affected_user_id, brand_id, details
  ) VALUES (
    p_payload->>'action_type',
    CASE WHEN (p_payload->>'admin_id') IS NULL THEN NULL ELSE (p_payload->>'admin_id')::UUID END,
    p_payload->>'admin_email',
    CASE WHEN (p_payload->>'affected_user_id') IS NULL THEN NULL ELSE (p_payload->>'affected_user_id')::UUID END,
    CASE WHEN (p_payload->>'brand_id') IS NULL THEN NULL ELSE (p_payload->>'brand_id')::UUID END,
    COALESCE(p_payload->'details', '{}'::JSONB)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================
-- log_user_activity — SECURITY DEFINER, bypasses RLS
-- Tracks per-user activities: logins, password changes, profile updates.
-- Payload: { user_id, activity_type, details, ip_address, user_agent }
-- ============================================================
CREATE OR REPLACE FUNCTION log_user_activity(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_activity_logs (
    user_id, activity_type, details, ip_address, user_agent
  ) VALUES (
    CASE WHEN (p_payload->>'user_id') IS NULL THEN NULL ELSE (p_payload->>'user_id')::UUID END,
    p_payload->>'activity_type',
    COALESCE(p_payload->'details', '{}'::JSONB),
    p_payload->>'ip_address',
    p_payload->>'user_agent'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

