-- Admin permanent deletion is a deliberate, name-confirmed action, so official history no
-- longer blocks it. Other deletes of organization_profiles stay guarded.
create or replace function public.guard_retained_organization_deletion()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,ytrace_identity as $$
begin
 -- Set transaction-locally only by delete_organization_account_canonical and the seed cleanup.
 if current_setting('app.allow_org_deletion', true) = 'true' then
   return old;
 end if;
 if ytrace_identity.has_retained_history(old.id) then
   raise exception 'Official organization history is retained. Request an authorized archival/retention review before permanent deletion.';
 end if;
 return old;
end $$;

-- Keep the function OID; drop the retention check and clear identity cases (restrict FK).
do $admin_delete_patch$
declare
 _definition text;
 _check constant text := E'  if ytrace_identity.has_retained_history(_organization_id) then\n    raise exception ''Official organization history is retained. Request an authorized archival/retention review before permanent deletion.'';\n  end if;\n';
 _marker constant text := '  -- 11. Delete organization profile';
begin
 _definition:=pg_get_functiondef('public.delete_organization_account_canonical(text,uuid)'::regprocedure);
 if position(_check in _definition)=0 or position(_marker in _definition)=0 then
   raise exception 'Canonical deletion changed. Review this patch before applying.';
 end if;
 _definition:=replace(_definition,_check,'');
 _definition:=replace(_definition,_marker,
   E'  -- 10b. Clear identity review cases for this organization\n'
   || E'  delete from ytrace_identity.cases where organization_id = _organization_id;\n'
   || E'  update ytrace_identity.cases set canonical_organization_id = null where canonical_organization_id = _organization_id;\n\n'
   || _marker);
 execute _definition;
end $admin_delete_patch$;
revoke all on function public.delete_organization_account_canonical(text,uuid) from public;
grant execute on function public.delete_organization_account_canonical(text,uuid) to anon,authenticated,service_role;
