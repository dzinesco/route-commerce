-- Migration 041: Payment Settings
-- Creates payment_settings table and RPCs for provider configuration.

-- ── 1. payment_settings table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id                  UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  provider                  TEXT,                                          -- stripe | square | manual
  stripe_publishable_key    TEXT,
  stripe_secret_key         TEXT,
  square_access_token      TEXT,
  square_location_id       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand admin can read payment_settings" ON public.payment_settings;
CREATE POLICY "Brand admin can read payment_settings"
  ON public.payment_settings FOR SELECT TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'brand_admin'
    )
  );

DROP POLICY IF EXISTS "Platform admin can read payment_settings" ON public.payment_settings;
CREATE POLICY "Platform admin can read payment_settings"
  ON public.payment_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'platform_admin'
    )
  );

-- Writes go through SECURITY DEFINER helpers only.

-- ── 3. get_payment_settings ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_payment_settings(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'provider', provider,
    'stripe_publishable_key', stripe_publishable_key,
    'stripe_secret_key', stripe_secret_key,
    'square_access_token', square_access_token,
    'square_location_id', square_location_id,
    'updated_at', updated_at::TEXT
  ) INTO v_result
  FROM payment_settings
  WHERE brand_id = p_brand_id;

  RETURN v_result;
END;
$$;

-- ── 4. upsert_payment_settings ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_payment_settings(
  p_brand_id              UUID,
  p_provider              TEXT,
  p_stripe_publishable_key TEXT DEFAULT NULL,
  p_stripe_secret_key     TEXT DEFAULT NULL,
  p_square_access_token   TEXT DEFAULT NULL,
  p_square_location_id    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_settings (
    brand_id, provider,
    stripe_publishable_key, stripe_secret_key,
    square_access_token, square_location_id
  )
  VALUES (
    p_brand_id, p_provider,
    p_stripe_publishable_key, p_stripe_secret_key,
    p_square_access_token, p_square_location_id
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    provider                  = EXCLUDED.provider,
    stripe_publishable_key   = EXCLUDED.stripe_publishable_key,
    stripe_secret_key        = EXCLUDED.stripe_secret_key,
    square_access_token      = EXCLUDED.square_access_token,
    square_location_id       = EXCLUDED.square_location_id,
    updated_at               = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

NOTIFY pgrst, 'reload schema';
