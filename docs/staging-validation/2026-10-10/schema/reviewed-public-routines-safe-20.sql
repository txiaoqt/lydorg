-- Isolated staging only. PII-bearing seed/test bodies are replaced with fail-closed stubs.
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_budget_request_terminal_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Legacy review stages now map to the canonical approval state.
  IF NEW.status IN ('approved_for_ftf_green', 'hard_copy_submitted') THEN
    NEW.status := 'awaiting_release';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'budget_released'
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.approved_amount IS DISTINCT FROM OLD.approved_amount
       OR NEW.released_amount IS DISTINCT FROM OLD.released_amount
       OR NEW.release_date IS DISTINCT FROM OLD.release_date
     ) THEN
    RAISE EXCEPTION 'Budget Released is the terminal Budget Request state. Release data is immutable; continue financial execution in the liquidation workflow.';
  END IF;

  IF NEW.status = 'completed' THEN
    -- Older seed code still emits `completed`; normalize only fully released
    -- records from the explicitly marked PCYDO sample batch.
    IF coalesce(NEW.is_seeded_sample_data, false)
       AND NEW.seed_batch = 'PCYDO-YORP-2024-2026'
       AND coalesce(NEW.released_amount, 0) > 0
       AND NEW.release_date IS NOT NULL THEN
      NEW.status := 'budget_released';
      RETURN NEW;
    END IF;

    -- Allow unrelated edits to a historical row until it is repaired, but do
    -- not permit inserts or transitions into the legacy terminal value.
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Completed is not a Budget Request status. Use budget_released; liquidation has its own lifecycle.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_budget_request_ypop_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Allow trusted SQL migrations and seed maintenance. Authenticated user
  -- mutations always have auth.uid() and must satisfy the qualification rule.
  if auth.uid() is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.ypop_periods yp
    join public.ypop_entries ye
      on ye.semester = yp.semester_key
     and ye.organization_id = new.organization_id
    where yp.status = 'open'
      and yp.id = (
        select current_period.id
        from public.ypop_periods current_period
        where current_period.status = 'open'
        order by current_period.created_at desc
        limit 1
      )
      and ye.status = 'qualified'
  ) then
    raise exception 'A qualified YPOP validation in the active period is required before creating a budget request.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_inquiry_authoritative_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  _org_email text;
  _auth_email text;
BEGIN
  -- 1. Derive authoritative email from organization_profiles if organization_id is set
  IF NEW.organization_id IS NOT NULL THEN
    SELECT op.organization_email INTO _org_email
    FROM public.organization_profiles op
    WHERE op.id = NEW.organization_id;
  END IF;

  -- 2. Derive authoritative email from auth.users if submitted_by is set
  IF NEW.submitted_by IS NOT NULL THEN
    SELECT u.email INTO _auth_email
    FROM auth.users u
    WHERE u.id = NEW.submitted_by;
  END IF;

  -- 3. Overwrite NEW.email with the authoritative account email
  IF _org_email IS NOT NULL AND TRIM(_org_email) <> '' THEN
    NEW.email := TRIM(_org_email);
  ELSIF _auth_email IS NOT NULL AND TRIM(_auth_email) <> '' THEN
    NEW.email := TRIM(_auth_email);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_organization_profile_headquarters_location()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  _barangay text;
  _district text;
BEGIN
  _barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
  IF _barangay IS NULL THEN
    RAISE EXCEPTION 'A valid Pasig Barangay is required for the headquarters address.';
  END IF;

  _district := public.resolve_pasig_district_from_barangay(_barangay);
  IF _district IS NULL THEN
    RAISE EXCEPTION 'Barangay "%" is not a recognized Pasig City Barangay.', _barangay;
  END IF;

  -- RLS remains responsible for restricting profile writes to the owner or an
  -- authorized administrator. This trigger only validates and synchronizes
  -- the location fields; it no longer blocks an owner's location correction.
  NEW.address_barangay := coalesce(nullif(trim(NEW.address_barangay), ''), nullif(trim(NEW.barangay), ''));
  NEW.barangay := NEW.address_barangay;
  NEW.district := _district;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_renewal_terminal_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF tg_op = 'UPDATE' THEN
    IF old.status IN ('approved', 'rejected') THEN
      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
        IF EXISTS (
          SELECT 1 FROM public.organization_profiles op
          WHERE op.id = old.organization_id
            AND (op.is_renewal_test_account = true)
        ) THEN
          RETURN new;
        END IF;
      END IF;
      RAISE EXCEPTION 'Terminal renewal records cannot be modified.';
    END IF;
    RETURN new;
  END IF;

  IF tg_op = 'DELETE' THEN
    IF current_setting('app.allow_org_deletion', true) = 'true' THEN
      RETURN old;
    END IF;
    IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN
      IF EXISTS (
        SELECT 1 FROM public.organization_profiles op
        WHERE op.id = old.organization_id
          AND (op.is_renewal_test_account = true)
      ) THEN
        RETURN old;
      END IF;
    END IF;
    IF old.status IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Terminal renewal records cannot be deleted.';
    END IF;
    RETURN old;
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_admin_demo_session(_session_token text, _username text DEFAULT 'lydoadmin'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  _admin_id uuid;
  _token_hash text;
  _expires_at timestamptz := now() + interval '7 days';
begin
  if _session_token is null or length(trim(_session_token)) = 0 then
    raise exception 'Session token is required.';
  end if;

  select id into _admin_id
  from public.admin_accounts
  where lower(username) = lower(coalesce(_username, 'lydoadmin'))
    and is_active = true
  limit 1;

  if _admin_id is null then
    select id into _admin_id
    from public.admin_accounts
    where is_active = true
    order by created_at asc
    limit 1;
  end if;

  if _admin_id is null then
    raise exception 'No active admin account found to bind demo session.';
  end if;

  _token_hash := encode(digest(_session_token, 'sha256'), 'hex');

  insert into public.admin_sessions (
    admin_id,
    token_hash,
    expires_at,
    created_at,
    last_used_at
  ) values (
    _admin_id,
    _token_hash,
    _expires_at,
    now(),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'admin_id', _admin_id,
    'expires_at', _expires_at
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_liquidation_report_for_budget()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('budget_released', 'completed') THEN
    INSERT INTO public.liquidation_reports (
      budget_request_id,
      organization_id,
      submitted_by,
      status,
      go_signal_at,
      deadline_at,
      created_at,
      updated_at,
      is_seeded_sample_data,
      seed_batch
    )
    VALUES (
      NEW.id,
      NEW.organization_id,
      NEW.submitted_by,
      'pending_activity_completion',
      coalesce(NEW.go_signal_at, now()),
      coalesce(NEW.go_signal_at, now()) + interval '1 month',
      now(),
      now(),
      coalesce(NEW.is_seeded_sample_data, false),
      NEW.seed_batch
    )
    ON CONFLICT (budget_request_id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          submitted_by = EXCLUDED.submitted_by,
          go_signal_at = coalesce(EXCLUDED.go_signal_at, public.liquidation_reports.go_signal_at),
          deadline_at = coalesce(EXCLUDED.deadline_at, public.liquidation_reports.deadline_at),
          is_seeded_sample_data = EXCLUDED.is_seeded_sample_data,
          seed_batch = EXCLUDED.seed_batch,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.evaluate_accreditation_notification_events()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

RESET check_function_bodies;

