-- Migration 119: Add brand_id to regenerate_headgate_token for ownership enforcement
CREATE OR REPLACE FUNCTION regenerate_headgate_token(p_headgate_id UUID, p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_token UUID;
  v_headgate_brand_id UUID;
BEGIN
  -- Verify headgate exists and belongs to brand
  SELECT brand_id INTO v_headgate_brand_id
  FROM water_headgates
  WHERE id = p_headgate_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Headgate not found');
  END IF;

  -- Brand scoping: if brand_id is not null, enforce ownership
  IF p_brand_id IS NOT NULL AND v_headgate_brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  v_new_token := gen_random_uuid();
  UPDATE water_headgates SET headgate_token = v_new_token WHERE id = p_headgate_id;

  RETURN jsonb_build_object('success', true, 'token', v_new_token);
END;
$$;
