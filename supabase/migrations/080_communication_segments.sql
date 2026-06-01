-- Migration 080: communication_segments table for reusable audience segments
-- Replaces ad-hoc JSONB audience_rules with named, saved segments

CREATE TABLE communication_segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID REFERENCES brands NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  rules         JSONB NOT NULL DEFAULT '{}',
  -- rules shape mirrors AudienceRules:
  -- { target, stop_id, date_from, date_to, zip_codes, city,
  --   order_history, days_back, product_id, customer_ids }
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Brand scoping is enforced at the application layer (server actions).
-- The SECURITY DEFINER RPCs bypass RLS, so no policies are needed.
-- If RLS is needed later, add permissive policies here.
ALTER TABLE communication_segments DISABLE ROW LEVEL SECURITY;

-- RPCs for segments CRUD
CREATE OR REPLACE FUNCTION get_communication_segments(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'segments', (
      SELECT COALESCE(jsonb_agg(s.*), '[]'::jsonb)
      FROM (
        SELECT id, brand_id, name, description, rules,
               created_by, created_at, updated_at
        FROM communication_segments
        WHERE brand_id = p_brand_id
        ORDER BY name
      ) s
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION upsert_communication_segment(
  p_brand_id    UUID,
  p_name        TEXT,
  p_description TEXT DEFAULT NULL,
  p_rules       JSONB DEFAULT '{}',
  p_created_by  UUID DEFAULT NULL,
  p_id          UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO communication_segments (id, brand_id, name, description, rules, created_by, updated_at)
  VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_brand_id,
    p_name,
    p_description,
    p_rules,
    p_created_by,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    rules       = EXCLUDED.rules,
    updated_at  = now()
  RETURNING to_jsonb(communication_segments.*) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION delete_communication_segment(p_segment_id UUID, p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM communication_segments
  WHERE id = p_segment_id AND brand_id = p_brand_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
