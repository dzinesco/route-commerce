-- Time tracking workers table
CREATE TABLE IF NOT EXISTS time_tracking_workers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text DEFAULT 'worker',
  lang text DEFAULT 'en',
  pin text NOT NULL,
  active boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS time_tracking_workers_pin_brand ON time_tracking_workers(brand_id, pin) WHERE active = true;

-- Time tracking tasks table
CREATE TABLE IF NOT EXISTS time_tracking_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_es text,
  unit text DEFAULT 'hours',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Workers RPCs
CREATE OR REPLACE FUNCTION create_time_worker(
  p_brand_id uuid,
  p_name text,
  p_role text DEFAULT 'worker',
  p_lang text DEFAULT 'en'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin text;
  v_worker time_tracking_workers;
BEGIN
  v_pin := lpad(floor(random() * 10000)::text, 4, '0');

  INSERT INTO time_tracking_workers (brand_id, name, role, lang, pin)
  VALUES (p_brand_id, p_name, p_role, p_lang, v_pin)
  RETURNING * INTO v_worker;

  RETURN json_build_object(
    'success', true,
    'worker', row_to_json(v_worker),
    'pin', v_pin
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_time_tracking_workers(p_brand_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'workers', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, name, role, lang, active, last_used_at, created_at
        FROM time_tracking_workers
        WHERE brand_id = p_brand_id
        ORDER BY name
      ) t
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_time_worker(
  p_worker_id uuid,
  p_name text,
  p_role text,
  p_lang text,
  p_active boolean
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE time_tracking_workers
  SET name = p_name, role = p_role, lang = p_lang, active = p_active
  WHERE id = p_worker_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION delete_time_worker(p_worker_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM time_tracking_workers WHERE id = p_worker_id;
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION reset_time_worker_pin(p_worker_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin text;
BEGIN
  v_pin := lpad(floor(random() * 10000)::text, 4, '0');
  UPDATE time_tracking_workers SET pin = v_pin WHERE id = p_worker_id;
  RETURN json_build_object('success', true, 'pin', v_pin);
END;
$$;

-- Tasks RPCs
CREATE OR REPLACE FUNCTION get_time_tracking_tasks(p_brand_id uuid, p_active_only boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'tasks', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, name, name_es, unit, sort_order, active, created_at
        FROM time_tracking_tasks
        WHERE brand_id = p_brand_id
          AND (NOT p_active_only OR active = true)
        ORDER BY sort_order, name
      ) t
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_time_task(
  p_brand_id uuid,
  p_name text,
  p_name_es text DEFAULT NULL,
  p_unit text DEFAULT 'hours',
  p_sort_order integer DEFAULT 0
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO time_tracking_tasks (brand_id, name, name_es, unit, sort_order)
  VALUES (p_brand_id, p_name, p_name_es, p_unit, p_sort_order)
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_time_task(
  p_task_id uuid,
  p_name text,
  p_name_es text,
  p_unit text,
  p_active boolean,
  p_sort_order integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE time_tracking_tasks
  SET name = p_name, name_es = p_name_es, unit = p_unit,
      active = p_active, sort_order = p_sort_order
  WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION delete_time_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM time_tracking_tasks WHERE id = p_task_id;
  RETURN json_build_object('success', true);
END;
$$;
