-- A file awaiting the organization's corrected upload is the organization's turn.
-- Requesting revision again would silently overwrite the feedback they are working from.
do $migration$
declare
  _definition text;
  _old text := $old$  -- Fetch workflow notification settings
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);$old$;
  _new text := $new$  -- Guard 3: No new revision request (or remark change) until the organization uploads a corrected file
  IF _status = 'needs_revision' AND _current_admin_status = 'needs_revision' THEN
    IF _current_uploaded_at IS NULL OR (_current_revision_requested_at IS NOT NULL AND _current_uploaded_at <= _current_revision_requested_at) THEN
      RAISE EXCEPTION 'This document is awaiting the organization''s corrected file. Review it again after they resubmit.';
    END IF;
  END IF;

  -- Fetch workflow notification settings
  _notify_approved := public.get_system_setting_bool('workflow.notify_org_on_approved', true);$new$;
begin
  select pg_get_functiondef('public.update_admin_document_submission_file_review(text,uuid,public.document_submission_status,text)'::regprocedure)
    into _definition;
  if strpos(_definition, _old) = 0 then
    raise exception 'Unexpected document review function body; migration aborted.';
  end if;
  execute replace(_definition, _old, _new);
end;
$migration$;
