-- Run in the Supabase SQL editor.
-- Creates a public, unauthenticated-safe aggregate function for the home page stats.
-- SECURITY DEFINER bypasses RLS so the anon key can read aggregate counts
-- without exposing any individual records.

create or replace function public.get_public_stats()
returns table (
  verified_org_count bigint,
  activity_count     bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (select count(*) from public.organization_profiles where profile_status = 'verified'),
    (select count(*) from public.budget_requests) +
    (select count(*) from public.ypop_city_activities);
end;
$$;
