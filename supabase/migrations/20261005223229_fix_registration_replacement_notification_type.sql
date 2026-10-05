-- Use the existing completion notification category for successful resubmission.
do $migration$
declare _definition text;
begin
  select pg_get_functiondef('public.replace_organization_document_file(uuid,uuid,timestamptz,text,text,text,bigint)'::regprocedure)
    into _definition;
  if strpos(_definition, '''information''') = 0 then
    raise exception 'Expected invalid notification type was not found; migration aborted.';
  end if;
  execute replace(_definition, '''information''', '''completed''');
end;
$migration$;
