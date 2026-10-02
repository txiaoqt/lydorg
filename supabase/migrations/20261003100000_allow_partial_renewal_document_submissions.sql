-- Allow renewal requirements to be submitted in batches, like registration documents.
-- Renewal approval still requires every mandatory document to be approved.

CREATE OR REPLACE FUNCTION public.user_submit_renewal(
  p_renewal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  SELECT op.user_id INTO _owner_id
  FROM public.organization_profiles op
  WHERE op.id = _renewal.organization_id;

  IF _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status <> 'draft' THEN
    RAISE EXCEPTION 'Renewal cannot be submitted from status "%". Expected "draft".', _renewal.status;
  END IF;

  SELECT oa.end_date INTO _end_date
  FROM public.organization_accreditations oa
  WHERE oa.id = _renewal.current_accreditation_id;

  IF current_date > (_end_date + 180) THEN
    RAISE EXCEPTION 'Late renewal cutoff has passed (180 days past expiration). Application can no longer be submitted.';
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No renewal document submission found.';
  END IF;

  -- Each selected document may be sent as it is ready. The admin approval RPC
  -- continues to enforce completeness and approval of every required type.
  IF NOT EXISTS (
    SELECT 1
    FROM public.document_submission_files dsf
    JOIN public.required_document_types rdt ON rdt.id = dsf.document_type_id
    WHERE dsf.submission_id = _submission.id
      AND rdt.is_active = true
      AND coalesce(rdt.is_required, true) = true
      AND rdt.scope IN ('renewal', 'both')
      AND rdt.template_scope = 'document_submission'
      AND nullif(trim(dsf.file_url), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Upload at least one required renewal document before submitting.';
  END IF;

  UPDATE public.organization_renewals
  SET status = 'submitted', submitted_at = _now, updated_at = _now
  WHERE id = p_renewal_id;

  UPDATE public.document_submissions
  SET status = 'submitted', submitted_at = _now, updated_at = _now
  WHERE id = _submission.id;

  INSERT INTO public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_submitted',
    'renewal',
    p_renewal_id,
    format('Organization submitted renewal documents for Cycle %s.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'submitted_at', _now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_submit_additional_renewal_documents(
  p_renewal_id uuid,
  p_file_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _now timestamptz := clock_timestamp();
  _updated_count integer;
  _requested_count integer;
BEGIN
  _requested_count := coalesce(cardinality(p_file_ids), 0);
  IF _requested_count = 0 THEN
    RAISE EXCEPTION 'Select at least one renewal document to submit.';
  END IF;

  IF (SELECT count(DISTINCT requested.file_id) FROM unnest(p_file_ids) AS requested(file_id)) <> _requested_count THEN
    RAISE EXCEPTION 'A renewal document was selected more than once.';
  END IF;

  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  SELECT op.user_id INTO _owner_id
  FROM public.organization_profiles op
  WHERE op.id = _renewal.organization_id;

  IF _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status NOT IN ('submitted', 'under_review', 'resubmitted') THEN
    RAISE EXCEPTION 'Additional documents cannot be submitted from renewal status "%".', _renewal.status;
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No renewal document submission found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_file_ids) AS requested(file_id)
    LEFT JOIN public.document_submission_files dsf
      ON dsf.id = requested.file_id
     AND dsf.submission_id = _submission.id
    LEFT JOIN public.required_document_types rdt
      ON rdt.id = dsf.document_type_id
    WHERE dsf.id IS NULL
      OR dsf.admin_status <> 'draft'
      OR nullif(trim(dsf.file_url), '') IS NULL
      OR rdt.id IS NULL
      OR rdt.is_active IS DISTINCT FROM true
      OR coalesce(rdt.is_required, true) IS DISTINCT FROM true
      OR rdt.scope NOT IN ('renewal', 'both')
      OR rdt.template_scope <> 'document_submission'
  ) THEN
    RAISE EXCEPTION 'Only saved draft files for required renewal documents can be submitted.';
  END IF;

  UPDATE public.document_submission_files
  SET admin_status = 'under_admin_review', reviewed_at = NULL, updated_at = _now
  WHERE submission_id = _submission.id
    AND id = ANY(p_file_ids)
    AND admin_status = 'draft';
  GET DIAGNOSTICS _updated_count = ROW_COUNT;

  IF _updated_count <> _requested_count THEN
    RAISE EXCEPTION 'Not all selected renewal documents could be sent for review.';
  END IF;

  UPDATE public.document_submissions
  SET updated_at = _now
  WHERE id = _submission.id;

  UPDATE public.organization_renewals
  SET updated_at = _now
  WHERE id = p_renewal_id;

  INSERT INTO public.activity_logs (
    actor_user_id, organization_id, action, related_type, related_id, description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_documents_submitted',
    'renewal',
    p_renewal_id,
    format('Organization submitted %s additional renewal document(s) for Cycle %s.', _updated_count, _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'submitted_count', _updated_count,
    'submitted_at', _now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.user_submit_renewal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_submit_additional_renewal_documents(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_submit_renewal(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_submit_additional_renewal_documents(uuid, uuid[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.user_submit_additional_renewal_documents(uuid, uuid[])
  IS 'Submits selected draft renewal files for admin review after the renewal cycle is already in review.';
