-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_admin_liquidation_report(_session_token text, _liquidation_report_id uuid, _status liquidation_report_status DEFAULT NULL::liquidation_report_status, _remarks text DEFAULT NULL::text, _go_signal_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _deadline_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _hard_copy_submitted_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _completed_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, budget_request_id uuid, organization_id uuid, submitted_by uuid, status liquidation_report_status, remarks text, go_signal_at timestamp with time zone, deadline_at timestamp with time zone, hard_copy_submitted_at timestamp with time zone, completed_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  perform 1 from public.liquidation_reports lr where lr.id=_liquidation_report_id for update;
  if exists (select 1 from public.liquidation_reports lr where lr.id=_liquidation_report_id and lr.status::text = 'draft') then
    raise exception 'This liquidation report has not been submitted for review.';
  end if;
  return query
  update public.liquidation_reports
  set
    status = coalesce(_status, liquidation_reports.status),
    remarks = coalesce(_remarks, liquidation_reports.remarks),
    go_signal_at = coalesce(_go_signal_at, liquidation_reports.go_signal_at),
    deadline_at = coalesce(_deadline_at, liquidation_reports.deadline_at),
    hard_copy_submitted_at = coalesce(_hard_copy_submitted_at, liquidation_reports.hard_copy_submitted_at),
    completed_at = coalesce(_completed_at, liquidation_reports.completed_at),
    updated_at = now()
  where liquidation_reports.id = _liquidation_report_id
  returning
    liquidation_reports.id,
    liquidation_reports.budget_request_id,
    liquidation_reports.organization_id,
    liquidation_reports.submitted_by,
    liquidation_reports.status,
    liquidation_reports.remarks,
    liquidation_reports.go_signal_at,
    liquidation_reports.deadline_at,
    liquidation_reports.hard_copy_submitted_at,
    liquidation_reports.completed_at,
    liquidation_reports.created_at,
    liquidation_reports.updated_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_news_release(_session_token text, _news_release_id uuid, _title text, _description text, _facebook_post_url text, _preview_image_url text, _date_posted date, _visibility_status visibility_status)
 RETURNS TABLE(id uuid, title text, description text, facebook_post_url text, preview_image_url text, date_posted date, visibility_status visibility_status, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    preview_image_url = coalesce(trim(_preview_image_url), news_releases.preview_image_url),
    date_posted = coalesce(_date_posted, news_releases.date_posted),
    visibility_status = coalesce(_visibility_status, news_releases.visibility_status),
    updated_at = now()
  where news_releases.id = _news_release_id
  returning
    news_releases.id,
    news_releases.title,
    news_releases.description,
    news_releases.facebook_post_url,
    news_releases.preview_image_url,
    news_releases.date_posted,
    news_releases.visibility_status,
    news_releases.created_by,
    news_releases.created_at,
    news_releases.updated_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_news_release(_session_token text, _news_release_id uuid, _title text DEFAULT NULL::text, _description text DEFAULT NULL::text, _facebook_post_url text DEFAULT NULL::text, _preview_image_url text DEFAULT NULL::text, _date_posted date DEFAULT NULL::date, _visibility_status visibility_status DEFAULT NULL::visibility_status, _category text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, title text, description text, facebook_post_url text, preview_image_url text, date_posted date, visibility_status visibility_status, category text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    title            = coalesce(trim(_title), news_releases.title),
    description      = coalesce(_description, news_releases.description),
    facebook_post_url = coalesce(trim(_facebook_post_url), news_releases.facebook_post_url),
    preview_image_url = coalesce(nullif(trim(coalesce(_preview_image_url, '')), ''), news_releases.preview_image_url),
    date_posted      = coalesce(_date_posted, news_releases.date_posted),
    visibility_status = coalesce(_visibility_status, news_releases.visibility_status),
    category         = case
                         when _category is not null then nullif(trim(_category), '')
                         else news_releases.category
                       end,
    updated_at       = now()
  where news_releases.id = _news_release_id
  returning
    news_releases.id,
    news_releases.title,
    news_releases.description,
    news_releases.facebook_post_url,
    news_releases.preview_image_url,
    news_releases.date_posted,
    news_releases.visibility_status,
    news_releases.category,
    news_releases.created_by,
    news_releases.created_at,
    news_releases.updated_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_organization_profile_review(_session_token text, _organization_profile_id uuid, _profile_status profile_status, _verified_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, user_id uuid, organization_name text, organization_email citext, contact_number text, district text, barangay text, is_existing_organization boolean, organization_identifier_number text, major_classification text, sub_classification text, advocacies text[], adviser_name text, representative_name text, address text, facebook_page_url text, profile_status profile_status, verified_at timestamp with time zone, internal_notes text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _target_org public.organization_profiles%rowtype;
  _auto_res record;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select * into _target_org
  from public.organization_profiles
  where organization_profiles.id = _organization_profile_id
  for update;

  if not found then
    raise exception 'Organization profile not found.';
  end if;

  if _profile_status = 'verified'::public.profile_status then
    -- For new organization registrations, verify that required documents are genuinely complete
    if not _target_org.is_existing_organization or _target_org.registration_type = 'new_organization' then
      select * into _auto_res
      from public.evaluate_and_apply_automatic_registration_verification(_organization_profile_id, _admin_id);

      if not _auto_res.verified then
        raise exception 'Cannot verify organization: %', _auto_res.reason;
      end if;
    else
      -- Existing organization verification fallback
      perform public.evaluate_and_apply_automatic_registration_verification(_organization_profile_id, _admin_id);
    end if;

  else
    -- needs_update or incomplete
    update public.organization_profiles
    set
      profile_status = _profile_status,
      verified_at = null,
      updated_at = now()
    where organization_profiles.id = _organization_profile_id;
  end if;

  return query
  select
    op.id,
    op.user_id,
    op.organization_name,
    op.organization_email,
    op.contact_number,
    op.district,
    op.barangay,
    op.is_existing_organization,
    op.organization_identifier_number,
    op.major_classification,
    op.sub_classification,
    op.advocacies,
    op.adviser_name,
    op.representative_name,
    op.address,
    op.facebook_page_url,
    op.profile_status,
    op.verified_at,
    op.internal_notes,
    op.created_at,
    op.updated_at
  from public.organization_profiles op
  where op.id = _organization_profile_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_template_category(_session_token text, _template_id uuid, _template_category text[])
 RETURNS SETOF required_document_types
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  update public.required_document_types
  set template_category = _template_category, updated_at = now()
  where required_document_types.id = _template_id
  returning required_document_types.*;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_template_document(_session_token text, _template_id uuid, _name text, _description text, _template_description text, _template_scope text)
 RETURNS TABLE(id uuid, name text, description text, template_url text, template_description text, sort_order integer, is_required boolean, is_active boolean, template_scope text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
  _resolved_scope text;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  _resolved_scope := case
    when _template_scope in ('document_submission', 'move', 'other') then _template_scope
    else 'document_submission'
  end;

  return query
  update public.required_document_types
  set
    name = trim(_name),
    description = coalesce(_description, ''),
    template_description = coalesce(_template_description, ''),
    template_scope = _resolved_scope,
    is_required = (_resolved_scope = 'document_submission'),
    updated_at = now()
  where required_document_types.id = _template_id
  returning
    required_document_types.id,
    required_document_types.name,
    required_document_types.description,
    required_document_types.template_url,
    required_document_types.template_description,
    required_document_types.sort_order,
    required_document_types.is_required,
    required_document_types.is_active,
    required_document_types.template_scope,
    required_document_types.updated_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_template_document(_session_token text, _template_id uuid, _name text, _description text, _template_description text)
 RETURNS TABLE(id uuid, name text, description text, template_url text, template_description text, sort_order integer, is_required boolean, is_active boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  update public.required_document_types
  set
    name = trim(_name),
    description = coalesce(_description, ''),
    template_description = coalesce(_template_description, ''),
    updated_at = now()
  where required_document_types.id = _template_id
  returning
    required_document_types.id,
    required_document_types.name,
    required_document_types.description,
    required_document_types.template_url,
    required_document_types.template_description,
    required_document_types.sort_order,
    required_document_types.is_required,
    required_document_types.is_active,
    required_document_types.updated_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_template_file_url(_session_token text, _template_id uuid, _template_url text)
 RETURNS TABLE(id uuid, name text, description text, template_url text, template_description text, sort_order integer, is_required boolean, is_active boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  update public.required_document_types
  set
    template_url = coalesce(_template_url, ''),
    updated_at = now()
  where required_document_types.id = _template_id
  returning
    required_document_types.id,
    required_document_types.name,
    required_document_types.description,
    required_document_types.template_url,
    required_document_types.template_description,
    required_document_types.sort_order,
    required_document_types.is_required,
    required_document_types.is_active,
    required_document_types.updated_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_template_metadata(_session_token text, _template_id uuid, _template_category text[] DEFAULT NULL::text[], _template_file_size bigint DEFAULT NULL::bigint)
 RETURNS SETOF required_document_types
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  update public.required_document_types
  set
    template_category  = coalesce(_template_category,  template_category),
    template_file_size = coalesce(_template_file_size, template_file_size),
    updated_at         = now()
  where id = _template_id;

  return query
  select * from public.required_document_types where id = _template_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_template_metadata(_session_token text, _template_id uuid, _is_active boolean DEFAULT NULL::boolean, _description text DEFAULT NULL::text, _template_description text DEFAULT NULL::text, _template_scope text DEFAULT NULL::text, _template_category text[] DEFAULT NULL::text[], _template_file_size bigint DEFAULT NULL::bigint)
 RETURNS SETOF required_document_types
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;
  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;
  update public.required_document_types
  set
    is_active            = coalesce(_is_active,            is_active),
    description          = coalesce(_description,          description),
    template_description = coalesce(_template_description, template_description),
    template_scope       = coalesce(_template_scope,       template_scope),
    template_category    = coalesce(_template_category,    template_category),
    template_file_size   = coalesce(_template_file_size,   template_file_size),
    updated_at           = now()
  where id = _template_id;
  return query
  select * from public.required_document_types where id = _template_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_transparency_post(_session_token text, _post_id uuid, _title text, _description text, _category text, _attachment_url text, _post_date date, _visibility_status visibility_status)
 RETURNS TABLE(id uuid, title text, description text, category text, attachment_url text, visibility_status visibility_status, post_date date, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_organization_directory_preferences(_visible boolean, _show_representative boolean DEFAULT false, _show_adviser boolean DEFAULT false)
 RETURNS SETOF organization_profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _user_id uuid := auth.uid();
begin
  if _user_id is null then
    raise exception 'Please sign in with your organization account first.';
  end if;

  update public.organization_profiles
  set
    directory_visibility = coalesce(_visible, false),
    directory_show_representative = coalesce(_show_representative, false),
    directory_show_adviser = coalesce(_show_adviser, false),
    updated_at = now()
  where user_id = _user_id;

  if not found then
    raise exception 'Organization profile not found.';
  end if;

  return query
  select *
  from public.organization_profiles
  where user_id = _user_id;
end;
$function$;

RESET check_function_bodies;

