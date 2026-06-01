-- Migration 045: Extend payment_settings RPCs for Square Sync
-- Adds square_sync_enabled, square_inventory_mode, square_last_sync_at, square_last_sync_error
-- to upsert_payment_settings and get_payment_settings

CREATE OR REPLACE FUNCTION public.upsert_payment_settings(
  p_brand_id                UUID,
  p_provider                TEXT,
  p_stripe_publishable_key   TEXT DEFAULT NULL,
  p_stripe_secret_key       TEXT DEFAULT NULL,
  p_square_access_token     TEXT DEFAULT NULL,
  p_square_location_id      TEXT DEFAULT NULL,
  p_square_sync_enabled     BOOLEAN DEFAULT NULL,
  p_square_inventory_mode   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_settings (
    brand_id, provider,
    stripe_publishable_key, stripe_secret_key,
    square_access_token, square_location_id,
    square_sync_enabled, square_inventory_mode
  )
  VALUES (
    p_brand_id, p_provider,
    p_stripe_publishable_key, p_stripe_secret_key,
    p_square_access_token, p_square_location_id,
    COALESCE(p_square_sync_enabled, false),
    COALESCE(p_square_inventory_mode, 'none')
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    provider = COALESCE(p_provider, payment_settings.provider),
    stripe_publishable_key = COALESCE(p_stripe_publishable_key, payment_settings.stripe_publishable_key),
    stripe_secret_key = COALESCE(p_stripe_secret_key, payment_settings.stripe_secret_key),
    square_access_token = COALESCE(p_square_access_token, payment_settings.square_access_token),
    square_location_id = COALESCE(p_square_location_id, payment_settings.square_location_id),
    square_sync_enabled = COALESCE(p_square_sync_enabled, payment_settings.square_sync_enabled),
    square_inventory_mode = COALESCE(p_square_inventory_mode, payment_settings.square_inventory_mode),
    updated_at = now()
  RETURNING jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'provider', provider,
    'square_sync_enabled', square_sync_enabled,
    'square_inventory_mode', square_inventory_mode,
    'square_last_sync_at', square_last_sync_at,
    'square_last_sync_error', square_last_sync_error
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
