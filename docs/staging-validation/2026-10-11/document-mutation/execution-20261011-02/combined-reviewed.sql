-- REVIEW ONLY: unapplied forward security patch. No data repair or Storage policy changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $gate$ DECLARE r record; BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Reviewed postgres installation owner required'; END IF;
 FOR r IN SELECT * FROM (VALUES
 ('user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)','59370b100efed37d5975dc16983d786a'),
 ('replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)','ce30b4dff57a2fa1b7bf314c01e9fae6'),
 ('update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','252754fd75505948c26afe27f6b0b760'),
 ('user_submit_renewal(uuid)','d41b680681db2323aba2c62693f59131'),
 ('user_resubmit_renewal(uuid)','d19a1d0415f3eb900bab7dea241f0b21'),
 ('guard_submitted_registration_document_edits()','c6265ae36e8db8678de7a4e69691008e'),
 ('admin_approve_renewal(text,uuid,text,text)','33ba7c606820f771e4ed79709bcd188b'),
 ('promote_renewal_submission_files_for_review()','b1a1e8a2d5eb9e8ccd66b10b6c652b45'),
 ('hard_delete_admin_template_document(text,uuid)','36de9fc3fb6c5ad090579f3261f77bbf'),
 ('delete_organization_account_canonical(text,uuid)','5c1f0179b9f279eb7a99ff9ee8627c3f')
 ) AS expected(signature,fingerprint) LOOP
 IF to_regprocedure(r.signature) IS NULL OR md5(pg_get_functiondef(to_regprocedure(r.signature))) IS DISTINCT FROM r.fingerprint THEN
 RAISE EXCEPTION 'Document mutation catalog drift: %',r.signature; END IF;
 END LOOP;
 IF to_regnamespace('ytrace_document_mutation') IS NOT NULL THEN RAISE EXCEPTION 'Patch namespace already exists; inspect before replay'; END IF;
END $gate$;
-- Support fragment: installed only by the forward patch, never separately.
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

CREATE SCHEMA ytrace_document_mutation;
REVOKE ALL ON SCHEMA ytrace_document_mutation FROM PUBLIC,anon,authenticated;

-- Owner RPC entry point. Match approval's renewal -> organization order, then
-- submission -> file. Recheck the linkage after waiting on all locks.
CREATE FUNCTION ytrace_document_mutation.lock_replacement(_file_id uuid)
RETURNS public.document_submission_files LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE f public.document_submission_files; s public.document_submissions;
 r public.organization_renewals; o public.organization_profiles; _sid uuid; _rid uuid; _oid uuid; _end date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
 SELECT submission_id INTO _sid FROM public.document_submission_files WHERE id=_file_id;
 SELECT renewal_id,organization_id INTO _rid,_oid FROM public.document_submissions WHERE id=_sid;
 IF _sid IS NULL OR _oid IS NULL THEN RAISE EXCEPTION 'Document parent missing'; END IF;
 IF _rid IS NOT NULL THEN
   SELECT * INTO r FROM public.organization_renewals WHERE id=_rid FOR UPDATE;
   IF r.id IS NULL OR r.organization_id IS DISTINCT FROM _oid OR r.status IS NULL OR r.status NOT IN ('draft','needs_revision') THEN
     RAISE EXCEPTION 'Renewal is not editable'; END IF;
 END IF;
 SELECT * INTO o FROM public.organization_profiles WHERE id=_oid FOR SHARE;
 IF o.user_id IS DISTINCT FROM auth.uid() OR o.profile_status::text='suspended_inactive' THEN
   RAISE EXCEPTION 'Organization is not authorized to replace documents'; END IF;
 SELECT * INTO s FROM public.document_submissions WHERE id=_sid FOR UPDATE;
 SELECT * INTO f FROM public.document_submission_files WHERE id=_file_id FOR UPDATE;
 IF s.organization_id IS DISTINCT FROM _oid OR s.renewal_id IS DISTINCT FROM _rid OR f.submission_id IS DISTINCT FROM _sid THEN
   RAISE EXCEPTION 'Document relationship changed'; END IF;
 IF s.status IS NULL OR f.admin_status IS NULL OR s.status::text IN ('approved_green','rejected_red') OR f.admin_status::text NOT IN ('draft','needs_revision') THEN
   RAISE EXCEPTION 'Document is locked or terminal'; END IF;
 IF f.admin_status::text='needs_revision' AND s.status::text<>'needs_revision' THEN
   RAISE EXCEPTION 'Parent is not awaiting revision'; END IF;
 IF f.admin_status::text='draft' AND s.status::text NOT IN ('draft','needs_revision','submitted','under_admin_review','ready_for_review') THEN
   RAISE EXCEPTION 'Parent is not editable'; END IF;
 IF coalesce(s.revision_locked,false) OR coalesce(f.revision_locked,false)
   OR (s.revision_locked_at IS NOT NULL AND s.revision_unlocked_at IS NULL)
   OR (f.revision_locked_at IS NOT NULL AND f.revision_unlocked_at IS NULL)
   OR (s.revision_due_at<=clock_timestamp() AND s.revision_unlocked_at IS NULL)
   OR (f.revision_due_at<=clock_timestamp() AND f.revision_unlocked_at IS NULL)
   OR (_rid IS NOT NULL AND (coalesce(r.revision_locked,false)
      OR (r.revision_locked_at IS NOT NULL AND r.revision_unlocked_at IS NULL)
      OR (r.revision_due_at<=clock_timestamp() AND r.revision_unlocked_at IS NULL))) THEN
   RAISE EXCEPTION 'Document revision is locked or overdue'; END IF;
 IF _rid IS NOT NULL THEN
   SELECT end_date INTO _end FROM public.organization_accreditations
     WHERE id=r.current_accreditation_id AND organization_id=_oid;
   IF _end IS NULL OR current_date>_end+180 THEN RAISE EXCEPTION 'Renewal accreditation prerequisite or cutoff failed'; END IF;
 END IF;
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION ytrace_document_mutation.lock_replacement(uuid) FROM PUBLIC,anon,authenticated;

-- Runs for definer RPCs as well as direct REST writes. No Admin/GUC bypass.
CREATE FUNCTION ytrace_document_mutation.guard_file()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s public.document_submissions; r public.organization_renewals; o public.organization_profiles;
 _sid uuid; _rid uuid; _oid uuid; _path text; _prefix text; _object storage.objects; _payload boolean;
BEGIN
 -- Preserve existing validated template deletion's exact catalog unlink only.
 -- The invoker guard below denies this operation to direct organization clients.
 -- No URL, content, owner, status, review or history change is permitted here.
 IF TG_OP='UPDATE' AND OLD.document_type_id IS NOT NULL AND NEW.document_type_id IS NULL
   AND (to_jsonb(NEW)-ARRAY['document_type_id','updated_at'])=(to_jsonb(OLD)-ARRAY['document_type_id','updated_at']) THEN
   RETURN NEW;
 END IF;
 _sid:=CASE WHEN TG_OP='INSERT' THEN NEW.submission_id ELSE OLD.submission_id END;
 SELECT renewal_id,organization_id INTO _rid,_oid FROM public.document_submissions WHERE id=_sid;
 IF _rid IS NOT NULL THEN
   SELECT * INTO r FROM public.organization_renewals WHERE id=_rid FOR UPDATE;
   IF r.id IS NULL OR r.organization_id IS DISTINCT FROM _oid OR r.status IN ('approved','rejected','cancelled','expired') THEN
     RAISE EXCEPTION 'Terminal renewal documents are immutable'; END IF;
 END IF;
 SELECT * INTO o FROM public.organization_profiles WHERE id=_oid FOR SHARE;
 SELECT * INTO s FROM public.document_submissions WHERE id=_sid FOR UPDATE;
 IF s.id IS NULL OR s.organization_id IS DISTINCT FROM _oid OR s.renewal_id IS DISTINCT FROM _rid THEN
   RAISE EXCEPTION 'Document parent missing or changed'; END IF;
 IF s.status IS NULL OR s.status::text IN ('approved_green','rejected_red') THEN RAISE EXCEPTION 'Terminal submission documents are immutable'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.submission_id IS DISTINCT FROM OLD.submission_id
   OR NEW.document_type_id IS DISTINCT FROM OLD.document_type_id) THEN RAISE EXCEPTION 'Document relationship is immutable'; END IF;
 _payload:=TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN
   _payload:=ROW(NEW.file_url,NEW.file_name,NEW.file_type,NEW.file_size,NEW.uploaded_at)
     IS DISTINCT FROM ROW(OLD.file_url,OLD.file_name,OLD.file_type,OLD.file_size,OLD.uploaded_at);
   IF _payload AND OLD.admin_status::text NOT IN ('draft','needs_revision') THEN
     RAISE EXCEPTION 'Reviewed document content is locked'; END IF;
 END IF;
 IF _payload THEN
   IF TG_OP='UPDATE' AND (coalesce(OLD.revision_locked,false)
     OR (OLD.revision_locked_at IS NOT NULL AND OLD.revision_unlocked_at IS NULL)
     OR (OLD.revision_due_at<=clock_timestamp() AND OLD.revision_unlocked_at IS NULL)) THEN
     RAISE EXCEPTION 'Document revision is locked or overdue'; END IF;
   IF auth.uid() IS NULL OR o.user_id IS DISTINCT FROM auth.uid() OR o.profile_status::text='suspended_inactive' THEN
     RAISE EXCEPTION 'Organization is not authorized to attach this object'; END IF;
   IF _rid IS NOT NULL AND r.status NOT IN ('draft','needs_revision') THEN RAISE EXCEPTION 'Renewal is not editable'; END IF;
   IF coalesce(s.revision_locked,false) OR (s.revision_locked_at IS NOT NULL AND s.revision_unlocked_at IS NULL)
     OR (s.revision_due_at<=clock_timestamp() AND s.revision_unlocked_at IS NULL)
     OR (_rid IS NOT NULL AND (coalesce(r.revision_locked,false) OR (r.revision_locked_at IS NOT NULL AND r.revision_unlocked_at IS NULL)
       OR (r.revision_due_at<=clock_timestamp() AND r.revision_unlocked_at IS NULL))) THEN
     RAISE EXCEPTION 'Parent revision is locked or overdue'; END IF;
   IF NEW.file_url NOT LIKE 'storage://organization-documents/%' THEN RAISE EXCEPTION 'Canonical Storage reference required'; END IF;
   _path:=substr(NEW.file_url,length('storage://organization-documents/')+1);
   _prefix:=_oid::text||'/'||CASE WHEN _rid IS NULL THEN '' ELSE 'renewal/'||_rid::text||'/' END||NEW.document_type_id::text||'/';
   IF _path NOT LIKE _prefix||'%' OR _path ~ '(^|/)(\.|\.\.)(/|$)' OR _path LIKE '%//%' THEN
     RAISE EXCEPTION 'Storage object does not belong to this requirement'; END IF;
   IF TG_OP='UPDATE' AND OLD.admin_status::text='needs_revision' THEN
     IF _path NOT LIKE _prefix||'revisions/%' OR NEW.file_url=OLD.file_url THEN RAISE EXCEPTION 'A new revision upload is required'; END IF;
   END IF;
   SELECT * INTO _object FROM storage.objects WHERE bucket_id='organization-documents' AND name=_path FOR SHARE;
   IF _object.id IS NULL OR coalesce(_object.owner_id,_object.owner::text) IS DISTINCT FROM auth.uid()::text THEN
     RAISE EXCEPTION 'Uploaded Storage object ownership could not be verified'; END IF;
   IF NEW.file_size IS NULL OR NEW.file_size<=0 OR NEW.file_size>10485760
     OR (_object.metadata->>'size')::numeric IS DISTINCT FROM NEW.file_size::numeric
     OR NEW.file_type IS DISTINCT FROM 'application/pdf' OR _object.metadata->>'mimetype' IS DISTINCT FROM 'application/pdf'
     OR nullif(btrim(NEW.file_name),'') IS NULL OR length(NEW.file_name)>180 THEN
     RAISE EXCEPTION 'Uploaded document metadata is invalid'; END IF;
   IF TG_OP='UPDATE' AND OLD.admin_status::text='needs_revision' AND
     (_object.created_at IS NULL OR _object.created_at<=OLD.revision_requested_at) THEN RAISE EXCEPTION 'Revision upload predates the request'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION ytrace_document_mutation.guard_file() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER a_document_mutation_guard BEFORE INSERT OR UPDATE ON public.document_submission_files
 FOR EACH ROW EXECUTE FUNCTION ytrace_document_mutation.guard_file();

-- Invoker guard distinguishes direct table clients from existing validated RPCs.
-- It does not grant an Admin override; terminal/content checks above always run.
CREATE FUNCTION public.guard_direct_document_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE _parent public.document_submissions; _renewal_status text;
BEGIN
 IF current_user IN ('anon','authenticated') THEN
   IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.document_submissions s JOIN public.organization_profiles o ON o.id=s.organization_id
      WHERE s.id=CASE WHEN TG_OP='INSERT' THEN NEW.submission_id ELSE OLD.submission_id END
      AND o.user_id=auth.uid() AND o.profile_status::text<>'suspended_inactive') THEN
     RAISE EXCEPTION 'Organization is not authorized to edit documents'; END IF;
   IF TG_OP<>'INSERT' AND OLD.admin_status::text<>'draft' THEN RAISE EXCEPTION 'Use the supported revision workflow'; END IF;
   IF TG_OP='DELETE' THEN
     SELECT * INTO _parent FROM public.document_submissions WHERE id=OLD.submission_id FOR UPDATE;
     IF _parent.id IS NULL OR _parent.status::text IN ('approved_green','rejected_red') THEN
       RAISE EXCEPTION 'Terminal submission documents are immutable'; END IF;
     IF _parent.renewal_id IS NOT NULL THEN
       SELECT status INTO _renewal_status FROM public.organization_renewals WHERE id=_parent.renewal_id FOR UPDATE;
       IF _renewal_status IS NULL OR _renewal_status NOT IN ('draft','needs_revision') THEN
         RAISE EXCEPTION 'Renewal is not editable'; END IF;
     END IF;
     RETURN OLD;
   END IF;
   IF NEW.admin_status IS NULL OR NEW.admin_status::text NOT IN ('draft','submitted','under_admin_review','ready_for_review') OR NEW.reviewed_at IS NOT NULL
     OR NEW.admin_remarks IS NOT NULL OR coalesce(NEW.revision_locked,false) OR NEW.revision_due_at IS NOT NULL
     OR NEW.revision_unlocked_at IS NOT NULL OR NEW.revision_unlocked_by IS NOT NULL THEN RAISE EXCEPTION 'Review fields are server controlled'; END IF;
   IF TG_OP='UPDATE' AND (NEW.revision_history IS DISTINCT FROM OLD.revision_history
     OR NEW.revision_requested_at IS DISTINCT FROM OLD.revision_requested_at OR NEW.revision_locked_at IS DISTINCT FROM OLD.revision_locked_at) THEN
     RAISE EXCEPTION 'Review history is server controlled'; END IF;
   IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['file_url','file_name','file_type','file_size','validation_status','admin_status','uploaded_at','updated_at']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['file_url','file_name','file_type','file_size','validation_status','admin_status','uploaded_at','updated_at']) THEN
     RAISE EXCEPTION 'Review history is server controlled'; END IF;
   IF TG_OP='INSERT' AND (coalesce(NEW.revision_history,'[]'::jsonb)<>'[]'::jsonb OR NEW.revision_requested_at IS NOT NULL OR NEW.revision_locked_at IS NOT NULL) THEN
     RAISE EXCEPTION 'Review history is server controlled'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_direct_document_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER b_document_direct_guard BEFORE INSERT OR UPDATE OR DELETE ON public.document_submission_files
 FOR EACH ROW EXECUTE FUNCTION public.guard_direct_document_mutation();

CREATE FUNCTION public.guard_document_parent_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND NOT EXISTS(SELECT 1 FROM public.organization_profiles o
   WHERE o.id=CASE WHEN TG_OP='INSERT' THEN NEW.organization_id ELSE OLD.organization_id END
     AND o.user_id=auth.uid() AND o.profile_status::text<>'suspended_inactive') THEN
   RAISE EXCEPTION 'Organization is not authorized to edit submissions'; END IF;
 IF TG_OP='INSERT' THEN
   IF current_user IN ('anon','authenticated') AND (auth.uid() IS NULL
     OR NEW.status::text<>'draft' OR NEW.submitted_by IS DISTINCT FROM auth.uid()
     OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL
     OR coalesce(NEW.revision_locked,false) OR NEW.revision_unlocked_at IS NOT NULL
     OR NEW.revision_unlocked_by IS NOT NULL OR NEW.revision_due_at IS NOT NULL) THEN
     RAISE EXCEPTION 'Submission review fields are server controlled'; END IF;
   RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN
   -- Preserve the existing authorized canonical account-deletion workflow.
   -- Ordinary clients retain owner RLS and the terminal/lifecycle restriction.
   IF current_user IN ('anon','authenticated') AND (OLD.status::text IN ('approved_green','rejected_red')
      OR EXISTS(SELECT 1 FROM public.organization_renewals r WHERE r.id=OLD.renewal_id AND r.status NOT IN ('draft','needs_revision'))) THEN
     RAISE EXCEPTION 'Terminal submission is immutable'; END IF;
   RETURN OLD;
 END IF;
 IF ROW(NEW.id,NEW.organization_id,NEW.renewal_id,NEW.submission_scope,NEW.submitted_by)
   IS DISTINCT FROM ROW(OLD.id,OLD.organization_id,OLD.renewal_id,OLD.submission_scope,OLD.submitted_by) THEN
   RAISE EXCEPTION 'Submission relationship is immutable'; END IF;
 IF OLD.status::text IN ('approved_green','rejected_red') THEN
   IF NEW.status IS DISTINCT FROM OLD.status OR
     (to_jsonb(NEW)-ARRAY['updated_at','reviewed_by','reviewed_at','overall_remarks']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['updated_at','reviewed_by','reviewed_at','overall_remarks']) THEN
     RAISE EXCEPTION 'Terminal submission is immutable'; END IF;
 END IF;
 IF current_user IN ('anon','authenticated') AND (
   NEW.status::text NOT IN ('draft','submitted','under_admin_review','ready_for_review','needs_revision')
   OR (to_jsonb(NEW)-ARRAY['status','user_confirmed','submitted_at','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['status','user_confirmed','submitted_at','updated_at'])) THEN
   RAISE EXCEPTION 'Submission review fields are server controlled'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_document_parent_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER a_document_parent_guard BEFORE INSERT OR UPDATE OR DELETE ON public.document_submissions
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_parent_mutation();

CREATE OR REPLACE FUNCTION public.user_replace_document_submission_file(_file_id uuid, _new_file_url text, _new_file_name text, _new_file_type text, _new_file_size numeric DEFAULT NULL::numeric, _submit_for_review boolean DEFAULT true)
 RETURNS document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _old_file record;
  _submission record;
  _owner_id uuid;
  _history jsonb;
  _history_entry jsonb;
  _updated_row public.document_submission_files;
BEGIN
  SELECT * INTO _old_file FROM ytrace_document_mutation.lock_replacement(_file_id);

  IF _old_file.id IS NULL THEN
    RAISE EXCEPTION 'Document file not found.';
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE id = _old_file.submission_id;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'Parent document submission not found.';
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _submission.organization_id;

  IF auth.uid() IS NULL OR _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this submission.';
  END IF;

  _history_entry := jsonb_build_object(
    'action', 'replaced',
    'previousFileName', _old_file.file_name,
    'previousFileUrl', _old_file.file_url,
    'previousFileType', _old_file.file_type,
    'previousFileSize', _old_file.file_size,
    'previousStatus', _old_file.admin_status,
    'adminRemarks', _old_file.admin_remarks,
    'reviewedAt', _old_file.reviewed_at,
    'replacedAt', clock_timestamp()
  );

  _history := coalesce(_old_file.revision_history, '[]'::jsonb) || jsonb_build_array(_history_entry);

  UPDATE public.document_submission_files
  SET
    file_url = _new_file_url,
    file_name = _new_file_name,
    file_type = _new_file_type,
    file_size = coalesce(_new_file_size, _old_file.file_size),
    admin_status = CASE
      WHEN _submit_for_review THEN 'submitted'::public.document_submission_status
      ELSE 'draft'::public.document_submission_status
    END,
    admin_remarks = NULL,
    reviewed_at = NULL,
    uploaded_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    revision_history = _history
  WHERE id = _file_id
  RETURNING * INTO _updated_row;

  INSERT INTO public.activity_logs(actor_user_id,organization_id,action,related_type,related_id,description,metadata)
  VALUES(NULL,_submission.organization_id,'Replaced document','document_submission_file',_file_id,
    'Organization replaced an editable document.',jsonb_build_object('actor_auth_user_id',auth.uid(),'actor_type','organization'));
  RETURN _updated_row;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.replace_organization_document_file(_file_id uuid, _document_type_id uuid, _expected_updated_at timestamp with time zone, _file_url text, _file_name text, _file_type text, _file_size bigint)
 RETURNS SETOF document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  _user_id uuid := auth.uid();
  _file public.document_submission_files%rowtype;
  _submission public.document_submissions%rowtype;
  _organization public.organization_profiles%rowtype;
  _document_name text;
  _submitted_at timestamptz := clock_timestamp();
  _overall_status public.document_submission_status;
  _notify_resubmitted boolean;
begin
  if _user_id is null then
    raise exception 'Please sign in with your organization account first.';
  end if;

  select * into _file from ytrace_document_mutation.lock_replacement(_file_id);
  if _file.id is null then raise exception 'Document file not found.'; end if;

  select * into _submission from public.document_submissions where id = _file.submission_id for update;
  select * into _organization from public.organization_profiles where id = _submission.organization_id;

  if _organization.user_id is distinct from _user_id then
    raise exception 'You are not authorized to replace this document.';
  end if;

  -- PERMANENT SUSPENSION GUARD
  if _organization.profile_status = 'suspended_inactive' then
    raise exception 'This organization account is permanently suspended. Document replacement is not permitted.';
  end if;

  if _file.document_type_id is distinct from _document_type_id then
    raise exception 'The selected file does not match this document requirement.';
  end if;

  -- TERMINAL REJECTION GUARD
  if _file.admin_status = 'rejected_red' or _submission.status = 'rejected_red' then
    raise exception 'This rejected document cannot be replaced. The organization account is permanently suspended.';
  end if;

  if _file.admin_status <> 'needs_revision' then
    raise exception 'This document is no longer open for correction. Refresh the page to see its current status.';
  end if;

  -- AUTHORITATIVE SERVER-SIDE DEADLINE AND LOCK ENFORCEMENT
  if (_submission.revision_locked = true or (_submission.revision_due_at is not null and _submitted_at >= _submission.revision_due_at and _submission.revision_unlocked_at is null)) then
    update public.document_submissions
    set revision_locked = true,
        revision_locked_at = coalesce(revision_locked_at, _submitted_at)
    where id = _submission.id;

    raise exception 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  end if;

  if (_file.revision_locked = true or (_file.revision_due_at is not null and _submitted_at >= _file.revision_due_at and _file.revision_unlocked_at is null)) then
    raise exception 'Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.';
  end if;

  if _file.updated_at is distinct from _expected_updated_at then
    raise exception 'This document changed after the page was opened. Refresh before uploading again.';
  end if;
  if _file_size <= 0 or _file_size > 10485760 then
    raise exception 'The replacement file must be between 1 byte and 10 MB.';
  end if;
  if nullif(trim(_file_name), '') is null or length(_file_name) > 180
     or _file_name ~ '[\\/[:cntrl:]]' then
    raise exception 'The replacement file name is not allowed.';
  end if;
  if _file_url not like
    'storage://organization-documents/' || _organization.id::text || '/' ||
    _document_type_id::text || '/revisions/%'
     and _file_url not like
    'https://' || '%' || '/storage/v1/object/public/organization-documents/' ||
    _organization.id::text || '/' || _document_type_id::text || '/revisions/%'
     and _file_url not like
    'http://' || '%' || '/storage/v1/object/public/organization-documents/' ||
    _organization.id::text || '/' || _document_type_id::text || '/revisions/%'
  then
    raise exception 'The uploaded file path is invalid.';
  end if;

  select coalesce(required_document_types.name, _file.file_name)
  into _document_name
  from public.required_document_types
  where id = _document_type_id;

  update public.document_submission_files
  set
    file_url = _file_url,
    file_name = _file_name,
    file_type = _file_type,
    file_size = _file_size,
    validation_status = 'correct',
    admin_status = 'under_admin_review',
    admin_remarks = null,
    uploaded_at = _submitted_at,
    reviewed_at = null,
    revision_history = coalesce(revision_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'replaced',
        'file_name', _file_name,
        'replaced_at', _submitted_at,
        'previous_file_url', _file.file_url,
        'previous_admin_remarks', _file.admin_remarks
      )
    ),
    revision_requested_at = null,
    revision_due_at = null,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null,
    updated_at = _submitted_at
  where id = _file.id;

  select
    case
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status = 'rejected_red'
      ) then 'rejected_red'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status = 'needs_revision'
      ) then 'needs_revision'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
      ) and not exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission.id
          and admin_status <> 'approved_green'
      ) then 'approved_green'::public.document_submission_status
      else 'under_admin_review'::public.document_submission_status
    end
  into _overall_status;

  update public.document_submissions
  set
    status = _overall_status,
    updated_at = _submitted_at,
    revision_requested_at = case when _overall_status = 'needs_revision' then revision_requested_at else null end,
    revision_due_at = case when _overall_status = 'needs_revision' then revision_due_at else null end,
    revision_locked = false,
    revision_locked_at = null,
    revision_unlocked_at = null,
    revision_unlocked_by = null
  where id = _submission.id;

  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description,
    created_at,
    metadata
  ) values (
    null,
    _organization.id,
    'Replaced document',
    'document_submission_file',
    _file.id,
    format('Uploaded a corrected version of %s.', coalesce(_document_name, _file_name)),
    _submitted_at,
    jsonb_build_object('actor_auth_user_id', _user_id, 'actor_type', 'organization')
  );

  -- Gated resubmission acknowledgement notification based on workflow.notify_org_on_resubmitted
  _notify_resubmitted := public.get_system_setting_bool('workflow.notify_org_on_resubmitted', true);
  if _notify_resubmitted then
    insert into public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) values (
      _user_id,
      _organization.id,
      'Document Resubmitted',
      format('You have successfully uploaded a corrected version of ''%s''. It is now under review.', coalesce(_document_name, _file_name)),
      'completed',
      'document_submission',
      _submission.id,
      _submitted_at
    );
  end if;

  return query
  select *
  from public.document_submission_files
  where id = _file_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_admin_document_submission_file_review(_session_token text, _file_id uuid, _status document_submission_status, _admin_remarks text DEFAULT NULL::text)
 RETURNS SETOF document_submission_files
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _admin_id uuid;
  _submission_id uuid;
  _org_id uuid;
  _org_user_id uuid;
  _renewal_id uuid;
  _document_name text;
  _current_admin_status public.document_submission_status;
  _current_revision_requested_at timestamptz;
  _current_uploaded_at timestamptz;
  _reviewed_at timestamptz := clock_timestamp();
  _revision_due timestamptz := _reviewed_at + interval '5 days';
  _overall_status public.document_submission_status;
  _overall_remarks text;
  _notify_approved boolean;
  _notify_revision boolean;
  _notify_rejected boolean;
BEGIN
  -- Validate admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Resolve file, current status, timestamps, submission, organization, and document type name
  SELECT
    document_submission_files.submission_id,
    document_submission_files.admin_status,
    document_submission_files.revision_requested_at,
    document_submission_files.uploaded_at,
    COALESCE(required_document_types.name, document_submission_files.file_name)
  INTO
    _submission_id,
    _current_admin_status,
    _current_revision_requested_at,
    _current_uploaded_at,
    _document_name
  FROM public.document_submission_files
  LEFT JOIN public.required_document_types
    ON required_document_types.id = document_submission_files.document_type_id
  WHERE document_submission_files.id = _file_id
  LIMIT 1;

  IF _submission_id IS NULL THEN
    RAISE EXCEPTION 'Document submission file was not found.';
  END IF;

  -- Resolve parent submission details and organization owner
  SELECT ds.organization_id, ds.renewal_id
  INTO _org_id, _renewal_id
  FROM public.document_submissions ds
  WHERE ds.id = _submission_id;

  IF _org_id IS NOT NULL THEN
    SELECT op.user_id
    INTO _org_user_id
    FROM public.organization_profiles op
    WHERE op.id = _org_id;
  END IF;

  -- Serialize review with approval/replacement: renewal -> organization -> submission -> file.
  IF _renewal_id IS NOT NULL THEN
    PERFORM 1 FROM public.organization_renewals WHERE id=_renewal_id FOR UPDATE;
  END IF;
  PERFORM 1 FROM public.organization_profiles WHERE id=_org_id FOR UPDATE;
  PERFORM 1 FROM public.document_submissions WHERE id=_submission_id FOR UPDATE;
  PERFORM 1 FROM public.document_submission_files WHERE id=_file_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.document_submission_files f JOIN public.document_submissions s ON s.id=f.submission_id
    WHERE f.id=_file_id AND s.id=_submission_id AND s.organization_id=_org_id AND s.renewal_id IS NOT DISTINCT FROM _renewal_id) THEN
    RAISE EXCEPTION 'Document relationship changed'; END IF;
  SELECT admin_status,revision_requested_at,uploaded_at
    INTO _current_admin_status,_current_revision_requested_at,_current_uploaded_at
    FROM public.document_submission_files WHERE id=_file_id;
  -- Guard 1: Permanently suspended organizations cannot have registration review decisions modified
  IF _renewal_id IS NULL AND _org_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organization_profiles op
    WHERE op.id = _org_id
      AND op.profile_status = 'suspended_inactive'
  ) THEN
    RAISE EXCEPTION 'This organization account is permanently suspended. Review actions cannot be performed.';
  END IF;

  -- Guard 2: Once marked needs_revision, cannot be approved without a genuine new replacement upload
  IF _status = 'approved_green' AND _current_admin_status = 'needs_revision' THEN
    IF _current_uploaded_at IS NULL OR (_current_revision_requested_at IS NOT NULL AND _current_uploaded_at <= _current_revision_requested_at) THEN
      RAISE EXCEPTION 'Cannot approve document file that is awaiting revision without a new upload.';
    END IF;
  END IF;

  -- Fetch workflow notification settings
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);
  _notify_revision := public.get_system_setting_bool('workflow.notify_org_on_needs_revision', true);
  _notify_rejected := public.get_system_setting_bool('workflow.notify_org_on_rejected', true);

  -- Update the individual document file review record
  UPDATE public.document_submission_files
  SET
    admin_status = _status,
    admin_remarks = COALESCE(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    revision_requested_at = CASE WHEN _status = 'needs_revision' THEN _reviewed_at ELSE document_submission_files.revision_requested_at END,
    revision_due_at = CASE WHEN _status = 'needs_revision' THEN _revision_due ELSE NULL END,
    revision_locked = CASE WHEN _status = 'rejected_red' THEN true ELSE false END,
    revision_unlocked_at = NULL,
    revision_unlocked_by = NULL,
    updated_at = _reviewed_at
  WHERE document_submission_files.id = _file_id;

  -- If parent submission is tied to a renewal packet, handle renewal state transition
  IF _renewal_id IS NOT NULL THEN
    UPDATE public.organization_renewals
    SET
      status = CASE
        WHEN _status = 'rejected_red' THEN 'rejected'
        WHEN _status = 'needs_revision' THEN 'needs_revision'
        ELSE 'under_review'
      END,
      admin_remarks = CASE WHEN _status IN ('needs_revision', 'rejected_red') THEN COALESCE(_admin_remarks, organization_renewals.admin_remarks) ELSE organization_renewals.admin_remarks END,
      reviewed_by = _admin_id,
      reviewed_at = _reviewed_at,
      revision_requested_at = CASE WHEN _status = 'needs_revision' THEN _reviewed_at ELSE organization_renewals.revision_requested_at END,
      revision_due_at = CASE WHEN _status = 'needs_revision' THEN _revision_due ELSE organization_renewals.revision_due_at END,
      revision_locked = CASE WHEN _status = 'rejected_red' THEN true ELSE false END,
      revision_locked_at = CASE WHEN _status = 'rejected_red' THEN _reviewed_at ELSE NULL END,
      revision_unlocked_at = NULL,
      revision_unlocked_by = NULL,
      updated_at = _reviewed_at
    WHERE id = _renewal_id;
  END IF;

  -- Recompute overall parent submission status
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status = 'rejected_red'
      ) THEN 'rejected_red'::public.document_submission_status
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status = 'needs_revision'
      ) THEN 'needs_revision'::public.document_submission_status
      WHEN EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
      ) AND NOT EXISTS (
        SELECT 1
        FROM public.document_submission_files
        WHERE submission_id = _submission_id
          AND admin_status <> 'approved_green'
      ) THEN 'approved_green'::public.document_submission_status
      ELSE 'under_admin_review'::public.document_submission_status
    END
  INTO _overall_status;

  _overall_remarks :=
    CASE
      WHEN _status = 'approved_green' THEN format('Admin approved %s.', _document_name)
      WHEN _status = 'needs_revision' THEN format('Admin requested revisions for %s.', _document_name)
      ELSE format('Admin rejected %s.', _document_name)
    END;

  UPDATE public.document_submissions
  SET
    status = _overall_status,
    reviewed_by = _admin_id,
    reviewed_at = _reviewed_at,
    overall_remarks = _overall_remarks,
    revision_requested_at = CASE WHEN _overall_status = 'needs_revision' THEN _reviewed_at ELSE document_submissions.revision_requested_at END,
    revision_due_at = CASE WHEN _overall_status = 'needs_revision' THEN _revision_due ELSE NULL END,
    revision_locked = CASE WHEN _overall_status = 'rejected_red' THEN true ELSE false END,
    revision_locked_at = CASE WHEN _overall_status = 'rejected_red' THEN _reviewed_at ELSE NULL END,
    revision_unlocked_at = NULL,
    revision_unlocked_by = NULL,
    updated_at = _reviewed_at
  WHERE document_submissions.id = _submission_id;

  -- 1. REGISTRATION REVISION NOTIFICATION:
  IF _renewal_id IS NULL AND _status = 'needs_revision' AND _org_id IS NOT NULL AND _org_user_id IS NOT NULL AND _notify_revision THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) VALUES (
      _org_user_id,
      _org_id,
      'Registration Revision Requested',
      format('The admin requested revisions for %s.%s', _document_name, CASE WHEN _admin_remarks IS NOT NULL AND trim(_admin_remarks) <> '' THEN ' Remarks: ' || trim(_admin_remarks) ELSE '' END),
      'document_revision',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  END IF;

  -- 2. REGISTRATION SINGLE FILE APPROVED NOTIFICATION (when not yet fully verified):
  IF _renewal_id IS NULL AND _status = 'approved_green' AND _overall_status <> 'approved_green' AND _org_id IS NOT NULL AND _org_user_id IS NOT NULL AND _notify_approved THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      related_type,
      related_id,
      created_at
    ) VALUES (
      _org_user_id,
      _org_id,
      'Registration Document Approved',
      format('Your registration document ''%s'' has been approved by the admin.', _document_name),
      'completed',
      'document_submission',
      _submission_id,
      _reviewed_at
    );
  END IF;

  -- 3. ATOMIC REJECTION RULE (Permanent Suspension):
  IF _renewal_id IS NULL AND _status = 'rejected_red' AND _org_id IS NOT NULL THEN
    UPDATE public.organization_profiles
    SET
      profile_status = 'suspended_inactive'::public.profile_status,
      updated_at = _reviewed_at
    WHERE id = _org_id;

    INSERT INTO public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description,
      created_at
    ) VALUES (
      _admin_id,
      _org_id,
      'Suspended organization',
      'organization_profile',
      _org_id,
      format('Organization account permanently suspended due to rejected registration document: %s.', _document_name),
      _reviewed_at
    );

    IF _org_user_id IS NOT NULL AND _notify_rejected THEN
      INSERT INTO public.notifications (
        user_id,
        organization_id,
        title,
        message,
        type,
        related_type,
        related_id,
        created_at
      ) VALUES (
        _org_user_id,
        _org_id,
        'Registration Document Rejected',
        format('Your registration document ''%s'' was rejected.%s Your organization account has been permanently suspended.', _document_name, CASE WHEN _admin_remarks IS NOT NULL AND trim(_admin_remarks) <> '' THEN ' Remarks: ' || trim(_admin_remarks) ELSE '' END),
        'document_red',
        'document_submission',
        _submission_id,
        _reviewed_at
      );
    END IF;
  END IF;

  -- 4. AUTOMATIC REGISTRATION VERIFICATION:
  -- Only evaluate when not suspended, not renewal, and overall submission status reached approved_green
  IF _renewal_id IS NULL AND _org_id IS NOT NULL AND _overall_status = 'approved_green' THEN
    PERFORM public.evaluate_and_apply_automatic_registration_verification(_org_id, _admin_id);
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.document_submission_files
  WHERE id = _file_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.user_submit_renewal(p_renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _now timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  PERFORM 1 FROM public.organization_profiles WHERE id=_renewal.organization_id FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM public.organization_profiles WHERE id=_renewal.organization_id
    AND user_id=auth.uid() AND profile_status::text<>'suspended_inactive') THEN
    RAISE EXCEPTION 'Organization is not authorized to submit documents'; END IF;
  IF coalesce(_renewal.revision_locked,false) OR (_renewal.revision_due_at<=clock_timestamp() AND _renewal.revision_unlocked_at IS NULL) THEN
    RAISE EXCEPTION 'Renewal revision is locked or overdue'; END IF;
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
$function$
;
REVOKE ALL ON FUNCTION public.user_submit_renewal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_submit_renewal(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.user_resubmit_renewal(p_renewal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _renewal record;
  _submission record;
  _owner_id uuid;
  _end_date date;
  _now timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;
  SELECT * INTO _renewal
  FROM public.organization_renewals
  WHERE id = p_renewal_id
  FOR UPDATE;

  IF _renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal application not found.';
  END IF;

  PERFORM 1 FROM public.organization_profiles WHERE id=_renewal.organization_id FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM public.organization_profiles WHERE id=_renewal.organization_id
    AND user_id=auth.uid() AND profile_status::text<>'suspended_inactive') THEN
    RAISE EXCEPTION 'Organization is not authorized to submit documents'; END IF;
  IF coalesce(_renewal.revision_locked,false) OR (_renewal.revision_due_at<=clock_timestamp() AND _renewal.revision_unlocked_at IS NULL) THEN
    RAISE EXCEPTION 'Renewal revision is locked or overdue'; END IF;
  SELECT op.user_id INTO _owner_id
  FROM public.organization_profiles op
  WHERE op.id = _renewal.organization_id;

  IF _owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this organization.';
  END IF;

  IF _renewal.status <> 'needs_revision' THEN
    RAISE EXCEPTION 'Renewal cannot be resubmitted from status "%". Expected "needs_revision".', _renewal.status;
  END IF;

  -- Verify within 180-day window
  SELECT oa.end_date INTO _end_date
  FROM public.organization_accreditations oa
  WHERE oa.id = _renewal.current_accreditation_id;

  IF current_date > (_end_date + 180) THEN
    RAISE EXCEPTION 'Late renewal cutoff has passed (180 days past expiration). Resubmission is no longer allowed.';
  END IF;

  -- Verify all flagged documents have been replaced
  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE renewal_id = p_renewal_id
  FOR UPDATE;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'No document submission packet found for this renewal.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.document_submission_files dsf
    WHERE dsf.submission_id = _submission.id
      AND dsf.admin_status IN ('needs_revision', 'rejected_red')
  ) THEN
    RAISE EXCEPTION 'All documents marked for revision or rejection must be replaced before resubmission.';
  END IF;

  -- Update renewal state to resubmitted
  UPDATE public.organization_renewals
  SET
    status = 'resubmitted',
    updated_at = _now
  WHERE id = p_renewal_id;

  -- Update document submission state
  UPDATE public.document_submissions
  SET
    status = 'submitted',
    updated_at = _now
  WHERE id = _submission.id;

  -- Insert activity log with NULL actor_user_id (org user action)
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) VALUES (
    NULL,
    _renewal.organization_id,
    'renewal_resubmitted',
    'renewal',
    p_renewal_id,
    format('Organization resubmitted renewal application for Cycle %s after revisions.', _renewal.cycle_number)
  );

  RETURN jsonb_build_object(
    'success', true,
    'renewal_id', p_renewal_id,
    'resubmitted_at', _now
  );
END;
$function$
;
REVOKE ALL ON FUNCTION public.user_resubmit_renewal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) TO authenticated;
COMMIT;
