-- Migration 142: Add integration credentials storage (Resend, Twilio)
-- Store per-brand Resend and Twilio API credentials securely

ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS resend_credentials JSONB DEFAULT '{
    "api_key": null,
    "from_email": null,
    "from_name": null
  }'::jsonb;

ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS twilio_credentials JSONB DEFAULT '{
    "account_sid": null,
    "auth_token": null,
    "phone_number": null
  }'::jsonb;

-- RPC to get Resend credentials
CREATE OR REPLACE FUNCTION get_resend_credentials(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT resend_credentials FROM brand_settings WHERE brand_id = p_brand_id),
    '{"api_key": null, "from_email": null, "from_name": null}'::jsonb
  );
END;
$$;

-- RPC to save Resend credentials
CREATE OR REPLACE FUNCTION set_resend_credentials(
  p_brand_id UUID,
  p_credentials JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE brand_settings
  SET resend_credentials = p_credentials,
      updated_at = now()
  WHERE brand_id = p_brand_id;
  RETURN true;
END;
$$;

-- RPC to get Twilio credentials
CREATE OR REPLACE FUNCTION get_twilio_credentials(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT twilio_credentials FROM brand_settings WHERE brand_id = p_brand_id),
    '{"account_sid": null, "auth_token": null, "phone_number": null}'::jsonb
  );
END;
$$;

-- RPC to save Twilio credentials
CREATE OR REPLACE FUNCTION set_twilio_credentials(
  p_brand_id UUID,
  p_credentials JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE brand_settings
  SET twilio_credentials = p_credentials,
      updated_at = now()
  WHERE brand_id = p_brand_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION get_resend_credentials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_resend_credentials(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_twilio_credentials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_twilio_credentials(UUID, JSONB) TO authenticated;
