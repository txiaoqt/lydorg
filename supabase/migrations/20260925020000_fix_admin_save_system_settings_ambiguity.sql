-- ==============================================================================
-- Migration: 20260925020000_fix_admin_save_system_settings_ambiguity.sql
-- Description: Fixes column reference "setting_key" is ambiguous in
--              admin_save_system_settings by explicitly qualifying all column
--              references on public.admin_system_settings.
-- ==============================================================================

create or replace function public.admin_save_system_settings(
  _session_token text,
  _settings jsonb
)
returns table (
  id uuid,
  setting_key text,
  category text,
  value_json jsonb,
  data_type text,
  description text,
  is_sensitive boolean,
  is_editable boolean,
  updated_by uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _admin_id uuid;
  _item jsonb;
  _key text;
  _val jsonb;
  _target_record public.admin_system_settings%rowtype;
  _updated_keys text[] := array[]::text[];
  _log_enabled boolean := true;
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
    where a.id = _admin_id
      and ('system_settings_manage' = any(r.permission_codes) or r.code = 'super_admin')
  ) then
    raise exception 'You do not have permission to modify system settings.';
  end if;

  if jsonb_typeof(_settings) != 'array' then
    raise exception 'Invalid payload: settings must be a JSON array.';
  end if;

  -- Process each setting update atomically
  for _item in select * from jsonb_array_elements(_settings) loop
    _key := trim((_item->>'key')::text);
    _val := _item->'value';

    if _key is null or _key = '' or _val is null then
      raise exception 'Invalid setting item: missing key or value.';
    end if;

    select * into _target_record
    from public.admin_system_settings s
    where s.setting_key = _key
    for update;

    if not found then
      raise exception 'Setting % not found.', _key;
    end if;

    if not _target_record.is_editable then
      raise exception 'Setting % is read-only and cannot be modified.', _key;
    end if;

    -- Validate value against data_type constraints
    case _target_record.data_type
      when 'boolean' then
        if jsonb_typeof(_val) != 'boolean' then
          raise exception 'Setting % must be a boolean value.', _key;
        end if;
      when 'number' then
        if jsonb_typeof(_val) != 'number' then
          raise exception 'Setting % must be a numeric value.', _key;
        end if;
        if _key = 'security.admin_session_timeout_minutes' then
          if (_val::numeric < 5 or _val::numeric > 480) then
            raise exception 'Session timeout must be between 5 and 480 minutes.';
          end if;
        elsif _key in ('workflow.review_reminder_days', 'workflow.escalate_after_days', 'programs.ypop_default_reminder_days') then
          if _val::numeric < 0 then
            raise exception 'Days value for % cannot be negative.', _key;
          end if;
        end if;
      when 'string' then
        if jsonb_typeof(_val) != 'string' then
          raise exception 'Setting % must be a string value.', _key;
        end if;
        if _key in ('general.support_email', 'email.reply_to_email') then
          if not (_val #>> '{}' ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') then
            raise exception 'Invalid email format for %: %', _key, _val #>> '{}';
          end if;
        elsif _key in ('general.user_portal_url', 'general.admin_portal_url') then
          if not (_val #>> '{}' ~* '^https?://.+$') then
            raise exception 'Invalid URL format for %: must start with http:// or https://', _key;
          end if;
        end if;
      else
        null;
    end case;

    update public.admin_system_settings as s
    set
      value_json = _val,
      updated_by = _admin_id,
      updated_at = now()
    where s.setting_key = _key;

    _updated_keys := array_append(_updated_keys, _key);
  end loop;

  -- Check if config logging is enabled
  select coalesce((s.value_json)::boolean, true)
  into _log_enabled
  from public.admin_system_settings s
  where s.setting_key = 'audit.log_config_changes';

  if _log_enabled and array_length(_updated_keys, 1) > 0 then
    insert into public.activity_logs (
      actor_user_id,
      organization_id,
      action,
      related_type,
      related_id,
      description
    )
    values (
      _admin_id,
      null,
      'updated_system_settings',
      'system_settings',
      null,
      'Updated system settings: ' || array_to_string(_updated_keys, ', ')
    );
  end if;

  return query
  select
    s.id,
    s.setting_key,
    s.category,
    s.value_json,
    s.data_type,
    s.description,
    s.is_sensitive,
    s.is_editable,
    s.updated_by,
    s.updated_at
  from public.admin_system_settings s
  where s.setting_key = any(_updated_keys)
  order by s.category asc, s.setting_key asc;
end;
$$;

grant execute on function public.admin_save_system_settings(text, jsonb) to anon, authenticated, service_role;
