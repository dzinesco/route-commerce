-- Migration 093: Add hero_image_url to brand_settings
-- Storefront hero image (full-width background photo)

ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Update upsert_brand_settings to accept hero_image_url
CREATE OR REPLACE FUNCTION public.upsert_brand_settings(
  p_brand_id               UUID,
  p_legal_business_name    TEXT DEFAULT NULL,
  p_phone                  TEXT DEFAULT NULL,
  p_email                  TEXT DEFAULT NULL,
  p_website_url            TEXT DEFAULT NULL,
  p_street_address         TEXT DEFAULT NULL,
  p_city                   TEXT DEFAULT NULL,
  p_state                   TEXT DEFAULT NULL,
  p_postal_code            TEXT DEFAULT NULL,
  p_country                 TEXT DEFAULT NULL,
  p_logo_url              TEXT DEFAULT NULL,
  p_logo_url_dark          TEXT DEFAULT NULL,
  p_default_email_signature TEXT DEFAULT NULL,
  p_invoice_footer_notes   TEXT DEFAULT NULL,
  p_hero_tagline           TEXT DEFAULT NULL,
  p_about_headline          TEXT DEFAULT NULL,
  p_about_subheadline       TEXT DEFAULT NULL,
  p_custom_footer_text     TEXT DEFAULT NULL,
  p_show_wholesale_link    BOOLEAN DEFAULT NULL,
  p_show_zip_search       BOOLEAN DEFAULT NULL,
  p_show_schedule_pdf     BOOLEAN DEFAULT NULL,
  p_show_text_alerts      BOOLEAN DEFAULT NULL,
  p_schedule_pdf_notes    TEXT DEFAULT NULL,
  p_hero_image_url        TEXT DEFAULT NULL
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
    logo_url, logo_url_dark, default_email_signature, invoice_footer_notes,
    hero_tagline, about_headline, about_subheadline, custom_footer_text,
    show_wholesale_link, show_zip_search, show_schedule_pdf,
    show_text_alerts, schedule_pdf_notes, hero_image_url
  ) VALUES (
    p_brand_id, p_legal_business_name, p_phone, p_email, p_website_url,
    p_street_address, p_city, p_state, p_postal_code, p_country,
    p_logo_url, p_logo_url_dark, p_default_email_signature, p_invoice_footer_notes,
    p_hero_tagline, p_about_headline, p_about_subheadline, p_custom_footer_text,
    p_show_wholesale_link, p_show_zip_search, p_show_schedule_pdf,
    p_show_text_alerts, p_schedule_pdf_notes, p_hero_image_url
  )
  ON CONFLICT (brand_id) DO UPDATE SET
    legal_business_name     = COALESCE(p_legal_business_name, brand_settings.legal_business_name),
    phone                   = COALESCE(p_phone, brand_settings.phone),
    email                   = COALESCE(p_email, brand_settings.email),
    website_url             = COALESCE(p_website_url, brand_settings.website_url),
    street_address          = COALESCE(p_street_address, brand_settings.street_address),
    city                    = COALESCE(p_city, brand_settings.city),
    state                   = COALESCE(p_state, brand_settings.state),
    postal_code              = COALESCE(p_postal_code, brand_settings.postal_code),
    country                 = COALESCE(p_country, brand_settings.country),
    logo_url                = COALESCE(p_logo_url, brand_settings.logo_url),
    logo_url_dark           = COALESCE(p_logo_url_dark, brand_settings.logo_url_dark),
    default_email_signature = COALESCE(p_default_email_signature, brand_settings.default_email_signature),
    invoice_footer_notes    = COALESCE(p_invoice_footer_notes, brand_settings.invoice_footer_notes),
    hero_tagline            = COALESCE(p_hero_tagline, brand_settings.hero_tagline),
    about_headline          = COALESCE(p_about_headline, brand_settings.about_headline),
    about_subheadline       = COALESCE(p_about_subheadline, brand_settings.about_subheadline),
    custom_footer_text      = COALESCE(p_custom_footer_text, brand_settings.custom_footer_text),
    show_wholesale_link     = COALESCE(p_show_wholesale_link, brand_settings.show_wholesale_link),
    show_zip_search        = COALESCE(p_show_zip_search, brand_settings.show_zip_search),
    show_schedule_pdf       = COALESCE(p_show_schedule_pdf, brand_settings.show_schedule_pdf),
    show_text_alerts        = COALESCE(p_show_text_alerts, brand_settings.show_text_alerts),
    schedule_pdf_notes      = COALESCE(p_schedule_pdf_notes, brand_settings.schedule_pdf_notes),
    hero_image_url          = COALESCE(p_hero_image_url, brand_settings.hero_image_url),
    updated_at              = now()
  WHERE brand_settings.brand_id = p_brand_id
  RETURNING id INTO v_id;

  RETURN get_brand_settings(p_brand_id);
END;
$$;

-- Update get_brand_settings to include hero_image_url
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
    'hero_tagline', bs.hero_tagline,
    'about_headline', bs.about_headline,
    'about_subheadline', bs.about_subheadline,
    'custom_footer_text', bs.custom_footer_text,
    'show_wholesale_link', bs.show_wholesale_link,
    'show_zip_search', bs.show_zip_search,
    'show_schedule_pdf', bs.show_schedule_pdf,
    'show_text_alerts', bs.show_text_alerts,
    'schedule_pdf_notes', bs.schedule_pdf_notes,
    'hero_image_url', bs.hero_image_url,
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

-- Update get_brand_settings_by_slug to include hero_image_url
CREATE OR REPLACE FUNCTION public.get_brand_settings_by_slug(p_brand_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'brand_id', bs.brand_id,
    'brand_name', b.name,
    'hero_tagline', bs.hero_tagline,
    'about_headline', bs.about_headline,
    'about_subheadline', bs.about_subheadline,
    'custom_footer_text', bs.custom_footer_text,
    'show_wholesale_link', bs.show_wholesale_link,
    'show_zip_search', bs.show_zip_search,
    'show_schedule_pdf', bs.show_schedule_pdf,
    'show_text_alerts', bs.show_text_alerts,
    'schedule_pdf_notes', bs.schedule_pdf_notes,
    'logo_url', bs.logo_url,
    'logo_url_dark', bs.logo_url_dark,
    'hero_image_url', bs.hero_image_url,
    'contact_email', bs.email,
    'contact_phone', bs.phone,
    'legal_business_name', bs.legal_business_name,
    'wholesale_enabled', ws.wholesale_enabled
  )
  INTO result
  FROM brands b
  LEFT JOIN brand_settings bs ON bs.brand_id = b.id
  LEFT JOIN wholesale_settings ws ON ws.brand_id = b.id
  WHERE b.slug = p_brand_slug;

  RETURN result;
END;
$$;