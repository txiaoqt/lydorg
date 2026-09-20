-- Migration: 20260920040000_persistent_news_categories.sql
-- Purpose: Authoritative persistent news_categories registry with system category protection,
--          safe usage-validated deletion, and snapshot integration.

-- 1. Create table public.news_categories
create table if not exists public.news_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_categories enable row level security;

-- Allow read access to all authenticated and anon users
drop policy if exists "Allow read news_categories" on public.news_categories;
create policy "Allow read news_categories"
  on public.news_categories
  for select
  using (true);

-- 2. Seed system categories (YORP, YPOP, MOVE) idempotently
insert into public.news_categories (name, normalized_name, is_system)
values
  ('YORP', 'yorp', true),
  ('YPOP', 'ypop', true),
  ('MOVE', 'move', true)
on conflict (normalized_name)
do update set is_system = true;

-- 3. Backfill existing custom categories from public.news_releases
insert into public.news_categories (name, normalized_name, is_system)
select distinct
  trim(nr.category) as name,
  lower(trim(regexp_replace(nr.category, '\s+', ' ', 'g'))) as normalized_name,
  false as is_system
from public.news_releases nr
where nr.category is not null
  and trim(nr.category) <> ''
on conflict (normalized_name) do nothing;

-- 4. Admin RPC: Create news category
create or replace function public.create_admin_news_category(
  _session_token text,
  _name text
)
returns table (
  id uuid,
  name text,
  normalized_name text,
  is_system boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _trimmed text;
  _normalized text;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  _trimmed := trim(regexp_replace(_name, '\s+', ' ', 'g'));
  if _trimmed is null or _trimmed = '' then
    raise exception 'Category name cannot be empty.';
  end if;

  if length(_trimmed) > 50 then
    raise exception 'Category name must be 50 characters or less.';
  end if;

  _normalized := lower(_trimmed);

  -- Check if already exists
  if exists (select 1 from public.news_categories nc where nc.normalized_name = _normalized) then
    raise exception 'Category "%" already exists.', _trimmed;
  end if;

  return query
  insert into public.news_categories (
    name,
    normalized_name,
    is_system
  )
  values (
    _trimmed,
    _normalized,
    false
  )
  returning
    news_categories.id,
    news_categories.name,
    news_categories.normalized_name,
    news_categories.is_system,
    news_categories.created_at,
    news_categories.updated_at;
end;
$$;

-- 5. Admin RPC: Delete news category (with usage recheck and system protection)
create or replace function public.delete_admin_news_category(
  _session_token text,
  _category_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _cat public.news_categories%rowtype;
  _usage_count integer := 0;
begin
  -- 1. Authorize admin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Admin account is not authorized.'
    );
  end if;

  -- 2. Lock & load target category
  select *
  into _cat
  from public.news_categories
  where id = _category_id
  for update;

  if _cat.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Category not found.'
    );
  end if;

  -- 3. Reject system categories
  if _cat.is_system then
    return jsonb_build_object(
      'success', false,
      'error', 'System categories cannot be deleted.'
    );
  end if;

  -- 4. Re-check usage in news_releases (any status counts as usage)
  select count(*)
  into _usage_count
  from public.news_releases
  where lower(trim(regexp_replace(category, '\s+', ' ', 'g'))) = _cat.normalized_name;

  if _usage_count > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Cannot delete "' || _cat.name || '" because it is currently used by ' || _usage_count || ' news release(s).'
    );
  end if;

  -- 5. Perform safe delete (no news release records deleted)
  delete from public.news_categories
  where id = _category_id;

  return jsonb_build_object(
    'success', true,
    'deleted_id', _category_id,
    'deleted_name', _cat.name
  );
end;
$$;

-- 6. Update get_admin_portal_snapshot to include news_categories
create or replace function public.get_admin_portal_snapshot(_session_token text)
returns jsonb
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

  return jsonb_build_object(
    'organization_profiles',
    coalesce(
      (
        select jsonb_agg(to_jsonb(op) order by op.created_at desc)
        from public.organization_profiles op
      ),
      '[]'::jsonb
    ),
    'document_submissions',
    coalesce(
      (
        select jsonb_agg(to_jsonb(ds) order by ds.created_at desc)
        from public.document_submissions ds
      ),
      '[]'::jsonb
    ),
    'document_submission_files',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', dsf.id,
            'submission_id', dsf.submission_id,
            'file_url', dsf.file_url,
            'file_name', dsf.file_name,
            'file_type', dsf.file_type,
            'file_size', dsf.file_size,
            'validation_status', dsf.validation_status,
            'admin_status', dsf.admin_status,
            'admin_remarks', dsf.admin_remarks,
            'uploaded_at', dsf.uploaded_at,
            'reviewed_at', dsf.reviewed_at,
            'created_at', dsf.created_at,
            'updated_at', dsf.updated_at,
            'required_document_types', jsonb_build_object('id', rdt.id, 'name', rdt.name)
          )
          order by dsf.created_at desc
        )
        from public.document_submission_files dsf
        left join public.required_document_types rdt on rdt.id = dsf.document_type_id
      ),
      '[]'::jsonb
    ),
    'budget_requests',
    coalesce(
      (
        select jsonb_agg(to_jsonb(br) order by br.created_at desc)
        from public.budget_requests br
        where br.status <> 'draft'
      ),
      '[]'::jsonb
    ),
    'budget_request_files',
    coalesce(
      (
        select jsonb_agg(to_jsonb(brf) order by brf.created_at desc)
        from public.budget_request_files brf
        where exists (
          select 1 from public.budget_requests br
          where br.id = brf.budget_request_id
            and br.status <> 'draft'
        )
      ),
      '[]'::jsonb
    ),
    'liquidation_reports',
    coalesce(
      (
        select jsonb_agg(to_jsonb(lr) order by lr.created_at desc)
        from public.liquidation_reports lr
      ),
      '[]'::jsonb
    ),
    'liquidation_report_files',
    coalesce(
      (
        select jsonb_agg(to_jsonb(lrf) order by lrf.created_at desc)
        from public.liquidation_report_files lrf
      ),
      '[]'::jsonb
    ),
    'news_releases',
    coalesce(
      (
        select jsonb_agg(to_jsonb(nr) order by nr.date_posted desc, nr.created_at desc)
        from public.news_releases nr
      ),
      '[]'::jsonb
    ),
    'news_categories',
    coalesce(
      (
        select jsonb_agg(to_jsonb(nc) order by nc.is_system desc, nc.name asc)
        from public.news_categories nc
      ),
      '[]'::jsonb
    ),
    'transparency_posts',
    coalesce(
      (
        select jsonb_agg(to_jsonb(tp) order by tp.post_date desc, tp.created_at desc)
        from public.transparency_posts tp
      ),
      '[]'::jsonb
    ),
    'compliance_remarks',
    coalesce(
      (
        select jsonb_agg(to_jsonb(cr) order by cr.created_at desc)
        from public.compliance_remarks cr
      ),
      '[]'::jsonb
    ),
    'notifications',
    coalesce(
      (
        select jsonb_agg(to_jsonb(n) order by n.created_at desc)
        from public.notifications n
      ),
      '[]'::jsonb
    ),
    'activity_logs',
    coalesce(
      (
        select jsonb_agg(to_jsonb(al) order by al.created_at desc)
        from public.activity_logs al
      ),
      '[]'::jsonb
    ),
    'templates',
    coalesce(
      -- Includes both active and archived templates for administrative management
      (
        select jsonb_agg(to_jsonb(rdt) order by rdt.sort_order asc)
        from public.required_document_types rdt
      ),
      '[]'::jsonb
    )
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_portal_snapshot(text) TO anon, authenticated, service_role;
