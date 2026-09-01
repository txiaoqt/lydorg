-- Run this in the Supabase SQL editor.
--
-- get_admin_portal_snapshot does not currently return ypop_periods,
-- ypop_city_activities, or ypop_entries, so the admin app was falling back
-- to reading those tables directly as the anon role (no session check at
-- all). That's what surfaced the ypop_entries RLS gap: it has RLS enabled
-- with no policy, so direct anon reads silently return zero rows; its
-- siblings don't have RLS enabled, so direct anon reads work but are
-- unauthenticated (anyone with the public anon key could read them).
--
-- The fix here is 3 small security definer RPCs, following the same
-- session-token-validation template as admin_create_ypop_city_activity
-- (see add_ypop_city_activity_date_range.sql / repair_admin_portal_snapshot_and_news.sql).
-- Each validates the caller's admin session token before returning
-- anything; being security definer, they bypass RLS once that check
-- passes. No RLS policy is needed on any of the three tables — reads for
-- these are now only reachable through an authenticated admin session.
--
-- If you already ran add_ypop_entries_read_policy.sql (the public-read
-- policy), this cleans it up too — that approach has been superseded by
-- the RPCs below and should not be kept.
drop policy if exists "Allow public read access" on public.ypop_entries;

create or replace function public.admin_get_ypop_periods(_session_token text)
returns setof public.ypop_periods
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  select * from public.ypop_periods
  order by created_at desc;
end;
$$;

create or replace function public.admin_get_ypop_city_activities(_session_token text)
returns setof public.ypop_city_activities
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  select * from public.ypop_city_activities
  order by created_at asc;
end;
$$;

create or replace function public.admin_get_ypop_entries(_session_token text)
returns setof public.ypop_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  select * from public.ypop_entries
  order by created_at desc;
end;
$$;
