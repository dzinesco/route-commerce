-- Migration 086: Enhance email substitution with brand_settings
-- Updates send_campaign and send_stop_blast to:
-- 1. Look up brand_settings for legal_business_name (falls back to brands.name)
-- 2. Append default_email_signature to outbound emails if set
-- 3. Support {{address}}, {{phone}}, {{email}}, {{website}} variables
--
-- Variable substitution priority:
--   {{company_name}}  → legal_business_name (brand_settings) → brands.name → fallback
--   {{address}}        → street_address, city, state postal_code from brand_settings
--   {{phone}}          → phone from brand_settings
--   {{email}}          → email from brand_settings
--   {{website}}        → website_url from brand_settings
--   {{signature}}      → default_email_signature from brand_settings (appended to body)

-- ── Enhanced send_campaign ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.send_campaign(p_campaign_id UUID, p_brand_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign    communication_campaigns;
  v_settings    communication_settings;
  v_brand_settings RECORD;
  v_brand_name  TEXT := 'Route Commerce';
  v_signature   TEXT;
  v_address    TEXT;
  v_phone      TEXT;
  v_email      TEXT;
  v_website     TEXT;
  v_body_final  TEXT;
  v_subj_final  TEXT;
  v_audience    JSONB;
  v_entries     JSONB := '[]'::JSONB;
  v_customer   JSONB;
  v_count       INTEGER := 0;
BEGIN
  SELECT * INTO v_campaign FROM communication_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  -- Resolve effective brand_id
  IF p_brand_id IS NOT NULL THEN
    -- Use provided brand_id
  ELSIF v_campaign.brand_id IS NOT NULL THEN
    p_brand_id := v_campaign.brand_id;
  END IF;

  -- Look up brand_settings for extended variables
  SELECT
    bs.legal_business_name,
    bs.phone,
    bs.email,
    bs.website_url,
    bs.default_email_signature,
    bs.street_address,
    bs.city,
    bs.state,
    bs.postal_code,
    b.name AS brand_name
  INTO v_brand_settings
  FROM brand_settings bs
  JOIN brands b ON b.id = bs.brand_id
  WHERE bs.brand_id = p_brand_id;

  -- Build brand name: legal_business_name > brand_name > fallback
  v_brand_name := COALESCE(
    v_brand_settings.legal_business_name,
    v_brand_settings.brand_name,
    'Route Commerce'
  );

  -- Build full address string
  IF v_brand_settings.street_address IS NOT NULL THEN
    v_address := v_brand_settings.street_address
      || ', ' || COALESCE(v_brand_settings.city, '')
      || ', ' || COALESCE(v_brand_settings.state, '')
      || ' ' || COALESCE(v_brand_settings.postal_code, '');
    -- Clean up extra commas from empty parts
    v_address := trim(both ',' from v_address);
  ELSE
    v_address := NULL;
  END IF;

  v_phone   := v_brand_settings.phone;
  v_email   := v_brand_settings.email;
  v_website := v_brand_settings.website_url;
  v_signature := v_brand_settings.default_email_signature;

  -- Apply substitutions to subject
  v_subj_final := v_campaign.subject;
  v_subj_final := replace(v_subj_final, '{{company_name}}', COALESCE(v_brand_name, 'Route Commerce'));
  v_subj_final := replace(v_subj_final, '{{brand_name}}', COALESCE(v_brand_name, 'Route Commerce'));
  v_subj_final := replace(v_subj_final, '{{address}}', COALESCE(v_address, ''));
  v_subj_final := replace(v_subj_final, '{{phone}}', COALESCE(v_phone, ''));
  v_subj_final := replace(v_subj_final, '{{email}}', COALESCE(v_email, ''));
  v_subj_final := replace(v_subj_final, '{{website}}', COALESCE(v_website, ''));

  -- Apply substitutions to body, then append signature
  v_body_final := v_campaign.body_text;
  v_body_final := replace(v_body_final, '{{company_name}}', COALESCE(v_brand_name, 'Route Commerce'));
  v_body_final := replace(v_body_final, '{{brand_name}}', COALESCE(v_brand_name, 'Route Commerce'));
  v_body_final := replace(v_body_final, '{{address}}', COALESCE(v_address, ''));
  v_body_final := replace(v_body_final, '{{phone}}', COALESCE(v_phone, ''));
  v_body_final := replace(v_body_final, '{{email}}', COALESCE(v_email, ''));
  v_body_final := replace(v_body_final, '{{website}}', COALESCE(v_website, ''));

  -- Remove {{signature}} placeholder from body (replaced with actual signature below)
  v_body_final := replace(v_body_final, '{{signature}}', '');

  -- Append default email signature if set
  IF v_signature IS NOT NULL AND v_signature != '' THEN
    v_body_final := v_body_final || E'\n\n' || v_signature;
  END IF;

  SELECT * INTO v_settings
  FROM communication_settings
  WHERE brand_id = p_brand_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No communication settings for brand');
  END IF;

  v_audience := preview_campaign_audience(p_brand_id, v_campaign.audience_rules);

  FOR v_customer IN
    SELECT * FROM jsonb_array_elements(coalesce(v_audience->'sample_customers', '[]'::jsonb))
  LOOP
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'brand_id',         p_brand_id,
      'campaign_id',     p_campaign_id,
      'customer_id',     v_customer->>'id',
      'customer_email',   v_customer->>'email',
      'delivery_method',  'email',
      'subject',          v_subj_final,
      'body_preview',     left(v_body_final, 500),
      'status',          'queued'
    ));
    v_count := v_count + 1;
  END LOOP;

  PERFORM log_communication_messages(v_entries);

  UPDATE communication_campaigns
  SET status = 'sent', sent_at = now(), updated_at = now()
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object('success', true, 'messages_logged', v_count);
END;
$$;

-- ── Enhanced send_stop_blast ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.send_stop_blast(
  p_stop_id      UUID,
  p_brand_id     UUID,
  p_body         TEXT,
  p_channel      TEXT DEFAULT 'email',
  p_subject      TEXT DEFAULT NULL,
  p_audience     TEXT DEFAULT 'pending',
  p_created_by   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign_id    UUID;
  v_count           INT := 0;
  v_order           RECORD;
  v_contact         JSONB;
  v_customer_id     UUID;
  v_opted_in         BOOLEAN;
  v_email           TEXT;
  v_phone           TEXT;
  v_brand_name      TEXT := 'Route Commerce';
  v_signature       TEXT;
  v_address         TEXT;
  v_subj            TEXT;
  v_body_sub        TEXT;
  v_brand_settings  RECORD;
BEGIN
  -- Look up brand_settings for extended variables
  SELECT
    bs.legal_business_name,
    bs.phone,
    bs.email,
    bs.website_url,
    bs.default_email_signature,
    bs.street_address,
    bs.city,
    bs.state,
    bs.postal_code,
    b.name AS brand_name
  INTO v_brand_settings
  FROM brand_settings bs
  JOIN brands b ON b.id = p_brand_id
  WHERE bs.brand_id = p_brand_id;

  -- Build brand name: legal_business_name > brand_name > fallback
  v_brand_name := COALESCE(
    v_brand_settings.legal_business_name,
    v_brand_settings.brand_name,
    'Route Commerce'
  );

  -- Build full address string
  IF v_brand_settings.street_address IS NOT NULL THEN
    v_address := v_brand_settings.street_address
      || ', ' || COALESCE(v_brand_settings.city, '')
      || ', ' || COALESCE(v_brand_settings.state, '')
      || ' ' || COALESCE(v_brand_settings.postal_code, '');
    v_address := trim(both ',' from v_address);
  ELSE
    v_address := NULL;
  END IF;

  v_signature := v_brand_settings.default_email_signature;

  -- Apply substitutions to subject
  v_subj := p_subject;
  IF v_subj IS NOT NULL THEN
    v_subj := replace(v_subj, '{{company_name}}', COALESCE(v_brand_name, 'Route Commerce'));
    v_subj := replace(v_subj, '{{brand_name}}', COALESCE(v_brand_name, 'Route Commerce'));
    v_subj := replace(v_subj, '{{address}}', COALESCE(v_address, ''));
    v_subj := replace(v_subj, '{{phone}}', COALESCE(v_brand_settings.phone, ''));
    v_subj := replace(v_subj, '{{email}}', COALESCE(v_brand_settings.email, ''));
    v_subj := replace(v_subj, '{{website}}', COALESCE(v_brand_settings.website_url, ''));
  END IF;

  -- Apply substitutions to body, then append signature
  v_body_sub := p_body;
  v_body_sub := replace(v_body_sub, '{{company_name}}', COALESCE(v_brand_name, 'Route Commerce'));
  v_body_sub := replace(v_body_sub, '{{brand_name}}', COALESCE(v_brand_name, 'Route Commerce'));
  v_body_sub := replace(v_body_sub, '{{address}}', COALESCE(v_address, ''));
  v_body_sub := replace(v_body_sub, '{{phone}}', COALESCE(v_brand_settings.phone, ''));
  v_body_sub := replace(v_body_sub, '{{email}}', COALESCE(v_brand_settings.email, ''));
  v_body_sub := replace(v_body_sub, '{{website}}', COALESCE(v_brand_settings.website_url, ''));

  -- Append default email signature if set
  IF v_signature IS NOT NULL AND v_signature != '' THEN
    v_body_sub := v_body_sub || E'\n\n' || v_signature;
  END IF;

  -- Create campaign record
  INSERT INTO communication_campaigns (
    brand_id, name, subject, body_text,
    campaign_type, status, audience_rules,
    sent_at, created_by
  ) VALUES (
    p_brand_id,
    'Stop blast: ' || COALESCE(p_subject, p_body),
    v_subj,
    v_body_sub,
    'operational',
    'sent',
    jsonb_build_object(
      'target', 'stop',
      'stop_id', p_stop_id,
      'date_from', NULL,
      'date_to', NULL
    ),
    now(),
    p_created_by
  ) RETURNING id INTO v_campaign_id;

  -- Fetch matching orders
  FOR v_order IN
    SELECT o.id, o.customer_id, o.customer_name,
           o.customer_email, o.customer_phone, o.pickup_complete,
           c.email_opt_in, c.sms_opt_in, c.unsubscribed_at
    FROM orders o
    LEFT JOIN communication_contacts c ON c.id = o.customer_id
    WHERE o.stop_id = p_stop_id
      AND (
        p_audience = 'all'
        OR (p_audience = 'pending' AND NOT o.pickup_complete)
        OR (p_audience = 'picked_up' AND o.pickup_complete)
      )
  LOOP
    -- Check opt-in status per channel
    v_opted_in := (
      CASE p_channel
        WHEN 'sms' THEN v_order.customer_phone IS NOT NULL
                     AND COALESCE(v_order.sms_opt_in, FALSE) = TRUE
                     AND v_order.unsubscribed_at IS NULL
        WHEN 'email' THEN v_order.customer_email IS NOT NULL
                      AND COALESCE(v_order.email_opt_in, TRUE) = TRUE
                      AND v_order.unsubscribed_at IS NULL
        ELSE v_order.customer_email IS NOT NULL
             AND COALESCE(v_order.email_opt_in, TRUE) = TRUE
             AND v_order.unsubscribed_at IS NULL
      END
    );

    IF NOT v_opted_in THEN
      CONTINUE;
    END IF;

    -- Log email message with fully-substituted subject and body
    IF p_channel IN ('email', 'both') AND v_order.customer_email IS NOT NULL THEN
      INSERT INTO communication_message_logs (
        brand_id, campaign_id, customer_id, customer_email,
        delivery_method, subject, body_preview, status, sent_at
      ) VALUES (
        p_brand_id, v_campaign_id, v_order.customer_id, v_order.customer_email,
        'email', COALESCE(v_subj, ''), LEFT(v_body_sub, 200), 'queued', now()
      );
      v_count := v_count + 1;
    END IF;

    -- Log SMS message (signature not appended to SMS)
    IF p_channel IN ('sms', 'both') AND v_order.customer_phone IS NOT NULL THEN
      INSERT INTO communication_message_logs (
        brand_id, campaign_id, customer_id, customer_phone,
        delivery_method, body_preview, status, sent_at
      ) VALUES (
        p_brand_id, v_campaign_id, v_order.customer_id, v_order.customer_phone,
        'sms', LEFT(v_body_sub, 160), 'queued', now()
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', v_campaign_id,
    'messages_logged', v_count
  );
END;
$$;