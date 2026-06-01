-- Migration 085: Brand Settings Table
-- Single source of truth for brand/company information.
-- Used by email templates, invoices, site headers, and all brand-facing output.

CREATE TABLE IF NOT EXISTS public.brand_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Company info
  legal_business_name   TEXT,
  phone                 TEXT,
  email                 TEXT,
  website_url           TEXT,

  -- Address
  street_address        TEXT,
  city                  TEXT,
  state                 TEXT,
  postal_code           TEXT,
  country               TEXT DEFAULT 'US',

  -- Logos (Supabase Storage public URLs)
  logo_url              TEXT,
  logo_url_dark         TEXT,   -- For dark backgrounds (optional)

  -- Branding for emails/invoices
  default_email_signature TEXT,
  invoice_footer_notes    TEXT,

  -- Meta
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brand_settings_brand_idx
  ON public.brand_settings (brand_id);

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Brand admins and platform admins can manage their own settings
CREATE POLICY brand_admin_manage_brand_settings ON public.brand_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.brand_id = brand_settings.brand_id
        AND au.role IN ('brand_admin', 'platform_admin')
    )
  );

-- Read policy: brand admins + platform admins can read
CREATE POLICY brand_admin_read_brand_settings ON public.brand_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.brand_id = brand_settings.brand_id
    )
  );

-- ── RPCs ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_brand_settings(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', bs.id,
    'brand_id', bs.brand_id,
    'legal_business_name', bs.legal_business_name,
    'phone', bs.phone,
    'email', bs.email,
    'website_url', bs.website_url,
    'street_address', bs.street_address,
    'city', bs.city,
    'state', bs.state,
    'postal_code', bs.postal_code,
    'country', bs.country,
    'logo_url', bs.logo_url,
    'logo_url_dark', bs.logo_url_dark,
    'default_email_signature', bs.default_email_signature,
    'invoice_footer_notes', bs.invoice_footer_notes,
    'updated_at', bs.updated_at,
    'brand_name', b.name
  )
  INTO v_result
  FROM brand_settings bs
  JOIN brands b ON b.id = bs.brand_id
  WHERE bs.brand_id = p_brand_id;

  RETURN COALESCE(v_result, jsonb_build_object('brand_id', p_brand_id, 'brand_name', (
    SELECT name FROM brands WHERE id = p_brand_id
  )));
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_brand_settings(
  p_brand_id               UUID,
  p_legal_business_name    TEXT DEFAULT NULL,
  p_phone                  TEXT DEFAULT NULL,
  p_email                  TEXT DEFAULT NULL,
  p_website_url            TEXT DEFAULT NULL,
  p_street_address         TEXT DEFAULT NULL,
  p_city                   TEXT DEFAULT NULL,
  p_state                  TEXT DEFAULT NULL,
  p_postal_code            TEXT DEFAULT NULL,
  p_country                 TEXT DEFAULT NULL,
  p_logo_url              TEXT DEFAULT NULL,
  p_logo_url_dark          TEXT DEFAULT NULL,
  p_default_email_signature TEXT DEFAULT NULL,
  p_invoice_footer_notes   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO brand_settings (
    brand_id, legal_business_name, phone, email, website_url,
    street_address, city, state, postal_code, country,
    logo_url, logo_url_dark, default_email_signature, invoice_footer_notes
  ) VALUES (
    p_brand_id, p_legal_business_name, p_phone, p_email, p_website_url,
    p_street_address, p_city, p_state, p_postal_code, p_country,
    p_logo_url, p_logo_url_dark, p_default_email_signature, p_invoice_footer_notes
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    legal_business_name    = COALESCE(p_legal_business_name, brand_settings.legal_business_name),
    phone                  = COALESCE(p_phone, brand_settings.phone),
    email                  = COALESCE(p_email, brand_settings.email),
    website_url            = COALESCE(p_website_url, brand_settings.website_url),
    street_address         = COALESCE(p_street_address, brand_settings.street_address),
    city                   = COALESCE(p_city, brand_settings.city),
    state                  = COALESCE(p_state, brand_settings.state),
    postal_code            = COALESCE(p_postal_code, brand_settings.postal_code),
    country                = COALESCE(p_country, brand_settings.country),
    logo_url               = COALESCE(p_logo_url, brand_settings.logo_url),
    logo_url_dark          = COALESCE(p_logo_url_dark, brand_settings.logo_url_dark),
    default_email_signature = COALESCE(p_default_email_signature, brand_settings.default_email_signature),
    invoice_footer_notes   = COALESCE(p_invoice_footer_notes, brand_settings.invoice_footer_notes),
    updated_at             = now()
  WHERE brand_settings.brand_id = p_brand_id
  RETURNING id INTO v_id;

  -- Return the updated record
  RETURN get_brand_settings(p_brand_id);
END;
$$;