-- Migration: 037_update_admin_user_profile
-- Extends update_admin_user to accept display_name and phone_number.
-- Updates admin_users and syncs auth.users raw_user_meta_data.
-- After update, writes to admin_action_logs.

DROP FUNCTION IF EXISTS update_admin_user(UUID, TEXT, UUID, JSONB, BOOLEAN, TEXT, TEXT);
CREATE OR REPLACE FUNCTION update_admin_user(
  p_id UUID,
  p_role TEXT DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_flags JSONB DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  brand_id UUID,
  active BOOLEAN,
  phone_number TEXT,
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
  v_target_user_id UUID;
  v_admin_email TEXT;
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
  SELECT role, brand_id, user_id INTO v_target_role, v_target_brand_id, v_target_user_id
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

  -- Get caller email for audit log
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  -- Apply updates to admin_users
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
    active = COALESCE(p_active, active),
    display_name = COALESCE(p_display_name, display_name),
    phone_number = COALESCE(p_phone_number, phone_number)
  WHERE id = p_id;

  -- Sync display_name / phone_number to auth.users raw_user_meta_data
  IF p_display_name IS NOT NULL OR p_phone_number IS NOT NULL THEN
    UPDATE auth.users SET
      raw_user_meta_data = jsonb_strip_nulls(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{display_name}',
          to_jsonb(p_display_name)
        ) ||
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{phone_number}',
          to_jsonb(p_phone_number)
        )
      )
    WHERE id = v_target_user_id;
  END IF;

  -- Audit log: record the action
  PERFORM log_admin_action(jsonb_build_object(
    'action_type', 'update',
    'admin_id', auth.uid(),
    'admin_email', v_admin_email,
    'affected_user_id', v_target_user_id,
    'brand_id', COALESCE(p_brand_id, v_target_brand_id),
    'details', jsonb_build_object(
      'changed_fields', ARRAY_REMOVE(ARRAY[
        CASE WHEN p_role IS NOT NULL THEN 'role' ELSE NULL END,
        CASE WHEN p_brand_id IS NOT NULL THEN 'brand_id' ELSE NULL END,
        CASE WHEN p_flags IS NOT NULL THEN 'flags' ELSE NULL END,
        CASE WHEN p_active IS NOT NULL THEN 'active' ELSE NULL END,
        CASE WHEN p_display_name IS NOT NULL THEN 'display_name' ELSE NULL END,
        CASE WHEN p_phone_number IS NOT NULL THEN 'phone_number' ELSE NULL END
      ], NULL)
    )
  ));

  RETURN QUERY
  SELECT
    au.id, au.user_id,
    COALESCE(
      (au.raw_user_meta_data->>'display_name')::TEXT,
      u.email
    ) AS display_name,
    u.email, au.role::TEXT, au.brand_id, au.active,
    au.phone_number, NOW() AS updated_at
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  WHERE au.id = p_id;
END;
$$;

-- Update create_admin_user to also log
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
  v_admin_email TEXT;
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

  IF v_caller_role = 'brand_admin' AND p_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Insufficient permissions to create a platform_admin';
  END IF;

  IF v_caller_role = 'brand_admin' THEN
    IF p_brand_id IS DISTINCT FROM v_caller_brand_id THEN
      RAISE EXCEPTION 'Insufficient permissions to create a user for another brand';
    END IF;
    IF p_brand_id IS NULL AND p_role = 'platform_admin' THEN
      RAISE EXCEPTION 'brand_admin cannot create platform_admin';
    END IF;
  END IF;

  BEGIN
    SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email % not found', p_email;
  END IF;

  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_target_user_id) THEN
    RAISE EXCEPTION 'Admin user with email % already exists', p_email;
  END IF;

  -- Get caller email for audit log
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

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

  -- Audit log: record the creation
  PERFORM log_admin_action(jsonb_build_object(
    'action_type', 'create',
    'admin_id', auth.uid(),
    'admin_email', v_admin_email,
    'affected_user_id', v_target_user_id,
    'brand_id', p_brand_id,
    'details', jsonb_build_object('new_role', p_role)
  ));

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

-- Update delete_admin_user to also log
CREATE OR REPLACE FUNCTION delete_admin_user(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_user_id UUID;
  v_admin_email TEXT;
  v_target_brand_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM admin_users WHERE user_id = auth.uid();
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;

  SELECT user_id, brand_id INTO v_target_user_id, v_target_brand_id
  FROM admin_users WHERE id = p_id;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();

  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own admin account';
  END IF;

  IF v_caller_role = 'brand_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = p_id AND brand_id = (SELECT brand_id FROM admin_users WHERE user_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to delete this user';
    END IF;
  END IF;

  -- Audit log: record the deletion
  PERFORM log_admin_action(jsonb_build_object(
    'action_type', 'delete',
    'admin_id', auth.uid(),
    'admin_email', v_admin_email,
    'affected_user_id', v_target_user_id,
    'brand_id', v_target_brand_id,
    'details', jsonb_build_object('deleted_admin_id', p_id)
  ));

  DELETE FROM admin_users WHERE id = p_id;
  RETURN true;
END;
$$;

NOTIFY pgrst, 'reload schema';
