-- =============================================================================
-- Water Log V1 — Consolidated RPC Repair
-- Fixes: gen_salt/crypt calls, schema alignment, overload removal
-- Uses fully-qualified pgcrypto: extensions.crypt / extensions.gen_salt
-- =============================================================================

-- Drop all existing water log RPCs (ignore errors if some don't exist)
DROP FUNCTION IF EXISTS public.verify_water_pin(uuid, text);
DROP FUNCTION IF EXISTS public.create_water_user(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.create_water_user(uuid, text, text);
DROP FUNCTION IF EXISTS public.reset_water_user_pin(uuid);
DROP FUNCTION IF EXISTS public.reset_water_irrigator_pin(uuid);
DROP FUNCTION IF EXISTS public.submit_water_entry(uuid, uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.submit_water_entry(uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.update_water_irrigator(uuid, text, boolean, text);
DROP FUNCTION IF EXISTS public.update_water_user(uuid, text, boolean, text);
DROP FUNCTION IF EXISTS public.get_water_irrigators(uuid);
DROP FUNCTION IF EXISTS public.get_water_entries(uuid, int);
DROP FUNCTION IF EXISTS public.get_water_entries(uuid);

-- =============================================================================
-- verify_water_pin
-- Returns jsonb: {success, user_id, name, role, session_id, lang} or {success:false, error}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.verify_water_pin(p_brand_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
STATIC
AS $$
DECLARE
  v_user      jsonb;
  v_session_id uuid;
BEGIN
  -- Look up user by PIN (pgcrypto fully-qualified)
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'role', role,
    'lang', language_preference
  ) INTO v_user
  FROM public.water_users
  WHERE brand_id   = p_brand_id
    AND active     = true
    AND role      IN ('irrigator', 'water_admin')
    AND extensions.crypt(p_pin, pin_hash) = pin_hash;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Update last-used timestamp
  UPDATE public.water_users
  SET last_used_at = now()
  WHERE id = (v_user->>'id')::uuid;

  -- Create session
  v_session_id := gen_random_uuid();
  INSERT INTO public.water_sessions (id, irrigator_id, expires_at)
  VALUES (v_session_id, (v_user->>'id')::uuid, now() + interval '4 hours');

  RETURN jsonb_build_object(
    'success',   true,
    'user_id',   v_user->>'id',
    'name',      v_user->>'name',
    'role',      v_user->>'role',
    'session_id', v_session_id,
    'lang',      v_user->>'lang'
  );
END;
$$;

COMMENT ON FUNCTION public.verify_water_pin IS
  'Verify irrigator/admin PIN, create session, return user info as JSONB.';

-- =============================================================================
-- create_water_user
-- Returns jsonb: {success, user: {id,name,role}, pin}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_water_user(
  p_brand_id uuid,
  p_name     text,
  p_role     text,
  p_lang     text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
STATIC
AS $$
DECLARE
  v_brand_id  uuid;
  v_raw_pin   text;
  v_user_id   uuid;
  v_user_role text;
BEGIN
  v_brand_id  := COALESCE(p_brand_id, '64294306-5f42-463d-a5e8-2ad6c81a96de'::uuid);
  v_raw_pin   := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  v_user_role := COALESCE(p_role, 'irrigator');

  INSERT INTO public.water_users (brand_id, name, pin_hash, role, language_preference, active)
  VALUES (
    v_brand_id,
    p_name,
    extensions.crypt(v_raw_pin, extensions.gen_salt('bf')),
    v_user_role,
    p_lang,
    true
  )
  RETURNING id INTO v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user',    jsonb_build_object('id', v_user_id, 'name', p_name, 'role', v_user_role),
    'pin',     v_raw_pin
  );
END;
$$;

COMMENT ON FUNCTION public.create_water_user IS
  'Create water user, generate PIN, return hashed PIN and plaintext PIN once.';

-- =============================================================================
-- reset_water_user_pin
-- Returns jsonb: {success, user_id, pin}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reset_water_user_pin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STATIC
AS $$
DECLARE
  v_raw_pin text;
  v_name    text;
BEGIN
  v_raw_pin := lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  UPDATE public.water_users
  SET pin_hash = extensions.crypt(v_raw_pin, extensions.gen_salt('bf'))
  WHERE id = p_user_id
  RETURNING name INTO v_name;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'pin', v_raw_pin);
END;
$$;

-- =============================================================================
-- submit_water_entry
-- Returns jsonb: {success, entry_id} or {success:false, error}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.submit_water_entry(
  p_session_id    uuid,
  p_headgate_id   uuid,
  p_measurement   numeric,
  p_unit          text,
  p_notes         text DEFAULT '',
  p_submitted_via text DEFAULT 'field'
)
RETURNS jsonb
LANGUAGE plpgsql
STATIC
AS $$
DECLARE
  v_sess   record;
  v_brand_id uuid;
  v_entry_id uuid;
BEGIN
  -- Look up session and join to water_users to get brand_id
  SELECT s.id, s.irrigator_id, u.brand_id
  INTO   v_sess, v_brand_id
  FROM   public.water_sessions s
  JOIN   public.water_users    u ON s.irrigator_id = u.id
  WHERE  s.id        = p_session_id
    AND  s.expires_at > now();

  IF NOT FOUND OR v_sess.irrigator_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session expired or invalid');
  END IF;

  INSERT INTO public.water_log_entries
    (brand_id, headgate_id, irrigator_id, measurement, unit, notes, submitted_via)
  VALUES
    (v_brand_id, p_headgate_id, v_sess.irrigator_id, p_measurement, p_unit, p_notes, p_submitted_via)
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('success', true, 'entry_id', v_entry_id);
END;
$$;

COMMENT ON FUNCTION public.submit_water_entry IS
  'Submit a water log entry using an active wl_session cookie.';

-- =============================================================================
-- update_water_user
-- Returns jsonb: {success} or {success:false, error}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_water_user(
  p_user_id   uuid,
  p_name      text,
  p_active    boolean,
  p_lang      text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
STATIC
AS $$
BEGIN
  UPDATE public.water_users
  SET name = p_name, active = p_active, language_preference = p_lang
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- get_water_entries
-- Returns jsonb: {entries: [...]}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_water_entries(p_brand_id uuid, p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STATIC
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('entries', COALESCE(
      (SELECT jsonb_agg(e ORDER BY e.logged_at DESC)
       FROM (
         SELECT
           e.id,
           e.headgate_id,
           e.irrigator_id,
           h.name  AS headgate_name,
           u.name  AS irrigator_name,
           e.measurement,
           e.unit,
           e.notes,
           e.submitted_via,
           e.logged_at
         FROM  public.water_log_entries e
         JOIN  public.water_headgates    h ON e.headgate_id = h.id
         JOIN  public.water_users        u ON e.irrigator_id = u.id
         WHERE e.brand_id = p_brand_id
         ORDER BY e.logged_at DESC
         LIMIT  p_limit
       ) e
      ), '[]'::jsonb
    ))
  );
END;
$$;

-- =============================================================================
-- Reload PostgREST schema cache so new signatures are visible
-- =============================================================================
NOTIFY pgrst, 'reload schema';
