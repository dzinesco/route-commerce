-- Migration 033: Admin Users CRUD
--
-- RPC functions for listing, creating, updating, and deactivating admin_users.
-- Security constraints enforced at SQL level:
--   - platform_admin: can manage all users and any brand
--   - brand_admin with can_manage_users: can only manage users within their brand,
--     cannot create platform_admin, cannot assign foreign brand_id
--   - store_employee: cannot access these functions (guarded at TS route level)
--
-- Display name: joins auth.users raw_user_meta_data -> display_name | name, falls back to email.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. get_admin_users — list users, optionally filtered by brand
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_admin_users(UUID);
CREATE OR REPLACE FUNCTION get_admin_users(p_brand_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  brand_name TEXT,
  can_manage_products BOOLEAN,
  can_manage_stops BOOLEAN,
  can_manage_orders BOOLEAN,
  can_manage_pickup BOOLEAN,
  can_manage_messages BOOLEAN,
  can_manage_refunds BOOLEAN,
  can_manage_users BOOLEAN,
  can_manage_water_log BOOLEAN,
  can_manage_reports BOOLEAN,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      (au.raw_user_meta_data->>'full_name')::TEXT,
      u.email
    ) AS display_name,
    u.email,
    au.role::TEXT,
    au.brand_id,
    b.name AS brand_name,
    au.can_manage_products,
    au.can_manage_stops,
    au.can_manage_orders,
    au.can_manage_pickup,
    au.can_manage_messages,
    au.can_manage_refunds,
    au.can_manage_users,
    au.can_manage_water_log,
    COALESCE(au.can_manage_reports, false) AS can_manage_reports,
    au.active,
    au.created_at,
    au.last_login
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  LEFT JOIN brands b ON au.brand_id = b.id
  WHERE
    -- platform_admin sees all; brand_admin sees only their brand
    (
      EXISTS (
        SELECT 1 FROM admin_users caller
        WHERE caller.user_id = auth.uid()
        AND caller.role = 'platform_admin'
      )
      OR
      (
        EXISTS (
          SELECT 1 FROM admin_users caller
          WHERE caller.user_id = auth.uid()
          AND caller.role = 'brand_admin'
          AND caller.can_manage_users = true
        )
        AND (p_brand_id IS NULL OR au.brand_id = p_brand_id)
        AND (
          EXISTS (
            SELECT 1 FROM admin_users caller
            WHERE caller.user_id = auth.uid()
            AND caller.brand_id = au.brand_id
          )
        )
      )
    )
  ORDER BY au.created_at DESC;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. create_admin_user — create a new admin user record
--
-- p_email: must already have a Supabase auth account
-- p_role: 'platform_admin' | 'brand_admin' | 'store_employee'
-- p_brand_id: required for brand_admin and store_employee
-- p_flags: JSONB with individual can_manage_* booleans
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, UUID, JSONB);
CREATE OR REPLACE FUNCTION create_admin_user(
  p_email TEXT,
  p_role TEXT,
  p_brand_id UUID DEFAULT NULL,
  p_flags JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_brand_id UUID;
  v_caller_can_manage_users BOOLEAN;
  v_target_user_id UUID;
  v_new_id UUID;
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look up caller
  SELECT role, brand_id, can_manage_users
  INTO v_caller_role, v_caller_brand_id, v_caller_can_manage_users
  FROM admin_users
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  -- Security: brand_admin cannot create platform_admin
  IF v_caller_role = 'brand_admin' AND p_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
  END IF;

  -- Security: brand_admin can only create users in their own brand
  IF v_caller_role = 'brand_admin' THEN
    IF p_brand_id IS DISTINCT FROM v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to create a user for another brand';
    END IF;
    IF p_brand_id IS NULL AND p_role = 'platform_admin' THEN
      RAISE EXCEPTION 'brand_admin cannot create platform_admin';
    END IF;
  END IF;

  -- Find the auth user by email
  BEGIN
    SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END IF;

  -- Check no existing admin_users record for this user
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_target_user_id) THEN
    RAISE EXCEPTION 'Admin user with email % already exists', p_email;
  END IF;

  -- Insert new admin user
  INSERT INTO admin_users (
    user_id, role, brand_id,
    can_manage_products, can_manage_stops, can_manage_orders, can_manage_pickup,
    can_manage_messages, can_manage_refunds, can_manage_users, can_manage_water_log,
    can_manage_reports, active
  ) VALUES (
    v_target_user_id, p_role, p_brand_id,
    COALESCE((p_flags->>'can_manage_products')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_stops')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_orders')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_pickup')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_messages')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_refunds')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_users')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_water_log')::BOOLEAN, false),
    COALESCE((p_flags->>'can_manage_reports')::BOOLEAN, false),
    true
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY
  SELECT
    au.id, au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      (au.raw_user_meta_data->>'full_name')::TEXT,
      u.email
    ) AS display_name,
    u.email, au.role::TEXT, au.brand_id, au.active, au.created_at
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.id = v_new_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. update_admin_user — update role, brand, flags, or active status
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS update_admin_user(UUID, TEXT, UUID, JSONB, BOOLEAN);
CREATE OR REPLACE FUNCTION update_admin_user(
  p_id UUID,
  p_role TEXT DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_flags JSONB DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  active BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_brand_id UUID;
  v_caller_can_manage_users BOOLEAN;
  v_target_role TEXT;
  v_target_brand_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, brand_id, can_manage_users
  INTO v_caller_role, v_caller_brand_id, v_caller_can_manage_users
  FROM admin_users
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  -- Cannot update your own account's role
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = p_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Cannot update your own admin account';
  END IF;

  -- Look up target
  SELECT role, brand_id INTO v_target_role, v_target_brand_id
  FROM admin_users WHERE id = p_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Security: brand_admin cannot demote/promote platform_admin
  IF v_caller_role = 'brand_admin' AND v_target_role = 'platform_admin' AND p_role IS NOT NULL THEN
    RAISE EXCEPTION 'Insufficient permissions to modify a platform_admin';
  END IF;

  -- Security: brand_admin cannot give platform_admin role
  IF v_caller_role = 'brand_admin' AND p_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
  END IF;

  -- Security: brand_admin can only affect users in their brand
  IF v_caller_role = 'brand_admin' THEN
    IF v_target_brand_id != v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to modify a user from another brand';
    END IF;
    IF p_brand_id IS NOT NULL AND p_brand_id != v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to assign a user to another brand';
    END IF;
    IF p_role = 'platform_admin' THEN
      RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
    END IF;
  END IF;

  -- Apply updates
  UPDATE admin_users SET
    role = COALESCE(p_role, role),
    brand_id = COALESCE(p_brand_id, brand_id),
    can_manage_products = COALESCE((p_flags->>'can_manage_products')::BOOLEAN, can_manage_products),
    can_manage_stops = COALESCE((p_flags->>'can_manage_stops')::BOOLEAN, can_manage_stops),
    can_manage_orders = COALESCE((p_flags->>'can_manage_orders')::BOOLEAN, can_manage_orders),
    can_manage_pickup = COALESCE((p_flags->>'can_manage_pickup')::BOOLEAN, can_manage_pickup),
    can_manage_messages = COALESCE((p_flags->>'can_manage_messages')::BOOLEAN, can_manage_messages),
    can_manage_refunds = COALESCE((p_flags->>'can_manage_refunds')::BOOLEAN, can_manage_refunds),
    can_manage_users = COALESCE((p_flags->>'can_manage_users')::BOOLEAN, can_manage_users),
    can_manage_water_log = COALESCE((p_flags->>'can_manage_water_log')::BOOLEAN, can_manage_water_log),
    can_manage_reports = COALESCE((p_flags->>'can_manage_reports')::BOOLEAN, can_manage_reports),
    active = COALESCE(p_active, active)
  WHERE id = p_id;

  RETURN QUERY
  SELECT
    au.id, au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      (au.raw_user_meta_data->>'full_name')::TEXT,
      u.email
    ) AS display_name,
    u.email, au.role::TEXT, au.brand_id, au.active, NOW() AS updated_at
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.id = p_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. delete_admin_user — remove admin user record
--    Cannot delete your own account.
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS delete_admin_user(UUID);
CREATE OR REPLACE FUNCTION delete_admin_user(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM admin_users WHERE user_id = auth.uid();
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  -- Cannot delete self
  SELECT user_id INTO v_target_user_id FROM admin_users WHERE id = p_id;
  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own admin account';
  END IF;

  -- brand_admin can only delete users in their brand
  IF v_caller_role = 'brand_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = p_id AND brand_id = (SELECT brand_id FROM admin_users WHERE user_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to delete this user';
    END IF;
  END IF;

  DELETE FROM admin_users WHERE id = p_id;
  RETURN true;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';