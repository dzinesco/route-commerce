-- Add plan_tier column to brands
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'starter'
  CHECK (plan_tier IN ('starter', 'farm', 'enterprise'));

-- Add stripe_customer_id for Stripe billing portal
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add plan limits columns
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_stops_monthly INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_products INTEGER DEFAULT 25;

-- RPC: update_brand_plan_tier
CREATE OR REPLACE FUNCTION public.update_brand_plan_tier(
  p_brand_id      UUID,
  p_plan_tier     TEXT
) RETURNS VOID AS $$
BEGIN
  IF p_plan_tier NOT IN ('starter', 'farm', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid plan tier: %', p_plan_tier;
  END IF;
  UPDATE brands SET
    plan_tier = p_plan_tier,
    updated_at = now()
  WHERE id = p_brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: update_brand_stripe_customer_id
CREATE OR REPLACE FUNCTION public.update_brand_stripe_customer_id(
  p_brand_id      UUID,
  p_stripe_customer_id TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE brands SET
    stripe_customer_id = p_stripe_customer_id,
    updated_at = now()
  WHERE id = p_brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_brand_plan_info (returns plan tier + limits + usage stats)
CREATE OR REPLACE FUNCTION public.get_brand_plan_info(p_brand_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_count BIGINT;
  v_active_stops BIGINT;
  v_product_count BIGINT;
  v_brand RECORD;
BEGIN
  SELECT plan_tier, max_users, max_stops_monthly, max_products, stripe_customer_id
  INTO v_brand
  FROM brands WHERE id = p_brand_id;

  IF v_brand IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count current usage
  SELECT COUNT(*) INTO v_user_count FROM admin_users WHERE brand_id = p_brand_id AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_active_stops FROM stops WHERE brand_id = p_brand_id AND active = true AND date >= date_trunc('month', now());
  SELECT COUNT(*) INTO v_product_count FROM products WHERE brand_id = p_brand_id AND deleted_at IS NULL;

  SELECT jsonb_build_object(
    'plan_tier', v_brand.plan_tier,
    'max_users', v_brand.max_users,
    'max_stops_monthly', v_brand.max_stops_monthly,
    'max_products', v_brand.max_products,
    'stripe_customer_id', v_brand.stripe_customer_id,
    'usage', jsonb_build_object(
      'users', v_user_count,
      'stops_this_month', v_active_stops,
      'products', v_product_count
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;