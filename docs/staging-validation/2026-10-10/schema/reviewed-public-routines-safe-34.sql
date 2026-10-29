-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.user_submit_renewal(p_renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_admin_session_token(_session_token text)
 RETURNS TABLE(admin_id uuid, username citext, email citext, display_name text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.admin_sessions
  set last_used_at = now()
  where token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    and revoked_at is null
    and public.admin_sessions.expires_at > now();

  return query
  select
    aa.id,
    aa.username,
    aa.email,
    aa.display_name,
    s.expires_at
  from public.admin_sessions s
  join public.admin_accounts aa on aa.id = s.admin_id
  where s.token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')
    and s.revoked_at is null
    and s.expires_at > now()
    and aa.is_active = true
  limit 1;
end;
$function$;

RESET check_function_bodies;

