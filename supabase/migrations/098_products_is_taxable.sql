-- 098_products_is_taxable.sql
-- Add is_taxable flag to products table

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN NOT NULL DEFAULT true;

-- Comment for documentation
COMMENT ON COLUMN products.is_taxable IS 'If false, this product is exempt from sales tax even when shipping to nexus states';

-- Update get_stop_products to include is_taxable
DROP FUNCTION IF EXISTS public.get_stop_products(UUID);
CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  type TEXT,
  image_url TEXT,
  active BOOLEAN,
  brand_id UUID,
  is_taxable BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.type,
    p.image_url,
    p.active,
    p.brand_id,
    COALESCE(p.is_taxable, true)::BOOLEAN AS is_taxable
  FROM products p
  WHERE p.brand_id = (
    SELECT stop_id::UUID FROM (
      SELECT brand_id AS stop_id FROM stops WHERE id = p_stop_id
      UNION ALL
      SELECT brand_id FROM stops WHERE id = p_stop_id
    ) AS sub LIMIT 1
  )
    AND p.active = true
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

-- Create index on is_taxable for common queries
CREATE INDEX IF NOT EXISTS idx_products_is_taxable ON products(is_taxable) WHERE is_taxable = false;