-- 203_plan_usage_active_products.sql
-- Reconcile plan usage product count with the dashboard "Active Products" stat.
--
-- Context:
--   Migration 091's get_brand_plan_info counted `products` using
--       deleted_at IS NULL
--   while the dashboard's getDashboardStats server action counted
--       active = true
--   These two filters can disagree (a product can be `active=false` but
--   not soft-deleted, or `active=true` and soft-deleted in some flows),
--   producing "Active Products 1" in the dashboard stats while the
--   billing/usage bar said "Products 0/25".
--
-- This migration updates get_brand_plan_info to count products that are
-- active AND not soft-deleted — the natural meaning of "products you sell
-- that count against the plan limit". The same filter is also applied to
-- the stop count (active AND not soft-deleted AND in the current month)
-- to keep the usage semantics consistent across all three counters.
--
-- Uses CREATE OR REPLACE FUNCTION so re-running is safe.

CREATE OR REPLACE FUNCTION public.get_brand_plan_info(p_brand_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_count BIGINT;
  v_active_stops BIGINT;
  v_product_count BIGINT;
  v_brand RECORD;
BEGIN
  SELECT plan_tier, max_users, max_stops_monthly, max_products, stripe_customer_id, name
  INTO v_brand
  FROM brands WHERE id = p_brand_id;

  IF v_brand IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count current usage with consistent semantics:
  --   users:   not soft-deleted
  --   stops:   active AND not soft-deleted AND in the current month
  --   products: active AND not soft-deleted (matches "Active Products"
  --             stat used in the admin dashboard, so plan usage and
  --             dashboard stats never disagree)
  SELECT COUNT(*) INTO v_user_count
    FROM admin_users
   WHERE brand_id = p_brand_id
     AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_active_stops
    FROM stops
   WHERE brand_id = p_brand_id
     AND active = true
     AND deleted_at IS NULL
     AND date >= date_trunc('month', now());

  SELECT COUNT(*) INTO v_product_count
    FROM products
   WHERE brand_id = p_brand_id
     AND active = true
     AND deleted_at IS NULL;

  SELECT jsonb_build_object(
    'plan_tier', v_brand.plan_tier,
    'max_users', v_brand.max_users,
    'max_stops_monthly', v_brand.max_stops_monthly,
    'max_products', v_brand.max_products,
    'stripe_customer_id', v_brand.stripe_customer_id,
    'brand_name', v_brand.name,
    'usage', jsonb_build_object(
      'users', v_user_count,
      'stops_this_month', v_active_stops,
      'products', v_product_count
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload PostgREST schema cache so the change is picked up immediately.
NOTIFY pgrst, 'reload schema';
