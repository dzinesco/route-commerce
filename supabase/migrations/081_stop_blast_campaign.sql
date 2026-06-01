-- Migration 081: Stop blast via communication_campaigns
-- Routes stop-based blast messages through the campaign system for analytics
-- and to respect contact opt-in/opt-out preferences.

CREATE OR REPLACE FUNCTION send_stop_blast(
  p_stop_id      UUID,
  p_brand_id     UUID,
  p_body         TEXT,
  p_channel      TEXT DEFAULT 'email',  -- 'sms', 'email', 'both'
  p_subject      TEXT DEFAULT NULL,
  p_audience     TEXT DEFAULT 'pending', -- 'all', 'pending', 'picked_up'
  p_created_by   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign_id  UUID;
  v_count        INT := 0;
  v_order RECORD;
  v_contact JSONB;
  v_customer_id  UUID;
  v_opted_in     BOOLEAN;
  v_email        TEXT;
  v_phone        TEXT;
  v_brand_name   TEXT := 'Route Commerce';
  v_subj         TEXT;
  v_body_sub    TEXT;
BEGIN
  -- Resolve brand name for {{company_name}} substitution
  SELECT b.name INTO v_brand_name
  FROM brands b
  WHERE b.id = p_brand_id;
  IF v_brand_name IS NULL THEN
    SELECT invoice_business_name INTO v_brand_name
    FROM wholesale_settings
    WHERE brand_id = p_brand_id
    LIMIT 1;
  END IF;
  IF v_brand_name IS NULL THEN
    v_brand_name := 'Route Commerce';
  END IF;

  v_subj := replace(replace(p_subject, '{{company_name}}', v_brand_name), '{{brand_name}}', v_brand_name);
  v_body_sub := replace(replace(p_body, '{{company_name}}', v_brand_name), '{{brand_name}}', v_brand_name);

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
    -- Default to opted-in for email (email_opt_in defaults TRUE in schema)
    -- Default to opted-OUT for SMS (sms_opt_in defaults FALSE in schema)
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

    -- Log email message
    IF p_channel IN ('email', 'both') AND v_order.customer_email IS NOT NULL THEN
      INSERT INTO communication_message_logs (
        brand_id, campaign_id, customer_id, customer_email,
        delivery_method, subject, body_preview, status, sent_at
      ) VALUES (
        p_brand_id, v_campaign_id, v_order.customer_id, v_order.customer_email,
        'email', v_subj, LEFT(v_body_sub, 200), 'queued', now()
      );
      v_count := v_count + 1;
    END IF;

    -- Log SMS message
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
