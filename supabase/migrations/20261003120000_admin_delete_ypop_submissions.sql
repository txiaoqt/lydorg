-- Delete organization submissions for one semester, preserving organizations,
-- city activities, periods and financial records. Storage is removed through
-- the Storage API by the authenticated Edge Function after this transaction.
CREATE TABLE public.admin_ypop_deletion_jobs (
  id uuid PRIMARY KEY,
  admin_id uuid NOT NULL,
  period_id uuid NOT NULL,
  organization_ids uuid[] NOT NULL,
  storage_paths text[] NOT NULL DEFAULT '{}',
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  cleaned_at timestamptz,
  cleanup_error text
);
ALTER TABLE public.admin_ypop_deletion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_ypop_deletion_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_ypop_deletion_jobs TO service_role;

-- Tombstones let organization clients discard locally cached deleted records
-- without discarding newly created drafts or a later resubmission.
CREATE TABLE public.ypop_submission_deletion_receipts (
  operation_id uuid NOT NULL REFERENCES public.admin_ypop_deletion_jobs(id),
  organization_id uuid NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  semester text NOT NULL,
  entry_ids uuid[] NOT NULL DEFAULT '{}',
  participation_ids uuid[] NOT NULL DEFAULT '{}',
  org_activity_ids uuid[] NOT NULL DEFAULT '{}',
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operation_id, organization_id)
);
ALTER TABLE public.ypop_submission_deletion_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ypop_submission_deletion_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ypop_submission_deletion_receipts TO authenticated;
GRANT ALL ON public.ypop_submission_deletion_receipts TO service_role;
CREATE POLICY organization_reads_own_ypop_deletions
ON public.ypop_submission_deletion_receipts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_profiles o
  WHERE o.id = organization_id AND o.user_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.admin_bulk_delete_ypop_submissions(
  _session_token text, _period_id uuid, _organization_ids uuid[], _operation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
$$;
REVOKE ALL ON FUNCTION public.admin_bulk_delete_ypop_submissions(text, uuid, uuid[], uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_ypop_submissions(text, uuid, uuid[], uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
