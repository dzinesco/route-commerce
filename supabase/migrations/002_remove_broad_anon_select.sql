-- ============================================================
-- Remove broad anon SELECT policies
-- ============================================================
-- The checkout flow no longer requires post-checkout SELECT
-- because the RPC returns full order data directly.
-- Admin SELECT is handled by server-side auth (getAdminUser).

-- Drop the overly permissive read policies
DROP POLICY IF EXISTS "Allow public read on orders for checkout" ON orders;
DROP POLICY IF EXISTS "Allow public read on order_items" ON order_items;
