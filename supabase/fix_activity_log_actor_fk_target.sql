-- Run this in the Supabase SQL editor.
--
-- activity_logs.actor_user_id was FK'd to auth.users(id), but admins live in
-- public.admin_accounts — a completely separate table/UUID space (this
-- app's admin auth is hand-rolled, not Supabase Auth). create_admin_activity_log
-- is the only place that ever writes to this table, and it always writes an
-- admin_accounts.id, so the FK was pointing at the wrong table from the start.
-- This is the exact same bug already fixed once on news_releases.created_by
-- (see that table's fix) — same root cause, same fix shape.

-- Adding the new constraint validates every existing row. Some old rows
-- have an actor_user_id that doesn't exist in admin_accounts either (likely
-- stale ids from before the current schema) — clear those first so they
-- read as "System" instead of blocking the constraint. This only touches
-- already-broken references; it does not delete any log rows.
update public.activity_logs
set actor_user_id = null
where actor_user_id is not null
  and actor_user_id not in (select id from public.admin_accounts);

alter table public.activity_logs
  drop constraint activity_logs_actor_user_id_fkey;

alter table public.activity_logs
  add constraint activity_logs_actor_user_id_fkey
  foreign key (actor_user_id) references public.admin_accounts (id) on delete set null;
