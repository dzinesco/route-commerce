-- Migration 088: Brand feature flags / add-on licensing system
-- Enables per-brand add-on enablement for Harvest Reach, Wholesale Portal, Water Log, AI Tools, etc.

CREATE TABLE IF NOT EXISTS brand_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL, -- e.g., 'harvest_reach', 'wholesale_portal', 'water_log', 'ai_tools'
  enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, feature_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS brand_features_brand_id_idx ON brand_features(brand_id);

-- RPC to get all features for a brand
CREATE OR REPLACE FUNCTION get_brand_features(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  result := jsonb_object_agg(
    f.feature_key,
    CASE WHEN f.enabled AND f.disabled_at IS NULL THEN true ELSE false END
  )
  FROM brand_features f
  WHERE f.brand_id = p_brand_id;

  -- If no features set, return empty object (env vars will be fallback)
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- RPC to set a single feature on/off
CREATE OR REPLACE FUNCTION set_brand_feature(
  p_brand_id UUID,
  p_feature_key TEXT,
  p_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO brand_features (brand_id, feature_key, enabled, enabled_at)
  VALUES (p_brand_id, p_feature_key, p_enabled, CASE WHEN p_enabled THEN now() ELSE NULL END)
  ON CONFLICT (brand_id, feature_key)
  DO UPDATE SET
    enabled = p_enabled,
    enabled_at = CASE WHEN p_enabled AND brand_features.enabled_at IS NULL THEN now() ELSE brand_features.enabled_at END,
    disabled_at = CASE WHEN NOT p_enabled THEN now() ELSE NULL END;
  RETURN true;
END;
$$;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON brand_features TO authenticated;
GRANT EXECUTE ON FUNCTION get_brand_features(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_brand_feature(UUID, TEXT, BOOLEAN) TO authenticated;