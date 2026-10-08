-- LOCAL REVIEW ONLY. Do not apply without separate approval.
-- No identities/financial rows are merged, reassigned, or backfilled.
begin;
create schema if not exists ytrace_identity;
create extension if not exists pg_trgm with schema extensions;
revoke all on schema ytrace_identity from public, anon, authenticated;

create or replace function public.normalize_organization_identity_name(_value text)
returns text language sql immutable strict set search_path = pg_catalog as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(lower(normalize(_value, NFKC)), '[^[:alnum:]]+', ' ', 'g'),
    '\morg\M', 'organization', 'g'), '\massoc\M', 'association', 'g'),
    '\minc\M', 'incorporated', 'g'), '\s+', ' ', 'g'));
$$;
create or replace function public.organization_identity_name_anchor(_value text)
returns text language sql immutable strict set search_path = pg_catalog, public as $$
  select split_part(public.normalize_organization_identity_name(_value),' ',1) || ' ' ||
    split_part(public.normalize_organization_identity_name(_value),' ',2);
$$;
alter table public.organization_profiles
  add column identity_name_key text generated always as (public.normalize_organization_identity_name(organization_name)) stored,
  add column identity_name_anchor text generated always as (public.organization_identity_name_anchor(organization_name)) stored;
create index organization_identity_name_trgm_idx on public.organization_profiles using gin(identity_name_key extensions.gin_trgm_ops);
create index organization_identity_name_idx on public.organization_profiles(identity_name_key);
create index organization_identity_anchor_location_idx on public.organization_profiles(identity_name_anchor, barangay);

create table ytrace_identity.cases (
  organization_id uuid primary key,
  fingerprint text not null,
  candidates_digest text not null default '',
  outcome text not null check(outcome in ('NO_MATCH','POSSIBLE_MATCH','VERIFIED_SEPARATE','CONFIRMED_EXISTING','MORE_INFORMATION','REJECTED')),
  canonical_organization_id uuid references public.organization_profiles(id) on delete restrict,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create table ytrace_identity.decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  candidate_id uuid,
  subject_fingerprint text not null,
  candidate_fingerprint text,
  decision text not null check(decision in ('confirmed_different','confirmed_existing','more_information','rejected')),
  admin_id uuid not null references public.admin_accounts(id) on delete restrict,
  reason text not null check(length(trim(reason)) between 10 and 3000),
  evidence_reference text not null check(length(trim(evidence_reference)) between 5 and 1000),
  created_at timestamptz not null default now()
);
create index organization_identity_canonical_idx on ytrace_identity.cases(canonical_organization_id) where canonical_organization_id is not null;
create index organization_identity_decision_subject_idx on ytrace_identity.decisions(organization_id, created_at desc);
create index organization_identity_decision_pair_idx on ytrace_identity.decisions(organization_id,candidate_id,subject_fingerprint,candidate_fingerprint);
create table ytrace_identity.check_rate (
  actor text not null, minute timestamptz not null, requests integer not null,
  primary key(actor,minute)
);
create index organization_identity_rate_cleanup_idx on ytrace_identity.check_rate(minute);
alter table ytrace_identity.cases enable row level security;
alter table ytrace_identity.decisions enable row level security;
alter table ytrace_identity.check_rate enable row level security;
revoke all on all tables in schema ytrace_identity from public, anon, authenticated;

create function ytrace_identity.fingerprint(_p public.organization_profiles)
returns text language sql stable set search_path = pg_catalog, public as $$
 select encode(sha256(convert_to(jsonb_build_array(
   coalesce(public.normalize_organization_identity_name(_p.organization_name),''),
   coalesce(_p.barangay,''),coalesce(_p.district,''),coalesce(_p.registration_type::text,''),
   case when _p.registration_type::text='existing_urn' then coalesce(public.normalize_urn(_p.urn),'') else '' end
 )::text,'UTF8')),'hex');
$$;
create function ytrace_identity.candidate_fingerprint(_p public.organization_profiles)
returns text language sql stable set search_path=pg_catalog,public,ytrace_identity as $$
 select encode(sha256(convert_to(jsonb_build_array(ytrace_identity.fingerprint(_p),coalesce(_p.urn_normalized,''),
   coalesce(_p.profile_status::text,''),extract(epoch from _p.verified_at))::text,'UTF8')),'hex');
$$;

-- Bounded indexed candidates. Never interpret name/representative/contact matches as proof.
create function ytrace_identity.candidates(_name text, _barangay text, _urn text, _exclude uuid)
returns setof public.organization_profiles language sql stable security definer
set search_path = pg_catalog, public, ytrace_identity
set pg_trgm.similarity_threshold = '0.82' as $$
 select p.* from public.organization_profiles p
 where p.id is distinct from _exclude
 and not exists(select 1 from ytrace_identity.cases c where c.organization_id=p.id
   and c.outcome='CONFIRMED_EXISTING' and c.canonical_organization_id=_exclude)
 and (
   (length(public.normalize_organization_identity_name(_name)) >= 3 and p.identity_name_key=public.normalize_organization_identity_name(_name))
   or (nullif(_barangay,'') is not null and p.barangay=_barangay
       and p.identity_name_anchor=public.organization_identity_name_anchor(_name)
       and position(' ' in trim(public.normalize_organization_identity_name(_name)))>0)
   or (nullif(_barangay,'') is not null and p.barangay=_barangay
       and p.identity_name_key operator(extensions.%) public.normalize_organization_identity_name(_name))
   or (nullif(_urn,'') is not null and (p.urn_normalized=public.normalize_urn(_urn)
       or upper(trim(p.organization_identifier_number))=public.normalize_urn(_urn)))
 ) order by (nullif(_urn,'') is not null and p.urn_normalized=public.normalize_urn(_urn)) desc,
   (p.profile_status::text='verified') desc,p.created_at,p.id limit 21;
$$;

create function ytrace_identity.assess(_p public.organization_profiles)
returns text language plpgsql security definer set search_path = pg_catalog, public, ytrace_identity as $$
declare _fingerprint text := ytrace_identity.fingerprint(_p); _outcome text; _case ytrace_identity.cases; _candidate public.organization_profiles; _pending boolean:=false; _separate boolean:=false; _seen integer:=0; _digest text; _lock_key bigint;
begin
 -- Serialize colliding names through the entire profile-write/verification transaction.
 if current_setting('transaction_isolation')<>'read committed' then
   raise exception 'Identity writes require READ COMMITTED isolation so checks refresh after concurrent review locks.';
 end if;
 -- Exact-name matches across locations share an anchor lock. Fuzzy/anchor variations
 -- within the same barangay share a location lock. Acquire both in a stable order.
 for _lock_key in select key from (
   select hashtextextended('name:' || public.organization_identity_name_anchor(_p.organization_name),87126) as key
   union select hashtextextended('barangay:' || coalesce(_p.barangay,''),87126)
 ) locks order by key loop perform pg_advisory_xact_lock(_lock_key); end loop;
 select * into _case from ytrace_identity.cases where organization_id=_p.id for update;
 select encode(sha256(convert_to(coalesce(string_agg(p.id::text || ':' || ytrace_identity.candidate_fingerprint(p),',' order by p.id),''),'UTF8')),'hex') into _digest
 from ytrace_identity.candidates(_p.organization_name,_p.barangay,
   case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id) p;
 if _case.organization_id is not null and (_case.fingerprint is distinct from _fingerprint or _case.candidates_digest is distinct from _digest) then
   update ytrace_identity.cases set fingerprint=_fingerprint,candidates_digest=_digest,version=version+1,updated_at=now()
   where organization_id=_p.id returning * into _case;
 end if;
 if _case.outcome in ('CONFIRMED_EXISTING','MORE_INFORMATION','REJECTED') then return _case.outcome; end if;
 -- A newly created applicant must not disrupt an already established canonical organization.
 if _p.profile_status::text='verified' and exists(select 1 from public.organization_profiles original
   where original.id=_p.id and original.profile_status::text='verified'
     and ytrace_identity.fingerprint(original)=_fingerprint) then
   insert into ytrace_identity.cases(organization_id,fingerprint,candidates_digest,outcome) values(_p.id,_fingerprint,_digest,'NO_MATCH')
     on conflict(organization_id) do nothing;
   return coalesce(_case.outcome,'NO_MATCH');
 end if;
 for _candidate in select * from ytrace_identity.candidates(_p.organization_name,_p.barangay,
   case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id) loop
   _seen:=_seen+1;
   if exists(select 1 from ytrace_identity.decisions d where d.organization_id=_p.id and d.candidate_id=_candidate.id
     and d.subject_fingerprint=_fingerprint and d.candidate_fingerprint=ytrace_identity.candidate_fingerprint(_candidate)
     and d.decision='confirmed_different') then _separate:=true;
   else _pending:=true; end if;
 end loop;
 -- The 21st result is an overflow sentinel. Never clear an incomplete review.
 _outcome:=case when _pending or _seen>=21 then 'POSSIBLE_MATCH' when _separate then 'VERIFIED_SEPARATE' else 'NO_MATCH' end;
 insert into ytrace_identity.cases(organization_id,fingerprint,candidates_digest,outcome) values(_p.id,_fingerprint,_digest,_outcome)
 on conflict(organization_id) do update set fingerprint=excluded.fingerprint,outcome=excluded.outcome,
   version=ytrace_identity.cases.version+1,updated_at=now()
 where ytrace_identity.cases.fingerprint is distinct from excluded.fingerprint
    or ytrace_identity.cases.outcome is distinct from excluded.outcome;
 return _outcome;
end $$;

-- SECURITY INVOKER deliberately retains the real database caller, not editable metadata/GUCs.
create function public.guard_organization_identity_privileges()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
 if current_user not in ('postgres','supabase_admin','service_role') then
   if tg_op='INSERT' then
     new.created_at:=clock_timestamp();
     if new.profile_status::text in ('verified','suspended_inactive') or new.verified_at is not null
       or new.urn_review_status::text not in ('pending','not_applicable') or new.verification_method is not null
       or new.urn_reviewed_by is not null or new.urn_reviewed_at is not null
       or nullif(trim(new.urn_admin_remarks),'') is not null
       or nullif(trim(new.internal_notes),'') is not null then
       raise exception 'Organization verification requires an authorized server review.';
     end if;
   elsif new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at
     or (new.profile_status is distinct from old.profile_status and new.profile_status::text in ('verified','suspended_inactive'))
     or new.verified_at is distinct from old.verified_at
     or new.urn_review_status is distinct from old.urn_review_status
     or new.verification_method is distinct from old.verification_method
     or new.urn_reviewed_by is distinct from old.urn_reviewed_by
     or new.urn_reviewed_at is distinct from old.urn_reviewed_at
     or new.urn_admin_remarks is distinct from old.urn_admin_remarks
     or new.internal_notes is distinct from old.internal_notes
     or ((old.urn_review_status::text='verified' or old.profile_status::text='verified' or old.verified_at is not null) and (new.urn is distinct from old.urn
       or new.urn_normalized is distinct from old.urn_normalized
       or new.organization_identifier_number is distinct from old.organization_identifier_number
       or new.registration_type is distinct from old.registration_type))
     or (old.profile_status::text='verified' and new.profile_status is distinct from old.profile_status) then
       raise exception 'Organization verification fields require an authorized server review.';
   end if;
 end if;
 return new;
end $$;
create trigger trg_a_identity_privileges before insert or update on public.organization_profiles
 for each row execute function public.guard_organization_identity_privileges();

create function public.guard_organization_identity_verification()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, ytrace_identity as $$
declare _outcome text;
begin
 if tg_op='UPDATE' and new.user_id is distinct from old.user_id then
   raise exception 'Account ownership recovery requires the separately reviewed authorization design.';
 end if;
 _outcome:=ytrace_identity.assess(new);
 if new.profile_status::text='verified' and _outcome not in ('NO_MATCH','VERIFIED_SEPARATE') then
   raise exception 'Organization identity review is required before verification or verified profile changes.';
 end if;
 return new;
end $$;
create trigger trg_zz_identity_verification before insert or update on public.organization_profiles
 for each row execute function public.guard_organization_identity_verification();

create function public.check_organization_identity(_name text,_barangay text default null,_urn text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, ytrace_identity as $$
declare _actor text:=coalesce(auth.uid()::text,'shared-anonymous'); _count integer; _own uuid; _p public.organization_profiles; _candidate public.organization_profiles; _possible boolean:=false; _seen integer:=0;
begin
 if length(coalesce(_name,'')) not between 3 and 100 or length(coalesce(_urn,''))>80 or length(coalesce(_barangay,''))>100 then
   return jsonb_build_object('outcome','CHECK_UNAVAILABLE');
 end if;
 insert into ytrace_identity.check_rate(actor,minute,requests) values(_actor,date_trunc('minute',now()),1)
 on conflict(actor,minute) do update set requests=least(ytrace_identity.check_rate.requests+1,31) returning requests into _count;
 if _count>30 then return jsonb_build_object('outcome','CHECK_UNAVAILABLE'); end if;
 insert into ytrace_identity.check_rate(actor,minute,requests) values('global',date_trunc('minute',now()),1)
 on conflict(actor,minute) do update set requests=least(ytrace_identity.check_rate.requests+1,121) returning requests into _count;
 if _count>120 then return jsonb_build_object('outcome','CHECK_UNAVAILABLE'); end if;
 delete from ytrace_identity.check_rate where (actor,minute) in
   (select actor,minute from ytrace_identity.check_rate where minute<now()-interval '1 day' order by minute limit 100);
 select * into _p from public.organization_profiles where user_id=auth.uid(); _own:=_p.id;
 if nullif(_urn,'') is not null and exists(select 1 from public.organization_profiles p where p.id is distinct from _own
   and (p.urn_normalized=public.normalize_urn(_urn) or upper(trim(p.organization_identifier_number))=public.normalize_urn(_urn))) then
   return jsonb_build_object('outcome','EXACT_URN_CONFLICT');
 end if;
 if _own is not null and exists(select 1 from ytrace_identity.cases where organization_id=_own
   and outcome in ('CONFIRMED_EXISTING','MORE_INFORMATION','REJECTED')) then
   return jsonb_build_object('outcome','POSSIBLE_MATCH');
 end if;
 for _candidate in select * from ytrace_identity.candidates(_name,_barangay,_urn,_own) loop
   _seen:=_seen+1;
   if nullif(_urn,'') is not null and (_candidate.urn_normalized=public.normalize_urn(_urn)
      or upper(trim(_candidate.organization_identifier_number))=public.normalize_urn(_urn)) then
     return jsonb_build_object('outcome','EXACT_URN_CONFLICT');
   end if;
   if _own is null or public.normalize_organization_identity_name(_name) is distinct from _p.identity_name_key
     or coalesce(_barangay,'') is distinct from coalesce(_p.barangay,'')
     or (_p.registration_type::text='existing_urn' and public.normalize_urn(coalesce(_urn,'')) is distinct from public.normalize_urn(coalesce(_p.urn,'')))
     or not exists(select 1 from ytrace_identity.decisions d where d.organization_id=_own and d.candidate_id=_candidate.id
       and d.decision='confirmed_different' and d.subject_fingerprint=ytrace_identity.fingerprint(_p)
       and d.candidate_fingerprint=ytrace_identity.candidate_fingerprint(_candidate)) then _possible:=true; end if;
 end loop;
 return jsonb_build_object('outcome',case when _possible or _seen>=21 then 'POSSIBLE_MATCH'
   when _own is not null and public.normalize_organization_identity_name(_name)=_p.identity_name_key
     and coalesce(_barangay,'')=coalesce(_p.barangay,'') and exists(select 1 from ytrace_identity.cases where organization_id=_own and outcome='VERIFIED_SEPARATE') then 'VERIFIED_SEPARATE' else 'NO_MATCH' end);
end $$;
revoke all on function public.check_organization_identity(text,text,text) from public;
grant execute on function public.check_organization_identity(text,text,text) to anon, authenticated;

create function ytrace_identity.authorize_reviewer(_token text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare _admin uuid; _role text; _permissions text[];
begin
 select s.admin_id,r.code,r.permission_codes into _admin,_role,_permissions
 from public.validate_admin_session_token(_token) s join public.admin_accounts a on a.id=s.admin_id and a.is_active
 join public.roles r on r.id=a.role_id limit 1;
 if _admin is null or (_role<>'super_admin' and not('registrations_management'=any(coalesce(_permissions,array[]::text[])))) then
   raise exception 'An authorized registration reviewer is required.';
 end if;
 return _admin;
end $$;

create function public.admin_get_organization_identity_review(_session_token text,_organization_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,ytrace_identity as $$
declare _admin uuid; _p public.organization_profiles; _case ytrace_identity.cases; _candidates jsonb; _history jsonb; _related jsonb;
begin
 _admin:=ytrace_identity.authorize_reviewer(_session_token);
 select * into _p from public.organization_profiles where id=_organization_id;
 if not found then raise exception 'Registration not found.'; end if;
 perform ytrace_identity.assess(_p);
 select * into _case from ytrace_identity.cases where organization_id=_organization_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.organization_name,'urn',p.urn,'barangay',p.barangay,'district',p.district,
   'status',p.profile_status,'verifiedAt',p.verified_at,'signals',jsonb_build_object('normalizedName',p.identity_name_key=_p.identity_name_key,
   'sameBarangay',p.barangay=_p.barangay,'sameDistrict',p.district=_p.district,
   'exactUrn',nullif(_p.urn,'') is not null and p.urn_normalized=public.normalize_urn(_p.urn)),
   'hasRetainedHistory',exists(select 1 from public.organization_accreditations h where h.organization_id=p.id)
      or exists(select 1 from public.budget_requests h where h.organization_id=p.id)
      or exists(select 1 from public.liquidation_reports h where h.organization_id=p.id),
   'separateDecision',exists(select 1 from ytrace_identity.decisions d where d.organization_id=_p.id and d.candidate_id=p.id
       and d.decision='confirmed_different' and d.subject_fingerprint=ytrace_identity.fingerprint(_p)
       and d.candidate_fingerprint=ytrace_identity.candidate_fingerprint(p)))),'[]'::jsonb)
 into _candidates from ytrace_identity.candidates(_p.organization_name,_p.barangay,
   case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id) p;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'adminId',admin_id,'candidateId',candidate_id,'decision',decision,'reason',reason,
   'evidenceReference',evidence_reference,'createdAt',created_at) order by created_at desc),'[]'::jsonb) into _history
 from (select * from ytrace_identity.decisions where organization_id=_p.id order by created_at desc limit 50) d;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.organization_name,'urn',p.urn,'status',p.profile_status)),'[]'::jsonb)
 into _related from (select p.id,p.organization_name,p.urn,p.profile_status from ytrace_identity.cases c
   join public.organization_profiles p on p.id=c.organization_id
   where c.canonical_organization_id=coalesce(_case.canonical_organization_id,_p.id)
   order by c.updated_at desc,p.id limit 21) p;
 return jsonb_build_object('outcome',_case.outcome,'version',_case.version,'canonicalOrganizationId',_case.canonical_organization_id,
   'candidates',_candidates,'candidateLimitReached',jsonb_array_length(_candidates)>=21,'history',_history,'historyLimited',true,
   'relatedRegistrations',_related,'relatedLimitReached',jsonb_array_length(_related)>=21);
end $$;

create function public.admin_review_organization_identity(_session_token text,_organization_id uuid,_candidate_id uuid,
  _decision text,_reason text,_evidence_reference text,_expected_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,ytrace_identity as $$
declare _admin uuid; _p public.organization_profiles; _candidate public.organization_profiles; _case ytrace_identity.cases;
begin
 _admin:=ytrace_identity.authorize_reviewer(_session_token);
 if _decision not in ('confirmed_different','confirmed_existing','more_information','rejected') or _decision is null then raise exception 'Invalid identity decision.'; end if;
 if length(trim(coalesce(_reason,''))) not between 10 and 3000 or length(trim(coalesce(_evidence_reference,''))) not between 5 and 1000 then
   raise exception 'Record the review reason and official verification evidence reference.'; end if;
 select * into _p from public.organization_profiles where id=_organization_id for update;
 if not found then raise exception 'Registration not found.'; end if;
 perform ytrace_identity.assess(_p);
 select * into _case from ytrace_identity.cases where organization_id=_organization_id for update;
 if _expected_version is distinct from _case.version then raise exception 'Identity details changed. Reload before reviewing.'; end if;
 if _case.canonical_organization_id is not null then raise exception 'Confirmed canonical identity cannot be unlinked through registration review.'; end if;
 if _candidate_id is not null then
   select * into _candidate from public.organization_profiles where id=_candidate_id for update;
   if not found or _candidate_id=_organization_id or not exists(select 1 from ytrace_identity.candidates(_p.organization_name,_p.barangay,
      case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id) p where p.id=_candidate_id) then
     raise exception 'Select a current candidate from the reviewed registration.'; end if;
 elsif _decision='confirmed_existing' or (_decision='confirmed_different' and exists(select 1 from ytrace_identity.candidates(_p.organization_name,_p.barangay,
   case when _p.registration_type::text='existing_urn' then _p.urn else null end,_p.id))) then
   raise exception 'A current candidate is required for an identity determination.';
 end if;
 if _decision='confirmed_existing' and ((not (
    _candidate.profile_status::text='verified' or _candidate.verified_at is not null
    or exists(select 1 from public.organization_accreditations where organization_id=_candidate.id)
    or exists(select 1 from public.organization_renewals where organization_id=_candidate.id)
    or exists(select 1 from public.budget_requests where organization_id=_candidate.id and status::text<>'draft')
    or exists(select 1 from public.liquidation_reports where organization_id=_candidate.id)
    -- An authorized evidence decision may preserve the earlier original pending
    -- registration when both accounts are still pending. This does not verify it.
    or (_candidate.created_at,_candidate.id)<(_p.created_at,_p.id)
   )) or exists(select 1 from ytrace_identity.cases
    where organization_id=_candidate.id and canonical_organization_id is not null)) then
   raise exception 'Select the original verified/retained identity or earlier original pending registration; later applicants cannot become canonical identities.';
 end if;
 if _decision='confirmed_different' and _p.registration_type::text='existing_urn'
    and _candidate.urn_normalized=public.normalize_urn(_p.urn) then raise exception 'An existing official URN cannot be assigned to a different organization.'; end if;
 insert into ytrace_identity.decisions(organization_id,candidate_id,subject_fingerprint,candidate_fingerprint,decision,admin_id,reason,evidence_reference)
 values(_p.id,_candidate.id,ytrace_identity.fingerprint(_p),case when _candidate.id is not null then ytrace_identity.candidate_fingerprint(_candidate) else null end,
   _decision,_admin,trim(_reason),trim(_evidence_reference));
 update ytrace_identity.cases set outcome=case _decision when 'confirmed_existing' then 'CONFIRMED_EXISTING' when 'more_information' then 'MORE_INFORMATION'
   when 'rejected' then 'REJECTED' else 'NO_MATCH' end,
   canonical_organization_id=case when _decision='confirmed_existing' then _candidate.id else null end,
   version=version+1,updated_at=now() where organization_id=_p.id;
 -- This does NOT approve accreditation, transfer ownership, merge records or change financial IDs.
 return public.admin_get_organization_identity_review(_session_token,_p.id);
end $$;
revoke all on function public.admin_get_organization_identity_review(text,uuid) from public;
revoke all on function public.admin_review_organization_identity(text,uuid,uuid,text,text,text,integer) from public;
grant execute on function public.admin_get_organization_identity_review(text,uuid) to anon,authenticated;
grant execute on function public.admin_review_organization_identity(text,uuid,uuid,text,text,text,integer) to anon,authenticated;

-- Direct financial writes and server RPCs receive the same authoritative identity gate.
create function public.guard_organization_identity_financial_write()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,ytrace_identity as $$
declare _p public.organization_profiles; _outcome text;
begin
 if tg_op='UPDATE' then
   if new.organization_id is distinct from old.organization_id then raise exception 'Historical financial ownership cannot be reassigned.'; end if;
   if old.status::text<>'draft' then return new; end if;
 end if;
 if new.status::text='draft' then return new; end if;
 select * into _p from public.organization_profiles where id=new.organization_id for update;
 if not found or _p.profile_status::text<>'verified' then raise exception 'A verified organization is required before submitting a budget request.'; end if;
 _outcome:=ytrace_identity.assess(_p);
 if _outcome not in ('NO_MATCH','VERIFIED_SEPARATE') then raise exception 'Resolve organization identity with PCYDO before creating a new budget request.'; end if;
 return new;
end $$;
create trigger trg_identity_budget_write before insert or update of organization_id,status on public.budget_requests
 for each row execute function public.guard_organization_identity_financial_write();

-- Retention review proposal: the consequences are documented in audit-and-recovery-design.md.
-- Pause destructive cleanup of established records; do not invent a permanent retention period.
create function ytrace_identity.has_retained_history(_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,ytrace_identity as $$
 select exists(select 1 from public.organization_profiles where id=_id and (profile_status::text='verified' or verified_at is not null))
 or exists(select 1 from public.organization_accreditations where organization_id=_id)
 or exists(select 1 from public.organization_renewals where organization_id=_id)
 or exists(select 1 from public.budget_requests where organization_id=_id and status::text<>'draft')
 or exists(select 1 from public.liquidation_reports where organization_id=_id)
 or exists(select 1 from ytrace_identity.cases where canonical_organization_id=_id
   or (organization_id=_id and outcome in ('CONFIRMED_EXISTING','MORE_INFORMATION','REJECTED')));
$$;
create function public.guard_retained_organization_deletion()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,ytrace_identity as $$
begin
 if ytrace_identity.has_retained_history(old.id) then
   raise exception 'Official organization history is retained. Request an authorized archival/retention review before permanent deletion.';
 end if;
 return old;
end $$;
create trigger trg_identity_retained_deletion before delete on public.organization_profiles
 for each row execute function public.guard_retained_organization_deletion();

create function public.admin_check_organization_retention(_session_token text,_organization_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,ytrace_identity as $$
begin
 perform ytrace_identity.authorize_reviewer(_session_token);
 return jsonb_build_object('retained',ytrace_identity.has_retained_history(_organization_id));
end $$;
revoke all on function public.admin_check_organization_retention(text,uuid) from public;
grant execute on function public.admin_check_organization_retention(text,uuid) to anon,authenticated,service_role;

-- Keep the existing function OID: dependent/cached calls must receive the guard too.
-- Insert BEFORE cleanup, preserving existing authorization/protection/cleanup/audit code.
-- Fail the entire migration if the audited insertion boundary has changed.
do $retention_patch$
declare _definition text; _marker constant text := '  -- 4. Activate transaction-local bypass for immutability triggers';
begin
 _definition:=pg_get_functiondef('public.delete_organization_account_canonical(text,uuid)'::regprocedure);
 if position(_marker in _definition)=0 then raise exception 'Canonical deletion changed. Review the retention guard insertion before applying.'; end if;
 _definition:=replace(_definition,_marker,E'  perform ytrace_identity.authorize_reviewer(_session_token);\n  if ytrace_identity.has_retained_history(_organization_id) then\n    raise exception ''Official organization history is retained. Request an authorized archival/retention review before permanent deletion.'';\n  end if;\n\n' || _marker);
 execute _definition;
end $retention_patch$;
revoke all on function public.delete_organization_account_canonical(text,uuid) from public;
grant execute on function public.delete_organization_account_canonical(text,uuid) to anon,authenticated,service_role;

create function public.guard_historical_organization_owner()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.organization_id is distinct from old.organization_id then raise exception 'Historical organization ownership cannot be reassigned.'; end if;
 return new;
end $$;
create trigger trg_identity_liquidation_owner before update of organization_id on public.liquidation_reports
 for each row execute function public.guard_historical_organization_owner();
create trigger trg_identity_accreditation_owner before update of organization_id on public.organization_accreditations
 for each row execute function public.guard_historical_organization_owner();
create trigger trg_identity_renewal_owner before update of organization_id on public.organization_renewals
 for each row execute function public.guard_historical_organization_owner();
create trigger trg_identity_documents_owner before update of organization_id on public.document_submissions
 for each row execute function public.guard_historical_organization_owner();
create trigger trg_identity_ypop_owner before update of organization_id on public.ypop_entries
 for each row execute function public.guard_historical_organization_owner();
create trigger trg_identity_ypop_participation_owner before update of organization_id on public.ypop_event_participations
 for each row execute function public.guard_historical_organization_owner();
create trigger trg_identity_ypop_activity_owner before update of organization_id on public.ypop_org_activities
 for each row execute function public.guard_historical_organization_owner();

-- Helpers, trigger functions and audit tables are not directly executable/queryable by applicants.
revoke all on all functions in schema ytrace_identity from public,anon,authenticated;
revoke all on function public.guard_organization_identity_privileges() from public,anon,authenticated;
revoke all on function public.guard_organization_identity_verification() from public,anon,authenticated;
revoke all on function public.guard_organization_identity_financial_write() from public,anon,authenticated;
revoke all on function public.guard_retained_organization_deletion() from public,anon,authenticated;
revoke all on function public.guard_historical_organization_owner() from public,anon,authenticated;
commit;
