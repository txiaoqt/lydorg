-- Make the PCYDO YORP fixture repairable without touching the Renewal Test Organization.
-- Seed asset paths are intentionally data, not guessed here. Populate the mapping table
-- from the existing registration-seed-file objects before invoking the seed RPC.

ALTER TABLE public.document_submissions
  ADD COLUMN IF NOT EXISTS is_seeded_sample_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_batch text;

ALTER TABLE public.document_submission_files
  ADD COLUMN IF NOT EXISTS is_seeded_sample_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_batch text;

CREATE TABLE IF NOT EXISTS public.yorp_sample_document_assets (
  document_type_id uuid PRIMARY KEY REFERENCES public.required_document_types(id) ON DELETE CASCADE,
  bucket_id text NOT NULL DEFAULT 'registration-seed-file'
    CHECK (bucket_id = 'registration-seed-file'),
  object_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, object_name)
);

COMMENT ON TABLE public.yorp_sample_document_assets IS
  'Explicit mapping from active YORP registration requirements to immutable reusable Storage seed assets.';

-- Map each active YORP registration requirement to the exact reusable object
-- already present in Storage. These object names are bucket-relative paths.
WITH expected_assets(requirement_name, object_name) AS (
  VALUES
    ('Constitution and By-Laws', 'Constitution and By-Laws.pdf'),
    ('Endorsement', 'Endorsement.pdf'),
    ('NYC YORP Registration Form (Form B)', 'NYC YORP Registration Form (Form B).pdf'),
    ('Pasig City YORP Registration Form (Form A)', 'Pasig City YORP Registration Form (Form A).pdf'),
    ('YORP Directory of Officers and Adviser', 'YORP Directory of Officers and Adviser.pdf'),
    ('YORP List of Members in Good Standing', 'YORP List of Members in Good Standing.pdf')
)
INSERT INTO public.yorp_sample_document_assets (
  document_type_id, bucket_id, object_name, updated_at
)
SELECT
  rdt.id,
  'registration-seed-file',
  expected_assets.object_name,
  clock_timestamp()
FROM expected_assets
JOIN public.required_document_types rdt
  ON rdt.name = expected_assets.requirement_name
WHERE rdt.is_active IS TRUE
  AND coalesce(rdt.is_required, true) IS TRUE
  AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
  AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
  AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
ON CONFLICT (document_type_id) DO UPDATE
SET bucket_id = EXCLUDED.bucket_id,
    object_name = EXCLUDED.object_name,
    updated_at = clock_timestamp();

DO $asset_mapping_check$
DECLARE
  _mapped_count integer;
BEGIN
  WITH expected_assets(requirement_name, object_name) AS (
    VALUES
      ('Constitution and By-Laws', 'Constitution and By-Laws.pdf'),
      ('Endorsement', 'Endorsement.pdf'),
      ('NYC YORP Registration Form (Form B)', 'NYC YORP Registration Form (Form B).pdf'),
      ('Pasig City YORP Registration Form (Form A)', 'Pasig City YORP Registration Form (Form A).pdf'),
      ('YORP Directory of Officers and Adviser', 'YORP Directory of Officers and Adviser.pdf'),
      ('YORP List of Members in Good Standing', 'YORP List of Members in Good Standing.pdf')
  )
  SELECT count(*) INTO _mapped_count
  FROM expected_assets
  JOIN public.required_document_types rdt
    ON rdt.name = expected_assets.requirement_name
  JOIN public.yorp_sample_document_assets asset
    ON asset.document_type_id = rdt.id
   AND asset.bucket_id = 'registration-seed-file'
   AND asset.object_name = expected_assets.object_name
  JOIN storage.objects object_row
    ON object_row.bucket_id = asset.bucket_id
   AND object_row.name = asset.object_name
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  IF _mapped_count <> 6 THEN
    RAISE EXCEPTION 'Expected exactly 6 active YORP registration requirements with existing Storage assets; found %.', _mapped_count;
  END IF;
END;
$asset_mapping_check$;

REVOKE ALL ON TABLE public.yorp_sample_document_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.yorp_sample_document_assets TO service_role;

-- Keep the original fixture rows as the authoritative source, but make its internal
-- implementation inaccessible to browser callers. The wrapper below invokes it and
-- repairs related state inside the same PostgreSQL transaction.
ALTER FUNCTION public.admin_seed_yorp_sample_dataset(text, text)
  RENAME TO admin_seed_yorp_sample_dataset_core;
REVOKE ALL ON FUNCTION public.admin_seed_yorp_sample_dataset_core(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset_core(text, text) TO service_role;

-- Harden the existing fixture lookup and remove its source-controlled password.
DO $migration$
DECLARE
  _definition text;
  _updated text;
BEGIN
  _definition := pg_get_functiondef('public.admin_seed_yorp_sample_dataset_core(text,text)'::regprocedure);
  _updated := replace(
    _definition,
    'WHERE seed_batch = _batch_name',
    E'WHERE is_seeded_sample_data IS TRUE\n      AND seed_batch = _batch_name\n      AND id <> ''8170959f-2bb8-40ea-8ce8-31deb514de17''::uuid\n      AND coalesce(is_renewal_test_account, false) IS FALSE'
  );
  IF _updated = _definition THEN
    RAISE EXCEPTION 'Could not apply the YORP fixture ownership guard to the current seed function.';
  END IF;
  _definition := _updated;

  _updated := regexp_replace(
    _definition,
    $pattern$extensions[.]crypt\('[^']*', extensions[.]gen_salt\('bf'\)\)$pattern$,
    'extensions.crypt(gen_random_uuid()::text, extensions.gen_salt(''bf''))'
  );
  IF _updated = _definition THEN
    RAISE EXCEPTION 'Could not remove the hard-coded YORP seed password from the current seed function.';
  END IF;
  EXECUTE _updated;

  -- Test fixtures must not emit normal user workflow notifications/activity rows.
  _definition := pg_get_functiondef('public.notify_budget_request_change()'::regprocedure);
  _updated := replace(
    _definition,
    'IF old.status IS NOT DISTINCT FROM new.status THEN',
    E'IF coalesce(new.is_seeded_sample_data, false) THEN\n    RETURN new;\n  END IF;\n\n  IF old.status IS NOT DISTINCT FROM new.status THEN'
  );
  IF _updated = _definition THEN
    RAISE EXCEPTION 'Could not add seeded-row notification suppression to budget requests.';
  END IF;
  EXECUTE _updated;

  _definition := pg_get_functiondef('public.notify_liquidation_change()'::regprocedure);
  _updated := replace(
    _definition,
    'IF old.status IS NOT DISTINCT FROM new.status THEN',
    E'IF coalesce(new.is_seeded_sample_data, false) THEN\n    RETURN new;\n  END IF;\n\n  IF old.status IS NOT DISTINCT FROM new.status THEN'
  );
  IF _updated = _definition THEN
    RAISE EXCEPTION 'Could not add seeded-row notification suppression to liquidations.';
  END IF;
  EXECUTE _updated;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.repair_yorp_seeded_fixture_relationships(
  _organization_id uuid,
  _user_id uuid,
  _admin_id uuid,
  _record jsonb,
  _batch_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage, extensions
AS $function$
DECLARE
  _organization public.organization_profiles%ROWTYPE;
  _submission_id uuid;
  _budget_id uuid;
  _required_count integer := 0;
  _asset_count integer := 0;
  _missing text[] := '{}';
  _document record;
  _asset storage.objects%ROWTYPE;
  _file_id uuid;
  _expected_status public.budget_request_status;
  _amount numeric := coalesce((_record->>'b_amt')::numeric, 50000);
  _verified_at timestamptz := (_record->>'v_date')::timestamptz;
BEGIN
  IF _batch_name <> 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Only the designated PCYDO YORP test batch can be repaired.';
  END IF;

  SELECT * INTO _organization
  FROM public.organization_profiles
  WHERE id = _organization_id
    AND user_id = _user_id
    AND is_seeded_sample_data IS TRUE
    AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seed repair refused because the organization is not an eligible generated record.';
  END IF;

  SELECT count(*) INTO _required_count
  FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  IF _required_count = 0 THEN
    RAISE EXCEPTION 'No active required YORP registration document requirements are configured.';
  END IF;

  SELECT count(*) INTO _asset_count
  FROM public.required_document_types rdt
  JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
  JOIN storage.objects object_row
    ON object_row.bucket_id = asset.bucket_id
   AND object_row.name = asset.object_name
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  IF _asset_count <> _required_count THEN
    SELECT array_agg(rdt.name ORDER BY rdt.sort_order, rdt.name) INTO _missing
    FROM public.required_document_types rdt
    LEFT JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
    LEFT JOIN storage.objects object_row
      ON object_row.bucket_id = asset.bucket_id
     AND object_row.name = asset.object_name
    WHERE rdt.is_active IS TRUE
      AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
      AND object_row.name IS NULL;
    RAISE EXCEPTION 'YORP seed asset mapping is incomplete or points to missing Storage objects. Requirements: %', array_to_string(_missing, ', ');
  END IF;

  SELECT ds.id INTO _submission_id
  FROM public.document_submissions ds
  WHERE ds.organization_id = _organization_id
    AND ds.renewal_id IS NULL
    AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
  ORDER BY ds.created_at ASC, ds.id ASC
  LIMIT 1
  FOR UPDATE;

  IF _submission_id IS NULL THEN
    INSERT INTO public.document_submissions (
      organization_id, submitted_by, status, user_confirmed, submitted_at,
      reviewed_by, reviewed_at, submission_scope, renewal_id,
      is_seeded_sample_data, seed_batch, created_at, updated_at
    ) VALUES (
      _organization_id, _user_id, 'approved_green', true, _verified_at,
      _admin_id, _verified_at, 'registration', NULL,
      true, _batch_name, _verified_at, _verified_at
    ) RETURNING id INTO _submission_id;
  ELSE
    UPDATE public.document_submissions
    SET status = 'approved_green', user_confirmed = true,
        submitted_at = coalesce(submitted_at, _verified_at),
        reviewed_by = coalesce(reviewed_by, _admin_id),
        reviewed_at = coalesce(reviewed_at, _verified_at),
        is_seeded_sample_data = true, seed_batch = _batch_name,
        updated_at = clock_timestamp()
    WHERE id = _submission_id;
  END IF;

  -- Collapse duplicates only inside this generated registration packet. No Storage
  -- object is deleted; all file rows point to the immutable shared seed assets.
  UPDATE public.document_submission_files
  SET is_seeded_sample_data = true, seed_batch = _batch_name
  WHERE submission_id = _submission_id;

  DELETE FROM public.document_submission_files duplicate
  USING public.document_submission_files keeper
  WHERE duplicate.submission_id = _submission_id
    AND keeper.submission_id = duplicate.submission_id
    AND keeper.document_type_id = duplicate.document_type_id
    AND keeper.id < duplicate.id;

  DELETE FROM public.document_submission_files obsolete
  WHERE obsolete.submission_id = _submission_id
    AND NOT EXISTS (
      SELECT 1 FROM public.required_document_types rdt
      WHERE rdt.id = obsolete.document_type_id
        AND rdt.is_active IS TRUE
        AND coalesce(rdt.is_required, true) IS TRUE
        AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
        AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
        AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
    );

  FOR _document IN
    SELECT rdt.id, rdt.name, asset.bucket_id, asset.object_name, object_row.metadata
    FROM public.required_document_types rdt
    JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
    JOIN storage.objects object_row
      ON object_row.bucket_id = asset.bucket_id
     AND object_row.name = asset.object_name
    WHERE rdt.is_active IS TRUE
      AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
    ORDER BY rdt.sort_order, rdt.name
  LOOP
    SELECT * INTO _asset FROM storage.objects
    WHERE bucket_id = _document.bucket_id AND name = _document.object_name;

    SELECT id INTO _file_id FROM public.document_submission_files
    WHERE submission_id = _submission_id AND document_type_id = _document.id
    ORDER BY created_at ASC, id ASC LIMIT 1;

    IF _file_id IS NULL THEN
      INSERT INTO public.document_submission_files (
        submission_id, document_type_id, file_url, file_name, file_type,
        file_size, validation_status, admin_status, uploaded_at, reviewed_at,
        is_seeded_sample_data, seed_batch, created_at, updated_at
      ) VALUES (
        _submission_id, _document.id,
        'storage://' || _document.bucket_id || '/' || _document.object_name,
        regexp_replace(_document.object_name, '^.*/', ''),
        coalesce(_asset.metadata->>'mimetype', 'application/pdf'),
        coalesce((_asset.metadata->>'size')::bigint, 0),
        'correct', 'approved_green', _verified_at, _verified_at,
        true, _batch_name, _verified_at, _verified_at
      );
    ELSE
      UPDATE public.document_submission_files
      SET file_url = 'storage://' || _document.bucket_id || '/' || _document.object_name,
          file_name = regexp_replace(_document.object_name, '^.*/', ''),
          file_type = coalesce(_asset.metadata->>'mimetype', 'application/pdf'),
          file_size = coalesce((_asset.metadata->>'size')::bigint, 0),
          validation_status = 'correct', admin_status = 'approved_green',
          uploaded_at = coalesce(uploaded_at, _verified_at),
          reviewed_at = coalesce(reviewed_at, _verified_at),
          is_seeded_sample_data = true, seed_batch = _batch_name,
          updated_at = clock_timestamp()
      WHERE id = _file_id;
    END IF;
  END LOOP;

  -- Registration/accreditation state is repaired by the caller from the authoritative
  -- SQL fixture row. This function returns actual requirement counts for validation.
  RETURN jsonb_build_object('submission_id', _submission_id, 'required_documents', _required_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.repair_yorp_seeded_fixture_relationships(uuid, uuid, uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_yorp_seeded_fixture_relationships(uuid, uuid, uuid, jsonb, text) TO service_role;

-- Match the TypeScript catalog's existing title + CYP resolution rule. The source
-- fixtures are unchanged; this corrects the nine rows whose legacy SQL category
-- mapped differently after the older center-alignment trigger ran.
CREATE OR REPLACE FUNCTION public.resolve_yorp_sample_activity_category(
  _activity_title text,
  _advocacies text[]
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  _title text := lower(trim(coalesce(_activity_title, '')));
  _preferred text;
  _resolved text;
BEGIN
  _preferred := CASE
    WHEN _title LIKE '%disaster%' OR _title LIKE '%security%' OR _title LIKE '%first aid%' THEN 'peace building and security'
    WHEN _title LIKE '%leadership%' OR _title LIKE '%governance%' OR _title LIKE '%planning%' THEN 'governance'
    WHEN _title LIKE '%education%' OR _title LIKE '%academic%' OR _title LIKE '%technology%' THEN 'education'
    WHEN _title LIKE '%sport%' OR _title LIKE '%fitness%' OR _title LIKE '%wellness%' THEN 'health'
    WHEN _title LIKE '%environment%' OR _title LIKE '%tree-planting%' OR _title LIKE '%greening%' THEN 'environment'
    WHEN _title LIKE '%community%' OR _title LIKE '%civic%' OR _title LIKE '%outreach%' OR _title LIKE '%clean-up%' THEN 'social inclusion and equity'
    WHEN _title LIKE '%arts%' OR _title LIKE '%culture%' THEN 'education'
    ELSE NULL
  END;
  IF _preferred IS NOT NULL THEN
    SELECT cyp INTO _resolved FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE lower(trim(cyp)) = _preferred LIMIT 1;
  END IF;
  IF _resolved IS NULL THEN
    SELECT cyp INTO _resolved FROM unnest(coalesce(_advocacies, ARRAY[]::text[])) AS cyp
    WHERE trim(cyp) <> ''
    ORDER BY array_position(coalesce(_advocacies, ARRAY[]::text[]), cyp) LIMIT 1;
  END IF;
  RETURN _resolved;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_yorp_sample_activity_category(text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_yorp_sample_activity_category(text, text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_seed_yorp_sample_dataset(
  _session_token text,
  _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $function$
DECLARE
  _admin_id uuid;
  _result jsonb;
  _record record;
  _organization_id uuid;
  _user_id uuid;
  _accreditation_id uuid;
  _budget_id uuid;
  _required integer := 0;
  _organizations integer := 0;
  _registrations integer := 0;
  _documents integer := 0;
  _complete integer := 0;
  _missing integer := 0;
  _duplicates integer := 0;
  _budgets integer := 0;
  _awaiting integer := 0;
  _released integer := 0;
  _liquidated integer := 0;
  _verified_at timestamptz;
  _expected_status public.budget_request_status;
BEGIN
  IF _batch_name IS DISTINCT FROM 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Seed repair is restricted to batch PCYDO-YORP-2024-2026.';
  END IF;
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Seed operation is available only in an explicitly configured non-production environment.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));

  -- The fixture core and all repairs run in this transaction. Its temporary source
  -- table remains available until the enclosing RPC commits.
  _result := public.admin_seed_yorp_sample_dataset_core(_session_token, _batch_name);
  IF to_regclass('pg_temp.temp_yorp_seed_dataset') IS NULL THEN
    RAISE EXCEPTION 'Authoritative SQL fixture rows were not available for post-seed repair.';
  END IF;

  FOR _record IN EXECUTE 'SELECT * FROM pg_temp.temp_yorp_seed_dataset ORDER BY record_num' LOOP
    SELECT op.id, op.user_id, op.verified_at
    INTO _organization_id, _user_id, _verified_at
    FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = _batch_name
      AND op.seed_source_record_number = _record.record_num
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
    FOR UPDATE;

    IF _organization_id IS NULL OR _user_id IS NULL THEN
      RAISE EXCEPTION 'Seeded organization % is missing or is protected; no fixture repair was applied.', _record.record_num;
    END IF;

    INSERT INTO public.user_profiles(user_id, email, display_name, full_name, contact_number)
    SELECT _user_id, op.organization_email, op.organization_name, op.representative_name, op.contact_number
    FROM public.organization_profiles op
    WHERE op.id = _organization_id
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO auth.identities(id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    SELECT _user_id, _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', u.email),
      'email', _user_id::text, coalesce(u.created_at, clock_timestamp()), clock_timestamp()
    FROM auth.users u
    WHERE u.id = _user_id
      AND NOT EXISTS (
        SELECT 1 FROM auth.identities i WHERE i.provider = 'email' AND i.provider_id = _user_id::text
      )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- Reconstruct the required term-one accreditation only for this generated row.
    SELECT oa.id INTO _accreditation_id
    FROM public.organization_accreditations oa
    WHERE oa.organization_id = _organization_id AND oa.term_number = 1
    ORDER BY oa.created_at ASC, oa.id ASC LIMIT 1;
    IF _accreditation_id IS NULL THEN
      INSERT INTO public.organization_accreditations (
        organization_id, term_number, start_date, end_date, certificate_urn,
        status, approved_by, approved_at, created_at
      ) VALUES (
        _organization_id, 1, _record.v_date::date, _record.acc_end,
        (SELECT op.urn FROM public.organization_profiles op WHERE op.id = _organization_id),
        'active', _admin_id, _verified_at, _verified_at
      ) RETURNING id INTO _accreditation_id;
    END IF;
    UPDATE public.organization_profiles
    SET current_accreditation_id = _accreditation_id
    WHERE id = _organization_id
      AND is_seeded_sample_data IS TRUE
      AND seed_batch = _batch_name
      AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(is_renewal_test_account, false) IS FALSE;

    _expected_status := _record.b_status::public.budget_request_status;
    SELECT br.id INTO _budget_id
    FROM public.budget_requests br
    WHERE br.organization_id = _organization_id
      AND br.is_seeded_sample_data IS TRUE
      AND br.seed_batch = _batch_name
    ORDER BY br.created_at ASC, br.id ASC LIMIT 1;

    IF _budget_id IS NULL THEN
      INSERT INTO public.budget_requests (
        organization_id, submitted_by, activity_title, activity_description,
        activity_date, venue, requested_amount, approved_amount, released_amount,
        release_date, purpose_category, fiscal_year, status, is_seeded_sample_data,
        seed_batch, admin_remarks, user_note, created_at, updated_at
      ) VALUES (
        _organization_id, _user_id, _record.b_title,
        format('Official %s activity conducted by %s in Barangay %s.', _record.b_title, _record.org_name, _record.brgy),
        _record.v_date::date + interval '60 days',
        format('Barangay %s Multi-Purpose Hall, Pasig City', _record.brgy),
        _record.b_amt, _record.b_amt,
        CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN _record.b_amt ELSE 0 END,
        CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN (_record.v_date::date + interval '45 days')::timestamptz ELSE NULL END,
        _record.b_purpose, _record.b_year, _expected_status, true, _batch_name,
        format('Official sample budget request for %s seeded in CY %s.', _record.org_name, _record.src_year),
        'Administrative test-seeded budget request.',
        _record.v_date + interval '30 days', _record.v_date + interval '30 days'
      ) RETURNING id INTO _budget_id;
    ELSE
      UPDATE public.budget_requests
      SET submitted_by = _user_id, activity_title = _record.b_title,
          requested_amount = _record.b_amt, approved_amount = _record.b_amt,
          released_amount = CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN _record.b_amt ELSE 0 END,
          release_date = CASE WHEN _record.b_status IN ('budget_released', 'completed') THEN (_record.v_date::date + interval '45 days')::timestamptz ELSE NULL END,
          purpose_category = _record.b_purpose, fiscal_year = _record.b_year,
          status = _expected_status, seed_batch = _batch_name,
          is_seeded_sample_data = true, updated_at = clock_timestamp()
      WHERE id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
    END IF;

    UPDATE public.budget_requests
    SET purpose_category = public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp)
    WHERE id = _budget_id AND organization_id = _organization_id
      AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;

    IF NOT EXISTS (
      SELECT 1 FROM public.organization_profiles op
      WHERE op.id = _organization_id
        AND public.resolve_yorp_sample_activity_category(_record.b_title, _record.cyp) = ANY(coalesce(op.advocacies, ARRAY[]::text[]))
    ) THEN
      RAISE EXCEPTION 'Fixture category for source record % does not match its Centers of Youth Participation.', _record.record_num;
    END IF;

    IF _record.b_liquidated IS TRUE THEN
      INSERT INTO public.liquidation_reports (
        budget_request_id, organization_id, submitted_by, status, remarks,
        go_signal_at, deadline_at, hard_copy_submitted_at, completed_at,
        is_seeded_sample_data, seed_batch, created_at, updated_at
      ) VALUES (
        _budget_id, _organization_id, _user_id, 'completed_liquidated',
        'Administrative test-seeded verified liquidation report.',
        _record.v_date + interval '45 days', _record.v_date + interval '90 days',
        _record.v_date + interval '75 days', _record.v_date + interval '80 days',
        true, _batch_name, _record.v_date + interval '75 days', _record.v_date + interval '80 days'
      ) ON CONFLICT (budget_request_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        submitted_by = EXCLUDED.submitted_by,
        status = EXCLUDED.status, remarks = EXCLUDED.remarks,
        go_signal_at = EXCLUDED.go_signal_at, deadline_at = EXCLUDED.deadline_at,
        hard_copy_submitted_at = EXCLUDED.hard_copy_submitted_at,
        completed_at = EXCLUDED.completed_at,
        is_seeded_sample_data = true, seed_batch = _batch_name,
        updated_at = EXCLUDED.updated_at;
    ELSE
      DELETE FROM public.liquidation_reports
      WHERE budget_request_id = _budget_id AND organization_id = _organization_id
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name;
    END IF;

    PERFORM public.repair_yorp_seeded_fixture_relationships(
      _organization_id, _user_id, _admin_id, to_jsonb(_record), _batch_name
    );
  END LOOP;

  SELECT count(*) INTO _organizations FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _required FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(DISTINCT ds.id), count(dsf.id)
  INTO _registrations, _documents
  FROM public.document_submissions ds
  LEFT JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration');

  WITH seeded AS (
    SELECT op.id organization_id
    FROM public.organization_profiles op
    WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
  ), required AS (
    SELECT id FROM public.required_document_types rdt
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
  ), packets AS (
    SELECT s.organization_id, ds.id submission_id
    FROM seeded s JOIN public.document_submissions ds ON ds.organization_id = s.organization_id
    WHERE ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
  ), counts AS (
    SELECT p.organization_id, r.id document_type_id, count(dsf.id) file_count
    FROM packets p CROSS JOIN required r
    LEFT JOIN public.document_submission_files dsf
      ON dsf.submission_id = p.submission_id AND dsf.document_type_id = r.id
    GROUP BY p.organization_id, r.id
  ), per_org AS (
    SELECT organization_id,
      count(*) FILTER (WHERE file_count = 0) missing_count,
      sum(greatest(file_count - 1, 0)) duplicate_count,
      count(*) FILTER (WHERE file_count = 1) complete_count
    FROM counts GROUP BY organization_id
  )
  SELECT count(*) FILTER (WHERE missing_count = 0 AND duplicate_count = 0 AND complete_count = _required),
         coalesce(sum(missing_count), 0), coalesce(sum(duplicate_count), 0)
  INTO _complete, _missing, _duplicates FROM per_org;

  SELECT count(*) FILTER (WHERE br.status = 'awaiting_release'),
         count(*) FILTER (WHERE br.status IN ('budget_released', 'completed')),
         count(*)
  INTO _awaiting, _released, _budgets
  FROM public.budget_requests br JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND br.is_seeded_sample_data IS TRUE AND br.seed_batch = _batch_name
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _liquidated FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND lr.is_seeded_sample_data IS TRUE AND lr.seed_batch = _batch_name
    AND lr.status = 'completed_liquidated'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  IF _organizations <> 84 OR _registrations <> 84 OR _documents <> 84 * _required
     OR _complete <> 84 OR _missing <> 0 OR _duplicates <> 0 OR _budgets <> 84
     OR _awaiting <> 28 OR _released <> 56 OR _liquidated <> 28 THEN
    RAISE EXCEPTION 'YORP fixture validation failed: organizations %, registrations %, documents % (required % each), complete %, missing %, duplicates %, budgets %, awaiting %, released %, liquidated %.',
      _organizations, _registrations, _documents, _required, _complete, _missing,
      _duplicates, _budgets, _awaiting, _released, _liquidated;
  END IF;

  RETURN _result || jsonb_build_object(
    'organizations', _organizations,
    'registration_packets', _registrations,
    'document_records', _documents,
    'required_documents_per_organization', _required,
    'organizations_document_complete', _complete,
    'missing_requirements', _missing,
    'duplicate_requirements', _duplicates,
    'budget_requests', _budgets,
    'awaiting_release', _awaiting,
    'released', _released,
    'liquidated', _liquidated,
    'renewal_test_organization_excluded', true
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset(text, text) TO authenticated, service_role;

-- Stop cleanup from matching arbitrary batches and from deleting any Renewal Test row.
-- The migration also refuses to cascade-delete YPOP or unrelated organization history.
CREATE OR REPLACE FUNCTION public.admin_cleanup_yorp_sample_dataset(
  _session_token text,
  _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $function$
DECLARE
  _admin_id uuid;
  _org_ids uuid[] := '{}';
  _user_ids uuid[] := '{}';
  _deleted_orgs integer := 0;
  _deleted_budgets integer := 0;
  _deleted_liquidations integer := 0;
  _deleted_users integer := 0;
  _required_documents integer := 0;
  _mapped_assets integer := 0;
  _now timestamptz := clock_timestamp();
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Cleanup is available only in an explicitly configured non-production environment.';
  END IF;
  IF _batch_name IS DISTINCT FROM 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Cleanup is restricted to batch PCYDO-YORP-2024-2026.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('PCYDO-YORP-2024-2026'));

  SELECT coalesce(array_agg(id), '{}'), coalesce(array_agg(user_id), '{}')
  INTO _org_ids, _user_ids
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT coalesce(array_agg(DISTINCT op.user_id) FILTER (WHERE op.user_id IS NOT NULL), '{}')
  INTO _user_ids
  FROM public.organization_profiles op
  WHERE op.id = ANY(_org_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_profiles renewal
      WHERE renewal.user_id = op.user_id
        AND (renewal.id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
          OR coalesce(renewal.is_renewal_test_account, false) IS TRUE)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_profiles related
      WHERE related.user_id = op.user_id
        AND related.id <> ALL(_org_ids)
    );

  IF cardinality(_org_ids) > 0 THEN
    SELECT count(*) INTO _required_documents
    FROM public.required_document_types rdt
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));
    SELECT count(*) INTO _mapped_assets
    FROM public.required_document_types rdt
    JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
    JOIN storage.objects object_row ON object_row.bucket_id = asset.bucket_id AND object_row.name = asset.object_name
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));
    IF _required_documents = 0 OR _mapped_assets <> _required_documents THEN
      RAISE EXCEPTION 'Cleanup stopped because reusable registration seed assets are not mapped for every active YORP requirement. Map % of % requirements before cleanup.', _mapped_assets, _required_documents;
    END IF;

    IF EXISTS (SELECT 1 FROM public.ypop_entries WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have YPOP entries that are not part of the authoritative fixture and would otherwise cascade-delete.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.organization_renewals WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have renewal history that this fixture cannot reconstruct.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.inquiries WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have inquiry records outside the generated fixture.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.compliance_remarks WHERE organization_id = ANY(_org_ids)) THEN
      RAISE EXCEPTION 'Cleanup stopped: seeded organizations have compliance history outside the generated fixture.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.budget_requests
      WHERE organization_id = ANY(_org_ids)
        AND (is_seeded_sample_data IS DISTINCT FROM TRUE OR seed_batch IS DISTINCT FROM _batch_name)
    ) THEN
      RAISE EXCEPTION 'Cleanup stopped: one or more seeded organizations have budget requests outside the generated fixture.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.liquidation_reports
      WHERE organization_id = ANY(_org_ids)
        AND (is_seeded_sample_data IS DISTINCT FROM TRUE OR seed_batch IS DISTINCT FROM _batch_name)
    ) THEN
      RAISE EXCEPTION 'Cleanup stopped: one or more seeded organizations have liquidation records outside the generated fixture.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.document_submissions ds
      WHERE ds.organization_id = ANY(_org_ids)
        AND (ds.is_seeded_sample_data IS DISTINCT FROM TRUE OR ds.seed_batch IS DISTINCT FROM _batch_name)
    ) THEN
      RAISE EXCEPTION 'Cleanup stopped: one or more seeded organizations have registration packets not tracked as generated fixture data.';
    END IF;

    PERFORM set_config('app.allow_org_deletion', 'true', true);
    UPDATE public.organization_profiles
      SET current_accreditation_id = NULL
      WHERE id = ANY(_org_ids)
        AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
        AND coalesce(is_renewal_test_account, false) IS FALSE;

    WITH deleted AS (
      DELETE FROM public.liquidation_reports
      WHERE organization_id = ANY(_org_ids)
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
      RETURNING id
    ) SELECT count(*) INTO _deleted_liquidations FROM deleted;

    WITH deleted AS (
      DELETE FROM public.budget_requests
      WHERE organization_id = ANY(_org_ids)
        AND is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
      RETURNING id
    ) SELECT count(*) INTO _deleted_budgets FROM deleted;

    DELETE FROM public.organization_contacts WHERE organization_id = ANY(_org_ids);
    DELETE FROM public.organization_accreditations WHERE organization_id = ANY(_org_ids);
    DELETE FROM public.notifications
    WHERE organization_id = ANY(_org_ids) OR user_id = ANY(_user_ids);

    -- Preserve organization-linked audit history while clearing the cascading FK.
    UPDATE public.activity_logs
      SET organization_id = NULL
      WHERE organization_id = ANY(_org_ids);

    WITH deleted AS (
      DELETE FROM public.organization_profiles
      WHERE id = ANY(_org_ids)
        AND is_seeded_sample_data IS TRUE
        AND seed_batch = _batch_name
        AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
        AND coalesce(is_renewal_test_account, false) IS FALSE
      RETURNING id
    ) SELECT count(*) INTO _deleted_orgs FROM deleted;

    DELETE FROM public.user_profiles WHERE user_id = ANY(_user_ids);
    DELETE FROM auth.identities WHERE user_id = ANY(_user_ids)
      AND user_id <> ALL(ARRAY(
        SELECT renewal.user_id FROM public.organization_profiles renewal
        WHERE renewal.user_id IS NOT NULL
          AND (renewal.id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
            OR coalesce(renewal.is_renewal_test_account, false) IS TRUE)
      ));
    WITH deleted AS (
      DELETE FROM auth.users WHERE id = ANY(_user_ids)
        AND id <> ALL(ARRAY(
          SELECT renewal.user_id FROM public.organization_profiles renewal
          WHERE renewal.user_id IS NOT NULL
            AND (renewal.id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
              OR coalesce(renewal.is_renewal_test_account, false) IS TRUE)
        ))
      RETURNING id
    ) SELECT count(*) INTO _deleted_users FROM deleted;
  END IF;

  INSERT INTO public.activity_logs(actor_user_id, action, related_type, description, created_at)
  VALUES (_admin_id, 'cleaned_yorp_sample_dataset', 'system_batch',
    format('Removed generated PCYDO YORP fixture records: %s organizations, %s budgets, %s liquidations, %s test identities. Reusable Storage seed assets were retained.',
      _deleted_orgs, _deleted_budgets, _deleted_liquidations, _deleted_users), _now);

  RETURN jsonb_build_object(
    'success', true, 'batch_name', _batch_name,
    'deleted_organizations', _deleted_orgs,
    'deleted_budget_requests', _deleted_budgets,
    'deleted_liquidations', _deleted_liquidations,
    'deleted_users', _deleted_users,
    'storage_seed_assets_deleted', 0,
    'renewal_test_organization_excluded', true,
    'timestamp', _now
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_yorp_sample_dataset_status(
  _session_token text,
  _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage, extensions
AS $function$
DECLARE
  _admin_id uuid;
  _test_environment boolean;
  _organizations integer := 0;
  _year_2024 integer := 0;
  _year_2025 integer := 0;
  _year_2026 integer := 0;
  _awaiting integer := 0;
  _released integer := 0;
  _completed integer := 0;
  _liquidated integer := 0;
  _packets integer := 0;
  _documents integer := 0;
  _complete integer := 0;
  _missing integer := 0;
  _duplicates integer := 0;
  _required integer := 0;
  _mapped integer := 0;
  _last_seeded timestamptz;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;
  IF _batch_name IS DISTINCT FROM 'PCYDO-YORP-2024-2026' THEN
    RAISE EXCEPTION 'Status is restricted to batch PCYDO-YORP-2024-2026.';
  END IF;
  _test_environment := public.is_development_or_test_environment();

  SELECT count(*), count(*) FILTER (WHERE seed_source_year = 2024),
         count(*) FILTER (WHERE seed_source_year = 2025), count(*) FILTER (WHERE seed_source_year = 2026),
         max(updated_at)
  INTO _organizations, _year_2024, _year_2025, _year_2026, _last_seeded
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  SELECT count(*) FILTER (WHERE br.status = 'awaiting_release'),
         count(*) FILTER (WHERE br.status = 'budget_released'),
         count(*) FILTER (WHERE br.status = 'completed')
  INTO _awaiting, _released, _completed
  FROM public.budget_requests br
  JOIN public.organization_profiles op ON op.id = br.organization_id
  WHERE br.is_seeded_sample_data IS TRUE AND br.seed_batch = _batch_name
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _liquidated
  FROM public.liquidation_reports lr
  JOIN public.organization_profiles op ON op.id = lr.organization_id
  WHERE lr.is_seeded_sample_data IS TRUE AND lr.seed_batch = _batch_name
    AND lr.status = 'completed_liquidated'
    AND op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _required
  FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(*) INTO _mapped
  FROM public.required_document_types rdt
  JOIN public.yorp_sample_document_assets asset ON asset.document_type_id = rdt.id
  JOIN storage.objects object_row ON object_row.bucket_id = asset.bucket_id AND object_row.name = asset.object_name
  WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  WITH seeded AS (
    SELECT id organization_id FROM public.organization_profiles
    WHERE is_seeded_sample_data IS TRUE AND seed_batch = _batch_name
      AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(is_renewal_test_account, false) IS FALSE
  ), required AS (
    SELECT id FROM public.required_document_types rdt
    WHERE rdt.is_active IS TRUE AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
  ), packets AS (
    SELECT s.organization_id, ds.id submission_id
    FROM seeded s JOIN public.document_submissions ds ON ds.organization_id = s.organization_id
    WHERE ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
  ), counts AS (
    SELECT p.organization_id, r.id document_type_id, count(dsf.id) file_count
    FROM packets p CROSS JOIN required r
    LEFT JOIN public.document_submission_files dsf
      ON dsf.submission_id = p.submission_id AND dsf.document_type_id = r.id
    GROUP BY p.organization_id, r.id
  ), per_org AS (
    SELECT organization_id,
      count(*) FILTER (WHERE file_count = 0) missing_count,
      sum(greatest(file_count - 1, 0)) duplicate_count,
      count(*) FILTER (WHERE file_count = 1) complete_count
    FROM counts GROUP BY organization_id
  )
  SELECT count(*) FILTER (WHERE missing_count = 0 AND duplicate_count = 0 AND complete_count = _required),
         coalesce(sum(missing_count), 0), coalesce(sum(duplicate_count), 0)
  INTO _complete, _missing, _duplicates FROM per_org;

  SELECT count(DISTINCT ds.id), count(dsf.id)
  INTO _packets, _documents
  FROM public.document_submissions ds
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  LEFT JOIN public.document_submission_files dsf ON dsf.submission_id = ds.id
  WHERE op.is_seeded_sample_data IS TRUE AND op.seed_batch = _batch_name
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND ds.renewal_id IS NULL AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration');

  RETURN jsonb_build_object(
    'is_development_or_test_environment', _test_environment,
    'seed_batch', _batch_name,
    'total_seeded_organizations', _organizations,
    'expected_total', 84,
    'year_breakdown', jsonb_build_object('2024', _year_2024, '2025', _year_2025, '2026', _year_2026),
    'budget_breakdown', jsonb_build_object('awaiting_release', _awaiting, 'budget_released', _released,
      'completed', _completed, 'liquidated_reports', _liquidated),
    'registration_breakdown', jsonb_build_object(
      'packets', _packets, 'document_records', _documents,
      'required_documents_per_organization', _required,
      'organizations_complete', _complete, 'missing_requirements', _missing,
      'duplicate_requirements', _duplicates,
      'mapped_seed_assets', _mapped,
      'asset_mapping_complete', _required > 0 AND _mapped = _required,
      'renewal_test_organization_excluded', true
    ),
    'last_seeded_at', _last_seeded
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_seed_yorp_sample_dataset(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_yorp_sample_dataset_status(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text, text) TO authenticated, service_role;

-- Migration-time contract checks: fail closed if the protected account guards or
-- immutable-asset behavior are accidentally removed from either RPC definition.
DO $safety_contract$
DECLARE
  _seed text := pg_get_functiondef('public.admin_seed_yorp_sample_dataset(text,text)'::regprocedure);
  _cleanup text := pg_get_functiondef('public.admin_cleanup_yorp_sample_dataset(text,text)'::regprocedure);
BEGIN
  IF position('8170959f-2bb8-40ea-8ce8-31deb514de17' IN _seed) = 0
     OR position('is_renewal_test_account' IN _seed) = 0
     OR position('PCYDO-YORP-2024-2026' IN _seed) = 0 THEN
    RAISE EXCEPTION 'YORP seed safety contract is missing an explicit Renewal Test Account or batch guard.';
  END IF;
  IF position('8170959f-2bb8-40ea-8ce8-31deb514de17' IN _cleanup) = 0
     OR position('is_renewal_test_account' IN _cleanup) = 0
     OR position('PCYDO-YORP-2024-2026' IN _cleanup) = 0 THEN
    RAISE EXCEPTION 'YORP cleanup safety contract is missing an explicit Renewal Test Account or batch guard.';
  END IF;
  IF position('DELETE FROM storage.objects' IN upper(_cleanup)) > 0 THEN
    RAISE EXCEPTION 'YORP cleanup must preserve reusable Storage seed assets.';
  END IF;
END;
$safety_contract$;
