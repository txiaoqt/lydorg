-- PROPOSAL ONLY. Separate approval and fresh synthetic binary hash verification required.
-- STAGING ONLY zroudsvpswqsjlyttkjf. Execute via fixed verified control plane.
-- Run INSIDE the patch transaction, BEFORE its first CREATE SCHEMA statement.
-- Never execute alone or after installing the terminal guard. No trigger bypass.
-- Requires transaction-level table locks below; installation follows before COMMIT.
LOCK TABLE public.organization_renewals,public.document_submissions,public.document_submission_files IN ACCESS EXCLUSIVE MODE;
DO $reconcile$
DECLARE f public.document_submission_files; expected public.document_submission_files;
 h jsonb; o storage.objects; before_terms jsonb; before_renewal jsonb; before_parent jsonb; before_others jsonb;
BEGIN
 IF current_user<>'postgres' OR to_regnamespace('ytrace_document_mutation') IS NOT NULL THEN
   RAISE EXCEPTION 'Reviewed maintenance owner and pre-patch transaction required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_accounts a JOIN public.roles r ON r.id=a.role_id
   WHERE a.id='f3cd6008-41ee-46dd-969d-35f86bacf063' AND a.username='staging-super-admin'
   AND a.email='ytrace-staging-super-admin@example.invalid' AND a.is_active AND a.is_password_set AND r.code='super_admin') THEN
   RAISE EXCEPTION 'Exact staging anchor missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ytrace_staging_renewal.fixture b JOIN public.organization_profiles p ON p.id=b.organization_id
   JOIN auth.users u ON u.id=b.user_id AND p.user_id=u.id WHERE b.organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f'
   AND u.email='ytrace-renewal-synthetic@example.invalid'
   AND u.raw_app_meta_data->>'ytrace_renewal_fixture'='zroudsvpswqsjlyttkjf-v1') THEN
   RAISE EXCEPTION 'Trusted dedicated synthetic fixture missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organization_renewals WHERE id='be35b31c-2bbe-42ab-a4aa-52e9c7123b65' AND organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f' AND cycle_number=2 AND status='approved')
 OR NOT EXISTS(SELECT 1 FROM public.document_submissions WHERE id='8e1f2447-5e3f-46a2-b35c-405d341d4ecb' AND organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f' AND renewal_id='be35b31c-2bbe-42ab-a4aa-52e9c7123b65' AND status='approved_green') THEN
   RAISE EXCEPTION 'Expected approved parent state missing'; END IF;
 expected:=jsonb_populate_record(NULL::public.document_submission_files,$expected${"id":"bf21c513-6466-44ac-9487-c791544ee4ad","file_url":"storage://organization-documents/2615fa09-a72b-48c6-8540-2f0e9cab810f/renewal/be35b31c-2bbe-42ab-a4aa-52e9c7123b65/729554c2-5b7c-4be3-8915-3b6fa12b992c/SYNTHETIC-renewal-729554c2-5b7c-4be3-8915-3b6fa12b992c.pdf","file_name":"SYNTHETIC-renewal-729554c2-5b7c-4be3-8915-3b6fa12b992c.pdf","file_size":673,"file_type":"application/pdf","created_at":"2026-10-10T17:53:07.309716+00:00","seed_batch":null,"updated_at":"2026-10-10T18:26:42.585322+00:00","reviewed_at":null,"uploaded_at":"2026-10-10T18:26:42.587189+00:00","admin_status":"submitted","admin_remarks":null,"submission_id":"8e1f2447-5e3f-46a2-b35c-405d341d4ecb","revision_due_at":null,"revision_locked":false,"document_type_id":"729554c2-5b7c-4be3-8915-3b6fa12b992c","revision_history":[{"action":"replaced","replacedAt":"2026-10-10T18:26:34.254124+00:00","reviewedAt":"2026-10-10T17:53:10.461039+00:00","adminRemarks":"SYNTHETIC correct the dedicated renewal PDF","previousStatus":"needs_revision","previousFileUrl":"storage://organization-documents/2615fa09-a72b-48c6-8540-2f0e9cab810f/renewal/be35b31c-2bbe-42ab-a4aa-52e9c7123b65/729554c2-5b7c-4be3-8915-3b6fa12b992c/SYNTHETIC-renewal-729554c2-5b7c-4be3-8915-3b6fa12b992c.pdf","previousFileName":"SYNTHETIC-renewal-729554c2-5b7c-4be3-8915-3b6fa12b992c.pdf","previousFileSize":673,"previousFileType":"application/pdf"},{"action":"replaced","replacedAt":"2026-10-10T18:26:42.586987+00:00","reviewedAt":"2026-10-10T18:26:37.240878+00:00","adminRemarks":"SYNTHETIC controlled renewal recovery document approval","previousStatus":"approved_green","previousFileUrl":"storage://organization-documents/2615fa09-a72b-48c6-8540-2f0e9cab810f/renewal/be35b31c-2bbe-42ab-a4aa-52e9c7123b65/729554c2-5b7c-4be3-8915-3b6fa12b992c/revisions/a6d8c2cc-df26-4c58-80af-babd59d7b3d5-SYNTHETIC-renewal-corrected.pdf","previousFileName":"SYNTHETIC-renewal-corrected.pdf","previousFileSize":674,"previousFileType":"application/pdf"}],"validation_status":"correct","revision_locked_at":null,"revision_unlocked_at":null,"revision_unlocked_by":null,"is_seeded_sample_data":false,"revision_requested_at":"2026-10-10T17:53:10.461039+00:00"}$expected$::jsonb);
 SELECT * INTO f FROM public.document_submission_files WHERE id=expected.id FOR UPDATE;
 IF f IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Exact target metadata drift; stop repair'; END IF;
 IF (SELECT count(*) FROM public.document_submission_files WHERE submission_id=f.submission_id)<>6
   OR (SELECT count(*) FROM public.document_submission_files WHERE submission_id=f.submission_id AND id<>f.id AND admin_status='approved_green')<>5 THEN
   RAISE EXCEPTION 'Expected five preserved approved files missing'; END IF;
 h:=f.revision_history->-1;
 IF h->>'previousFileUrl'<>$uri$storage://organization-documents/2615fa09-a72b-48c6-8540-2f0e9cab810f/renewal/be35b31c-2bbe-42ab-a4aa-52e9c7123b65/729554c2-5b7c-4be3-8915-3b6fa12b992c/revisions/a6d8c2cc-df26-4c58-80af-babd59d7b3d5-SYNTHETIC-renewal-corrected.pdf$uri$ OR h->>'previousStatus'<>'approved_green'
   OR h->>'previousFileName'<>'SYNTHETIC-renewal-corrected.pdf' OR (h->>'previousFileSize')::bigint<>674
   OR h->>'previousFileType'<>'application/pdf' OR nullif(h->>'reviewedAt','') IS NULL THEN
   RAISE EXCEPTION 'Historical approved correction evidence differs'; END IF;
 SELECT * INTO o FROM storage.objects WHERE bucket_id='organization-documents' AND name=$path$2615fa09-a72b-48c6-8540-2f0e9cab810f/renewal/be35b31c-2bbe-42ab-a4aa-52e9c7123b65/729554c2-5b7c-4be3-8915-3b6fa12b992c/revisions/a6d8c2cc-df26-4c58-80af-babd59d7b3d5-SYNTHETIC-renewal-corrected.pdf$path$ FOR SHARE;
 IF o.id IS NULL OR o.created_at IS NULL OR (o.metadata->>'size')::bigint IS DISTINCT FROM 674::bigint OR o.metadata->>'mimetype' IS DISTINCT FROM 'application/pdf'
   OR coalesce(o.owner_id,o.owner::text) IS DISTINCT FROM (SELECT user_id::text FROM public.organization_profiles WHERE id='2615fa09-a72b-48c6-8540-2f0e9cab810f') THEN
   RAISE EXCEPTION 'Corrected synthetic Storage object differs'; END IF;
 PERFORM 1 FROM public.organization_profiles WHERE id='2615fa09-a72b-48c6-8540-2f0e9cab810f' FOR UPDATE;
 PERFORM 1 FROM public.organization_accreditations WHERE organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f' FOR UPDATE;
 SELECT jsonb_agg(to_jsonb(a) ORDER BY id) INTO before_terms FROM public.organization_accreditations a WHERE organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f';
 SELECT to_jsonb(r) INTO before_renewal FROM public.organization_renewals r WHERE id='be35b31c-2bbe-42ab-a4aa-52e9c7123b65';
 SELECT to_jsonb(s) INTO before_parent FROM public.document_submissions s WHERE id='8e1f2447-5e3f-46a2-b35c-405d341d4ecb';
 SELECT jsonb_agg(to_jsonb(x) ORDER BY id) INTO before_others FROM public.document_submission_files x WHERE id<>f.id;
 IF jsonb_array_length(before_terms)<>2 OR NOT EXISTS(SELECT 1 FROM public.organization_accreditations WHERE organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f' AND term_number=1 AND status='superseded')
   OR NOT EXISTS(SELECT 1 FROM public.organization_accreditations WHERE organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f' AND term_number=2 AND status='active') THEN
   RAISE EXCEPTION 'Expected preserved accreditation transition missing'; END IF;
 UPDATE public.document_submission_files SET file_url=h->>'previousFileUrl',file_name=h->>'previousFileName',
   file_type=h->>'previousFileType',file_size=(h->>'previousFileSize')::bigint,admin_status='approved_green',
   reviewed_at=(h->>'reviewedAt')::timestamptz,admin_remarks=h->>'adminRemarks',uploaded_at=o.created_at,updated_at=clock_timestamp()
   WHERE id=f.id;
 INSERT INTO public.activity_logs(actor_user_id,organization_id,action,related_type,related_id,description,metadata)
 VALUES(NULL,'2615fa09-a72b-48c6-8540-2f0e9cab810f','reconciled_synthetic_approved_document','document_submission_file',f.id,
   'Approved staging-only reconciliation of the terminal replacement security-test mutation.',
   jsonb_build_object('actor_type','authorized_staging_maintenance','before',to_jsonb(f),
     'after',(SELECT to_jsonb(x) FROM public.document_submission_files x WHERE id=f.id),
     'corrected_sha256','67bba8968f41f97923e82f9fcfcf2d90871de9605d1b897ff336d452652a4f0d','hash_source','fresh read-only binary verification required before execution',
     'uploaded_at_source','Storage object created_at; exact previous metadata timestamp unavailable',
     'evidence','document-mutation/fixture-readonly-verification.json'));
 IF (SELECT revision_history FROM public.document_submission_files WHERE id=f.id) IS DISTINCT FROM f.revision_history
 OR (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM public.document_submission_files x WHERE id<>f.id) IS DISTINCT FROM before_others
 OR (SELECT to_jsonb(s) FROM public.document_submissions s WHERE id='8e1f2447-5e3f-46a2-b35c-405d341d4ecb') IS DISTINCT FROM before_parent
 OR (SELECT to_jsonb(r) FROM public.organization_renewals r WHERE id='be35b31c-2bbe-42ab-a4aa-52e9c7123b65') IS DISTINCT FROM before_renewal
 OR (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM public.organization_accreditations a WHERE organization_id='2615fa09-a72b-48c6-8540-2f0e9cab810f') IS DISTINCT FROM before_terms THEN
   RAISE EXCEPTION 'Preservation invariant failed; transaction must roll back'; END IF;
END $reconcile$;
