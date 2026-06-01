-- Migration 039: Shipping Fulfillment Fields
-- Idempotent: ADD COLUMN IF NOT EXISTS

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

COMMENT ON COLUMN orders.shipping_status IS 'pending | label_created | shipped | delivered | returned';
COMMENT ON COLUMN orders.tracking_number IS 'Carrier tracking number';
