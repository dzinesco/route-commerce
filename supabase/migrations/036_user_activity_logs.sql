-- Migration: 036_user_activity_logs
-- Tracks per-user activities: logins, password changes, profile updates

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  activity_type  TEXT NOT NULL,  -- 'login' | 'logout' | 'password_change' | 'profile_update' | 'email_change'
  details        JSONB DEFAULT '{}',
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-user log lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
-- Index for time-based queries per user
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);

-- RLS: user can read own logs; platform_admin can read all
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_activity_logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "platform_admin_read_all_user_activity_logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
    )
  );

-- Any authenticated user can insert their own log entries
CREATE POLICY "user_insert_own_activity_logs" ON user_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
