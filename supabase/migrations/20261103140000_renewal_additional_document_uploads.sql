-- Renewals accept added or corrected documents after a partial submit, like registration does.
-- user_submit_additional_renewal_documents already sends draft files from submitted/under_review/resubmitted
-- renewals to review, but these two guards refused to save those drafts ("Renewal is not editable").
-- Only the renewal-status list changes; per-file locks (reviewed files, revision deadlines, ownership) stay.

CREATE OR REPLACE FUNCTION ytrace_document_mutation.guard_file()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
   IF _rid IS NOT NULL AND r.status NOT IN ('draft','needs_revision','submitted','under_review','resubmitted') THEN RAISE EXCEPTION 'Renewal is not editable'; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.guard_direct_document_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
       IF _renewal_status IS NULL OR _renewal_status NOT IN ('draft','needs_revision','submitted','under_review','resubmitted') THEN
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
END $function$;
