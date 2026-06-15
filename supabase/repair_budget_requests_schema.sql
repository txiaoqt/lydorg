-- Run this in the Supabase SQL editor for existing projects
-- that still use the older single-remarks-only budget request schema.

alter table if exists public.budget_requests
  add column if not exists admin_remarks text not null default '',
  add column if not exists user_note text not null default '',
  add column if not exists revision_history jsonb not null default '[]';

update public.budget_requests
set
  admin_remarks = coalesce(admin_remarks, ''),
  user_note = coalesce(user_note, ''),
  revision_history = coalesce(revision_history, '[]'::jsonb)
where
  admin_remarks is null
  or user_note is null
  or revision_history is null;

alter table if exists public.budget_requests
  alter column admin_remarks set default '',
  alter column user_note set default '',
  alter column revision_history set default '[]'::jsonb;

alter table if exists public.budget_requests
  alter column admin_remarks set not null,
  alter column user_note set not null,
  alter column revision_history set not null;
