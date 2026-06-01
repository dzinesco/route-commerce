-- Migration 092: Stripe Subscriptions + Billing Integration
-- Enables real Stripe subscription management for platform billing

-- ── Subscription tracking columns on brands ────────────────────────────────
ALTER TABLE brands ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;

-- ── RPC: Save subscription data from Stripe webhook ─────────────────────────
CREATE OR REPLACE FUNCTION set_brand_subscription(
  p_brand_id UUID,
  p_subscription_id TEXT,
  p_status TEXT,
  p_current_period_end TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE brands SET
    stripe_subscription_id = p_subscription_id,
    stripe_subscription_status = p_status,
    stripe_current_period_end = p_current_period_end,
    updated_at = NOW()
  WHERE id = p_brand_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_brand_subscription(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- ── RPC: Get subscription info ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_brand_subscription(p_brand_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'stripe_subscription_id', stripe_subscription_id,
    'stripe_subscription_status', stripe_subscription_status,
    'stripe_current_period_end', stripe_current_period_end,
    'stripe_customer_id', stripe_customer_id,
    'plan_tier', plan_tier
  ) INTO result
  FROM brands WHERE id = p_brand_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_brand_subscription(UUID) TO authenticated;

-- ── Stripe price IDs (environment-variable-driven) ─────────────────────────
-- These should be set in .env.local:
-- STRIPE_PRICE_STARTER=price_xxxx
-- STRIPE_PRICE_FARM=price_xxxx
-- STRIPE_PRICE_ENTERPRISE=price_xxxx
-- STRIPE_PRICE_HARVEST_REACH=price_xxxx  (add-on)
-- STRIPE_PRICE_WHOLESALE_PORTAL=price_xxxx
-- STRIPE_PRICE_WATER_LOG=price_xxxx
-- STRIPE_PRICE_AI_TOOLS=price_xxxx
-- STRIPE_PRICE_SQUARE_SYNC=price_xxxx
-- STRIPE_PRICE_SMS_CAMPAIGNS=price_xxxx

-- ── Feature flag auto-enable map ───────────────────────────────────────────
-- When Stripe subscription is active for a given price, the corresponding
-- brand_features flag is enabled. When subscription is canceled, it's disabled.
--
-- Price ID → feature key mapping (configured via env vars):
-- STRIPE_PRICE_HARVEST_REACH  → harvest_reach
-- STRIPE_PRICE_WHOLESALE_PORTAL → wholesale_portal
-- STRIPE_PRICE_WATER_LOG     → water_log
-- STRIPE_PRICE_AI_TOOLS      → ai_tools
-- STRIPE_PRICE_SQUARE_SYNC   → square_sync
-- STRIPE_PRICE_SMS_CAMPAIGNS → sms_campaigns
--
-- Plan tier changes are handled separately via plan upgrade checkout sessions.