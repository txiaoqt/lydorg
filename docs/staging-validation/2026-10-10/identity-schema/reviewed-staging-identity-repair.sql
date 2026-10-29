-- STAGING ONLY: zroudsvpswqsjlyttkjf. Catalog-only production extraction; no production rows.
-- Execute through explicit staging apply_migration, never unrestricted db push.
BEGIN;
SET LOCAL search_path = pg_catalog, public, extensions;
SET LOCAL lock_timeout = '5s';
-- Initialize the already-installed extension in this connection before CREATE FUNCTION SET.
-- This read-only call registers its USERSET GUC; no extension/configuration/grant changes.
SELECT extensions.similarity('synthetic', 'synthetic');
DO $guard$ BEGIN
 IF to_regnamespace('ytrace_identity') IS NOT NULL THEN RAISE EXCEPTION 'Expected missing private schema; stop rather than replace existing objects'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_trgm') THEN RAISE EXCEPTION 'Required extension missing; no scope expansion'; END IF;
END $guard$;
CREATE SCHEMA ytrace_identity AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA ytrace_identity FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE, CREATE ON SCHEMA ytrace_identity TO postgres;

CREATE TABLE ytrace_identity."cases" (
  "organization_id" uuid NOT NULL,
  "fingerprint" text NOT NULL,
  "candidates_digest" text DEFAULT ''::text NOT NULL,
  "outcome" text NOT NULL,
  "canonical_organization_id" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ytrace_identity."cases" OWNER TO postgres;
ALTER TABLE ytrace_identity."cases" ADD CONSTRAINT "cases_canonical_organization_id_fkey" FOREIGN KEY (canonical_organization_id) REFERENCES organization_profiles(id) ON DELETE RESTRICT;
ALTER TABLE ytrace_identity."cases" ADD CONSTRAINT "cases_outcome_check" CHECK (outcome = ANY (ARRAY['NO_MATCH'::text, 'POSSIBLE_MATCH'::text, 'VERIFIED_SEPARATE'::text, 'CONFIRMED_EXISTING'::text, 'MORE_INFORMATION'::text, 'REJECTED'::text]));
ALTER TABLE ytrace_identity."cases" ADD CONSTRAINT "cases_pkey" PRIMARY KEY (organization_id);
CREATE INDEX organization_identity_canonical_idx ON ytrace_identity.cases USING btree (canonical_organization_id) WHERE (canonical_organization_id IS NOT NULL);
ALTER TABLE ytrace_identity."cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE ytrace_identity."cases" NO FORCE ROW LEVEL SECURITY;

CREATE TABLE ytrace_identity."check_rate" (
  "actor" text NOT NULL,
  "minute" timestamp with time zone NOT NULL,
  "requests" integer NOT NULL
);
ALTER TABLE ytrace_identity."check_rate" OWNER TO postgres;
ALTER TABLE ytrace_identity."check_rate" ADD CONSTRAINT "check_rate_pkey" PRIMARY KEY (actor, minute);
CREATE INDEX organization_identity_rate_cleanup_idx ON ytrace_identity.check_rate USING btree (minute);
ALTER TABLE ytrace_identity."check_rate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE ytrace_identity."check_rate" NO FORCE ROW LEVEL SECURITY;

CREATE TABLE ytrace_identity."decisions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "candidate_id" uuid,
  "subject_fingerprint" text NOT NULL,
  "candidate_fingerprint" text,
  "decision" text NOT NULL,
  "admin_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "evidence_reference" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ytrace_identity."decisions" OWNER TO postgres;
ALTER TABLE ytrace_identity."decisions" ADD CONSTRAINT "decisions_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE RESTRICT;
ALTER TABLE ytrace_identity."decisions" ADD CONSTRAINT "decisions_decision_check" CHECK (decision = ANY (ARRAY['confirmed_different'::text, 'confirmed_existing'::text, 'more_information'::text, 'rejected'::text]));
ALTER TABLE ytrace_identity."decisions" ADD CONSTRAINT "decisions_evidence_reference_check" CHECK (length(TRIM(BOTH FROM evidence_reference)) >= 5 AND length(TRIM(BOTH FROM evidence_reference)) <= 1000);
ALTER TABLE ytrace_identity."decisions" ADD CONSTRAINT "decisions_pkey" PRIMARY KEY (id);
ALTER TABLE ytrace_identity."decisions" ADD CONSTRAINT "decisions_reason_check" CHECK (length(TRIM(BOTH FROM reason)) >= 10 AND length(TRIM(BOTH FROM reason)) <= 3000);
CREATE INDEX organization_identity_decision_pair_idx ON ytrace_identity.decisions USING btree (organization_id, candidate_id, subject_fingerprint, candidate_fingerprint);
CREATE INDEX organization_identity_decision_subject_idx ON ytrace_identity.decisions USING btree (organization_id, created_at DESC);
ALTER TABLE ytrace_identity."decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE ytrace_identity."decisions" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA ytrace_identity FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ytrace_identity TO postgres;

CREATE OR REPLACE FUNCTION ytrace_identity.fingerprint(_p organization_profiles)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select encode(sha256(convert_to(jsonb_build_array(
   coalesce(public.normalize_organization_identity_name(_p.organization_name),''),
   coalesce(_p.barangay,''),coalesce(_p.district,''),coalesce(_p.registration_type::text,''),
   case when _p.registration_type::text='existing_urn' then coalesce(public.normalize_urn(_p.urn),'') else '' end
 )::text,'UTF8')),'hex');
$function$;
ALTER FUNCTION ytrace_identity.fingerprint(_p organization_profiles) OWNER TO postgres;

CREATE OR REPLACE FUNCTION ytrace_identity.candidate_fingerprint(_p organization_profiles)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
 select encode(sha256(convert_to(jsonb_build_array(ytrace_identity.fingerprint(_p),coalesce(_p.urn_normalized,''),
   coalesce(_p.profile_status::text,''),extract(epoch from _p.verified_at))::text,'UTF8')),'hex');
$function$;
ALTER FUNCTION ytrace_identity.candidate_fingerprint(_p organization_profiles) OWNER TO postgres;

CREATE OR REPLACE FUNCTION ytrace_identity.candidates(_name text, _barangay text, _urn text, _exclude uuid)
 RETURNS SETOF organization_profiles
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
 SET "pg_trgm.similarity_threshold" TO '0.82'
AS $function$
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
$function$;
ALTER FUNCTION ytrace_identity.candidates(_name text, _barangay text, _urn text, _exclude uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION ytrace_identity.assess(_p organization_profiles)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
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
end $function$;
ALTER FUNCTION ytrace_identity.assess(_p organization_profiles) OWNER TO postgres;

CREATE OR REPLACE FUNCTION ytrace_identity.authorize_reviewer(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare _admin uuid; _role text; _permissions text[];
begin
 select s.admin_id,r.code,r.permission_codes into _admin,_role,_permissions
 from public.validate_admin_session_token(_token) s join public.admin_accounts a on a.id=s.admin_id and a.is_active
 join public.roles r on r.id=a.role_id limit 1;
 if _admin is null or (_role<>'super_admin' and not('registrations_management'=any(coalesce(_permissions,array[]::text[])))) then
   raise exception 'An authorized registration reviewer is required.';
 end if;
 return _admin;
end $function$;
ALTER FUNCTION ytrace_identity.authorize_reviewer(_token text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION ytrace_identity.has_retained_history(_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'ytrace_identity'
AS $function$
 select exists(select 1 from public.organization_profiles where id=_id and (profile_status::text='verified' or verified_at is not null))
 or exists(select 1 from public.organization_accreditations where organization_id=_id)
 or exists(select 1 from public.organization_renewals where organization_id=_id)
 or exists(select 1 from public.budget_requests where organization_id=_id and status::text<>'draft')
 or exists(select 1 from public.liquidation_reports where organization_id=_id)
 or exists(select 1 from ytrace_identity.cases where canonical_organization_id=_id
   or (organization_id=_id and outcome in ('CONFIRMED_EXISTING','MORE_INFORMATION','REJECTED')));
$function$;
ALTER FUNCTION ytrace_identity.has_retained_history(_id uuid) OWNER TO postgres;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ytrace_identity FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ytrace_identity TO postgres;
COMMIT;

