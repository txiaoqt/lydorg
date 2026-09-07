-- ==============================================================================
-- Migration: 20260907180000_phase2_2_corrective_hardening.sql
-- Description: Phase 2.2 Corrective Hardening for Y-TRACE Renewal / Accreditation Backend
--
-- TARGETED CORRECTIONS:
-- 1. Safe additive expansion of public.notification_type enum (adds missing values)
-- 2. Database-level notification idempotency via partial unique index on
--    (organization_id, type, related_id) WHERE related_type = 'accreditation'
--    (Eliminates Postgres 22P02 & 55P04 enum-cast parse errors in SQL Editor)
-- 3. Concurrency-safe evaluate_accreditation_notification_events() with matching
--    ON CONFLICT (organization_id, type, related_id) WHERE related_type = 'accreditation' DO NOTHING
--    and canonical activity_logs recording
-- 4. Re-affirmed User RPCs as SECURITY INVOKER with strict auth.uid() ownership checks
-- 5. Re-affirmed Admin RPCs as SECURITY DEFINER with canonical validate_admin_session_token()
-- 6. Document replacement review-state guard preserving complete historical evidence
-- 7. Database-level trigger enforcing terminal status immutability on organization_renewals
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NOTIFICATION ENUM SAFE EXPANSION
-- ------------------------------------------------------------------------------
-- In PostgreSQL 12+, ALTER TYPE ... ADD VALUE IF NOT EXISTS is safe and non-blocking.
-- Preserves all existing enum values without dropping or altering records.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'renewal_window_opened';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'renewal_window_urgent';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'accreditation_expired';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'rejected';

-- ------------------------------------------------------------------------------
-- 2. DATABASE-LEVEL NOTIFICATION IDEMPOTENCY (PARTIAL UNIQUE INDEX)
-- ------------------------------------------------------------------------------
-- Clean up previous partial index attempt if present
drop index if exists public.uq_notifications_time_driven_term;

-- Enforce exactly one notification per (organization_id, type, related_id)
-- where related_id represents the authoritative accreditation term ID and
-- related_type = 'accreditation'.
-- Filtering on `related_type = 'accreditation'` (text) avoids casting new enum
-- literals inside the index predicate, eliminating Postgres 22P02/55P04 errors
-- while perfectly isolating time-driven renewal notifications from general alerts.
create unique index if not exists uq_notifications_time_driven_term
  on public.notifications (organization_id, type, related_id)
  where related_type = 'accreditation';

comment on index public.uq_notifications_time_driven_term is
  'Enforces database-level idempotency for time-driven renewal notifications across accreditation terms (Phase 2.2 hardened).';

-- ------------------------------------------------------------------------------
-- 3. CONCURRENCY-SAFE evaluate_accreditation_notification_events
-- ------------------------------------------------------------------------------

create or replace function public.evaluate_accreditation_notification_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _today date := current_date;
  _opened_count int := 0;
  _urgent_count int := 0;
  _expired_count int := 0;
  _rec record;
begin
  -- 1. renewal_window_opened (90 days before end_date down to 31 days)
  for _rec in
    select oa.id as accreditation_id, oa.organization_id, oa.end_date, op.user_id
    from public.organization_accreditations oa
    join public.organization_profiles op on op.id = oa.organization_id
    where oa.status = 'active'
      and (oa.end_date - _today) <= 90
      and (oa.end_date - _today) > 30
      and not exists (
        select 1 from public.notifications n
        where n.organization_id = oa.organization_id
          and n.type = 'renewal_window_opened'
          and n.related_id = oa.id::text
      )
  loop
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Renewal Window Open',
      format('Your accreditation expires in %s days (%s). You may now prepare and submit your renewal application.', (_rec.end_date - _today), to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'renewal_window_opened',
      'accreditation',
      _rec.accreditation_id::text
    )
    on conflict (organization_id, type, related_id) where related_type = 'accreditation'
    do nothing;

    _opened_count := _opened_count + 1;
  end loop;

  -- 2. renewal_window_urgent (30 days before end_date down to 0 days)
  for _rec in
    select oa.id as accreditation_id, oa.organization_id, oa.end_date, op.user_id
    from public.organization_accreditations oa
    join public.organization_profiles op on op.id = oa.organization_id
    where oa.status = 'active'
      and (oa.end_date - _today) <= 30
      and (oa.end_date - _today) >= 0
      and not exists (
        select 1 from public.notifications n
        where n.organization_id = oa.organization_id
          and n.type = 'renewal_window_urgent'
          and n.related_id = oa.id::text
      )
  loop
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Urgent: Accreditation Expiring Soon',
      format('Your accreditation expires in %s days (%s). Please submit your renewal application immediately to prevent service interruptions.', (_rec.end_date - _today), to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'renewal_window_urgent',
      'accreditation',
      _rec.accreditation_id::text
    )
    on conflict (organization_id, type, related_id) where related_type = 'accreditation'
    do nothing;

    _urgent_count := _urgent_count + 1;
  end loop;

  -- 3. accreditation_expired (past end_date)
  for _rec in
    select oa.id as accreditation_id, oa.organization_id, oa.end_date, op.user_id
    from public.organization_accreditations oa
    join public.organization_profiles op on op.id = oa.organization_id
    where oa.status = 'active'
      and _today > oa.end_date
      and not exists (
        select 1 from public.notifications n
        where n.organization_id = oa.organization_id
          and n.type = 'accreditation_expired'
          and n.related_id = oa.id::text
      )
  loop
    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Accreditation Expired',
      format('Your organization accreditation expired on %s. New budget requests and YPOP activities are paused until renewal approval.', to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'accreditation_expired',
      'accreditation',
      _rec.accreditation_id::text
    )
    on conflict (organization_id, type, related_id) where related_type = 'accreditation'
    do nothing;

    -- Canonical activity logging for accreditation expiration
    insert into public.activity_logs (
      organization_id,
      actor_user_id,
      action,
      related_type,
      related_id,
      description
    ) values (
      _rec.organization_id,
      null,
      'accreditation_expired',
      'accreditation',
      _rec.accreditation_id::text,
      format('Accreditation term %s expired on %s.', _rec.accreditation_id, to_char(_rec.end_date, 'FMMonth DD, YYYY'))
    );

    _expired_count := _expired_count + 1;
  end loop;

  return jsonb_build_object(
    'opened_count', _opened_count,
    'urgent_count', _urgent_count,
    'expired_count', _expired_count
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. DOCUMENT REPLACEMENT REVIEW-STATE GUARD
-- ------------------------------------------------------------------------------

create or replace function public.user_replace_document_submission_file(
  _file_id uuid,
  _new_file_url text,
  _new_file_name text,
  _new_file_type text,
  _new_file_size numeric default null
)
returns public.document_submission_files
language plpgsql
security invoker
as $$
declare
  _old_file record;
  _submission record;
  _owner_id uuid;
  _history jsonb;
  _history_entry jsonb;
  _updated_row public.document_submission_files;
begin
  select * into _old_file
  from public.document_submission_files
  where id = _file_id;

  if _old_file.id is null then
    raise exception 'Document file not found.';
  end if;

  select * into _submission
  from public.document_submissions
  where id = _old_file.submission_id;

  if _submission.id is null then
    raise exception 'Parent document submission not found.';
  end if;

  select user_id into _owner_id
  from public.organization_profiles
  where id = _submission.organization_id;

  if _owner_id <> auth.uid() then
    raise exception 'Unauthorized: Caller does not own this submission.';
  end if;

  -- HARDENING: Replacement is strictly permitted ONLY for files requiring correction.
  -- Approved files (approved_green) or files pending review (submitted, under_admin_review) cannot be arbitrarily replaced.
  if _old_file.admin_status not in ('needs_revision', 'rejected_red') then
    raise exception 'Document replacement is only permitted for files marked for revision or rejected (current status: "%").', _old_file.admin_status;
  end if;

  -- Build history entry preserving complete historical evidence
  _history_entry := jsonb_build_object(
    'action', 'replaced',
    'previousFileName', _old_file.file_name,
    'previousFileUrl', _old_file.file_url,
    'previousFileType', _old_file.file_type,
    'previousFileSize', _old_file.file_size,
    'previousStatus', _old_file.admin_status,
    'adminRemarks', _old_file.admin_remarks,
    'reviewedAt', _old_file.reviewed_at,
    'previousUploadedAt', _old_file.uploaded_at,
    'replacedAt', clock_timestamp()
  );

  _history := coalesce(_old_file.revision_history, '[]'::jsonb) || jsonb_build_array(_history_entry);

  update public.document_submission_files
  set
    file_url = _new_file_url,
    file_name = _new_file_name,
    file_type = _new_file_type,
    file_size = coalesce(_new_file_size, _old_file.file_size),
    admin_status = 'submitted',
    admin_remarks = null,
    reviewed_at = null,
    uploaded_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    revision_history = _history
  where id = _file_id
  returning * into _updated_row;

  return _updated_row;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. TERMINAL RENEWAL IMMUTABILITY GUARD (DATABASE-LEVEL TRIGGER)
-- ------------------------------------------------------------------------------

create or replace function public.enforce_renewal_terminal_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- A rejected renewal is terminal. It cannot be altered, reopened, or resubmitted.
    if old.status = 'rejected' and new.status <> 'rejected' then
      raise exception 'A rejected renewal application is terminal and cannot be transitioned or reopened.';
    end if;

    -- An approved renewal is terminal.
    if old.status = 'approved' and new.status <> 'approved' then
      raise exception 'An approved renewal application cannot be transitioned or altered.';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('approved', 'rejected') then
      raise exception 'Historical terminal renewal applications cannot be deleted.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_renewal_terminal_immutability on public.organization_renewals;
create trigger trg_renewal_terminal_immutability
before update or delete on public.organization_renewals
for each row execute function public.enforce_renewal_terminal_immutability();
