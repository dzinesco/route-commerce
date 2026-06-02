-- Migration 083: Add stripe_user_id support to payment_settings for Stripe Connect
-- This enables Stripe Connect Express account onboarding

-- First, add stripe_user_id column to payment_settings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_settings' AND column_name = 'stripe_user_id') THEN
    ALTER TABLE payment_settings ADD COLUMN stripe_user_id TEXT;
  END IF;
END $$;

-- Update upsert_payment_settings to support stripe_user_id
CREATE OR REPLACE FUNCTION public.upsert_payment_settings(
  p_brand_id                UUID,
  p_provider                TEXT,
  p_stripe_publishable_key   TEXT DEFAULT NULL,
  p_stripe_secret_key       TEXT DEFAULT NULL,
  p_stripe_user_id          TEXT DEFAULT NULL,
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
    stripe_publishable_key, stripe_secret_key, stripe_user_id,
    square_access_token, square_location_id,
    square_sync_enabled, square_inventory_mode
  )
  VALUES (
    p_brand_id, p_provider,
    p_stripe_publishable_key, p_stripe_secret_key, p_stripe_user_id,
    p_square_access_token, p_square_location_id,
    COALESCE(p_square_sync_enabled, false),
    COALESCE(p_square_inventory_mode, 'none')
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    provider = COALESCE(p_provider, payment_settings.provider),
    stripe_publishable_key = COALESCE(p_stripe_publishable_key, payment_settings.stripe_publishable_key),
    stripe_secret_key = COALESCE(p_stripe_secret_key, payment_settings.stripe_secret_key),
    stripe_user_id = COALESCE(p_stripe_user_id, payment_settings.stripe_user_id),
    square_access_token = COALESCE(p_square_access_token, payment_settings.square_access_token),
    square_location_id = COALESCE(p_square_location_id, payment_settings.square_location_id),
    square_sync_enabled = COALESCE(p_square_sync_enabled, payment_settings.square_sync_enabled),
    square_inventory_mode = COALESCE(p_square_inventory_mode, payment_settings.square_inventory_mode),
    updated_at = now()
  RETURNING jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'provider', provider,
    'stripe_user_id', stripe_user_id,
    'stripe_publishable_key', stripe_publishable_key,
    'square_sync_enabled', square_sync_enabled,
    'square_inventory_mode', square_inventory_mode,
    'square_last_sync_at', square_last_sync_at,
    'square_last_sync_error', square_last_sync_error
  );
END;
$$;

-- Create function to get brand payment settings
CREATE OR REPLACE FUNCTION public.get_payment_settings(
  p_brand_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id', id,
      'brand_id', brand_id,
      'provider', provider,
      'stripe_publishable_key', stripe_publishable_key,
      'stripe_secret_key', stripe_secret_key,
      'stripe_user_id', stripe_user_id,
      'square_access_token', square_access_token,
      'square_location_id', square_location_id,
      'square_sync_enabled', square_sync_enabled,
      'square_inventory_mode', square_inventory_mode,
      'square_last_sync_at', square_last_sync_at,
      'square_last_sync_error', square_last_sync_error,
      'updated_at', updated_at
    )
    FROM payment_settings
    WHERE brand_id = p_brand_id
  );
END;
$$;

-- Create function to set Stripe Connect account
CREATE OR REPLACE FUNCTION public.set_stripe_connect_account(
  p_brand_id UUID,
  p_stripe_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_settings (brand_id, provider, stripe_user_id)
  VALUES (p_brand_id, 'stripe', p_stripe_user_id)
  ON CONFLICT (brand_id) DO UPDATE SET
    stripe_user_id = p_stripe_user_id,
    provider = 'stripe',
    updated_at = now()
  RETURNING jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'stripe_user_id', stripe_user_id,
    'provider', provider
  );
END;
$$;

-- Create function to disconnect Stripe Connect
CREATE OR REPLACE FUNCTION public.disconnect_stripe_connect(
  p_brand_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE payment_settings
  SET
    stripe_user_id = NULL,
    stripe_publishable_key = NULL,
    stripe_secret_key = NULL,
    provider = 'manual',
    updated_at = now()
  WHERE brand_id = p_brand_id;
  
  RETURN jsonb_build_object('success', true, 'brand_id', p_brand_id);
END;
$$;

NOTIFY pgrst, 'reload schema';