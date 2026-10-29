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
