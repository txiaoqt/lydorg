-- Run this in the Supabase SQL editor for existing LYDO Connect projects.
-- It adds the admin snapshot RPC used by the admin portal after sign-in.

alter table if exists public.organization_profiles
  add column if not exists verified_at timestamptz,
  add column if not exists is_existing_organization boolean not null default false,
  add column if not exists organization_identifier_number text not null default '';

alter table if exists public.document_submission_files
  add column if not exists ocr_metadata jsonb;

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
            'ocr_text', dsf.ocr_text,
            'ocr_status', dsf.ocr_status,
            'ocr_confidence', dsf.ocr_confidence,
            'validation_status', dsf.validation_status,
            'admin_status', dsf.admin_status,
            'admin_remarks', dsf.admin_remarks,
            'ocr_metadata', dsf.ocr_metadata,
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
      ),
      '[]'::jsonb
    ),
    'budget_request_files',
    coalesce(
      (
        select jsonb_agg(to_jsonb(brf) order by brf.created_at desc)
        from public.budget_request_files brf
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
      (
        select jsonb_agg(to_jsonb(rdt) order by rdt.sort_order asc)
        from public.required_document_types rdt
        where rdt.is_active = true
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.update_admin_news_release(
  _session_token text,
  _news_release_id uuid,
  _title text,
  _description text,
  _facebook_post_url text,
  _date_posted date,
  _visibility_status public.visibility_status
)
returns table (
  id uuid,
  title text,
  description text,
  facebook_post_url text,
  date_posted date,
  visibility_status public.visibility_status,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
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
  update public.news_releases
  set
    title = coalesce(trim(_title), news_releases.title),
    description = coalesce(_description, news_releases.description),
    facebook_post_url = coalesce(trim(_facebook_post_url), news_releases.facebook_post_url),
    date_posted = coalesce(_date_posted, news_releases.date_posted),
    visibility_status = coalesce(_visibility_status, news_releases.visibility_status),
    updated_at = now()
  where news_releases.id = _news_release_id
  returning
    news_releases.id,
    news_releases.title,
    news_releases.description,
    news_releases.facebook_post_url,
    news_releases.date_posted,
    news_releases.visibility_status,
    news_releases.created_by,
    news_releases.created_at,
    news_releases.updated_at;
end;
$$;

alter table if exists public.activity_logs
  alter column action type text using action::text;

create or replace function public.create_admin_transparency_post(
  _session_token text,
  _title text,
  _description text,
  _category text,
  _attachment_url text,
  _post_date date,
  _visibility_status public.visibility_status
)
returns table (
  id uuid,
  title text,
  description text,
  category text,
  attachment_url text,
  visibility_status public.visibility_status,
  post_date date,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
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
  insert into public.transparency_posts (
    title,
    description,
    category,
    attachment_url,
    visibility_status,
    post_date,
    created_by
  )
  values (
    trim(_title),
    coalesce(_description, ''),
    trim(_category),
    nullif(trim(coalesce(_attachment_url, '')), ''),
    coalesce(_visibility_status, 'draft'::public.visibility_status),
    _post_date,
    null
  )
  returning
    transparency_posts.id,
    transparency_posts.title,
    transparency_posts.description,
    transparency_posts.category,
    transparency_posts.attachment_url,
    transparency_posts.visibility_status,
    transparency_posts.post_date,
    transparency_posts.created_by,
    transparency_posts.created_at,
    transparency_posts.updated_at;
end;
$$;

drop policy if exists organization_documents_read_portal on storage.objects;
create policy organization_documents_read_portal on storage.objects
for select using (bucket_id = 'organization-documents');

drop policy if exists budget_request_files_read_portal on storage.objects;
create policy budget_request_files_read_portal on storage.objects
for select using (bucket_id = 'budget-request-files');

drop policy if exists liquidation_report_files_read_portal on storage.objects;
create policy liquidation_report_files_read_portal on storage.objects
for select using (bucket_id = 'liquidation-report-files');

create or replace function public.update_admin_transparency_post(
  _session_token text,
  _post_id uuid,
  _title text,
  _description text,
  _category text,
  _attachment_url text,
  _post_date date,
  _visibility_status public.visibility_status
)
returns table (
  id uuid,
  title text,
  description text,
  category text,
  attachment_url text,
  visibility_status public.visibility_status,
  post_date date,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
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
  update public.transparency_posts
  set
    title = coalesce(trim(_title), transparency_posts.title),
    description = coalesce(_description, transparency_posts.description),
    category = coalesce(trim(_category), transparency_posts.category),
    attachment_url = case
      when _attachment_url is null then transparency_posts.attachment_url
      else nullif(trim(_attachment_url), '')
    end,
    post_date = coalesce(_post_date, transparency_posts.post_date),
    visibility_status = coalesce(_visibility_status, transparency_posts.visibility_status),
    updated_at = now()
  where transparency_posts.id = _post_id
  returning
    transparency_posts.id,
    transparency_posts.title,
    transparency_posts.description,
    transparency_posts.category,
    transparency_posts.attachment_url,
    transparency_posts.visibility_status,
    transparency_posts.post_date,
    transparency_posts.created_by,
    transparency_posts.created_at,
    transparency_posts.updated_at;
end;
$$;

create or replace function public.delete_admin_transparency_post(
  _session_token text,
  _post_id uuid
)
returns void
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

  delete from public.transparency_posts
  where id = _post_id;
end;
$$;

create or replace function public.create_admin_activity_log(
  _session_token text,
  _organization_id uuid,
  _action text,
  _related_type text,
  _related_id uuid,
  _description text
)
returns table (
  id uuid,
  actor_user_id uuid,
  organization_id uuid,
  action text,
  related_type text,
  related_id uuid,
  description text,
  created_at timestamptz
)
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
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  )
  values (
    null,
    _organization_id,
    trim(_action),
    trim(_related_type),
    _related_id,
    _description
  )
  returning
    activity_logs.id,
    activity_logs.actor_user_id,
    activity_logs.organization_id,
    activity_logs.action,
    activity_logs.related_type,
    activity_logs.related_id,
    activity_logs.description,
    activity_logs.created_at;
end;
$$;

create or replace function public.update_admin_organization_profile_review(
  _session_token text,
  _organization_profile_id uuid,
  _profile_status public.profile_status,
  _verified_at timestamptz default null
)
returns table (
  id uuid,
  user_id uuid,
  organization_name text,
  organization_email citext,
  contact_number text,
  district text,
  barangay text,
  is_existing_organization boolean,
  organization_identifier_number text,
  major_classification text,
  sub_classification text,
  advocacies text[],
  adviser_name text,
  representative_name text,
  address text,
  facebook_page_url text,
  profile_status public.profile_status,
  verified_at timestamptz,
  internal_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
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
  update public.organization_profiles
  set
    profile_status = _profile_status,
    verified_at = case
      when _profile_status = 'verified'::public.profile_status then coalesce(_verified_at, now())
      else null
    end,
    updated_at = now()
  where organization_profiles.id = _organization_profile_id
  returning
    organization_profiles.id,
    organization_profiles.user_id,
    organization_profiles.organization_name,
    organization_profiles.organization_email,
    organization_profiles.contact_number,
    organization_profiles.district,
    organization_profiles.barangay,
    organization_profiles.is_existing_organization,
    organization_profiles.organization_identifier_number,
    organization_profiles.major_classification,
    organization_profiles.sub_classification,
    organization_profiles.advocacies,
    organization_profiles.adviser_name,
    organization_profiles.representative_name,
    organization_profiles.address,
    organization_profiles.facebook_page_url,
    organization_profiles.profile_status,
    organization_profiles.verified_at,
    organization_profiles.internal_notes,
    organization_profiles.created_at,
    organization_profiles.updated_at;
end;
$$;

create or replace function public.update_admin_document_submission_review(
  _session_token text,
  _submission_id uuid,
  _status public.document_submission_status,
  _overall_remarks text default null,
  _admin_remarks text default null
)
returns table (
  id uuid,
  organization_id uuid,
  submitted_by uuid,
  status public.document_submission_status,
  user_confirmed boolean,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  overall_remarks text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _reviewed_at timestamptz := now();
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  update public.document_submission_files
  set
    admin_status = _status,
    admin_remarks = coalesce(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    updated_at = _reviewed_at
  where submission_id = _submission_id;

  return query
  update public.document_submissions
  set
    status = _status,
    reviewed_by = null,
    reviewed_at = _reviewed_at,
    overall_remarks = coalesce(_overall_remarks, document_submissions.overall_remarks),
    updated_at = _reviewed_at
  where document_submissions.id = _submission_id
  returning
    document_submissions.id,
    document_submissions.organization_id,
    document_submissions.submitted_by,
    document_submissions.status,
    document_submissions.user_confirmed,
    document_submissions.submitted_at,
    document_submissions.reviewed_by,
    document_submissions.reviewed_at,
    document_submissions.overall_remarks,
    document_submissions.created_at,
    document_submissions.updated_at;
end;
$$;

create or replace function public.update_admin_document_submission_file_review(
  _session_token text,
  _file_id uuid,
  _status public.document_submission_status,
  _admin_remarks text default null
)
returns setof public.document_submission_files
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _reviewed_at timestamptz := now();
  _submission_id uuid;
  _document_name text;
  _overall_status public.document_submission_status;
  _overall_remarks text;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select
    document_submission_files.submission_id,
    coalesce(required_document_types.name, document_submission_files.file_name)
  into _submission_id, _document_name
  from public.document_submission_files
  left join public.required_document_types
    on required_document_types.id = document_submission_files.document_type_id
  where document_submission_files.id = _file_id
  limit 1;

  if _submission_id is null then
    raise exception 'Document submission file was not found.';
  end if;

  update public.document_submission_files
  set
    admin_status = _status,
    admin_remarks = coalesce(_admin_remarks, document_submission_files.admin_remarks),
    reviewed_at = _reviewed_at,
    updated_at = _reviewed_at
  where document_submission_files.id = _file_id;

  select
    case
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
          and admin_status = 'rejected_red'
      ) then 'rejected_red'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
          and admin_status = 'needs_revision'
      ) then 'needs_revision'::public.document_submission_status
      when exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
      ) and not exists (
        select 1
        from public.document_submission_files
        where submission_id = _submission_id
          and admin_status <> 'approved_green'
      ) then 'approved_green'::public.document_submission_status
      else 'under_admin_review'::public.document_submission_status
    end
  into _overall_status;

  _overall_remarks :=
    case
      when _status = 'approved_green' then format('Admin approved %s.', _document_name)
      when _status = 'needs_revision' then format('Admin requested revisions for %s.', _document_name)
      else format('Admin rejected %s.', _document_name)
    end;

  update public.document_submissions
  set
    status = _overall_status,
    reviewed_by = null,
    reviewed_at = _reviewed_at,
    overall_remarks = _overall_remarks,
    updated_at = _reviewed_at
  where document_submissions.id = _submission_id;

  return query
  select *
  from public.document_submission_files
  where document_submission_files.id = _file_id;
end;
$$;

create or replace function public.notify_organization_profile_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.profile_status is not distinct from new.profile_status then
    return new;
  end if;

  if new.profile_status = 'verified' then
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      new.user_id,
      new.id,
      'Registration verified',
      'The admin verified your organization registration.',
      'completed',
      'organization_profile',
      new.id
    );
  elsif new.profile_status = 'needs_update' then
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      new.user_id,
      new.id,
      'Registration needs update',
      'The admin reviewed your organization profile and requested updates before verification.',
      'document_revision',
      'organization_profile',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_organization_profile_review_notify on public.organization_profiles;
create trigger trg_organization_profile_review_notify after update on public.organization_profiles for each row when (old.profile_status is distinct from new.profile_status) execute function public.notify_organization_profile_review_change();
