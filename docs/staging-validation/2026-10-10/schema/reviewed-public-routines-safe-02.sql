-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_bulk_delete_ypop_submissions(_session_token text, _period_id uuid, _organization_ids uuid[], _operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_semester text;
  v_requested uuid[];
  v_org_ids uuid[];
  v_entry_ids uuid[];
  v_participation_ids uuid[];
  v_activity_ids uuid[];
  v_prefixes text[];
  v_paths text[];
  v_org_id uuid;
  v_receipt jsonb;
  v_receipts jsonb := '[]'::jsonb;
  v_result jsonb;
  v_existing public.admin_ypop_deletion_jobs%ROWTYPE;
  v_deleted_at timestamptz := now();
BEGIN
  SELECT vat.admin_id INTO v_admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_accounts a JOIN public.roles r ON r.id = a.role_id
    WHERE a.id = v_admin_id AND a.is_active
      AND (r.code = 'super_admin' OR 'ypop_validation_review' = ANY(r.permission_codes))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete YPOP submissions.';
  END IF;
  SELECT array_agg(DISTINCT id ORDER BY id) INTO v_requested
  FROM unnest(_organization_ids) AS ids(id) WHERE id IS NOT NULL;
  IF _operation_id IS NULL OR coalesce(cardinality(v_requested), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one organization submission.';
  END IF;
  -- Retries use the same operation: a later resubmission is never deleted twice.
  PERFORM pg_advisory_xact_lock(hashtextextended(_operation_id::text, 0));
  SELECT * INTO v_existing FROM public.admin_ypop_deletion_jobs WHERE id = _operation_id;
  IF FOUND THEN
    IF v_existing.admin_id <> v_admin_id OR v_existing.period_id <> _period_id
       OR v_existing.organization_ids <> v_requested THEN
      RAISE EXCEPTION 'Deletion operation does not match the selected submissions.';
    END IF;
    RETURN v_existing.result;
  END IF;
  SELECT semester_key INTO v_semester FROM public.ypop_periods
  WHERE id = _period_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The YPOP semester was not found.'; END IF;

  -- Lock parents before collecting children so FK-linked writes cannot race deletion.
  PERFORM 1 FROM public.organization_profiles WHERE id = ANY(v_requested) ORDER BY id FOR UPDATE;
  SELECT coalesce(array_agg(o.id ORDER BY o.id), '{}') INTO v_org_ids
  FROM public.organization_profiles o WHERE o.id = ANY(v_requested) AND (
    EXISTS (SELECT 1 FROM public.ypop_entries e WHERE e.organization_id = o.id AND e.semester = v_semester)
    OR EXISTS (SELECT 1 FROM public.ypop_event_participations p
      JOIN public.ypop_city_activities c ON c.id = p.activity_id
      WHERE p.organization_id = o.id AND c.semester_key = v_semester AND p.status <> 'draft')
  );
  PERFORM 1 FROM public.ypop_entries WHERE organization_id = ANY(v_org_ids) AND semester = v_semester ORDER BY id FOR UPDATE;
  SELECT coalesce(array_agg(id), '{}') INTO v_entry_ids FROM public.ypop_entries
  WHERE organization_id = ANY(v_org_ids) AND semester = v_semester;
  PERFORM 1 FROM public.ypop_event_participations p
  WHERE p.organization_id = ANY(v_org_ids) AND p.activity_id IN (
    SELECT id FROM public.ypop_city_activities WHERE semester_key = v_semester
  ) ORDER BY p.id FOR UPDATE;
  SELECT coalesce(array_agg(p.id), '{}') INTO v_participation_ids FROM public.ypop_event_participations p
  JOIN public.ypop_city_activities c ON c.id = p.activity_id
  WHERE p.organization_id = ANY(v_org_ids) AND c.semester_key = v_semester;
  PERFORM 1 FROM public.ypop_org_activities WHERE ypop_entry_id = ANY(v_entry_ids) ORDER BY id FOR UPDATE;
  SELECT coalesce(array_agg(id), '{}') INTO v_activity_ids FROM public.ypop_org_activities
  WHERE ypop_entry_id = ANY(v_entry_ids);
  SELECT coalesce(array_agg(id::text), '{}') INTO v_prefixes
  FROM unnest(v_entry_ids || v_participation_ids || v_activity_ids) AS ids(id);
  -- Includes previous file versions and orphan uploads under these exact parents.
  SELECT coalesce(array_agg(name), '{}') INTO v_paths FROM storage.objects
  WHERE bucket_id = 'ypop-files' AND split_part(name, '/', 1) = ANY(v_prefixes);

  FOREACH v_org_id IN ARRAY v_org_ids LOOP
    v_receipt := jsonb_build_object(
      'operation_id', _operation_id, 'organization_id', v_org_id, 'semester', v_semester,
      'entry_ids', (SELECT coalesce(jsonb_agg(id), '[]') FROM public.ypop_entries WHERE id = ANY(v_entry_ids) AND organization_id = v_org_id),
      'participation_ids', (SELECT coalesce(jsonb_agg(id), '[]') FROM public.ypop_event_participations WHERE id = ANY(v_participation_ids) AND organization_id = v_org_id),
      'org_activity_ids', (SELECT coalesce(jsonb_agg(id), '[]') FROM public.ypop_org_activities WHERE id = ANY(v_activity_ids) AND organization_id = v_org_id),
      'deleted_at', v_deleted_at
    );
    v_receipts := v_receipts || jsonb_build_array(v_receipt);
    PERFORM public.create_admin_activity_log(
      _session_token, v_org_id, 'delete_ypop_submission', 'ypop_submission', _period_id,
      'Deleted organization YPOP submissions for ' || v_semester || '. Organization may submit again while the period is open.',
      'deletion', jsonb_build_object('operation_id', _operation_id, 'semester', v_semester)
    );
  END LOOP;
  v_result := jsonb_build_object('deleted_count', cardinality(v_org_ids), 'receipts', v_receipts, 'operation_id', _operation_id);
  INSERT INTO public.admin_ypop_deletion_jobs(id, admin_id, period_id, organization_ids, storage_paths, result)
  VALUES (_operation_id, v_admin_id, _period_id, v_requested, v_paths, v_result);
  INSERT INTO public.ypop_submission_deletion_receipts
    (operation_id, organization_id, semester, entry_ids, participation_ids, org_activity_ids, deleted_at)
  SELECT _operation_id, (r->>'organization_id')::uuid, v_semester,
    ARRAY(SELECT jsonb_array_elements_text(r->'entry_ids')::uuid),
    ARRAY(SELECT jsonb_array_elements_text(r->'participation_ids')::uuid),
    ARRAY(SELECT jsonb_array_elements_text(r->'org_activity_ids')::uuid), v_deleted_at
  FROM jsonb_array_elements(v_receipts) AS receipts(r);

  DELETE FROM public.notifications WHERE organization_id = ANY(v_org_ids)
    AND ((related_type = 'ypop_entry' AND related_id = ANY(v_entry_ids))
      OR (related_type IN ('ypop_event_participation', 'ypop_event') AND related_id = ANY(v_participation_ids))
      OR (related_type = 'ypop_org_activity' AND related_id = ANY(v_activity_ids)));
  -- File rows and PPAs cascade; budget_requests.ypop_entry_id becomes NULL.
  DELETE FROM public.ypop_event_participations WHERE id = ANY(v_participation_ids);
  DELETE FROM public.ypop_entries WHERE id = ANY(v_entry_ids);
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_bump_portal_change_version(_resource_key text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  UPDATE public.admin_portal_change_versions
  SET version = version + 1, updated_at = now()
  WHERE resource_key = _resource_key;
$function$;

CREATE OR REPLACE FUNCTION public.admin_check_organization_retention(_session_token text, _organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
begin
 perform ytrace_identity.authorize_reviewer(_session_token);
 return jsonb_build_object('retained',ytrace_identity.has_retained_history(_organization_id));
end $function$;

CREATE OR REPLACE FUNCTION public.admin_cleanup_yorp_sample_dataset(_session_token text, _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
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

RESET check_function_bodies;

