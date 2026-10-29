-- PRODUCTION REVIEW CANDIDATE ONLY; NOT INSTALLED.
-- Target must be externally verified as Supabase project mqqaykksadotbrghbexz immediately before execution.
-- Keep outside supabase/migrations: production history is behind this checkout and automatic replay is unsafe.
-- This forward-only patch contains document lifecycle guards/RPC corrections only.
-- No fixture reconciliation, test organization, date simulation, test credentials, data rewrite or Storage policy change.
-- Exact reviewed staging-tested code body SHA-256: b19e93c19454a9012e85eb9dce81ba152b4f93d0eaa0fa475f78ab8d30a4d7a0.
-- Catalog gate is pinned to read-only production inspection from 2026-10-11.
-- REVIEW ONLY: unapplied forward security patch. No data repair or Storage policy changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $production_gate$ DECLARE r record; _count bigint; _latest text; _trigger_hash text; _storage_policy_hash text; _table_policy_hash text; _rpc_acl_hash text; BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Reviewed postgres installation owner required'; END IF;
 SELECT count(*),max(version) INTO _count,_latest FROM supabase_migrations.schema_migrations;
 IF _count<>163 OR _latest<>'20261008174154' THEN RAISE EXCEPTION 'Production migration history drift'; END IF;
 FOR r IN SELECT * FROM (VALUES
 ('user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)','59370b100efed37d5975dc16983d786a',true),
 ('replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)','ce30b4dff57a2fa1b7bf314c01e9fae6',true),
 ('update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','252754fd75505948c26afe27f6b0b760',true),
 ('user_submit_renewal(uuid)','d41b680681db2323aba2c62693f59131',true),
 ('user_resubmit_renewal(uuid)','d19a1d0415f3eb900bab7dea241f0b21',true),
 ('guard_submitted_registration_document_edits()','c6265ae36e8db8678de7a4e69691008e',false),
 ('admin_approve_renewal(text,uuid,text,text)','33ba7c606820f771e4ed79709bcd188b',true),
 ('promote_renewal_submission_files_for_review()','b1a1e8a2d5eb9e8ccd66b10b6c652b45',true),
 ('hard_delete_admin_template_document(text,uuid)','36de9fc3fb6c5ad090579f3261f77bbf',true),
 ('delete_organization_account_canonical(text,uuid)','5c1f0179b9f279eb7a99ff9ee8627c3f',true)
 ) AS expected(signature,fingerprint,security_definer) LOOP
  IF to_regprocedure(r.signature) IS NULL OR md5(pg_get_functiondef(to_regprocedure(r.signature))) IS DISTINCT FROM r.fingerprint
    OR (SELECT pg_get_userbyid(p.proowner) FROM pg_proc p WHERE p.oid=to_regprocedure(r.signature))<>'postgres'
    OR (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=to_regprocedure(r.signature)) IS DISTINCT FROM r.security_definer THEN
    RAISE EXCEPTION 'Production mutation catalog drift: %',r.signature;
  END IF;
 END LOOP;
 IF to_regnamespace('ytrace_document_mutation') IS NOT NULL THEN RAISE EXCEPTION 'Patch namespace already exists'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('a_document_mutation_guard','b_document_direct_guard','a_document_parent_guard') AND NOT tgisinternal) THEN RAISE EXCEPTION 'Document guard trigger name collision'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('document_submission_files','document_submissions','organization_profiles','organization_renewals','organization_accreditations') AND NOT c.relrowsecurity) THEN RAISE EXCEPTION 'Required RLS state drift'; END IF;
 IF NOT has_function_privilege('authenticated','public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.user_submit_renewal(uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.user_resubmit_renewal(uuid)','EXECUTE')
 OR NOT has_function_privilege('anon','public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Production mutation RPC grant drift';
 END IF;
 SELECT md5(coalesce(string_agg(p.oid::regprocedure::text||':'||coalesce(grantee.rolname,'PUBLIC')||':'||acl.privilege_type||':'||acl.is_grantable,E'\n' ORDER BY p.oid::regprocedure::text,coalesce(grantee.rolname,'PUBLIC'),acl.privilege_type),'')) INTO _rpc_acl_hash
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
 LEFT JOIN pg_roles grantee ON grantee.oid=acl.grantee
 WHERE n.nspname='public' AND p.proname IN ('user_replace_document_submission_file','replace_organization_document_file','update_admin_document_submission_file_review','user_submit_renewal','user_resubmit_renewal');
 IF _rpc_acl_hash<>'e45685fb8b158e7b039a6bf39b2b8973' THEN RAISE EXCEPTION 'Production mutation RPC ACL drift'; END IF;
 SELECT md5(coalesce(string_agg(c.relname||':'||t.tgname||':'||pg_get_triggerdef(t.oid),E'\n' ORDER BY c.relname,t.tgname),'')) INTO _trigger_hash
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('document_submission_files','document_submissions','organization_profiles','organization_renewals','organization_accreditations');
 IF _trigger_hash<>'aed1b3f4417ad04716197a353c7259bf' THEN RAISE EXCEPTION 'Production trigger compatibility drift'; END IF;
 SELECT md5(coalesce(string_agg(schemaname||':'||tablename||':'||policyname||':'||roles::text||':'||cmd||':'||permissive||':'||coalesce(qual,'')||':'||coalesce(with_check,''),E'\n' ORDER BY schemaname,tablename,policyname),'')) INTO _storage_policy_hash FROM pg_policies WHERE schemaname='storage';
 IF _storage_policy_hash<>'c5debe81f16c612c63a6b83ffdb90531' THEN RAISE EXCEPTION 'Production Storage policy drift'; END IF;
 SELECT md5(coalesce(string_agg(schemaname||':'||tablename||':'||policyname||':'||roles::text||':'||cmd||':'||permissive||':'||coalesce(qual,'')||':'||coalesce(with_check,''),E'\n' ORDER BY schemaname,tablename,policyname),'')) INTO _table_policy_hash FROM pg_policies WHERE schemaname='public' AND tablename IN ('document_submission_files','document_submissions','organization_renewals','organization_profiles','organization_accreditations');
 IF _table_policy_hash<>'be6cd95840181dc1dc6124af9cfa6912' THEN RAISE EXCEPTION 'Production table policy drift'; END IF;
END $production_gate$;
-- Support fragment: installed only by the forward patch, never separately.
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
