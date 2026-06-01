-- Migration 089: AI providers config + custom integrations
-- Store per-brand AI provider settings and custom integration definitions

ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS ai_provider_settings JSONB DEFAULT '{
    "provider": "openai",
    "api_key": null,
    "org_id": null,
    "model": "gpt-4o-mini",
    "custom_endpoint": null
  }'::jsonb;

ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS custom_integrations JSONB DEFAULT '[]'::jsonb;

-- RPC to get AI provider config
CREATE OR REPLACE FUNCTION get_ai_provider_settings(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT ai_provider_settings FROM brand_settings WHERE brand_id = p_brand_id),
    '{"provider": "openai", "model": "gpt-4o-mini"}'::jsonb
  );
END;
$$;

-- RPC to save AI provider config
CREATE OR REPLACE FUNCTION set_ai_provider_settings(
  p_brand_id UUID,
  p_settings JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE brand_settings
  SET ai_provider_settings = p_settings,
      updated_at = now()
  WHERE brand_id = p_brand_id;
  RETURN true;
END;
$$;

-- RPC to get custom integrations
CREATE OR REPLACE FUNCTION get_custom_integrations(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT custom_integrations FROM brand_settings WHERE brand_id = p_brand_id),
    '[]'::jsonb
  );
END;
$$;

-- RPC to add/update a custom integration
CREATE OR REPLACE FUNCTION upsert_custom_integration(
  p_brand_id UUID,
  p_integration JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_integrations JSONB;
  updated_integrations JSONB;
  integration_id TEXT;
BEGIN
  current_integrations := COALESCE(
    (SELECT custom_integrations FROM brand_settings WHERE brand_id = p_brand_id),
    '[]'::jsonb
  );

  integration_id := p_integration->>'id';

  -- Remove existing with same id, then append
  current_integrations := (
    SELECT jsonb_agg(item)
    FROM (
      SELECT item
      FROM jsonb_array_elements(current_integrations) item
      WHERE item->>'id' != integration_id
      UNION ALL
      SELECT p_integration
    ) t
  );

  UPDATE brand_settings
  SET custom_integrations = current_integrations,
      updated_at = now()
  WHERE brand_id = p_brand_id;

  RETURN current_integrations;
END;
$$;

-- RPC to delete a custom integration
CREATE OR REPLACE FUNCTION delete_custom_integration(
  p_brand_id UUID,
  p_integration_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE brand_settings
  SET custom_integrations = (
    SELECT jsonb_agg(item)
    FROM (
      SELECT item
      FROM jsonb_array_elements(custom_integrations) item
      WHERE item->>'id' != p_integration_id
    ) t
  ),
  updated_at = now()
  WHERE brand_id = p_brand_id;

  RETURN (SELECT custom_integrations FROM brand_settings WHERE brand_id = p_brand_id);
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_provider_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_ai_provider_settings(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_custom_integrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_custom_integration(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_custom_integration(UUID, TEXT) TO authenticated;