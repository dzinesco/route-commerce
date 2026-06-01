-- =============================================================================
-- Communication Center V1.2 — Import Metadata Storage
-- Fully idempotent: additive changes only
-- Updates import_communication_contacts_batch to store ignored CSV columns
-- in metadata.imported_raw so no context is lost from arbitrary extra columns.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Update email path — add imported_raw to metadata on UPDATE ───────────────
-- Lines ~400-402 in migration 017: UPDATE path for existing email contact

CREATE OR REPLACE FUNCTION public.import_communication_contacts_batch(
  p_brand_id              UUID,
  p_contacts              JSONB,
  p_allow_opt_in_override BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry    JSONB;
  v_result   JSONB := '{"created": 0, "updated": 0, "skipped": 0, "errors": []}'::JSONB;
  v_existing communication_contacts%ROWTYPE;
  v_email   TEXT;
  v_phone   TEXT;
  v_tags    TEXT[];
  v_raw_meta JSONB;
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    v_email := nullif(v_entry->>'email', '');
    v_phone := nullif(v_entry->>'phone', '');

    -- Parse tags: CSV sends "tag1;tag2" as a plain string; split into TEXT[]
    IF (v_entry->>'tags') IS NOT NULL AND (v_entry->>'tags') != '' THEN
      v_tags := coalesce(
        (SELECT array_agg(trim(x)) FROM unnest(string_to_array(v_entry->>'tags', ';')) AS x WHERE trim(x) != ''),
        '{}'
      );
    ELSE
      v_tags := '{}';
    END IF;

    -- Build imported_raw from any _metadata key (ignored CSV columns)
    v_raw_meta := nullif(v_entry->>'_metadata', '')::JSONB;

    BEGIN
      IF v_email IS NOT NULL AND v_email != '' THEN
        SELECT * INTO v_existing
        FROM public.communication_contacts
        WHERE brand_id = p_brand_id AND email = v_email;

        IF FOUND THEN
          -- Existing contact
          IF v_existing.unsubscribed_at IS NOT NULL AND
             coalesce((v_entry->>'email_opt_in')::BOOLEAN, false) = true AND
             p_allow_opt_in_override = false THEN
            v_result := jsonb_set(v_result, '{skipped}',
              to_jsonb((v_result->>'skipped')::INTEGER + 1));
          ELSE
            UPDATE public.communication_contacts SET
              phone         = COALESCE(nullif(v_entry->>'phone', ''), phone),
              first_name    = COALESCE(nullif(v_entry->>'first_name', ''), first_name),
              last_name     = COALESCE(nullif(v_entry->>'last_name', ''), last_name),
              full_name     = COALESCE(nullif(v_entry->>'full_name', ''), full_name),
              source        = 'import',
              external_id  = COALESCE(nullif(v_entry->>'external_id', ''), external_id),
              email_opt_in = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.email_opt_in
                ELSE coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                )
              END,
              sms_opt_in   = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.sms_opt_in
                ELSE coalesce(
                  (v_entry->>'sms_opt_in')::BOOLEAN,
                  communication_contacts.sms_opt_in,
                  false
                )
              END,
              email_opt_in_at = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN email_opt_in_at
                WHEN coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                ) = true THEN now()
                ELSE email_opt_in_at
              END,
              tags          = CASE
                WHEN v_tags != '{}' THEN v_tags
                ELSE communication_contacts.tags
              END,
              metadata      = communication_contacts.metadata ||
                jsonb_build_object(
                  'imported_at', now()::TEXT,
                  'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
                ),
              updated_at    = now()
            WHERE brand_id = p_brand_id AND email = v_email;

            v_result := jsonb_set(v_result, '{updated}',
              to_jsonb((v_result->>'updated')::INTEGER + 1));
          END IF;

        ELSE
          -- Insert new
          INSERT INTO public.communication_contacts
            (brand_id, email, phone, first_name, last_name, full_name, source,
             external_id, email_opt_in, sms_opt_in, email_opt_in_at, sms_opt_in_at,
             tags, metadata)
          VALUES (
            p_brand_id,
            v_email,
            nullif(v_entry->>'phone', ''),
            nullif(v_entry->>'first_name', ''),
            nullif(v_entry->>'last_name', ''),
            nullif(v_entry->>'full_name', ''),
            'import',
            nullif(v_entry->>'external_id', ''),
            coalesce((v_entry->>'email_opt_in')::BOOLEAN, true),
            coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false),
            CASE WHEN coalesce((v_entry->>'email_opt_in')::BOOLEAN, true) = true THEN now() ELSE NULL END,
            CASE WHEN coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false) = true THEN now() ELSE NULL END,
            v_tags,
            jsonb_build_object(
              'imported_at', now()::TEXT,
              'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
            )
          );
          v_result := jsonb_set(v_result, '{created}',
            to_jsonb((v_result->>'created')::INTEGER + 1));
        END IF;

      ELSIF v_phone IS NOT NULL AND v_phone != '' THEN
        -- Upsert by phone
        SELECT * INTO v_existing
        FROM public.communication_contacts
        WHERE brand_id = p_brand_id AND phone = v_phone;

        IF FOUND THEN
          IF v_existing.unsubscribed_at IS NOT NULL AND
             coalesce((v_entry->>'email_opt_in')::BOOLEAN, false) = true AND
             p_allow_opt_in_override = false THEN
            v_result := jsonb_set(v_result, '{skipped}',
              to_jsonb((v_result->>'skipped')::INTEGER + 1));
          ELSE
            UPDATE public.communication_contacts SET
              email        = COALESCE(nullif(v_entry->>'email', ''), email),
              first_name   = COALESCE(nullif(v_entry->>'first_name', ''), first_name),
              last_name    = COALESCE(nullif(v_entry->>'last_name', ''), last_name),
              full_name    = COALESCE(nullif(v_entry->>'full_name', ''), full_name),
              source       = 'import',
              email_opt_in = CASE
                WHEN communication_contacts.unsubscribed_at IS NOT NULL
                  THEN communication_contacts.email_opt_in
                ELSE coalesce(
                  (v_entry->>'email_opt_in')::BOOLEAN,
                  communication_contacts.email_opt_in,
                  true
                )
              END,
              tags         = CASE WHEN v_tags != '{}' THEN v_tags ELSE communication_contacts.tags END,
              metadata     = communication_contacts.metadata ||
                jsonb_build_object(
                  'imported_at', now()::TEXT,
                  'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
                ),
              updated_at   = now()
            WHERE brand_id = p_brand_id AND phone = v_phone;

            v_result := jsonb_set(v_result, '{updated}',
              to_jsonb((v_result->>'updated')::INTEGER + 1));
          END IF;
        ELSE
          INSERT INTO public.communication_contacts
            (brand_id, email, phone, first_name, last_name, full_name, source,
             email_opt_in, sms_opt_in, tags, metadata)
          VALUES (
            p_brand_id,
            nullif(v_entry->>'email', ''),
            v_phone,
            nullif(v_entry->>'first_name', ''),
            nullif(v_entry->>'last_name', ''),
            nullif(v_entry->>'full_name', ''),
            'import',
            coalesce((v_entry->>'email_opt_in')::BOOLEAN, true),
            coalesce((v_entry->>'sms_opt_in')::BOOLEAN, false),
            v_tags,
            jsonb_build_object(
              'imported_at', now()::TEXT,
              'imported_raw', coalesce(v_raw_meta, '{}'::JSONB)
            )
          );
          v_result := jsonb_set(v_result, '{created}',
            to_jsonb((v_result->>'created')::INTEGER + 1));
        END IF;

      ELSE
        -- No email or phone
        v_result := jsonb_set(
          v_result, '{errors}',
          v_result->'errors' || jsonb_build_array(
            jsonb_build_object('row', v_entry, 'error', 'No email or phone provided')
          )
        );
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_set(
        v_result, '{errors}',
        v_result->'errors' || jsonb_build_array(
          jsonb_build_object('row', v_entry, 'error', SQLERRM)
        )
      );
    END;
  END LOOP;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';
