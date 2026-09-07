-- ==============================================================================
-- Migration: 20260907190000_phase2_3_expiration_event_idempotency.sql
-- Description: Phase 2.3 Final Expiration Event Idempotency & Observability Hardening
--
-- TARGETED OBJECTIVES:
-- 1. Database-level idempotency for accreditation_expired activity log events
--    via partial unique index on public.activity_logs (organization_id, action, related_id)
--    WHERE action = 'accreditation_expired' AND related_type = 'accreditation'.
-- 2. Accurate counter observability in evaluate_accreditation_notification_events():
--    Counters (_opened_count, _urgent_count, _expired_count) increment ONLY when a new
--    notification row is physically inserted, strictly ignoring skipped conflict rows.
-- 3. Concurrency-safe execution: simultaneous evaluator invocations produce zero
--    duplicate notifications, zero duplicate activity logs, and exact insert counts.
-- 4. Preserves multi-term distinction: each accreditation term cycle (related_id) can
--    generate its own expiration notification and audit log without colliding.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DATABASE-LEVEL ACTIVITY LOG IDEMPOTENCY (PARTIAL UNIQUE INDEX)
-- ------------------------------------------------------------------------------
drop index if exists public.uq_activity_logs_accreditation_expired;

create unique index if not exists uq_activity_logs_accreditation_expired
  on public.activity_logs (organization_id, action, related_id)
  where action = 'accreditation_expired' and related_type = 'accreditation';

comment on index public.uq_activity_logs_accreditation_expired is
  'Enforces database-level uniqueness for accreditation expiration audit events across distinct accreditation terms (Phase 2.3).';

-- ------------------------------------------------------------------------------
-- 2. CONFIRM NOTIFICATION PARTIAL UNIQUE INDEX
-- ------------------------------------------------------------------------------
create unique index if not exists uq_notifications_time_driven_term
  on public.notifications (organization_id, type, related_id)
  where related_type = 'accreditation';

-- ------------------------------------------------------------------------------
-- 3. HARDENED evaluate_accreditation_notification_events()
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
  _inserted_id uuid;
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
          and n.related_id = oa.id
      )
  loop
    _inserted_id := null;

    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Renewal Window Open',
      format('Your accreditation expires in %s days (%s). You may now prepare and submit your renewal application.', (_rec.end_date - _today), to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'renewal_window_opened',
      'accreditation',
      _rec.accreditation_id
    )
    on conflict (organization_id, type, related_id) where related_type = 'accreditation'
    do nothing
    returning id into _inserted_id;

    if _inserted_id is not null then
      _opened_count := _opened_count + 1;
    end if;
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
          and n.related_id = oa.id
      )
  loop
    _inserted_id := null;

    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Urgent: Accreditation Expiring Soon',
      format('Your accreditation expires in %s days (%s). Please submit your renewal application immediately to prevent service interruptions.', (_rec.end_date - _today), to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'renewal_window_urgent',
      'accreditation',
      _rec.accreditation_id
    )
    on conflict (organization_id, type, related_id) where related_type = 'accreditation'
    do nothing
    returning id into _inserted_id;

    if _inserted_id is not null then
      _urgent_count := _urgent_count + 1;
    end if;
  end loop;

  -- 3. accreditation_expired (past end_date)
  for _rec in
    select oa.id as accreditation_id, oa.organization_id, oa.end_date, op.user_id
    from public.organization_accreditations oa
    join public.organization_profiles op on op.id = oa.organization_id
    where oa.status = 'active'
      and _today > oa.end_date
      and (
        not exists (
          select 1 from public.notifications n
          where n.organization_id = oa.organization_id
            and n.type = 'accreditation_expired'
            and n.related_id = oa.id
        )
        or not exists (
          select 1 from public.activity_logs al
          where al.organization_id = oa.organization_id
            and al.action = 'accreditation_expired'
            and al.related_type = 'accreditation'
            and al.related_id = oa.id
        )
      )
  loop
    _inserted_id := null;

    insert into public.notifications (user_id, organization_id, title, message, type, related_type, related_id)
    values (
      _rec.user_id,
      _rec.organization_id,
      'Accreditation Expired',
      format('Your organization accreditation expired on %s. New budget requests and YPOP activities are paused until renewal approval.', to_char(_rec.end_date, 'FMMonth DD, YYYY')),
      'accreditation_expired',
      'accreditation',
      _rec.accreditation_id
    )
    on conflict (organization_id, type, related_id) where related_type = 'accreditation'
    do nothing
    returning id into _inserted_id;

    if _inserted_id is not null then
      _expired_count := _expired_count + 1;
    end if;

    -- Canonical activity logging for accreditation expiration (database-level unique index enforced)
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
      _rec.accreditation_id,
      format('Accreditation term %s expired on %s.', _rec.accreditation_id, to_char(_rec.end_date, 'FMMonth DD, YYYY'))
    )
    on conflict (organization_id, action, related_id)
      where action = 'accreditation_expired' and related_type = 'accreditation'
    do nothing;
  end loop;

  return jsonb_build_object(
    'opened_count', _opened_count,
    'urgent_count', _urgent_count,
    'expired_count', _expired_count
  );
end;
$$;
