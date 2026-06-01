-- 095: Tax Settings — brand_settings columns + tax summary/orders RPCs
-- Adds collect_sales_tax + nexus_states to brand_settings
-- Creates get_tax_summary and get_taxable_orders RPCs

BEGIN;

-- ── 1. Add columns to brand_settings ─────────────────────────────────────────
ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS collect_sales_tax BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nexus_states TEXT[] NOT NULL DEFAULT '{CO}'::TEXT[];

-- ── 2. Update upsert_brand_settings ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.upsert_brand_settings(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN,
  BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[]
);
CREATE OR REPLACE FUNCTION public.upsert_brand_settings(
  p_brand_id UUID,
  p_legal_business_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_website_url TEXT,
  p_street_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_logo_url TEXT,
  p_logo_url_dark TEXT,
  p_default_email_signature TEXT,
  p_invoice_footer_notes TEXT,
  p_hero_tagline TEXT,
  p_about_headline TEXT,
  p_about_subheadline TEXT,
  p_custom_footer_text TEXT,
  p_show_wholesale_link BOOLEAN,
  p_show_zip_search BOOLEAN,
  p_show_schedule_pdf BOOLEAN,
  p_show_text_alerts BOOLEAN,
  p_schedule_pdf_notes TEXT,
  p_hero_image_url TEXT,
  p_brand_primary_color TEXT,
  p_brand_secondary_color TEXT,
  p_brand_bg_color TEXT,
  p_brand_text_color TEXT,
  p_collect_sales_tax BOOLEAN DEFAULT NULL,
  p_nexus_states TEXT[] DEFAULT NULL
) RETURNS brand_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row brand_settings;
BEGIN
  INSERT INTO brand_settings (
    id, brand_id, legal_business_name, phone, email, website_url,
    street_address, city, state, postal_code, country,
    logo_url, logo_url_dark, default_email_signature, invoice_footer_notes,
    hero_tagline, about_headline, about_subheadline, custom_footer_text,
    show_wholesale_link, show_zip_search, show_schedule_pdf, show_text_alerts,
    schedule_pdf_notes, hero_image_url,
    brand_primary_color, brand_secondary_color, brand_bg_color, brand_text_color,
    collect_sales_tax, nexus_states
  )
  VALUES (
    gen_random_uuid(), p_brand_id, p_legal_business_name, p_phone, p_email, p_website_url,
    p_street_address, p_city, p_state, p_postal_code, p_country,
    p_logo_url, p_logo_url_dark, p_default_email_signature, p_invoice_footer_notes,
    p_hero_tagline, p_about_headline, p_about_subheadline, p_custom_footer_text,
    COALESCE(p_show_wholesale_link, TRUE), COALESCE(p_show_zip_search, TRUE),
    COALESCE(p_show_schedule_pdf, TRUE), COALESCE(p_show_text_alerts, FALSE),
    p_schedule_pdf_notes, p_hero_image_url,
    p_brand_primary_color, p_brand_secondary_color, p_brand_bg_color, p_brand_text_color,
    COALESCE(p_collect_sales_tax, FALSE), COALESCE(p_nexus_states, '{CO}'::TEXT[])
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    legal_business_name     = COALESCE(p_legal_business_name, brand_settings.legal_business_name),
    phone                    = COALESCE(p_phone, brand_settings.phone),
    email                    = COALESCE(p_email, brand_settings.email),
    website_url              = COALESCE(p_website_url, brand_settings.website_url),
    street_address           = COALESCE(p_street_address, brand_settings.street_address),
    city                     = COALESCE(p_city, brand_settings.city),
    state                    = COALESCE(p_state, brand_settings.state),
    postal_code              = COALESCE(p_postal_code, brand_settings.postal_code),
    country                  = COALESCE(p_country, brand_settings.country),
    logo_url                 = COALESCE(p_logo_url, brand_settings.logo_url),
    logo_url_dark            = COALESCE(p_logo_url_dark, brand_settings.logo_url_dark),
    default_email_signature  = COALESCE(p_default_email_signature, brand_settings.default_email_signature),
    invoice_footer_notes    = COALESCE(p_invoice_footer_notes, brand_settings.invoice_footer_notes),
    hero_tagline             = COALESCE(p_hero_tagline, brand_settings.hero_tagline),
    about_headline           = COALESCE(p_about_headline, brand_settings.about_headline),
    about_subheadline        = COALESCE(p_about_subheadline, brand_settings.about_subheadline),
    custom_footer_text       = COALESCE(p_custom_footer_text, brand_settings.custom_footer_text),
    show_wholesale_link      = COALESCE(p_show_wholesale_link, brand_settings.show_wholesale_link),
    show_zip_search          = COALESCE(p_show_zip_search, brand_settings.show_zip_search),
    show_schedule_pdf        = COALESCE(p_show_schedule_pdf, brand_settings.show_schedule_pdf),
    show_text_alerts         = COALESCE(p_show_text_alerts, brand_settings.show_text_alerts),
    schedule_pdf_notes       = COALESCE(p_schedule_pdf_notes, brand_settings.schedule_pdf_notes),
    hero_image_url          = COALESCE(p_hero_image_url, brand_settings.hero_image_url),
    brand_primary_color    = COALESCE(p_brand_primary_color, brand_settings.brand_primary_color),
    brand_secondary_color   = COALESCE(p_brand_secondary_color, brand_settings.brand_secondary_color),
    brand_bg_color          = COALESCE(p_brand_bg_color, brand_settings.brand_bg_color),
    brand_text_color        = COALESCE(p_brand_text_color, brand_settings.brand_text_color),
    collect_sales_tax        = COALESCE(p_collect_sales_tax, brand_settings.collect_sales_tax),
    nexus_states            = COALESCE(p_nexus_states, brand_settings.nexus_states)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ── 3. Update get_brand_settings ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_brand_settings(uuid);
CREATE OR REPLACE FUNCTION public.get_brand_settings(
  p_brand_id UUID
) RETURNS brand_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row brand_settings;
BEGIN
  SELECT *
    INTO v_row
    FROM brand_settings
   WHERE brand_id = p_brand_id;
  RETURN v_row;
END;
$$;

-- ── 4. Update get_brand_settings_by_slug (public) ────────────────────────────
DROP FUNCTION IF EXISTS public.get_brand_settings_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_brand_settings_by_slug(
  p_brand_slug TEXT
) RETURNS brand_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row brand_settings;
BEGIN
  SELECT bs.*
    INTO v_row
    FROM brand_settings bs
    JOIN brands b ON b.id = bs.brand_id
   WHERE b.slug = p_brand_slug;
  RETURN v_row;
END;
$$;

-- ── 5. Tax Summary RPC ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_tax_summary(
  p_brand_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  total_tax_collected NUMERIC,
  total_gross_sales NUMERIC,
  order_count BIGINT,
  tax_by_state JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH taxed AS (
    SELECT
      o.tax_amount,
      o.subtotal,
      o.tax_location,
      -- Parse state from tax_location (format: 'STATE:CO' or just 'CO')
      CASE
        WHEN o.tax_location IS NOT NULL AND position('STATE:' IN o.tax_location) > 0 THEN
          upper(substr(o.tax_location, position('STATE:' IN o.tax_location) + 7, 2))
        WHEN o.tax_location IS NOT NULL AND length(o.tax_location) = 2 THEN
          upper(o.tax_location)
        WHEN o.tax_location IS NOT NULL AND length(o.tax_location) > 2 THEN
          upper(substr(o.tax_location, 1, 2))
        ELSE
          'UNKNOWN'::TEXT
      END AS state_code
    FROM orders o
    WHERE o.brand_id = p_brand_id
      AND o.created_at::DATE >= p_start_date
      AND o.created_at::DATE <= p_end_date
      AND o.tax_amount IS NOT NULL
      AND o.tax_amount > 0
  )
  SELECT
    COALESCE(SUM(t.tax_amount), 0)::NUMERIC AS total_tax_collected,
    COALESCE(SUM(t.subtotal), 0)::NUMERIC AS total_gross_sales,
    COUNT(DISTINCT t.tax_amount)::BIGINT AS order_count,
    COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'state', state_code,
        'total_tax', COALESCE(SUM(t.tax_amount) FILTER (WHERE state_code = t.state_code), 0),
        'gross_sales', COALESCE(SUM(t.subtotal) FILTER (WHERE state_code = t.state_code), 0),
        'order_count', COUNT(*) FILTER (WHERE state_code = t.state_code)
      ) ORDER BY state_code
    ), '[]'::JSONB) AS tax_by_state
  FROM taxed t;
END;
$$;

-- ── 6. Taxable Orders RPC ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_taxable_orders(
  p_brand_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  order_id UUID,
  date TEXT,
  customer_name TEXT,
  city TEXT,
  state TEXT,
  taxable_amount NUMERIC,
  tax_amount NUMERIC,
  tax_rate NUMERIC,
  tax_location TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.created_at::DATE::TEXT AS date,
    o.customer_name,
    COALESCE(s.city, ''::TEXT) AS city,
    COALESCE(s.state, ''::TEXT) AS state,
    o.subtotal AS taxable_amount,
    o.tax_amount,
    o.tax_rate,
    COALESCE(o.tax_location, ''::TEXT) AS tax_location
  FROM orders o
  LEFT JOIN stops s ON s.id = o.stop_id
  WHERE o.brand_id = p_brand_id
    AND o.created_at::DATE >= p_start_date
    AND o.created_at::DATE <= p_end_date
    AND o.tax_amount IS NOT NULL
    AND o.tax_amount > 0
  ORDER BY o.created_at DESC;
END;
$$;

COMMIT;