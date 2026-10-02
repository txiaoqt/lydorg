-- Seed the dedicated Renewal Test Organization's REGISTRATION packet so it
-- appears complete in Organizations > Registrations. This never creates or
-- changes a renewal-scoped document submission.

CREATE OR REPLACE FUNCTION public.admin_seed_renewal_test_registration_documents(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, storage
AS $function$
DECLARE
  _admin_id uuid;
  _org record;
  _submission_id uuid;
  _seeded_at timestamptz;
  _required integer := 0;
  _mapped integer := 0;
  _packet_complete boolean := false;
  _inserted integer := 0;
  _doc record;
  _asset storage.objects%ROWTYPE;
BEGIN
  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(p_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Registration sample files can only be seeded in a non-production environment.';
  END IF;

  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account IS TRUE
     OR organization_email = 'renewal.test@pasigcity.gov.ph'
  ORDER BY is_renewal_test_account DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF _org.id IS NULL OR _org.is_renewal_test_account IS NOT TRUE THEN
    RETURN jsonb_build_object('success', true, 'seeded', false, 'reason', 'renewal_test_account_missing');
  END IF;

  -- Permit this seeder alone to finish creating a new fixture packet even
  -- though the packet row is marked immutable as soon as it is inserted.
  PERFORM set_config('app.seed_renewal_test_registration_documents', 'true', true);

  _seeded_at := coalesce(_org.verified_at, _org.created_at, clock_timestamp());

  SELECT count(*) INTO _required
  FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(*) INTO _mapped
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

  IF _required = 0 OR _mapped <> _required THEN
    RETURN jsonb_build_object(
      'success', true,
      'seeded', false,
      'reason', 'registration_requirements_without_seed_assets',
      'required', _required,
      'mapped', _mapped
    );
  END IF;

  SELECT id INTO _submission_id
  FROM public.document_submissions
  WHERE organization_id = _org.id
    AND renewal_id IS NULL
    AND (submission_scope IS NULL OR submission_scope = 'registration')
  ORDER BY created_at ASC, id ASC
  LIMIT 1
  FOR UPDATE;

  IF _submission_id IS NULL THEN
    INSERT INTO public.document_submissions (
      organization_id, submitted_by, status, user_confirmed, submitted_at,
      reviewed_by, reviewed_at, submission_scope, renewal_id,
      is_seeded_sample_data, seed_batch, created_at, updated_at
    ) VALUES (
      _org.id, _org.user_id, 'approved_green', true, _seeded_at,
      _admin_id, _seeded_at, 'registration', NULL,
      true, 'RENEWAL-TEST-REGISTRATION', _seeded_at, clock_timestamp()
    ) RETURNING id INTO _submission_id;
  END IF;

  FOR _doc IN
    SELECT rdt.id AS document_type_id,
           rdt.name AS document_type_name,
           asset.bucket_id,
           asset.object_name
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
    IF NOT EXISTS (
      SELECT 1 FROM public.document_submission_files dsf
      WHERE dsf.submission_id = _submission_id
        AND dsf.document_type_id = _doc.document_type_id
    ) THEN
      SELECT * INTO _asset
      FROM storage.objects
      WHERE bucket_id = _doc.bucket_id AND name = _doc.object_name;

      INSERT INTO public.document_submission_files (
        submission_id, document_type_id, file_url, file_name, file_type,
        file_size, validation_status, admin_status, uploaded_at, reviewed_at,
        is_seeded_sample_data, seed_batch, created_at, updated_at
      ) VALUES (
        _submission_id,
        _doc.document_type_id,
        'storage://' || _doc.bucket_id || '/' || _doc.object_name,
        regexp_replace(_doc.object_name, '^.*/', ''),
        coalesce(_asset.metadata->>'mimetype', 'application/pdf'),
        coalesce(nullif(_asset.metadata->>'size', '')::bigint, 0),
        'correct', 'approved_green', _seeded_at, _seeded_at,
        true, 'RENEWAL-TEST-REGISTRATION', _seeded_at, clock_timestamp()
      );
      _inserted := _inserted + 1;
    END IF;
  END LOOP;

  -- Mark only a complete, fully approved test registration packet as verified.
  SELECT coalesce(
    count(*) = _required AND bool_and(dsf.admin_status = 'approved_green'),
    false
  ) INTO _packet_complete
  FROM public.required_document_types rdt
  LEFT JOIN public.document_submission_files dsf
    ON dsf.document_type_id = rdt.id
   AND dsf.submission_id = _submission_id
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  IF _packet_complete THEN
    UPDATE public.document_submissions
    SET status = 'approved_green',
        user_confirmed = true,
        submitted_at = coalesce(submitted_at, _seeded_at),
        reviewed_by = coalesce(reviewed_by, _admin_id),
        reviewed_at = coalesce(reviewed_at, _seeded_at),
        submission_scope = 'registration',
        is_seeded_sample_data = true,
        seed_batch = 'RENEWAL-TEST-REGISTRATION',
        updated_at = clock_timestamp()
    WHERE id = _submission_id
      AND is_seeded_sample_data IS DISTINCT FROM TRUE;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'seeded', true,
    'organizationId', _org.id,
    'submissionId', _submission_id,
    'required', _required,
    'inserted', _inserted,
    'scope', 'registration'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_seed_renewal_test_registration_documents(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_seed_renewal_test_registration_documents(text) TO authenticated, service_role;

-- Backfill an already-created Renewal Test Organization immediately when this
-- migration is run in Supabase SQL Editor. This operates only on the ordinary
-- registration packet (renewal_id IS NULL).
DO $seed_existing_renewal_test_registration$
DECLARE
  _org record;
  _submission_id uuid;
  _seeded_at timestamptz;
  _required integer := 0;
  _mapped integer := 0;
  _present integer := 0;
  _packet_complete boolean := false;
  _inserted integer := 0;
  _doc record;
  _asset storage.objects%ROWTYPE;
BEGIN
  SELECT * INTO _org
  FROM public.organization_profiles
  WHERE is_renewal_test_account IS TRUE
     OR organization_email = 'renewal.test@pasigcity.gov.ph'
  ORDER BY is_renewal_test_account DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF _org.id IS NULL OR _org.is_renewal_test_account IS NOT TRUE THEN
    RAISE NOTICE 'Registration seed skipped: dedicated Renewal Test Organization was not found.';
    RETURN;
  END IF;

  _seeded_at := coalesce(_org.verified_at, _org.created_at, clock_timestamp());

  SELECT count(*) INTO _required
  FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(*) INTO _mapped
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

  IF _required = 0 OR _mapped <> _required THEN
    RAISE EXCEPTION 'Registration seed needs sample assets for every required registration template (mapped %, required %).', _mapped, _required;
  END IF;

  SELECT id INTO _submission_id
  FROM public.document_submissions
  WHERE organization_id = _org.id
    AND renewal_id IS NULL
    AND (submission_scope IS NULL OR submission_scope = 'registration')
  ORDER BY created_at ASC, id ASC
  LIMIT 1
  FOR UPDATE;

  IF _submission_id IS NULL THEN
    INSERT INTO public.document_submissions (
      organization_id, submitted_by, status, user_confirmed, submitted_at,
      reviewed_by, reviewed_at, submission_scope, renewal_id,
      is_seeded_sample_data, seed_batch, created_at, updated_at
    ) VALUES (
      _org.id, _org.user_id, 'approved_green', true, _seeded_at,
      NULL, _seeded_at, 'registration', NULL,
      true, 'RENEWAL-TEST-REGISTRATION', _seeded_at, clock_timestamp()
    ) RETURNING id INTO _submission_id;
  END IF;

  FOR _doc IN
    SELECT rdt.id AS document_type_id, asset.bucket_id, asset.object_name
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
    IF NOT EXISTS (
      SELECT 1 FROM public.document_submission_files dsf
      WHERE dsf.submission_id = _submission_id
        AND dsf.document_type_id = _doc.document_type_id
    ) THEN
      SELECT * INTO _asset
      FROM storage.objects
      WHERE bucket_id = _doc.bucket_id AND name = _doc.object_name;

      INSERT INTO public.document_submission_files (
        submission_id, document_type_id, file_url, file_name, file_type,
        file_size, validation_status, admin_status, uploaded_at, reviewed_at,
        is_seeded_sample_data, seed_batch, created_at, updated_at
      ) VALUES (
        _submission_id,
        _doc.document_type_id,
        'storage://' || _doc.bucket_id || '/' || _doc.object_name,
        regexp_replace(_doc.object_name, '^.*/', ''),
        coalesce(_asset.metadata->>'mimetype', 'application/pdf'),
        coalesce(nullif(_asset.metadata->>'size', '')::bigint, 0),
        'correct', 'approved_green', _seeded_at, _seeded_at,
        true, 'RENEWAL-TEST-REGISTRATION', _seeded_at, clock_timestamp()
      );
      _inserted := _inserted + 1;
    END IF;
  END LOOP;

  SELECT coalesce(
    count(*) = _required AND bool_and(dsf.admin_status = 'approved_green'),
    false
  ) INTO _packet_complete
  FROM public.required_document_types rdt
  LEFT JOIN public.document_submission_files dsf
    ON dsf.document_type_id = rdt.id
   AND dsf.submission_id = _submission_id
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  IF _packet_complete THEN
    UPDATE public.document_submissions
    SET status = 'approved_green',
        user_confirmed = true,
        submitted_at = coalesce(submitted_at, _seeded_at),
        reviewed_at = coalesce(reviewed_at, _seeded_at),
        submission_scope = 'registration',
        is_seeded_sample_data = true,
        seed_batch = 'RENEWAL-TEST-REGISTRATION',
        updated_at = clock_timestamp()
    WHERE id = _submission_id
      AND is_seeded_sample_data IS DISTINCT FROM TRUE;
  END IF;

  SELECT count(*) INTO _present
  FROM public.required_document_types rdt
  JOIN public.document_submission_files dsf
    ON dsf.document_type_id = rdt.id
   AND dsf.submission_id = _submission_id
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  RAISE NOTICE 'Registration sample data seeded for %: %/% required documents.',
    _org.organization_name, _present, _required;
END;
$seed_existing_renewal_test_registration$;

-- The Cycle 1 registration fixture is an immutable historical packet. Renewal
-- review and later Cycle 2 updates must never alter its files or packet row.
CREATE OR REPLACE FUNCTION public.guard_renewal_test_registration_packet_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _submission_id uuid;
  _is_seeded_registration boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'document_submission_files'
     AND TG_OP = 'INSERT'
     AND current_setting('app.seed_renewal_test_registration_documents', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'document_submissions' THEN
    _submission_id := OLD.id;
    _is_seeded_registration :=
      OLD.is_seeded_sample_data IS TRUE
      AND OLD.seed_batch = 'RENEWAL-TEST-REGISTRATION'
      AND OLD.submission_scope = 'registration'
      AND OLD.renewal_id IS NULL;
  ELSE
    IF TG_OP = 'INSERT' THEN
      _submission_id := NEW.submission_id;
    ELSE
      _submission_id := OLD.submission_id;
    END IF;
    SELECT EXISTS (
      SELECT 1
      FROM public.document_submissions submission
      WHERE (submission.id = _submission_id
         OR (TG_OP = 'UPDATE' AND submission.id = NEW.submission_id))
        AND submission.is_seeded_sample_data IS TRUE
        AND submission.seed_batch = 'RENEWAL-TEST-REGISTRATION'
        AND submission.submission_scope = 'registration'
        AND submission.renewal_id IS NULL
    ) INTO _is_seeded_registration;
  END IF;

  IF _is_seeded_registration THEN
    RAISE EXCEPTION 'The Renewal Test Organization registration packet is an immutable Cycle 1 record.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_immutable_renewal_test_registration_submission
  ON public.document_submissions;
CREATE TRIGGER trg_immutable_renewal_test_registration_submission
BEFORE UPDATE OR DELETE ON public.document_submissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_renewal_test_registration_packet_immutable();

DROP TRIGGER IF EXISTS trg_immutable_renewal_test_registration_file
  ON public.document_submission_files;
CREATE TRIGGER trg_immutable_renewal_test_registration_file
BEFORE INSERT OR UPDATE OR DELETE ON public.document_submission_files
FOR EACH ROW
EXECUTE FUNCTION public.guard_renewal_test_registration_packet_immutable();

REVOKE ALL ON FUNCTION public.guard_renewal_test_registration_packet_immutable() FROM PUBLIC, anon, authenticated;
