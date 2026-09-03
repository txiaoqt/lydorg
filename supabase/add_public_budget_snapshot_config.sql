-- Run this in the Supabase SQL editor.
--
-- Backs the new "Configure Public Budget Snapshot" admin page. This is
-- deliberately separate, admin-curated data — a manually-entered list of
-- budget sources (amount + purpose) per fiscal year, plus a singleton
-- settings row controlling default fiscal year / fiscal-year switching /
-- which Budget Snapshot sections are visible on the Public tab. It does
-- NOT feed the real internal Budget Monitoring figures (those stay
-- computed from budget_requests/liquidation_reports as before) — this is
-- intentionally decoupled, per the page's own "Heads up" notice.
--
-- Admin-only data: RLS is enabled with no public/anon policies. All
-- access goes through the security-definer RPCs below, validated via
-- validate_admin_session_token, following the same template used
-- throughout this project (see add_budget_request_file_review_status.sql).

create table if not exists public.public_budget_sources (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null,
  amount numeric not null default 0,
  purpose text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_budget_sources enable row level security;

create table if not exists public.public_budget_snapshot_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  default_fiscal_year integer,
  allow_fiscal_year_switch boolean not null default false,
  show_utilization_progress boolean not null default true,
  show_total_fy_budget boolean not null default true,
  show_approved_budget boolean not null default true,
  show_released_budget boolean not null default true,
  show_liquidated_budget boolean not null default true,
  show_allocation_breakdown boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.public_budget_snapshot_settings enable row level security;

insert into public.public_budget_snapshot_settings (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

create or replace function public.admin_get_public_budget_sources(
  _session_token text,
  _fiscal_year integer
)
returns setof public.public_budget_sources
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
  select *
  from public.public_budget_sources
  where fiscal_year = _fiscal_year
  order by sort_order asc;
end;
$$;

create or replace function public.admin_save_public_budget_sources(
  _session_token text,
  _fiscal_year integer,
  _sources jsonb
)
returns setof public.public_budget_sources
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

  delete from public.public_budget_sources
  where fiscal_year = _fiscal_year;

  insert into public.public_budget_sources (fiscal_year, amount, purpose, sort_order)
  select
    _fiscal_year,
    coalesce((item->>'amount')::numeric, 0),
    coalesce(item->>'purpose', ''),
    coalesce((item->>'sortOrder')::integer, 0)
  from jsonb_array_elements(_sources) as item;

  return query
  select *
  from public.public_budget_sources
  where fiscal_year = _fiscal_year
  order by sort_order asc;
end;
$$;

create or replace function public.admin_get_public_budget_snapshot_settings(
  _session_token text
)
returns setof public.public_budget_snapshot_settings
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
  select *
  from public.public_budget_snapshot_settings
  where id = '00000000-0000-0000-0000-000000000001';
end;
$$;

create or replace function public.admin_save_public_budget_snapshot_settings(
  _session_token text,
  _default_fiscal_year integer,
  _allow_fiscal_year_switch boolean,
  _show_utilization_progress boolean,
  _show_total_fy_budget boolean,
  _show_approved_budget boolean,
  _show_released_budget boolean,
  _show_liquidated_budget boolean,
  _show_allocation_breakdown boolean
)
returns setof public.public_budget_snapshot_settings
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

  update public.public_budget_snapshot_settings
  set
    default_fiscal_year = _default_fiscal_year,
    allow_fiscal_year_switch = _allow_fiscal_year_switch,
    show_utilization_progress = _show_utilization_progress,
    show_total_fy_budget = _show_total_fy_budget,
    show_approved_budget = _show_approved_budget,
    show_released_budget = _show_released_budget,
    show_liquidated_budget = _show_liquidated_budget,
    show_allocation_breakdown = _show_allocation_breakdown,
    updated_at = now()
  where id = '00000000-0000-0000-0000-000000000001';

  return query
  select *
  from public.public_budget_snapshot_settings
  where id = '00000000-0000-0000-0000-000000000001';
end;
$$;
