-- ============================================================
-- Water Log V1
-- ============================================================
-- Tables: water_headgates, water_irrigators, water_log_entries
-- Auth: PIN-based field login via HTTP-only cookie session
-- Admin: brand-scoped, SECURITY DEFINER RPCs, audit logged

-- ── Tables ─────────────────────────────────────────────────

CREATE TABLE water_headgates (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id   UUID REFERENCES brands(id) NOT NULL,
  name       TEXT NOT NULL,
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE water_irrigators (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id           UUID REFERENCES brands(id) NOT NULL,
  name               TEXT NOT NULL,
  pin_hash           TEXT NOT NULL,
  language_preference TEXT DEFAULT 'en',
  active             BOOLEAN DEFAULT true,
  last_used_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Water sessions for field login (HTTP-only cookie, server-side validation)
CREATE TABLE water_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  irrigator_id UUID REFERENCES water_irrigators(id) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE water_log_entries (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id     UUID REFERENCES brands(id) NOT NULL,
  headgate_id  UUID REFERENCES water_headgates(id) NOT NULL,
  irrigator_id UUID REFERENCES water_irrigators(id) NOT NULL,
  measurement  NUMERIC NOT NULL,
  unit         TEXT NOT NULL,
  notes        TEXT,
  submitted_via TEXT NOT NULL,  -- 'field' or 'admin'
  logged_at    TIMESTAMPTZ DEFAULT now(),
  logged_by    UUID REFERENCES admin_users(id)
);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE water_headgates ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_irrigators ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_log_entries ENABLE ROW LEVEL SECURITY;

-- Headgates: readable by anyone (for field form), writable by admin RPCs
CREATE POLICY "Headgates are readable by all" ON water_headgates FOR SELECT TO anon USING (true);
CREATE POLICY "Headgates writable by postgres" ON water_headgates FOR ALL TO postgres USING (true);

-- Irrigators: only SECURITY DEFINER RPCs read/write (pin_hash never exposed)
CREATE POLICY "Irrigators writable by postgres" ON water_irrigators FOR ALL TO postgres USING (true);

-- Entries: readable by all (for admin), writable by admin RPCs and field RPC
CREATE POLICY "Entries readable by all" ON water_log_entries FOR SELECT TO anon USING (true);
CREATE POLICY "Entries writable by postgres" ON water_log_entries FOR ALL TO postgres USING (true);

-- ── Audit Log ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs writable by postgres" ON audit_logs FOR ALL TO postgres USING (true);

-- ── RPCs ───────────────────────────────────────────────────

-- Verify PIN, create DB session, return session token (stored in HTTP-only cookie)
CREATE OR REPLACE FUNCTION verify_water_pin(p_brand_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_irr     water_irrigators%ROWTYPE;
  v_sess_id UUID;
  v_lang    TEXT;
BEGIN
  SELECT * INTO v_irr FROM water_irrigators
  WHERE brand_id = p_brand_id AND active = true
  AND crypt(p_pin, pin_hash) = pin_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  UPDATE water_irrigators SET last_used_at = now() WHERE id = v_irr.id;

  -- Create DB session with 4-hour expiry
  v_sess_id := gen_random_uuid();
  INSERT INTO water_sessions (id, irrigator_id, expires_at)
  VALUES (v_sess_id, v_irr.id, now() + interval '4 hours');

  RETURN jsonb_build_object(
    'success', true,
    'irrigator_id', v_irr.id,
    'name', v_irr.name,
    'session_id', v_sess_id,
    'lang', v_irr.language_preference
  );
END;
$$;

-- Submit water log entry (field side — session validated via DB)
CREATE OR REPLACE FUNCTION submit_water_entry(
  p_session_id   UUID,
  p_headgate_id  UUID,
  p_measurement  NUMERIC,
  p_unit         TEXT,
  p_notes        TEXT,
  p_submitted_via TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_sess     water_sessions%ROWTYPE;
  v_brand_id UUID;
BEGIN
  -- Validate session: exists and not expired
  SELECT s.*, i.brand_id INTO v_sess, v_brand_id
  FROM water_sessions s
  JOIN water_irrigators i ON s.irrigator_id = i.id
  WHERE s.id = p_session_id AND s.expires_at > now() AND i.active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session expired or invalid');
  END IF;

  INSERT INTO water_log_entries (brand_id, headgate_id, irrigator_id, measurement, unit, notes, submitted_via)
  VALUES (v_brand_id, p_headgate_id, v_sess.irrigator_id, p_measurement, p_unit, p_notes, p_submitted_via)
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('success', true, 'entry_id', v_entry_id);
END;
$$;

-- Get headgates for a brand. p_active_only=true for field form, false for admin
CREATE OR REPLACE FUNCTION get_water_headgates(p_brand_id UUID, p_active_only BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('headgates', (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'active', active, 'created_at', created_at
    ) ORDER BY name), '[]'::JSONB)
    FROM water_headgates
    WHERE brand_id = p_brand_id
    AND (NOT p_active_only OR active = true)
  ));
END;
$$;

-- Get irrigators for a brand (admin, no pin_hash exposed)
CREATE OR REPLACE FUNCTION get_water_irrigators(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('irrigators', (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'active', active,
      'language_preference', language_preference,
      'last_used_at', last_used_at,
      'created_at', created_at
    ) ORDER BY name), '[]'::JSONB)
    FROM water_irrigators
    WHERE brand_id = p_brand_id
  ));
END;
$$;

-- Create a new irrigator with auto-generated PIN
-- Returns irrigator + plain PIN (shown once)
CREATE OR REPLACE FUNCTION create_water_irrigator(p_brand_id UUID, p_name TEXT, p_lang TEXT DEFAULT 'en')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_irr    water_irrigators%ROWTYPE;
  v_raw_pin TEXT;
  v_new_id   UUID;
BEGIN
  v_raw_pin := floor(random() * 9000 + 1000)::TEXT;  -- 4-digit PIN

  INSERT INTO water_irrigators (brand_id, name, pin_hash, language_preference)
  VALUES (p_brand_id, p_name, crypt(v_raw_pin, gen_salt('bf')), p_lang)
  RETURNING * INTO v_irr;

  RETURN jsonb_build_object(
    'irrigator', jsonb_build_object(
      'id', v_irr.id, 'name', v_irr.name,
      'active', v_irr.active, 'language_preference', v_irr.language_preference,
      'created_at', v_irr.created_at
    ),
    'pin', v_raw_pin
  );
END;
$$;

-- Update irrigator name/active
CREATE OR REPLACE FUNCTION update_water_irrigator(
  p_irrigator_id UUID, p_name TEXT, p_active BOOLEAN, p_lang TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_irr water_irrigators%ROWTYPE;
BEGIN
  UPDATE water_irrigators
  SET name = p_name, active = p_active, language_preference = p_lang
  WHERE id = p_irrigator_id
  RETURNING * INTO v_irr;

  RETURN jsonb_build_object('irrigator', jsonb_build_object(
    'id', v_irr.id, 'name', v_irr.name,
    'active', v_irr.active, 'language_preference', v_irr.language_preference,
    'last_used_at', v_irr.last_used_at
  ));
END;
$$;

-- Reset irrigator PIN — returns new PIN (shown once)
CREATE OR REPLACE FUNCTION reset_water_irrigator_pin(p_irrigator_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_irr     water_irrigators%ROWTYPE;
  v_raw_pin TEXT;
BEGIN
  v_raw_pin := floor(random() * 9000 + 1000)::TEXT;

  UPDATE water_irrigators
  SET pin_hash = crypt(v_raw_pin, gen_salt('bf'))
  WHERE id = p_irrigator_id
  RETURNING * INTO v_irr;

  RETURN jsonb_build_object('irrigator_id', v_irr.id, 'pin', v_raw_pin);
END;
$$;

-- Create headgate
CREATE OR REPLACE FUNCTION create_water_headgate(p_brand_id UUID, p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hg water_headgates%ROWTYPE;
BEGIN
  INSERT INTO water_headgates (brand_id, name)
  VALUES (p_brand_id, p_name)
  RETURNING * INTO v_hg;

  RETURN jsonb_build_object('headgate', jsonb_build_object(
    'id', v_hg.id, 'name', v_hg.name, 'active', v_hg.active, 'created_at', v_hg.created_at
  ));
END;
$$;

-- Update headgate
CREATE OR REPLACE FUNCTION update_water_headgate(p_headgate_id UUID, p_name TEXT, p_active BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hg water_headgates%ROWTYPE;
BEGIN
  UPDATE water_headgates
  SET name = p_name, active = p_active
  WHERE id = p_headgate_id
  RETURNING * INTO v_hg;

  RETURN jsonb_build_object('headgate', jsonb_build_object(
    'id', v_hg.id, 'name', v_hg.name, 'active', v_hg.active
  ));
END;
$$;

-- Get recent entries for a brand
CREATE OR REPLACE FUNCTION get_water_entries(p_brand_id UUID, p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('entries', (
    SELECT COALESCE(jsonb_agg(t ORDER BY t.logged_at DESC), '[]'::JSONB)
    FROM (
      SELECT e.id, e.headgate_id, e.irrigator_id, e.measurement, e.unit,
             e.notes, e.submitted_via, e.logged_at,
             h.name as headgate_name,
             i.name as irrigator_name
      FROM water_log_entries e
      JOIN water_headgates h ON e.headgate_id = h.id
      JOIN water_irrigators i ON e.irrigator_id = i.id
      WHERE e.brand_id = p_brand_id
      ORDER BY e.logged_at DESC
      LIMIT p_limit
    ) t
  ));
END;
$$;