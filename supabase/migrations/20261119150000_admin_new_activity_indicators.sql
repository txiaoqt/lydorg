-- Show admins which organizations have new activity since they last looked.
-- "New" = the organization submitted something after both this admin's last
-- view of that organization and the latest admin review in that workflow.

create table if not exists public.admin_record_views (
  admin_id uuid not null references public.admin_accounts(id) on delete cascade,
  organization_id uuid not null references public.organization_profiles(id) on delete cascade,
  scope text not null check (scope in ('registration', 'renewal', 'ypop')),
  scope_key text not null default '',
  viewed_at timestamptz not null default now(),
  primary key (admin_id, organization_id, scope, scope_key)
);
alter table public.admin_record_views enable row level security;
revoke all on public.admin_record_views from anon, authenticated;

-- shortcut: computed per row on every list load; fine for hundreds of orgs, add stored timestamps if lists reach thousands.
create or replace function public.admin_org_activity(_admin_id uuid, _organization_id uuid, _scope text, _scope_key text default '')
returns table (last_activity_at timestamptz, has_new boolean)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with activity as (
    select
      case _scope
        when 'registration' then (
          select max(f.uploaded_at) from public.document_submission_files f
          join public.document_submissions s on s.id = f.submission_id
          where s.organization_id = _organization_id
            and coalesce(s.submission_scope::text, 'registration') = 'registration'
            and f.admin_status::text <> 'draft')
        when 'renewal' then greatest(
          (select max(f.uploaded_at) from public.document_submission_files f
           join public.document_submissions s on s.id = f.submission_id
           where s.organization_id = _organization_id and s.submission_scope::text = 'renewal'
             and f.admin_status::text <> 'draft'),
          (select max(r.submitted_at) from public.organization_renewals r where r.organization_id = _organization_id))
        when 'ypop' then greatest(
          (select max(e.submitted_at) from public.ypop_entries e
           where e.organization_id = _organization_id and e.semester = _scope_key),
          (select max(ep.proof_submitted_at) from public.ypop_event_participations ep
           join public.ypop_city_activities a on a.id = ep.activity_id and a.semester_key = _scope_key
           where ep.organization_id = _organization_id and ep.status::text <> 'draft'),
          (select max(coalesce(oa.submitted_at, oa.created_at)) from public.ypop_org_activities oa
           join public.ypop_entries e on e.id = oa.ypop_entry_id and e.semester = _scope_key
           where oa.organization_id = _organization_id and oa.status::text <> 'draft'))
      end as last_activity_at,
      case _scope
        when 'registration' then (
          select max(greatest(f.reviewed_at, f.revision_requested_at)) from public.document_submission_files f
          join public.document_submissions s on s.id = f.submission_id
          where s.organization_id = _organization_id
            and coalesce(s.submission_scope::text, 'registration') = 'registration')
        when 'renewal' then greatest(
          (select max(greatest(f.reviewed_at, f.revision_requested_at)) from public.document_submission_files f
           join public.document_submissions s on s.id = f.submission_id
           where s.organization_id = _organization_id and s.submission_scope::text = 'renewal'),
          (select max(greatest(r.reviewed_at, r.revision_requested_at)) from public.organization_renewals r
           where r.organization_id = _organization_id))
        when 'ypop' then greatest(
          (select max(greatest(e.validated_at, e.revision_requested_at)) from public.ypop_entries e
           where e.organization_id = _organization_id and e.semester = _scope_key),
          (select max(greatest(ep.verified_at, ep.revision_requested_at)) from public.ypop_event_participations ep
           join public.ypop_city_activities a on a.id = ep.activity_id and a.semester_key = _scope_key
           where ep.organization_id = _organization_id),
          (select max(greatest(oa.approved_at, oa.revision_requested_at)) from public.ypop_org_activities oa
           join public.ypop_entries e on e.id = oa.ypop_entry_id and e.semester = _scope_key
           where oa.organization_id = _organization_id))
      end as last_review_at,
      (select v.viewed_at from public.admin_record_views v
       where v.admin_id = _admin_id and v.organization_id = _organization_id
         and v.scope = _scope and v.scope_key = coalesce(_scope_key, '')) as viewed_at
  )
  select last_activity_at,
    coalesce(last_activity_at > coalesce(greatest(last_review_at, viewed_at), '-infinity'::timestamptz), false)
  from activity;
$$;
revoke all on function public.admin_org_activity(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.admin_mark_org_viewed(_session_token text, _organization_id uuid, _scope text, _scope_key text default '')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  _admin_id uuid;
begin
  select vat.admin_id into _admin_id from public.validate_admin_session_token(_session_token) vat limit 1;
  if _admin_id is null then raise exception 'Admin session is invalid or expired.'; end if;
  if _scope not in ('registration', 'renewal', 'ypop') then raise exception 'Unsupported view scope.'; end if;
  insert into public.admin_record_views (admin_id, organization_id, scope, scope_key, viewed_at)
  values (_admin_id, _organization_id, _scope, coalesce(_scope_key, ''), now())
  on conflict (admin_id, organization_id, scope, scope_key) do update set viewed_at = excluded.viewed_at;
end;
$$;
revoke all on function public.admin_mark_org_viewed(text, uuid, text, text) from public;
grant execute on function public.admin_mark_org_viewed(text, uuid, text, text) to anon, authenticated;

-- Lists: rows with new activity first, then most recent organization activity.
do $migration$
declare
  _def text;
  _edits text[][];
  _i integer;
begin
  -- Registrations
  select pg_get_functiondef('public.admin_get_portal_list_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer)'::regprocedure) into _def;
  _def := replace(_def, chr(13) || chr(10), chr(10)); -- stored bodies mix line endings
  _edits := array[
    array[$o$    ), page_rows AS (
      SELECT op.*
      FROM filtered_profiles op
      ORDER BY
        CASE WHEN _sort = 'oldest' THEN op.created_at END ASC,$o$,
          $n$    ), page_rows AS (
      SELECT op.*, act.has_new, act.last_activity_at
      FROM filtered_profiles op
      CROSS JOIN LATERAL public.admin_org_activity(_admin_id, op.id, 'registration') act
      ORDER BY
        act.has_new DESC,
        act.last_activity_at DESC NULLS LAST,
        CASE WHEN _sort = 'oldest' THEN op.created_at END ASC,$n$],
    array[$o$          'submitted_document_count', document_counts.submitted_document_count
        ) ORDER BY
          CASE WHEN _sort = 'oldest' THEN page_rows.created_at END ASC,$o$,
          $n$          'submitted_document_count', document_counts.submitted_document_count,
          'has_new', page_rows.has_new,
          'last_activity_at', page_rows.last_activity_at
        ) ORDER BY
          page_rows.has_new DESC,
          page_rows.last_activity_at DESC NULLS LAST,
          CASE WHEN _sort = 'oldest' THEN page_rows.created_at END ASC,$n$]
  ];
  for _i in 1 .. array_length(_edits, 1) loop
    if strpos(_def, _edits[_i][1]) = 0 then raise exception 'Registrations list changed (edit %); migration aborted.', _i; end if;
    _def := replace(_def, _edits[_i][1], _edits[_i][2]);
  end loop;
  execute _def;

  -- Renewals
  select pg_get_functiondef('public.admin_get_renewal_queue_page(text,integer,integer,text,text,text,text,text,uuid[])'::regprocedure) into _def;
  _def := replace(_def, chr(13) || chr(10), chr(10)); -- stored bodies mix line endings
  _edits := array[
    array[$o$  page_rows AS (
    SELECT * FROM queue
    ORDER BY submitted_at DESC NULLS LAST,created_at DESC,id$o$,
          $n$  page_rows AS (
    SELECT q.*, act.has_new, act.last_activity_at FROM queue q
    CROSS JOIN LATERAL public.admin_org_activity(_admin_id, q.organization_id, 'renewal') act
    ORDER BY act.has_new DESC, act.last_activity_at DESC NULLS LAST, q.submitted_at DESC NULLS LAST, q.created_at DESC, q.id$n$],
    array[$o$      'submitted_document_count',p.submitted_count,'linked_document_submission_id',p.submission_id
    ) ORDER BY p.submitted_at DESC NULLS LAST,p.created_at DESC,p.id)$o$,
          $n$      'submitted_document_count',p.submitted_count,'linked_document_submission_id',p.submission_id,
      'has_new',p.has_new,'last_activity_at',p.last_activity_at
    ) ORDER BY p.has_new DESC, p.last_activity_at DESC NULLS LAST, p.submitted_at DESC NULLS LAST,p.created_at DESC,p.id)$n$]
  ];
  for _i in 1 .. array_length(_edits, 1) loop
    if strpos(_def, _edits[_i][1]) = 0 then raise exception 'Renewal queue changed (edit %); migration aborted.', _i; end if;
    _def := replace(_def, _edits[_i][1], _edits[_i][2]);
  end loop;
  execute _def;

  -- YPOP submissions: also a "has_new" filter, so Qualified orgs that keep logging activity are findable.
  select pg_get_functiondef('public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text)'::regprocedure) into _def;
  _def := replace(_def, chr(13) || chr(10), chr(10)); -- stored bodies mix line endings
  _edits := array[
    array[$o$    FROM candidate c
  ), filtered AS ($o$,
          $n$      , act.has_new, act.last_activity_at
    FROM candidate c
    CROSS JOIN LATERAL public.admin_org_activity(_admin_id, c.organization_id, 'ypop', _semester) act
  ), filtered AS ($n$],
    array[$o$      AND (_qualification_status IS NULL OR _qualification_status='all' OR qualification_status=_qualification_status)$o$,
          $n$      AND (_qualification_status IS NULL OR _qualification_status='all' OR qualification_status=_qualification_status
        OR (_qualification_status='has_new' AND has_new))$n$],
    array[$o$  page_rows AS (SELECT * FROM filtered ORDER BY created_at DESC NULLS LAST,organization_name,organization_id LIMIT$o$,
          $n$  page_rows AS (SELECT * FROM filtered ORDER BY has_new DESC,last_activity_at DESC NULLS LAST,created_at DESC NULLS LAST,organization_name,organization_id LIMIT$n$],
    array[$o$      'major_classification',COALESCE(p.major_classification,''),'qualification_status',p.qualification_status
    ) ORDER BY p.created_at DESC NULLS LAST,p.organization_name,p.organization_id)$o$,
          $n$      'major_classification',COALESCE(p.major_classification,''),'qualification_status',p.qualification_status,
      'has_new',p.has_new,'last_activity_at',p.last_activity_at
    ) ORDER BY p.has_new DESC,p.last_activity_at DESC NULLS LAST,p.created_at DESC NULLS LAST,p.organization_name,p.organization_id)$n$],
    array[$o$      'not_qualified',(SELECT count(*) FROM scored WHERE qualification_status='not_qualified')$o$,
          $n$      'not_qualified',(SELECT count(*) FROM scored WHERE qualification_status='not_qualified'),
      'has_new',(SELECT count(*) FROM scored WHERE has_new)$n$]
  ];
  for _i in 1 .. array_length(_edits, 1) loop
    if strpos(_def, _edits[_i][1]) = 0 then raise exception 'YPOP submissions list changed (edit %); migration aborted.', _i; end if;
    _def := replace(_def, _edits[_i][1], _edits[_i][2]);
  end loop;
  execute _def;
end;
$migration$;
