-- Migration 070: RLS Policy Audit Fixes
-- 1. Add RLS to products (was completely missing)
-- 2. Add brand scoping to stops RLS
-- 3. Add deleted_at IS NULL to wholesale_customers and wholesale_products RLS
-- 4. Add SELECT policy to order_items (brand-scoped via orders/stops JOIN)

BEGIN;

-- ── 1. products — Add RLS ──────────────────────────────────────────────────────
-- Table has brand_id column but no RLS policies whatsoever.
-- Add SELECT for admins (brand-scoped), INSERT/UPDATE/DELETE blocked (RPC only).

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Platform admin can read all products
CREATE POLICY "platform_admin_read_products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'platform_admin'
    )
  );

-- Brand admin can read their brand's products
CREATE POLICY "brand_admin_read_products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'brand_admin'
      AND au.brand_id = products.brand_id
    )
  );

-- Store employee can read their brand's products
CREATE POLICY "store_employee_read_products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'store_employee'
      AND au.brand_id = products.brand_id
    )
  );

-- wholesale_customer can read their brand's products (via brand_id join)
CREATE POLICY "wholesale_customer_read_products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN wholesale_customers wc ON wc.user_id = au.user_id
      WHERE au.user_id = auth.uid()
      AND au.role = 'wholesale_customer'
      AND wc.brand_id = products.brand_id
    )
  );

-- Block INSERT/UPDATE/DELETE on products — all writes go through RPCs
-- No policy = no access for mutating operations (authenticated users blocked)
CREATE POLICY "block_products_mutations" ON public.products
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_products_update" ON public.products
  FOR UPDATE USING (false);

CREATE POLICY "block_products_delete" ON public.products
  FOR DELETE USING (false);

-- ── 2. stops — Add brand scoping ───────────────────────────────────────────────
-- Current policy allows ANY admin to read ALL stops across all brands.
-- Replace with brand-scoped policies.

DROP POLICY IF EXISTS "Admins can read stops" ON stops;
ALTER TABLE stops DISABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;

-- Platform admin sees all stops
CREATE POLICY "platform_admin_read_stops" ON stops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'platform_admin'
    )
  );

-- Brand admin / store_employee sees only their brand's stops
CREATE POLICY "brand_admin_read_stops" ON stops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role IN ('brand_admin', 'store_employee')
      AND au.brand_id = stops.brand_id
    )
  );

-- Block all mutations on stops (admin only via RPC)
CREATE POLICY "block_stops_mutations" ON stops
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_stops_update" ON stops
  FOR UPDATE USING (false);

CREATE POLICY "block_stops_delete" ON stops
  FOR DELETE USING (false);

-- ── 3. wholesale_customers — Add deleted_at IS NULL ───────────────────────────
-- Soft-deleted customers (deleted_at NOT NULL) should not be readable via REST.
-- Split into two policies: one for platform_admin (no deleted filter), one for brand_admin.

DROP POLICY IF EXISTS "brand_admin_manage_wholesale_customers" ON wholesale_customers;
DROP POLICY IF EXISTS "wholesale_customer_read_own" ON wholesale_customers;
ALTER TABLE wholesale_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_customers ENABLE ROW LEVEL SECURITY;

-- Platform admin can read all customers (including soft-deleted for recovery)
CREATE POLICY "platform_admin_manage_wholesale_customers" ON wholesale_customers
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT = 'platform_admin'
  );

-- Brand admin can only manage their brand's non-deleted customers
CREATE POLICY "brand_admin_manage_wholesale_customers" ON wholesale_customers
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT = 'brand_admin'
    AND brand_id = current_setting('app.settings.brand_id', true)::UUID
    AND deleted_at IS NULL
  );

-- Customers can read their own record (not brand-admin, wholesale_customer role)
CREATE POLICY "wholesale_customer_read_own" ON wholesale_customers
  FOR SELECT USING (
    current_setting('app.settings.role', true)::TEXT = 'wholesale_customer'
    AND user_id = current_setting('app.settings.user_id', true)::UUID
    AND deleted_at IS NULL
  );

-- ── 4. wholesale_products — Add deleted_at IS NULL ───────────────────────────
-- Soft-deleted products should not be readable via REST.

DROP POLICY IF EXISTS "brand_admin_manage_wholesale_products" ON wholesale_products;
ALTER TABLE wholesale_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_products ENABLE ROW LEVEL SECURITY;

-- Platform admin can read all (including soft-deleted for recovery)
CREATE POLICY "platform_admin_manage_wholesale_products" ON wholesale_products
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT = 'platform_admin'
  );

-- Brand admin can only manage their brand's non-deleted products
CREATE POLICY "brand_admin_manage_wholesale_products" ON wholesale_products
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT = 'brand_admin'
    AND brand_id = current_setting('app.settings.brand_id', true)::UUID
    AND deleted_at IS NULL
  );

-- ── 5. order_items — Add brand-scoped SELECT policy ───────────────────────────
-- order_items currently has no RLS policies (all access blocked).
-- Add SELECT with brand scoping via orders/stops JOIN.

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Platform admin can read all order items
CREATE POLICY "platform_admin_read_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'platform_admin'
    )
  );

-- Brand admin / store_employee: can read order items for their brand's orders
CREATE POLICY "brand_admin_read_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN orders o ON o.id = order_items.order_id
      JOIN stops s ON s.id = o.stop_id
      WHERE au.user_id = auth.uid()
      AND au.role IN ('brand_admin', 'store_employee')
      AND s.brand_id = au.brand_id
    )
  );

-- Block all mutations on order_items (admin only via RPC)
CREATE POLICY "block_order_items_mutations" ON order_items
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_order_items_update" ON order_items
  FOR UPDATE USING (false);

CREATE POLICY "block_order_items_delete" ON order_items
  FOR DELETE USING (false);

-- ── 6. orders — Add brand scoping to write policies ───────────────────────────
-- Existing SELECT policies use stops JOIN correctly.
-- Ensure INSERT/UPDATE/DELETE policies also enforce brand scoping (or block them).
-- Note: orders INSERT/UPDATE/DELETE go through RPCs — add blocking policies as safety net.

CREATE POLICY "block_orders_insert" ON orders
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_orders_update" ON orders
  FOR UPDATE USING (false);

CREATE POLICY "block_orders_delete" ON orders
  FOR DELETE USING (false);

-- ── 7. wholesale_orders — Ensure no deleted_at issues ─────────────────────────
-- wholesale_orders has no deleted_at column (hard delete). No changes needed.
-- But add explicit INSERT/UPDATE/DELETE block to match other tables.
-- All writes go through RPCs — block direct REST mutations.

CREATE POLICY "block_wholesale_orders_insert" ON wholesale_orders
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_wholesale_orders_update" ON wholesale_orders
  FOR UPDATE USING (false);

CREATE POLICY "block_wholesale_orders_delete" ON wholesale_orders
  FOR DELETE USING (false);

-- ── 8. wholesale_order_items — Block direct REST mutations ────────────────────
-- SELECT is already scoped in 069. Block INSERT/UPDATE/DELETE.

CREATE POLICY "block_wholesale_order_items_insert" ON wholesale_order_items
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_wholesale_order_items_update" ON wholesale_order_items
  FOR UPDATE USING (false);

CREATE POLICY "block_wholesale_order_items_delete" ON wholesale_order_items
  FOR DELETE USING (false);

-- ── 9. wholesale_deposits — Block direct REST mutations ───────────────────────
-- SELECT is already scoped in 069. Block INSERT/UPDATE/DELETE.

CREATE POLICY "block_wholesale_deposits_insert" ON wholesale_deposits
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_wholesale_deposits_update" ON wholesale_deposits
  FOR UPDATE USING (false);

CREATE POLICY "block_wholesale_deposits_delete" ON wholesale_deposits
  FOR DELETE USING (false);

-- ── 10. wholesale_customers — Block direct REST mutations ──────────────────────
-- SELECT policies already set above. Block mutations.

CREATE POLICY "block_wholesale_customers_insert" ON wholesale_customers
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_wholesale_customers_update" ON wholesale_customers
  FOR UPDATE USING (false);

CREATE POLICY "block_wholesale_customers_delete" ON wholesale_customers
  FOR DELETE USING (false);

-- ── 11. wholesale_products — Block direct REST mutations ───────────────────────
-- SELECT policies already set above. Block mutations.

CREATE POLICY "block_wholesale_products_insert" ON wholesale_products
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_wholesale_products_update" ON wholesale_products
  FOR UPDATE USING (false);

CREATE POLICY "block_wholesale_products_delete" ON wholesale_products
  FOR DELETE USING (false);

COMMIT;

NOTIFY pgrst, 'reload schema';