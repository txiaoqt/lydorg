-- Migration: 20260920010000_create_activity_announcements.sql
-- Description: Create activity_announcements table and admin RPCs for YPOP City-Led activity announcements

create table if not exists public.activity_announcements (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.ypop_city_activities(id) on delete cascade,
  sent_by uuid references public.admin_accounts(id) on delete set null,
  recipient_count int not null default 0,
  successful_count int not null default 0,
  failed_count int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'partial_failure', 'failed')),
  error_message text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_activity_announcements_activity_id on public.activity_announcements(activity_id);
create index if not exists idx_activity_announcements_status on public.activity_announcements(status);
create index if not exists idx_activity_announcements_idempotency on public.activity_announcements(idempotency_key);

alter table public.activity_announcements enable row level security;

-- Only service role and validated admins can view/manage announcements
drop policy if exists "Allow service role full access to activity_announcements" on public.activity_announcements;
create policy "Allow service role full access to activity_announcements"
  on public.activity_announcements
  for all
  to service_role
  using (true)
  with check (true);

-- RPC to retrieve announcement history for an activity
create or replace function public.admin_get_activity_announcements(
  _session_token text,
  _activity_id uuid
)
returns table (
  id uuid,
  activity_id uuid,
  sent_by uuid,
  recipient_count int,
  successful_count int,
  failed_count int,
  status text,
  error_message text,
  idempotency_key text,
  created_at timestamptz,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  return query
  select
    aa.id,
    aa.activity_id,
    aa.sent_by,
    aa.recipient_count,
    aa.successful_count,
    aa.failed_count,
    aa.status,
    aa.error_message,
    aa.idempotency_key,
    aa.created_at,
    aa.sent_at
  from public.activity_announcements aa
  where aa.activity_id = _activity_id
  order by aa.created_at desc;
end;
$$;
