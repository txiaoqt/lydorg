-- Run this in the Supabase SQL editor.
--
-- budget_request_files currently has no per-file review status — a budget
-- request's admin decision only lives on the parent budget_requests row.
-- This adds a per-file admin_status/admin_remarks pair, purely additive,
-- following the same session-token-validation template already used by
-- update_admin_document_submission_file_review
-- (see repair_admin_portal_snapshot_and_news.sql). This powers the new
-- Budget Request review page's "Review Summary" stat counts
-- (Approved / Request Revision / Unreviewed), the same way
-- document_submission_files.admin_status already powers the equivalent
-- counts on the Registrations review page.
--
-- Deliberately a plain text column, not a reference to the existing
-- document_submission_status enum (or a new enum type) — this keeps the
-- change fully additive and independent of that enum's exact defined
-- values, which this migration does not need to know or depend on.
-- Application code validates the value set:
--   'submitted' | 'under_admin_review' | 'approved_green' | 'needs_revision' | 'rejected_red'

alter table public.budget_request_files
  add column if not exists admin_status text not null default 'submitted',
  add column if not exists admin_remarks text not null default '';

create or replace function public.admin_update_budget_request_file_status(
  _session_token text,
  _file_id uuid,
  _admin_status text,
  _admin_remarks text default null
)
returns setof public.budget_request_files
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
  update public.budget_request_files
  set
    admin_status = coalesce(_admin_status, budget_request_files.admin_status),
    admin_remarks = coalesce(_admin_remarks, budget_request_files.admin_remarks)
  where budget_request_files.id = _file_id
  returning *;
end;
$$;
