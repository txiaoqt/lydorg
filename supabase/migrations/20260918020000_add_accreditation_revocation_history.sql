-- Migration: 20260918020000_add_accreditation_revocation_history.sql
-- Purpose:
-- 1. Adds authoritative historical revocation tracking (revoked_at, revocation_reason)
--    to public.organization_accreditations.
-- 2. Enforces strict ledger immutability on revoked_at and revocation_reason.
-- 3. Provides an authoritative administrative revocation RPC (revoke_organization_accreditation)
--    that atomically updates the accreditation ledger, synchronizes the organization profile
--    projection to 'suspended_inactive', and writes an immutable activity audit log.

-- 1. Add revocation columns
alter table public.organization_accreditations
  add column if not exists revoked_at timestamptz default null,
  add column if not exists revocation_reason text default null;

comment on column public.organization_accreditations.revoked_at is
  'Authoritative timestamp when this accreditation term was formally revoked. NULL if active or superseded without revocation. Immutable once assigned.';

comment on column public.organization_accreditations.revocation_reason is
  'Formal administrative justification for the accreditation revocation. Immutable once assigned.';

-- 2. Add consistency constraint (non-revoked terms must have null revoked_at)
alter table public.organization_accreditations
  drop constraint if exists chk_accreditation_revocation_consistency;

alter table public.organization_accreditations
  add constraint chk_accreditation_revocation_consistency
  check (
    (status <> 'revoked' and revoked_at is null)
    or (status = 'revoked')
  );

-- 3. Update immutability trigger to protect revocation history
create or replace function public.enforce_accreditation_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- Core historical term attributes must never be altered
    if old.term_number is distinct from new.term_number
       or old.start_date is distinct from new.start_date
       or old.end_date is distinct from new.end_date
       or old.certificate_urn is distinct from new.certificate_urn
       or old.approved_by is distinct from new.approved_by
       or old.approved_at is distinct from new.approved_at
       or old.created_at is distinct from new.created_at
       or old.is_legacy_inferred is distinct from new.is_legacy_inferred then
      raise exception 'Historical accreditation term fields are immutable.';
    end if;

    -- Revocation immutability rules:
    -- A. If previously revoked, revoked_at and revocation_reason cannot be altered
    if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
      raise exception 'Accreditation revocation timestamp is immutable once set.';
    end if;

    if old.revocation_reason is not null and new.revocation_reason is distinct from old.revocation_reason then
      raise exception 'Accreditation revocation reason is immutable once set.';
    end if;

    -- B. Non-revoked terms must never have a revoked_at timestamp
    if new.status <> 'revoked' and new.revoked_at is not null then
      raise exception 'Non-revoked accreditation terms cannot have a revocation timestamp.';
    end if;

    -- Valid status transitions only:
    -- active -> superseded (when subsequent renewal is approved)
    -- active -> revoked (by formal administrative action)
    if old.status = 'superseded' and new.status <> 'superseded' then
      raise exception 'A superseded accreditation term cannot be reactivated or altered.';
    end if;

    if old.status = 'revoked' and new.status <> 'revoked' then
      raise exception 'A revoked accreditation term cannot be reactivated.';
    end if;

    -- When transitioning to revoked, ensure revoked_at is populated
    if old.status <> 'revoked' and new.status = 'revoked' then
      if new.revoked_at is null then
        new.revoked_at := clock_timestamp();
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Accreditation terms in the authoritative ledger cannot be deleted.';
  end if;

  return new;
end;
$$;

-- Ensure trigger is active
drop trigger if exists trg_accreditation_immutability on public.organization_accreditations;
create trigger trg_accreditation_immutability
before update or delete on public.organization_accreditations
for each row execute function public.enforce_accreditation_immutability();

-- 4. Authoritative Administrative Revocation RPC
create or replace function public.revoke_organization_accreditation(
  _session_token text,
  _accreditation_id uuid,
  _revocation_reason text default null,
  _revoked_at timestamptz default null
)
returns public.organization_accreditations
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_id uuid;
  _acc public.organization_accreditations%rowtype;
  _effective_revoked_at timestamptz;
  _trimmed_reason text;
begin
  -- Authorize admin session
  select vat.admin_id into _admin_id
  from public.validate_admin_session_token(_session_token) vat
  limit 1;

  if _admin_id is null then
    raise exception 'Admin account is not authorized.';
  end if;

  select * into _acc
  from public.organization_accreditations
  where id = _accreditation_id
  for update;

  if not found then
    raise exception 'Accreditation record not found.';
  end if;

  if _acc.status = 'revoked' then
    raise exception 'Accreditation is already revoked.';
  end if;

  if _acc.status = 'superseded' then
    raise exception 'Cannot revoke a superseded historical accreditation term.';
  end if;

  _effective_revoked_at := coalesce(_revoked_at, clock_timestamp());
  _trimmed_reason := nullif(trim(_revocation_reason), '');

  -- Atomically update accreditation ledger
  update public.organization_accreditations
  set
    status = 'revoked',
    revoked_at = _effective_revoked_at,
    revocation_reason = _trimmed_reason
  where id = _accreditation_id
  returning * into _acc;

  -- Synchronize organization profile projection to suspended_inactive
  update public.organization_profiles
  set
    profile_status = 'suspended_inactive'::public.profile_status,
    updated_at = now()
  where id = _acc.organization_id;

  -- Write audit log
  insert into public.activity_logs (
    actor_user_id,
    organization_id,
    action,
    related_type,
    related_id,
    description
  ) values (
    _admin_id,
    _acc.organization_id,
    'Revoked Accreditation',
    'organization_accreditation',
    _accreditation_id,
    format('Revoked accreditation term %s. Reason: %s', _acc.term_number, coalesce(_trimmed_reason, 'No reason specified'))
  );

  return _acc;
end;
$$;

grant execute on function public.revoke_organization_accreditation(text, uuid, text, timestamptz) to anon, authenticated;
