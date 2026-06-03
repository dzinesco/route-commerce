-- Production Database Migrations
-- Add comprehensive RLS policies, audit tables, referral system, and seed data

BEGIN;

-- =============================================================================
-- REFERRAL SYSTEM
-- =============================================================================

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  referrer_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  reward_type VARCHAR(50) DEFAULT 'percentage',
  reward_value DECIMAL(10,2) DEFAULT 20.00,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Referral redemptions table
CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  referred_email VARCHAR(255) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  reward_type VARCHAR(50),
  reward_value DECIMAL(10,2),
  is_credit_applied BOOLEAN DEFAULT false,
  signup_plan VARCHAR(50),
  signup_value DECIMAL(10,2),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- CHANGELOG SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  released_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT false,
  feature_type VARCHAR(50) DEFAULT 'general',
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(brand_id, version)
);

CREATE TABLE IF NOT EXISTS changelog_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  changelog_id UUID REFERENCES changelogs(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed BOOLEAN DEFAULT false,
  UNIQUE(user_id, changelog_id)
);

-- =============================================================================
-- ONBOARDING PROGRESS
-- =============================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_step VARCHAR(50) NOT NULL,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  skipped_steps JSONB DEFAULT '[]'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(brand_id, user_id)
);

-- =============================================================================
-- USER ACTIVITY / ANALYTICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table pre-existed from 036 (without brand_id etc), add the columns now so policies below succeed
ALTER TABLE user_activity_logs
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action VARCHAR(100),
  ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS resource_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- =============================================================================
-- API KEYS FOR EXTERNAL INTEGRATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20),
  permissions JSONB DEFAULT '["read"]'::jsonb,
  rate_limit INTEGER DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL
);

-- =============================================================================
-- NOTIFICATION PREFERENCES
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  email_orders BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  email_reports BOOLEAN DEFAULT true,
  email_billing BOOLEAN DEFAULT true,
  sms_orders BOOLEAN DEFAULT false,
  sms_marketing BOOLEAN DEFAULT false,
  push_orders BOOLEAN DEFAULT true,
  push_marketing BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- =============================================================================
-- REFINED RLS POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Referral codes policies
CREATE POLICY "Users can view their own referral codes"
  ON referral_codes FOR SELECT
  USING (referrer_user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Platform admins can manage all referral codes"
  ON referral_codes FOR ALL
  USING (current_setting('app.current_user_role', true) = 'platform_admin');

CREATE POLICY "Brand admins can manage their brand's referral codes"
  ON referral_codes FOR ALL
  USING (brand_id = current_setting('app.current_brand_id', true)::uuid);

-- Changelogs policies - public read for all authenticated
CREATE POLICY "Authenticated users can view published changelogs"
  ON changelogs FOR SELECT
  USING (
    is_published = true 
    AND (
      current_setting('app.current_user_role', true) = 'platform_admin'
      OR brand_id = current_setting('app.current_brand_id', true)::uuid
    )
  );

CREATE POLICY "Brand admins can manage their changelogs"
  ON changelogs FOR ALL
  USING (brand_id = current_setting('app.current_brand_id', true)::uuid);

-- Onboarding progress policies
CREATE POLICY "Users can view their own onboarding progress"
  ON onboarding_progress FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update their own onboarding progress"
  ON onboarding_progress FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Brand admins can view onboarding progress for their brand"
  ON onboarding_progress FOR SELECT
  USING (brand_id = current_setting('app.current_brand_id', true)::uuid);

-- User activity logs - admins only
CREATE POLICY "Brand admins can view activity logs for their brand"
  ON user_activity_logs FOR SELECT
  USING (
    brand_id = current_setting('app.current_brand_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'platform_admin'
  );

-- API keys policies
CREATE POLICY "Brand admins can manage their API keys"
  ON api_keys FOR ALL
  USING (brand_id = current_setting('app.current_brand_id', true)::uuid);

CREATE POLICY "Anyone can read active API key prefix (for verification)"
  ON api_keys FOR SELECT
  USING (is_active = true);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Brand admins can view preferences for their brand users"
  ON notification_preferences FOR SELECT
  USING (brand_id = current_setting('app.current_brand_id', true)::uuid);

-- =============================================================================
-- COMPREHENSIVE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_referral_codes_brand ON referral_codes(brand_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_referrer ON referral_codes(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referrer ON referral_redemptions(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referred ON referral_redemptions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_changelogs_brand ON changelogs(brand_id);
CREATE INDEX IF NOT EXISTS idx_changelogs_published ON changelogs(is_published, released_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelog_reads_user ON changelog_reads(user_id, changelog_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_brand ON onboarding_progress(brand_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_brand ON user_activity_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_brand ON api_keys(brand_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

COMMIT;