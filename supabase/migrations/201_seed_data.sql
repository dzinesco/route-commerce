-- Seed data for production development and testing

BEGIN;

-- =============================================================================
-- DEMO BRANDS
-- =============================================================================

INSERT INTO brands (id, name, slug, plan_tier, max_users, max_stops_monthly, max_products, stripe_customer_id, created_at)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sunrise Farms', 'sunrise-farms', 'enterprise', 10, 100, 500, 'cus_demo_sunrise', NOW()),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Green Valley Organics', 'green-valley', 'farm', 5, 50, 250, 'cus_demo_green', NOW()),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Orchard Fresh', 'orchard-fresh', 'starter', 2, 10, 50, 'cus_demo_orchard', NOW())
ON CONFLICT (id) DO NOTHING;


-- NOTE: The remainder of the original seed data (products, stops, orders, water logs, etc.)
-- has been removed from this migration because the column layouts in the live DB
-- (shaped by many prior migrations) no longer match the INSERTs here.
-- The 3 demo brands above will be inserted (now that plan_tier/max_* columns exist).
-- Use the admin UI or separate scripts to populate test data as needed.

COMMIT;
