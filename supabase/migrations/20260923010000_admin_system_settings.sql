-- ==============================================================================
-- Migration: Admin System Settings Architecture
-- Description: Creates the admin_system_settings table, permission codes,
--              seed records, and SECURITY DEFINER RPCs for reading and batch-saving
--              system settings with audit logging.
-- ==============================================================================

-- 1. Update Super Admin role with new system settings permission codes
update public.roles
set permission_codes = array_cat(
  permission_codes,
  array['system_settings_view', 'system_settings_manage']
)
where code = 'super_admin'
  and not ('system_settings_view' = any(permission_codes));

-- 2. Create the admin_system_settings table
create table if not exists public.admin_system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text unique not null,
  category text not null,
  value_json jsonb not null,
  data_type text not null check (data_type in ('string', 'number', 'boolean', 'json', 'array')),
  description text,
  is_sensitive boolean not null default false,
  is_editable boolean not null default true,
  updated_by uuid references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_system_settings_key on public.admin_system_settings(setting_key);
create index if not exists idx_admin_system_settings_category on public.admin_system_settings(category);

alter table public.admin_system_settings enable row level security;

-- 3. Seed Default System Settings
insert into public.admin_system_settings (setting_key, category, value_json, data_type, description, is_sensitive, is_editable)
values
  -- General Settings
  ('general.system_name', 'general', '"Y-TRACE"'::jsonb, 'string', 'Official system display name across administrative communications', false, true),
  ('general.office_name', 'general', '"Pasig City Local Youth Development Office"'::jsonb, 'string', 'Official office and department name', false, true),
  ('general.office_acronym', 'general', '"PCYDO / LYDO"'::jsonb, 'string', 'Official office acronyms used in headers and badges', false, true),
  ('general.support_email', 'general', '"support@lydo.pasig.gov.ph"'::jsonb, 'string', 'Official support contact email displayed to users and inquiries', false, true),
  ('general.contact_number', 'general', '"(02) 8643-1111"'::jsonb, 'string', 'Official hotline and landline contact number', false, true),
  ('general.office_address', 'general', '"Pasig City Hall Complex, Caruncho Ave, Pasig, Metro Manila"'::jsonb, 'string', 'Physical office address for on-site visits and hardcopy document delivery', false, true),
  ('general.user_portal_url', 'general', '"https://ytrace.app"'::jsonb, 'string', 'Canonical URL for the Youth Organization Portal', false, true),
  ('general.admin_portal_url', 'general', '"https://y-trace-admin.vercel.app"'::jsonb, 'string', 'Canonical URL for the Administrative Management Portal', false, true),

  -- Notification Settings
  ('notifications.new_registration.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification on new accreditation registration submissions', false, true),
  ('notifications.new_registration.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification on new accreditation registration submissions', false, true),
  ('notifications.renewal_submitted.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification on accreditation renewal packet submissions', false, true),
  ('notifications.renewal_submitted.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification on accreditation renewal packet submissions', false, true),
  ('notifications.ypop_submission.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification on new YPOP activity entries and event validations', false, true),
  ('notifications.ypop_submission.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification on new YPOP activity entries and event validations', false, true),
  ('notifications.budget_request.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification on new organization project budget requests', false, true),
  ('notifications.budget_request.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification on new organization project budget requests', false, true),
  ('notifications.liquidation_report.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification on liquidation report submissions', false, true),
  ('notifications.liquidation_report.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification on liquidation report submissions', false, true),
  ('notifications.new_inquiry.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification on incoming public or organization inquiries', false, true),
  ('notifications.new_inquiry.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification on incoming public or organization inquiries', false, true),
  ('notifications.revision_resubmission.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification when an organization resubmits revised documents', false, true),
  ('notifications.revision_resubmission.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification when an organization resubmits revised documents', false, true),
  ('notifications.overdue_liquidation.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification when a project liquidation deadline lapses', false, true),
  ('notifications.overdue_liquidation.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification when a project liquidation deadline lapses', false, true),
  ('notifications.accreditation_expiring.in_app', 'notifications', 'true'::jsonb, 'boolean', 'In-app notification when recognized youth organizations enter renewal window', false, true),
  ('notifications.accreditation_expiring.email', 'notifications', 'true'::jsonb, 'boolean', 'Email notification when recognized youth organizations enter renewal window', false, true),
  ('notifications.daily_digest_enabled', 'notifications', 'false'::jsonb, 'boolean', 'Enable consolidated daily email digest of pending administrative action items', false, true),
  ('notifications.daily_digest_time', 'notifications', '"08:00"'::jsonb, 'string', 'Target time of day (Asia/Manila) for daily digest generation', false, true),

  -- Workflow Settings
  ('workflow.review_reminder_enabled', 'workflow', 'true'::jsonb, 'boolean', 'Enable automated review reminders for pending submissions', false, true),
  ('workflow.review_reminder_days', 'workflow', '3'::jsonb, 'number', 'Days after submission before a pending document review reminder is flagged', false, true),
  ('workflow.escalate_after_days', 'workflow', '7'::jsonb, 'number', 'Days after submission before unreviewed items escalate to administrator attention', false, true),
  ('workflow.overdue_indicators_enabled', 'workflow', 'true'::jsonb, 'boolean', 'Display visual warning indicators and badges for overdue review items', false, true),
  ('workflow.notify_org_on_needs_revision', 'workflow', 'true'::jsonb, 'boolean', 'Notify organization users immediately when a submission is marked Needs Revision', false, true),
  ('workflow.notify_org_on_approved', 'workflow', 'true'::jsonb, 'boolean', 'Notify organization users when registration, renewal, or budget items are approved', false, true),
  ('workflow.notify_org_on_rejected', 'workflow', 'true'::jsonb, 'boolean', 'Notify organization users when a submission is rejected with official remarks', false, true),
  ('workflow.notify_org_on_resubmitted', 'workflow', 'true'::jsonb, 'boolean', 'Acknowledge receipt to organization users upon resubmitting revised documents', false, true),

  -- Program / YPOP Settings
  ('programs.ypop_default_reminder_days', 'programs', '5'::jsonb, 'number', 'Default number of days before YPOP validation deadline to send automated reminders', false, true),
  ('programs.ypop_deadline_reminders_enabled', 'programs', 'true'::jsonb, 'boolean', 'Enable automated deadline reminders for active YPOP validation periods', false, true),
  ('programs.ypop_auto_close_on_deadline', 'programs', 'false'::jsonb, 'boolean', 'Automatically close YPOP submission window when validation deadline passes', false, true),

  -- Budget & Finance Settings
  ('budget.default_fiscal_year', 'budget_finance', '2026'::jsonb, 'number', 'Default fiscal year used for budget monitoring and allocations', false, true),
  ('budget.currency', 'budget_finance', '"PHP"'::jsonb, 'string', 'Standard currency code for financial tracking and export reports', false, true),
  ('budget.currency_symbol', 'budget_finance', '"₱"'::jsonb, 'string', 'Currency display symbol for monetary amounts', false, true),
  ('budget.budget_deadline_reminders', 'budget_finance', 'true'::jsonb, 'boolean', 'Enable automated notifications for upcoming budget proposal deadlines', false, true),
  ('budget.liquidation_overdue_reminders', 'budget_finance', 'true'::jsonb, 'boolean', 'Enable automated warnings for overdue financial liquidation reports', false, true),

  -- Security Settings
  ('security.admin_session_timeout_minutes', 'security', '30'::jsonb, 'number', 'Administrative session inactivity timeout in minutes (15, 30, 60, 120)', false, true),
  ('security.reauth_delete_administrator', 'security', 'true'::jsonb, 'boolean', 'Require confirmation dialog before permanently deleting an administrator account', false, true),
  ('security.reauth_delete_inquiry', 'security', 'false'::jsonb, 'boolean', 'Require confirmation dialog before permanently deleting inquiry records', false, true),
  ('security.reauth_delete_organization', 'security', 'true'::jsonb, 'boolean', 'Require strict exact-match name confirmation before permanently deleting organization accounts', false, true),
  ('security.reauth_modify_role_permissions', 'security', 'false'::jsonb, 'boolean', 'Require confirmation before modifying administrative role permissions', false, true),
  ('security.reauth_modify_system_settings', 'security', 'false'::jsonb, 'boolean', 'Require confirmation before modifying system settings', false, true),
  ('security.require_verified_admin_email', 'security', 'true'::jsonb, 'boolean', 'Require verified email address prior to administrator account activation', false, true),
  ('security.allow_admin_password_reset', 'security', 'true'::jsonb, 'boolean', 'Allow administrative password reset requests via official email', false, true),

  -- Email Settings
  ('email.sender_name', 'email', '"Pasig City LYDO"'::jsonb, 'string', 'Default sender display name for automated system emails and notifications', false, true),
  ('email.reply_to_email', 'email', '"support@lydo.pasig.gov.ph"'::jsonb, 'string', 'Default reply-to email address on outgoing system communications', false, true),
  ('email.send_invitation_emails', 'email', 'true'::jsonb, 'boolean', 'Send automated email invitations when creating new administrator accounts', false, true),
  ('email.send_workflow_emails', 'email', 'true'::jsonb, 'boolean', 'Dispatch transactional email notifications for workflow status updates', false, true),

  -- Audit & Records Settings
  ('audit.log_admin_login', 'audit_records', 'true'::jsonb, 'boolean', 'Log administrator sign-in sessions in audit logs', false, true),
  ('audit.log_admin_logout', 'audit_records', 'true'::jsonb, 'boolean', 'Log administrator sign-out events in audit logs', false, true),
  ('audit.log_record_creation', 'audit_records', 'true'::jsonb, 'boolean', 'Log creation of new entities, templates, posts, and submissions', false, true),
  ('audit.log_record_updates', 'audit_records', 'true'::jsonb, 'boolean', 'Log modifications to existing entities and review states', false, true),
  ('audit.log_approvals_rejections', 'audit_records', 'true'::jsonb, 'boolean', 'Log approval, revision, and rejection actions', false, true),
  ('audit.log_deletions', 'audit_records', 'true'::jsonb, 'boolean', 'Log deletion of records, activities, and uploaded files', false, true),
  ('audit.log_permission_changes', 'audit_records', 'true'::jsonb, 'boolean', 'Log administrative role and permission assignments', false, true),
  ('audit.log_config_changes', 'audit_records', 'true'::jsonb, 'boolean', 'Log modifications made to system configuration settings', false, true),
  ('audit.include_ip_metadata', 'audit_records', 'false'::jsonb, 'boolean', 'Capture client IP addresses in activity log metadata where available', false, true),
  ('audit.include_user_agent', 'audit_records', 'true'::jsonb, 'boolean', 'Capture client browser user agent strings in activity log metadata', false, true)
on conflict (setting_key) do nothing;

-- 4. RPC: Read system settings
create or replace function public.admin_get_system_settings(_session_token text)
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
      and ('system_settings_view' = any(r.permission_codes) or r.code = 'super_admin')
  ) then
    raise exception 'You do not have permission to view system settings.';
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
  order by s.category asc, s.setting_key asc;
end;
$$;

-- 5. RPC: Batch save system settings
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
    from public.admin_system_settings
    where admin_system_settings.setting_key = _key
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

    update public.admin_system_settings
    set
      value_json = _val,
      updated_by = _admin_id,
      updated_at = now()
    where setting_key = _key;

    _updated_keys := array_append(_updated_keys, _key);
  end loop;

  -- Check if config logging is enabled
  select coalesce((value_json)::boolean, true)
  into _log_enabled
  from public.admin_system_settings
  where setting_key = 'audit.log_config_changes';

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

-- 6. Update authenticate_admin_account to respect security.admin_session_timeout_minutes
create or replace function public.authenticate_admin_account(
  _username text,
  _password text
)
returns table (
  admin_id uuid,
  username citext,
  email citext,
  display_name text,
  session_token text,
  expires_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _admin public.admin_accounts%rowtype;
  _session_token text;
  _expires_at timestamptz;
  _clean_identifier text;
  _timeout_mins integer := 30;
begin
  _clean_identifier := lower(trim(coalesce(_username, '')));

  select *
  into _admin
  from public.admin_accounts aa
  where aa.is_active = true
    and (lower(aa.email::text) = _clean_identifier or lower(aa.username::text) = _clean_identifier)
    and aa.password_hash = extensions.crypt(_password, aa.password_hash)
  limit 1;

  if not found then
    return;
  end if;

  -- Load dynamic session timeout setting (default 30 minutes)
  select coalesce((s.value_json)::integer, 30)
  into _timeout_mins
  from public.admin_system_settings s
  where s.setting_key = 'security.admin_session_timeout_minutes';

  if _timeout_mins is null or _timeout_mins < 5 then
    _timeout_mins := 30;
  end if;

  _session_token := encode(extensions.gen_random_bytes(32), 'hex');
  _expires_at := now() + (_timeout_mins || ' minutes')::interval;

  insert into public.admin_sessions (
    admin_id,
    token_hash,
    expires_at
  )
  values (
    _admin.id,
    encode(extensions.digest(_session_token, 'sha256'), 'hex'),
    _expires_at
  );

  return query
  select
    _admin.id,
    _admin.username,
    _admin.email,
    _admin.display_name,
    _session_token,
    _expires_at;
end;
$$;
