-- Add seasonal availability date fields to products table
-- Allows products to have start/end availability dates (e.g., "Available mid-July through mid-September")

ALTER TABLE products ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN products.available_from IS 'Start date for product availability (seasonal)';
COMMENT ON COLUMN products.available_until IS 'End date for product availability (seasonal)';