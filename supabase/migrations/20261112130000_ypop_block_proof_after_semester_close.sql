-- Joining was already blocked once a YPOP semester closes, but proof could still be attached
-- and submitted for events joined earlier. Block both once the semester's period is closed.
create or replace function public.ypop_event_semester_is_closed(_participation_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce((
   select per.status::text = 'closed'
   from public.ypop_event_participations p
   join public.ypop_city_activities a on a.id = p.activity_id
   join public.ypop_periods per on per.semester_key = a.semester_key
   where p.id = _participation_id
   limit 1), false);
$$;
revoke all on function public.ypop_event_semester_is_closed(uuid) from public;

create or replace function public.guard_ypop_proof_after_semester_close()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_table_name = 'ypop_event_files' then
   if public.ypop_event_semester_is_closed(new.participation_id) then
     raise exception 'This YPOP semester is closed. Proof can no longer be submitted.';
   end if;
 elsif new.status::text = 'pending_verification' and old.status is distinct from new.status
   and public.ypop_event_semester_is_closed(new.id) then
   raise exception 'This YPOP semester is closed. Proof can no longer be submitted.';
 end if;
 return new;
end $$;

drop trigger if exists trg_ypop_event_file_semester_closed on public.ypop_event_files;
create trigger trg_ypop_event_file_semester_closed before insert on public.ypop_event_files
 for each row execute function public.guard_ypop_proof_after_semester_close();

drop trigger if exists trg_ypop_participation_semester_closed on public.ypop_event_participations;
create trigger trg_ypop_participation_semester_closed before update of status on public.ypop_event_participations
 for each row execute function public.guard_ypop_proof_after_semester_close();
