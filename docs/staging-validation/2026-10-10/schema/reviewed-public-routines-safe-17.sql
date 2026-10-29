-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_organization_identity(_name text, _barangay text DEFAULT NULL::text, _urn text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
declare _actor text:=coalesce(auth.uid()::text,'shared-anonymous'); _count integer; _own uuid; _p public.organization_profiles; _candidate public.organization_profiles; _possible boolean:=false; _seen integer:=0;
begin
 if length(coalesce(_name,'')) not between 3 and 100 or length(coalesce(_urn,''))>80 or length(coalesce(_barangay,''))>100 then
   return jsonb_build_object('outcome','CHECK_UNAVAILABLE');
 end if;
 insert into ytrace_identity.check_rate(actor,minute,requests) values(_actor,date_trunc('minute',now()),1)
 on conflict(actor,minute) do update set requests=least(ytrace_identity.check_rate.requests+1,31) returning requests into _count;
 if _count>30 then return jsonb_build_object('outcome','CHECK_UNAVAILABLE'); end if;
 insert into ytrace_identity.check_rate(actor,minute,requests) values('global',date_trunc('minute',now()),1)
 on conflict(actor,minute) do update set requests=least(ytrace_identity.check_rate.requests+1,121) returning requests into _count;
 if _count>120 then return jsonb_build_object('outcome','CHECK_UNAVAILABLE'); end if;
 delete from ytrace_identity.check_rate where (actor,minute) in
   (select actor,minute from ytrace_identity.check_rate where minute<now()-interval '1 day' order by minute limit 100);
 select * into _p from public.organization_profiles where user_id=auth.uid(); _own:=_p.id;
 if nullif(_urn,'') is not null and exists(select 1 from public.organization_profiles p where p.id is distinct from _own
   and (p.urn_normalized=public.normalize_urn(_urn) or upper(trim(p.organization_identifier_number))=public.normalize_urn(_urn))) then
   return jsonb_build_object('outcome','EXACT_URN_CONFLICT');
 end if;
 if _own is not null and exists(select 1 from ytrace_identity.cases where organization_id=_own
   and outcome in ('CONFIRMED_EXISTING','MORE_INFORMATION','REJECTED')) then
   return jsonb_build_object('outcome','POSSIBLE_MATCH');
 end if;
 for _candidate in select * from ytrace_identity.candidates(_name,_barangay,_urn,_own) loop
   _seen:=_seen+1;
   if nullif(_urn,'') is not null and (_candidate.urn_normalized=public.normalize_urn(_urn)
      or upper(trim(_candidate.organization_identifier_number))=public.normalize_urn(_urn)) then
     return jsonb_build_object('outcome','EXACT_URN_CONFLICT');
   end if;
   if _own is null or public.normalize_organization_identity_name(_name) is distinct from _p.identity_name_key
     or coalesce(_barangay,'') is distinct from coalesce(_p.barangay,'')
     or (_p.registration_type::text='existing_urn' and public.normalize_urn(coalesce(_urn,'')) is distinct from public.normalize_urn(coalesce(_p.urn,'')))
     or not exists(select 1 from ytrace_identity.decisions d where d.organization_id=_own and d.candidate_id=_candidate.id
       and d.decision='confirmed_different' and d.subject_fingerprint=ytrace_identity.fingerprint(_p)
       and d.candidate_fingerprint=ytrace_identity.candidate_fingerprint(_candidate)) then _possible:=true; end if;
 end loop;
 return jsonb_build_object('outcome',case when _possible or _seen>=21 then 'POSSIBLE_MATCH'
   when _own is not null and public.normalize_organization_identity_name(_name)=_p.identity_name_key
     and coalesce(_barangay,'')=coalesce(_p.barangay,'') and exists(select 1 from ytrace_identity.cases where organization_id=_own and outcome='VERIFIED_SEPARATE') then 'VERIFIED_SEPARATE' else 'NO_MATCH' end);
end $function$;

CREATE OR REPLACE FUNCTION public.check_signup_email_status(_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_normalized text;
  v_user record;
BEGIN
  v_normalized := lower(trim(_email));
  IF v_normalized IS NULL OR v_normalized = '' THEN
    RETURN 'available';
  END IF;

  SELECT id, email_confirmed_at, confirmed_at
  INTO v_user
  FROM auth.users
  WHERE lower(email) = v_normalized
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'available';
  END IF;

  IF v_user.email_confirmed_at IS NOT NULL OR v_user.confirmed_at IS NOT NULL THEN
    RETURN 'registered';
  ELSE
    RETURN 'unconfirmed';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_account(_session_token text, _display_name text, _email text, _username text, _role_id smallint, _unit_id smallint)
 RETURNS TABLE(id uuid, display_name text, email text, username text, role_id smallint, unit_id smallint, is_active boolean, is_password_set boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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

  if not exists (
    select 1 from public.admin_accounts a
    join public.roles r on r.id = a.role_id
    where a.id = _admin_id and 'administrators_management' = any(r.permission_codes)
  ) then
    raise exception 'You do not have permission to manage admin accounts.';
  end if;

  return query
  insert into public.admin_accounts (
    display_name, email, username, password_hash, role_id, unit_id, is_password_set
  )
  values (
    trim(_display_name),
    trim(_email),
    trim(_username),
    crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
    _role_id,
    _unit_id,
    false
  )
  returning
    admin_accounts.id,
    admin_accounts.display_name,
    admin_accounts.email::text,
    admin_accounts.username::text,
    admin_accounts.role_id,
    admin_accounts.unit_id,
    admin_accounts.is_active,
    admin_accounts.is_password_set;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_activity_log(_session_token text, _organization_id uuid, _action text, _related_type text, _related_id uuid, _description text, _category text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, actor_user_id uuid, organization_id uuid, action text, related_type text, related_id uuid, description text, created_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
  _effective_category text;
  _final_meta jsonb;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  _effective_category := lower(trim(coalesce(_category, '')));
  IF _effective_category = '' THEN
    IF _action ILIKE '%login%' OR _action ILIKE '%sign_in%' THEN _effective_category := 'login';
    ELSIF _action ILIKE '%logout%' OR _action ILIKE '%sign_out%' THEN _effective_category := 'logout';
    ELSIF _action ILIKE '%delete%' OR _action ILIKE '%remove%' OR _action ILIKE '%purge%' THEN _effective_category := 'deletion';
    ELSIF _action ILIKE '%permission%' OR _action ILIKE '%role%' THEN _effective_category := 'permission';
    ELSIF _action ILIKE '%setting%' OR _action ILIKE '%config%' THEN _effective_category := 'config';
    ELSIF _action ILIKE '%approve%' OR _action ILIKE '%reject%' OR _action ILIKE '%decision%' OR _action ILIKE '%review%' THEN _effective_category := 'approval';
    ELSIF _action ILIKE '%create%' OR _action ILIKE '%add%' OR _action ILIKE '%new%' THEN _effective_category := 'create';
    ELSE _effective_category := 'update';
    END IF;
  END IF;

  -- If the audit category is disabled, safely return empty set without failing the operation
  IF NOT public.is_audit_logging_enabled(_effective_category) THEN
    RETURN;
  END IF;

  _final_meta := coalesce(_metadata, '{}'::jsonb) || public.extract_audit_request_metadata();

  RETURN QUERY
  INSERT INTO public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description,
    metadata
  )
  VALUES (
    _admin_id,
    _organization_id,
    trim(_action),
    trim(_related_type),
    _related_id,
    _description,
    _final_meta
  )
  RETURNING
    activity_logs.id,
    activity_logs.actor_user_id,
    activity_logs.organization_id,
    activity_logs.action,
    activity_logs.related_type,
    activity_logs.related_id,
    activity_logs.description,
    activity_logs.created_at,
    activity_logs.metadata;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_news_category(_session_token text, _name text)
 RETURNS TABLE(id uuid, name text, normalized_name text, is_system boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_news_release(_session_token text, _title text, _description text, _facebook_post_url text, _preview_image_url text, _date_posted date, _visibility_status visibility_status)
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
  insert into public.news_releases (
    title,
    description,
    facebook_post_url,
    preview_image_url,
    date_posted,
    visibility_status,
    created_by
  )
  values (
    trim(_title),
    coalesce(_description, ''),
    trim(_facebook_post_url),
    coalesce(trim(_preview_image_url), ''),
    _date_posted,
    coalesce(_visibility_status, 'draft'::public.visibility_status),
    null
  )
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

CREATE OR REPLACE FUNCTION public.create_admin_news_release(_session_token text, _title text, _description text, _facebook_post_url text, _preview_image_url text DEFAULT NULL::text, _date_posted date DEFAULT NULL::date, _visibility_status visibility_status DEFAULT 'draft'::visibility_status, _category text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, title text, description text, facebook_post_url text, preview_image_url text, date_posted date, visibility_status visibility_status, category text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  RETURN QUERY
  INSERT INTO public.news_releases (
    title, description, facebook_post_url, preview_image_url,
    date_posted, visibility_status, category, created_by
  )
  VALUES (
    TRIM(_title),
    COALESCE(_description, ''),
    TRIM(_facebook_post_url),
    NULLIF(TRIM(COALESCE(_preview_image_url, '')), ''),
    _date_posted,
    COALESCE(_visibility_status, 'draft'::public.visibility_status),
    NULLIF(TRIM(COALESCE(_category, '')), ''),
    _admin_id
  )
  RETURNING
    news_releases.id, news_releases.title, news_releases.description,
    news_releases.facebook_post_url, news_releases.preview_image_url,
    news_releases.date_posted, news_releases.visibility_status,
    news_releases.category, news_releases.created_by,
    news_releases.created_at, news_releases.updated_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_template_document(_session_token text, _name text, _description text, _template_description text, _template_scope text)
 RETURNS TABLE(id uuid, name text, description text, template_url text, template_description text, sort_order integer, is_required boolean, is_active boolean, template_scope text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _next_sort_order integer;
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

  select coalesce(max(rdt.sort_order), 0) + 1
  into _next_sort_order
  from public.required_document_types rdt;

  return query
  insert into public.required_document_types (
    name,
    description,
    required_year,
    is_required,
    template_url,
    template_description,
    sort_order,
    is_active,
    template_scope
  )
  values (
    trim(_name),
    coalesce(_description, ''),
    extract(year from now())::integer,
    _resolved_scope = 'document_submission',
    '',
    coalesce(_template_description, ''),
    _next_sort_order,
    true,
    _resolved_scope
  )
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

CREATE OR REPLACE FUNCTION public.create_admin_template_document(_session_token text, _name text, _description text, _template_description text)
 RETURNS TABLE(id uuid, name text, description text, template_url text, template_description text, sort_order integer, is_required boolean, is_active boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _next_sort_order integer;
  _admin_id uuid;
begin
  select vat.admin_id
  into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select coalesce(max(rdt.sort_order), 0) + 1
  into _next_sort_order
  from public.required_document_types rdt;

  return query
  insert into public.required_document_types (
    name,
    description,
    required_year,
    is_required,
    template_url,
    template_description,
    sort_order,
    is_active
  )
  values (
    trim(_name),
    coalesce(_description, ''),
    extract(year from now())::integer,
    true,
    '',
    coalesce(_template_description, ''),
    _next_sort_order,
    true
  )
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

CREATE OR REPLACE FUNCTION public.create_admin_transparency_post(_session_token text, _title text, _description text, _category text, _attachment_url text, _post_date date, _visibility_status visibility_status)
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
$function$;

CREATE OR REPLACE FUNCTION public.create_notification_record(p_id text, p_user_id text, p_org_id text, p_title text, p_message text, p_type text, p_related_type text, p_related_id text, p_created_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (id, user_id, organization_id, title, message, type, related_type, related_id, is_read, created_at)
  VALUES (p_id, p_user_id, NULLIF(p_org_id, ''), p_title, p_message, p_type, p_related_type, p_related_id, false, p_created_at)
  ON CONFLICT (id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_role(_roles app_role_code[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when auth.uid() is null then false
    else exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.code = any(_roles)
    )
  end;
$function$;

RESET check_function_bodies;

