-- Migration 082: Substitute {{company_name}} with brand name in campaign emails
-- Updates send_campaign to look up brands.name and replace {{company_name}}
-- in subject and body_text before queuing messages.

CREATE OR REPLACE FUNCTION public.send_campaign(p_campaign_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign  communication_campaigns;
  v_settings communication_settings;
  v_brand    RECORD;
  v_audience JSONB;
  v_entries  JSONB := '[]'::JSONB;
  v_customer JSONB;
  v_count    INTEGER := 0;
  v_brand_name TEXT := 'Route Commerce';
BEGIN
  SELECT * INTO v_campaign FROM communication_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  -- Look up brand name for {{company_name}} substitution
  SELECT b.name INTO v_brand_name
  FROM brands b
  WHERE b.id = v_campaign.brand_id;
  -- Fall back to wholesale_settings if brand name not found
  IF v_brand_name IS NULL THEN
    SELECT invoice_business_name INTO v_brand_name
    FROM wholesale_settings
    WHERE brand_id = v_campaign.brand_id
    LIMIT 1;
  END IF;
  IF v_brand_name IS NULL THEN
    v_brand_name := 'Route Commerce';
  END IF;

  SELECT * INTO v_settings
  FROM communication_settings
  WHERE brand_id = v_campaign.brand_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No communication settings for brand');
  END IF;

  v_audience := preview_campaign_audience(v_campaign.brand_id, v_campaign.audience_rules);

  FOR v_customer IN
    SELECT * FROM jsonb_array_elements(coalesce(v_audience->'sample_customers', '[]'::jsonb))
  LOOP
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'brand_id',         v_campaign.brand_id,
      'campaign_id',      p_campaign_id,
      'customer_id',      v_customer->>'id',
      'customer_email',   v_customer->>'email',
      'delivery_method', 'email',
      'subject',
        -- Substitute {{company_name}} in subject
        replace(replace(v_campaign.subject, '{{company_name}}', v_brand_name), '{{brand_name}}', v_brand_name),
      'body_preview',    left(replace(replace(v_campaign.body_text, '{{company_name}}', v_brand_name), '{{brand_name}}', v_brand_name), 500),
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
