-- update_user_password RPC
-- Accepts user_id (text) and new password, updates auth.users via supabase_admin,
-- then clears must_change_password flag in admin_users.
-- SECURITY DEFINER so it runs with service role privileges.
CREATE OR REPLACE FUNCTION update_user_password(p_user_id text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM supabase_admin.update_user(p_user_id, jsonb_build_object('password', p_password));

  UPDATE admin_users
  SET must_change_password = false
  WHERE user_id = p_user_id
    AND must_change_password = true;

  RETURN true;
END;
$$;