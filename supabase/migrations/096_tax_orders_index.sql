-- 096: Tax Orders Index — partial index for efficient tax queries
-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tax_brand_date
  ON orders (brand_id, created_at)
  WHERE tax_amount IS NOT NULL AND tax_amount > 0;