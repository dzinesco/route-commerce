-- Migration 038: Product Images + Public Site Polish
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION

-- ── 1. Add image_url to products ───────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── 2. Update get_stop_products to include image_url ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('products', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ps.id,
        'product_id', ps.product_id,
        'name', p.name,
        'type', p.type,
        'price', p.price,
        'image_url', p.image_url
      )
    ), '[]'::JSONB)
    FROM product_stops ps
    JOIN products p ON p.id = ps.product_id
    WHERE ps.stop_id = p_stop_id
  ));
END;
$$;

NOTIFY pgrst, 'reload schema';
