-- Mark only the already-verified children of the generated YORP sample batch.
-- The initial fixture predates child-row ownership markers; Cleanup deliberately
-- refuses to delete packets or liquidation rows that are not explicitly marked.
DO $migration$
DECLARE
  _target_orgs integer;
  _all_packets integer;
  _registration_packets integer;
  _required integer;
  _mapping_count integer;
  _file_rows integer;
  _invalid_slots integer;
  _extra_files integer;
  _liquidations integer;
  _marked_liquidations integer;
  _pending_placeholders integer;
BEGIN
  SELECT count(*) INTO _target_orgs
  FROM public.organization_profiles
  WHERE is_seeded_sample_data IS TRUE
    AND seed_batch = 'PCYDO-YORP-2024-2026'
    AND id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(is_renewal_test_account, false) IS FALSE;

  IF _target_orgs <> 84 THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: expected 84 protected-scope sample organizations, found %.', _target_orgs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_profiles
    WHERE id = '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND is_renewal_test_account IS TRUE
      AND coalesce(is_seeded_sample_data, false) IS FALSE
  ) THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: the protected Renewal Test Organization is missing or marked as seeded.';
  END IF;

  SELECT count(*) INTO _required
  FROM public.required_document_types rdt
  WHERE rdt.is_active IS TRUE
    AND coalesce(rdt.is_required, true) IS TRUE
    AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
    AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
    AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category));

  SELECT count(*) INTO _mapping_count
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

  IF _required <> 6 OR _mapping_count <> _required THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: expected six active requirements with six existing Storage mappings; found % requirements and % mappings.', _required, _mapping_count;
  END IF;

  SELECT count(*), count(*) FILTER (
    WHERE ds.renewal_id IS NULL
      AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
  )
  INTO _all_packets, _registration_packets
  FROM public.document_submissions ds
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  IF _all_packets <> 84 OR _registration_packets <> 84 THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: expected exactly 84 registration packets and no other packets; found % total and % registration.', _all_packets, _registration_packets;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.document_submissions ds
    JOIN public.organization_profiles op ON op.id = ds.organization_id
    WHERE op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = 'PCYDO-YORP-2024-2026'
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND NOT (
        (ds.is_seeded_sample_data IS TRUE AND ds.seed_batch = 'PCYDO-YORP-2024-2026')
        OR (ds.is_seeded_sample_data IS FALSE AND ds.seed_batch IS NULL)
      )
  ) THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: a registration packet already has conflicting ownership markers.';
  END IF;

  SELECT count(*) INTO _file_rows
  FROM public.document_submission_files f
  JOIN public.document_submissions ds ON ds.id = f.submission_id
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  SELECT count(*) INTO _invalid_slots
  FROM (
    SELECT ds.id, rdt.id AS document_type_id, count(f.id) AS file_count
    FROM public.document_submissions ds
    JOIN public.organization_profiles op ON op.id = ds.organization_id
    CROSS JOIN public.required_document_types rdt
    LEFT JOIN public.document_submission_files f
      ON f.submission_id = ds.id
     AND f.document_type_id = rdt.id
    WHERE op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = 'PCYDO-YORP-2024-2026'
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND ds.renewal_id IS NULL
      AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration')
      AND rdt.is_active IS TRUE
      AND coalesce(rdt.is_required, true) IS TRUE
      AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
      AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
      AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
    GROUP BY ds.id, rdt.id
  ) requirement_slots
  WHERE file_count <> 1;

  SELECT count(*) INTO _extra_files
  FROM public.document_submission_files f
  JOIN public.document_submissions ds ON ds.id = f.submission_id
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND NOT EXISTS (
      SELECT 1 FROM public.required_document_types rdt
      WHERE rdt.id = f.document_type_id
        AND rdt.is_active IS TRUE
        AND coalesce(rdt.is_required, true) IS TRUE
        AND coalesce(rdt.template_scope, 'document_submission') = 'document_submission'
        AND (rdt.scope IS NULL OR rdt.scope IN ('registration', 'both'))
        AND (rdt.template_category IS NULL OR rdt.template_category = '{}' OR 'yorp' = ANY(rdt.template_category))
    );

  IF _file_rows <> 504 OR _invalid_slots <> 0 OR _extra_files <> 0 THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: expected 504 files with exactly one file for each active requirement; found % files, % invalid requirement slots, and % extra files.', _file_rows, _invalid_slots, _extra_files;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.document_submission_files f
    JOIN public.document_submissions ds ON ds.id = f.submission_id
    JOIN public.organization_profiles op ON op.id = ds.organization_id
    WHERE op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = 'PCYDO-YORP-2024-2026'
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND NOT (
        (f.is_seeded_sample_data IS TRUE AND f.seed_batch = 'PCYDO-YORP-2024-2026')
        OR (f.is_seeded_sample_data IS FALSE AND f.seed_batch IS NULL)
      )
  ) THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: a document file already has conflicting ownership markers.';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE l.is_seeded_sample_data IS TRUE AND l.seed_batch = 'PCYDO-YORP-2024-2026'),
         count(*) FILTER (WHERE l.status = 'pending_activity_completion'
           AND l.is_seeded_sample_data IS FALSE AND l.seed_batch IS NULL)
  INTO _liquidations, _marked_liquidations, _pending_placeholders
  FROM public.liquidation_reports l
  JOIN public.organization_profiles op ON op.id = l.organization_id
  WHERE op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE;

  IF _liquidations <> 56 OR _marked_liquidations <> 28 OR _pending_placeholders <> 28 THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: expected 56 linked liquidation rows (28 marked and 28 pending placeholders); found %, %, and %.', _liquidations, _marked_liquidations, _pending_placeholders;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.liquidation_reports l
    JOIN public.organization_profiles op ON op.id = l.organization_id
    LEFT JOIN public.budget_requests br ON br.id = l.budget_request_id
    WHERE op.is_seeded_sample_data IS TRUE
      AND op.seed_batch = 'PCYDO-YORP-2024-2026'
      AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
      AND coalesce(op.is_renewal_test_account, false) IS FALSE
      AND (br.id IS NULL OR br.organization_id <> op.id
        OR br.is_seeded_sample_data IS DISTINCT FROM TRUE
        OR br.seed_batch IS DISTINCT FROM 'PCYDO-YORP-2024-2026')
  ) THEN
    RAISE EXCEPTION 'Refusing child-marker backfill: a liquidation row is not attached to a budget request in the same seeded organization and batch.';
  END IF;

  UPDATE public.document_submissions ds
  SET is_seeded_sample_data = TRUE,
      seed_batch = 'PCYDO-YORP-2024-2026'
  FROM public.organization_profiles op
  WHERE op.id = ds.organization_id
    AND op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND ds.renewal_id IS NULL
    AND (ds.submission_scope IS NULL OR ds.submission_scope = 'registration');

  UPDATE public.document_submission_files f
  SET is_seeded_sample_data = TRUE,
      seed_batch = 'PCYDO-YORP-2024-2026'
  FROM public.document_submissions ds
  JOIN public.organization_profiles op ON op.id = ds.organization_id
  WHERE f.submission_id = ds.id
    AND op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND ds.is_seeded_sample_data IS TRUE
    AND ds.seed_batch = 'PCYDO-YORP-2024-2026';

  UPDATE public.liquidation_reports l
  SET is_seeded_sample_data = TRUE,
      seed_batch = 'PCYDO-YORP-2024-2026'
  FROM public.organization_profiles op
  JOIN public.budget_requests br ON br.organization_id = op.id
  WHERE op.id = l.organization_id
    AND br.id = l.budget_request_id
    AND op.is_seeded_sample_data IS TRUE
    AND op.seed_batch = 'PCYDO-YORP-2024-2026'
    AND op.id <> '8170959f-2bb8-40ea-8ce8-31deb514de17'::uuid
    AND coalesce(op.is_renewal_test_account, false) IS FALSE
    AND br.is_seeded_sample_data IS TRUE
    AND br.seed_batch = 'PCYDO-YORP-2024-2026'
    AND l.status = 'pending_activity_completion'
    AND l.is_seeded_sample_data IS FALSE
    AND l.seed_batch IS NULL;
END;
$migration$;
