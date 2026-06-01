-- Migration 065: Fix get_wholesale_products — remove rc_product_id reference
-- The wholesale_products table does not have rc_product_id column,
-- but get_wholesale_products RPC (migration 061) references it.
-- Also drop the orphaned rc_product_id column if it exists.

BEGIN;

-- Drop rc_product_id column if it somehow got added (migration 046 planned it but it was never created)
-- This is safe IF NOT EXISTS since the column likely doesn't exist
ALTER TABLE public.wholesale_products DROP COLUMN IF EXISTS rc_product_id;

-- Recreate get_wholesale_products without rc_product_id reference
DROP FUNCTION IF EXISTS public.get_wholesale_products(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_products(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.name) INTO v_result
  FROM (
    SELECT
      id, brand_id, name, description,
      unit_type, unit_type_custom, availability, qty_available,
      season_start, season_end, price_tiers, hp_sku, hp_item_id,
      handling_instructions, storage_warning, loading_notes,
      product_label, pack_style, container_type, container_size_code,
      units_per_container, default_pickup_location, created_at, updated_at,
      deleted_at
    FROM wholesale_products
    WHERE brand_id = p_brand_id
      AND deleted_at IS NULL
    ORDER BY name
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';