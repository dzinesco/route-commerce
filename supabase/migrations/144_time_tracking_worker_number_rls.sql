-- Add numeric worker_number (PIN) to time_tracking_workers
-- Workers enter this 4-digit PIN on the time clock to identify themselves

ALTER TABLE time_tracking_workers ADD COLUMN IF NOT EXISTS worker_number integer;

-- Auto-assign sequential worker numbers (PINs) per brand, starting at 100
CREATE OR REPLACE FUNCTION assign_worker_number(p_brand_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number integer;
BEGIN
  -- Start at 100, find next available number per brand
  SELECT COALESCE(MAX(worker_number), 99) + 1
  INTO v_next_number
  FROM time_tracking_workers
  WHERE brand_id = p_brand_id;

  RETURN v_next_number;
END;
$$;

-- Update create_time_worker to assign worker_number (PIN)
CREATE OR REPLACE FUNCTION create_time_worker(
  p_brand_id uuid,
  p_name text,
  p_role text DEFAULT 'worker',
  p_lang text DEFAULT 'en',
  p_worker_number integer DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin text;
  v_number integer;
  v_worker time_tracking_workers;
BEGIN
  v_pin := lpad(floor(random() * 10000)::text, 4, '0');
  
  -- Use provided number or assign next available
  IF p_worker_number IS NOT NULL THEN
    v_number := p_worker_number;
  ELSE
    v_number := assign_worker_number(p_brand_id);
  END IF;

  INSERT INTO time_tracking_workers (brand_id, name, role, lang, pin, worker_number)
  VALUES (p_brand_id, p_name, p_role, p_lang, v_pin, v_number)
  RETURNING * INTO v_worker;

  RETURN json_build_object(
    'success', true,
    'worker', row_to_json(v_worker),
    'pin', v_pin,
    'worker_number', v_number
  );
END;
$$;

-- Add RLS policies for time tracking tables
-- These are brand-scoped tables, so RLS enforces brand isolation

ALTER TABLE time_tracking_workers ENABLE ROW LEVEL SECURITY;

-- Workers can only see their own record (for PIN verification)
CREATE POLICY "Workers can select own record"
  ON time_tracking_workers FOR SELECT
  USING (true);

-- Brand admins can manage workers for their brand
CREATE POLICY "Brand admins can manage workers"
  ON time_tracking_workers FOR ALL
  USING (
    brand_id IN (
      SELECT brand_id FROM admin_users
      WHERE admin_users.id = current_setting('request.jwt.claim.sub', true)::uuid
      AND admin_users.role = 'brand_admin'
    )
  );

ALTER TABLE time_tracking_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand admins can manage tasks"
  ON time_tracking_tasks FOR ALL
  USING (
    brand_id IN (
      SELECT brand_id FROM admin_users
      WHERE admin_users.id = current_setting('request.jwt.claim.sub', true)::uuid
      AND admin_users.role = 'brand_admin'
    )
  );

ALTER TABLE time_tracking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand admins can manage time logs"
  ON time_tracking_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM time_tracking_workers w
      JOIN admin_users a ON a.id = current_setting('request.jwt.claim.sub', true)::uuid
      WHERE w.id = time_tracking_logs.worker_id
      AND a.brand_id = w.brand_id
      AND a.role = 'brand_admin'
    )
  );

-- Assign worker_number to existing workers (they already have PINs)
UPDATE time_tracking_workers 
SET worker_number = assign_worker_number(brand_id) 
WHERE worker_number IS NULL;

-- Set NOT NULL constraint
ALTER TABLE time_tracking_workers ALTER COLUMN worker_number SET NOT NULL;