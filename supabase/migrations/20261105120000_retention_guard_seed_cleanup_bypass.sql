-- The 8 Oct retention guard blocked admin_cleanup_yorp_sample_dataset, which deletes
-- verified seeded organizations. Let only generated seed rows through, and only while
-- that cleanup has set its transaction-local flag in a development/test environment.
create or replace function public.guard_retained_organization_deletion()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,ytrace_identity as $$
begin
 if old.is_seeded_sample_data is true
    and old.seed_batch = 'PCYDO-YORP-2024-2026'
    and coalesce(old.is_renewal_test_account, false) is false
    and current_setting('app.allow_org_deletion', true) = 'true'
    and public.is_development_or_test_environment() then
   return old;
 end if;
 if ytrace_identity.has_retained_history(old.id) then
   raise exception 'Official organization history is retained. Request an authorized archival/retention review before permanent deletion.';
 end if;
 return old;
end $$;
