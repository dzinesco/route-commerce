-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Storefront customization fields added to brand_settings
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS hero_tagline TEXT;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS about_headline TEXT;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS about_subheadline TEXT;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS custom_footer_text TEXT;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS show_wholesale_link BOOLEAN DEFAULT true;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS show_zip_search BOOLEAN DEFAULT true;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS show_schedule_pdf BOOLEAN DEFAULT true;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS show_text_alerts BOOLEAN DEFAULT false;
ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS schedule_pdf_notes TEXT;

-- New RPC: get brand settings by slug (public, no auth required for brand-specific storefront pages)
CREATE OR REPLACE FUNCTION get_brand_settings_by_slug(p_brand_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION get_brand_settings_by_slug IS
  'Returns brand settings merged with wholesale_enabled for public storefront pages. No auth required.';