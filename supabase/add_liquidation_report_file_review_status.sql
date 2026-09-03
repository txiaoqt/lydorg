-- Run this in the Supabase SQL editor.
--
-- liquidation_report_files currently has no per-file review status — a
-- liquidation report's admin decision only lives on the parent
-- liquidation_reports row. This adds a per-file admin_status/admin_remarks
-- pair, purely additive, following the exact same template already used
-- for budget_request_files (see add_budget_request_file_review_status.sql).
-- This powers the new Liquidation Report review page's "Review Summary"
-- stat counts (Approved / Request Revision / Unreviewed) and its
-- Document Queue / Review Decision panel, the same way
-- budget_request_files.admin_status already powers the equivalent counts
-- on the Budget Request review page.
--
-- Deliberately a plain text column, not a reference to the existing
-- liquidation_status enum (or a new enum type) — this keeps the change
-- fully additive and independent of that enum's exact defined values.
-- Application code validates the value set:
--   'submitted' | 'under_admin_review' | 'approved_green' | 'needs_revision' | 'rejected_red'

alter table public.liquidation_report_files
  add column if not exists admin_status text not null default 'submitted',
  add column if not exists admin_remarks text not null default '';

create or replace function public. (
  _session_token text,
  _file_id uuid,
  _admin_status text,
  _admin_remarks text default null
)
returns setof public.liquidation_report_files
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
  update public.liquidation_report_files
  set
    admin_status = coalesce(_admin_status, liquidation_report_files.admin_status),
    admin_remarks = coalesce(_admin_remarks, liquidation_report_files.admin_remarks)
  where liquidation_report_files.id = _file_id
  returning *;
end;
$$;
