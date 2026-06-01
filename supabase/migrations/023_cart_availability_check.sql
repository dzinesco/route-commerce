-- Migration 023: Fix cart availability check
-- Replaces unreliable client-side product_stops query with a
-- SECURITY DEFINER RPC that bypasses RLS and returns structured availability.
--
-- The cart page's availability check was:
-- 1. Unreliable — anon/frontend query may be blocked by RLS or return empty
-- 2. Conflating "no rows" with "product is unavailable"
-- 3. Blocking all stops even when the query itself failed
--
-- This adds: check_stop_product_availability(p_stop_id, p_product_ids)
-- Returns: { product_id, is_available }[] for each requested product.
-- The cart page uses this to show truly incompatible items separately
-- from query errors.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. check_stop_product_availability RPC
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_stop_product_availability(
  p_stop_id      UUID,
  p_product_ids  UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_pid    UUID;
BEGIN
  FOR v_pid IN SELECT unnest(p_product_ids)
  LOOP
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'product_id',   v_pid,
      'is_available', EXISTS(
        SELECT 1 FROM product_stops
        WHERE stop_id = p_stop_id AND product_id = v_pid
      )
    ));
  END LOOP;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Update cart/page.tsx to use the RPC + show query errors distinctly
--    (done in the application code, not the migration)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Changes to src/app/cart/page.tsx:
-- - handleStopSelect: POST to check_stop_product_availability RPC instead of
--   direct product_stops query. Handle errors distinctly from unavailability.
-- - Add availabilityError state — if RPC fails, show "Unable to verify
--   availability" but allow checkout to proceed (server will catch true errors).
-- - Add per-product availabilityError flag to distinguish query failure
--   from confirmed unavailability.