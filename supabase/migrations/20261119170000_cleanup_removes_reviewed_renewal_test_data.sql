-- Cleanup failed once the Renewal Test Organization had an approved renewal:
-- removing the org cleared the renewal's accreditation link and the renewal
-- document packet's renewal link, and both are guarded. Remove the renewal
-- packets and renewals first; the guards allow this for the test account only.
do $migration$
declare
  _def text;
  _old text := $o$  LOOP
    _renewal_result := public.delete_organization_account_canonical(_session_token, _renewal.id);$o$;
  _new text := $n$  LOOP
    PERFORM set_config('app.allow_test_scenario_prep', 'true', true);
    DELETE FROM public.document_submissions
      WHERE renewal_id IN (SELECT r.id FROM public.organization_renewals r WHERE r.organization_id = _renewal.id);
    DELETE FROM public.organization_renewals WHERE organization_id = _renewal.id;
    PERFORM set_config('app.allow_test_scenario_prep', '', true);
    _renewal_result := public.delete_organization_account_canonical(_session_token, _renewal.id);$n$;
begin
  select pg_get_functiondef('public.admin_cleanup_yorp_sample_dataset(text,text)'::regprocedure) into _def;
  _def := replace(_def, chr(13) || chr(10), chr(10)); -- stored bodies mix line endings
  if strpos(_def, _old) = 0 then
    raise exception 'YORP sample cleanup function changed; migration aborted.';
  end if;
  execute replace(_def, _old, _new);
end;
$migration$;
