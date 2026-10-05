-- activity_logs.actor_user_id references admin_accounts, not auth.users.
-- Keep the organization actor in metadata for this owner-authenticated action.
do $migration$
declare
  _definition text;
  _old text := $old$insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description,
    created_at
  ) values (
    _user_id,
    _organization.id,
    'Replaced document',
    'document_submission_file',
    _file.id,
    format('Uploaded a corrected version of %s.', coalesce(_document_name, _file_name)),
    _submitted_at
  );$old$;
  _new text := $new$insert into public.activity_logs (
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
  );$new$;
begin
  select pg_get_functiondef('public.replace_organization_document_file(uuid,uuid,timestamptz,text,text,text,bigint)'::regprocedure)
    into _definition;
  if strpos(_definition, _old) = 0 then
    raise exception 'Unexpected document replacement audit block; migration aborted.';
  end if;
  execute replace(_definition, _old, _new);
end;
$migration$;
