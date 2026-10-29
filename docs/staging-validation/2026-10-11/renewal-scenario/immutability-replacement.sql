CREATE OR REPLACE FUNCTION public.enforce_accreditation_immutability()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  IF tg_op = 'UPDATE' THEN\n    IF old.term_number IS DISTINCT FROM new.term_number\n       OR old.start_date IS DISTINCT FROM new.start_date\n       OR old.end_date IS DISTINCT FROM new.end_date\n       OR old.certificate_urn IS DISTINCT FROM new.certificate_urn\n       OR old.approved_by IS DISTINCT FROM new.approved_by\n       OR old.approved_at IS DISTINCT FROM new.approved_at\n       OR old.created_at IS DISTINCT FROM new.created_at\n       OR old.is_legacy_inferred IS DISTINCT FROM new.is_legacy_inferred THEN\n      -- Controlled exception: permit date adjustments strictly for the designated renewal test account in non-production\n      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN\n        IF EXISTS (\n          SELECT 1 FROM public.organization_profiles op\n          WHERE op.id = old.organization_id\n            AND (op.is_renewal_test_account = true)\n        ) THEN\n          RETURN new;\n        END IF;\n      END IF;\n\n      RAISE EXCEPTION 'Historical accreditation term fields are immutable.';\n    END IF;\n\n    -- Revocation immutability rules:\n    IF old.revoked_at IS NOT NULL AND new.revoked_at IS DISTINCT FROM old.revoked_at THEN\n      RAISE EXCEPTION 'Accreditation revocation timestamp is immutable once set.';\n    END IF;\n\n    IF old.revocation_reason IS NOT NULL AND new.revocation_reason IS DISTINCT FROM old.revocation_reason THEN\n      RAISE EXCEPTION 'Accreditation revocation reason is immutable once set.';\n    END IF;\n\n    IF new.status <> 'revoked' AND new.revoked_at IS NOT NULL THEN\n      RAISE EXCEPTION 'Non-revoked accreditation terms cannot have a revocation timestamp.';\n    END IF;\n\n    -- Valid status transitions only:\n    IF old.status = 'superseded' AND new.status <> 'superseded' THEN\n      IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN\n        IF EXISTS (\n          SELECT 1 FROM public.organization_profiles op\n          WHERE op.id = old.organization_id\n            AND (op.is_renewal_test_account = true)\n        ) THEN\n          RETURN new;\n        END IF;\n      END IF;\n      RAISE EXCEPTION 'A superseded accreditation term cannot be reactivated or altered.';\n    END IF;\n\n    IF old.status = 'revoked' AND new.status <> 'revoked' THEN\n      RAISE EXCEPTION 'A revoked accreditation term cannot be reactivated.';\n    END IF;\n\n    IF old.status <> 'revoked' AND new.status = 'revoked' THEN\n      IF new.revoked_at IS NULL THEN\n        new.revoked_at := clock_timestamp();\n      END IF;\n    END IF;\n\n    RETURN new;\n  END IF;\n\n  IF tg_op = 'DELETE' THEN\n    IF current_setting('app.allow_org_deletion', true) = 'true' THEN\n      RETURN old;\n    END IF;\n    IF current_setting('app.allow_test_scenario_prep', true) = 'true' THEN\n      IF EXISTS (\n        SELECT 1 FROM public.organization_profiles op\n        WHERE op.id = old.organization_id\n          AND (op.is_renewal_test_account = true)\n      ) THEN\n        RETURN old;\n      END IF;\n    END IF;\n    RAISE EXCEPTION 'Accreditation terms in the authoritative ledger cannot be deleted.';\n  END IF;\n\n  RETURN new;\nEND;\n$function$\n"},{"acl":"{postgres=X/postgres,=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","signature":"sync_organization_accreditation_projection()","definition":"CREATE OR REPLACE FUNCTION public.sync_organization_accreditation_projection()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nbegin\r\n  if tg_op = 'INSERT' or tg_op = 'UPDATE' then\r\n    if new.status = 'active' then\r\n      update public.organization_profiles\r\n      set\r\n        current_accreditation_id = new.id,\r\n        accreditation_start_date = new.start_date,\r\n        accreditation_expires_at = (new.end_date::text || 'T23:59:59+08:00')::timestamptz\r\n      where id = new.organization_id;\r\n    elsif (tg_op = 'UPDATE' and old.status = 'active' and new.status in ('superseded', 'revoked')) then\r\n      -- If active was superseded or revoked, update projection to latest active or keep latest term\r\n      update public.organization_profiles op\r\n      set\r\n        current_accreditation_id = new.id,\r\n        accreditation_start_date = new.start_date,\r\n        accreditation_expires_at = (new.end_date::text || 'T23:59:59+08:00')::timestamptz\r\n      where op.id = new.organization_id\r\n        and op.current_accreditation_id = old.id;\r\n    end if;\r\n  end if;\r\n\r\n  return new;\r\nend;\r\n$function$\n"},{"acl":"{postgres=X/postgres,=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","signature":"validate_admin_session_token(text)","definition":"CREATE OR REPLACE FUNCTION public.validate_admin_session_token(_session_token text)\n RETURNS TABLE(admin_id uuid, username citext, email citext, display_name text, expires_at timestamp with time zone)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nbegin\r\n  update public.admin_sessions\r\n  set last_used_at = now()\r\n  where token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')\r\n    and revoked_at is null\r\n    and public.admin_sessions.expires_at > now();\r\n\r\n  return query\r\n  select\r\n    aa.id,\r\n    aa.username,\r\n    aa.email,\r\n    aa.display_name,\r\n    s.expires_at\r\n  from public.admin_sessions s\r\n  join public.admin_accounts aa on aa.id = s.admin_id\r\n  where s.token_hash = encode(extensions.digest(_session_token, 'sha256'), 'hex')\r\n    and s.revoked_at is null\r\n    and s.expires_at > now()\r\n    and aa.is_active = true\r\n  limit 1;\r\nend;\r\n$function$\n"}],"constraints":[{"name":"activity_logs_actor_user_id_fkey","table":"activity_logs","definition":"FOREIGN KEY (actor_user_id) REFERENCES admin_accounts(id) ON DELETE SET NULL"},{"name":"activity_logs_organization_id_fkey","table":"activity_logs","definition":"FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE"},{"name":"activity_logs_pkey","table":"activity_logs","definition":"PRIMARY KEY (id)"},{"name":"chk_accreditation_dates","table":"organization_accreditations","definition":"CHECK ((end_date > start_date))"},{"name":"chk_accreditation_revocation_consistency","table":"organization_accreditations","definition":"CHECK ((((status <> 'revoked'::text) AND (revoked_at IS NULL)) OR (status = 'revoked'::text)))"},{"name":"organization_accreditations_approved_by_fkey","table":"organization_accreditations","definition":"FOREIGN KEY (approved_by) REFERENCES admin_accounts(id) ON DELETE SET NULL"},{"name":"organization_accreditations_organization_id_fkey","table":"organization_accreditations","definition":"FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE"},{"name":"organization_accreditations_pkey","table":"organization_accreditations","definition":"PRIMARY KEY (id)"},{"name":"organization_accreditations_status_check","table":"organization_accreditations","definition":"CHECK ((status = ANY (ARRAY['active'::text, 'superseded'::text, 'revoked'::text])))"},{"name":"organization_accreditations_term_number_check","table":"organization_accreditations","definition":"CHECK ((term_number >= 1))"},{"name":"uq_organization_term_number","table":"organization_accreditations","definition":"UNIQUE (organization_id, term_number)"},{"name":"organization_profiles_contact_number_check","table":"organization_profiles","definition":"CHECK ((contact_number ~ '^09[0-9]{9}$'::text))"},{"name":"organization_profiles_current_accreditation_id_fkey","table":"organization_profiles","definition":"FOREIGN KEY (current_accreditation_id) REFERENCES organization_accreditations(id) ON DELETE SET NULL"},{"name":"organization_profiles_pkey","table":"organization_profiles","definition":"PRIMARY KEY (id)"},{"name":"organization_profiles_user_id_fkey","table":"organization_profiles","definition":"FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"organization_profiles_user_id_key","table":"organization_profiles","definition":"UNIQUE (user_id)"},{"name":"organization_renewals_current_accreditation_id_fkey","table":"organization_renewals","definition":"FOREIGN KEY (current_accreditation_id) REFERENCES organization_accreditations(id) ON DELETE SET NULL"},{"name":"organization_renewals_cycle_number_check","table":"organization_renewals","definition":"CHECK ((cycle_number >= 2))"},{"name":"organization_renewals_organization_id_fkey","table":"organization_renewals","definition":"FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE"},{"name":"organization_renewals_pkey","table":"organization_renewals","definition":"PRIMARY KEY (id)"},{"name":"organization_renewals_reviewed_by_fkey","table":"organization_renewals","definition":"FOREIGN KEY (reviewed_by) REFERENCES admin_accounts(id) ON DELETE SET NULL"},{"name":"organization_renewals_status_check","table":"organization_renewals","definition":"CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'needs_revision'::text, 'resubmitted'::text, 'approved'::text, 'rejected'::text])))"},{"name":"uq_organization_renewal_cycle","table":"organization_renewals","definition":"UNIQUE (organization_id, cycle_number)"}]}$expected_catalog$::jsonb THEN
   RAISE EXCEPTION 'Exact staging catalog drift; stop before DDL';
 END IF;
END $installation$;
-- END VERIFIED INSTALLATION GATE



DO $drift$
BEGIN
  IF EXISTS(select expected.signature from (values
('admin_ensure_renewal_test_account_profile(text)','e7f0f4cb0cb71a5271202d32d35b164b'),
('admin_get_or_create_renewal_test_account(text)','5c3286bd4d13a668579a82d7d18c9759'),
('admin_prepare_renewal_test_scenario(text,integer,date)','049dd6f04d80029a980d97a966f7a938'),
('admin_reset_renewal_test_scenario(text)','4acc23f708af5887fac0f6e625241d13'),
('admin_restore_renewal_test_scenario(text)','40b95e3530d3bd3afaa517244f8eae35'),
('admin_seed_renewal_test_registration_documents(text)','92fbbf2abd30f40f600510b3e4323846'),
('enforce_accreditation_immutability()','20311bbade4bdfc93c00c52035891c05')
) expected(signature,definition_md5)
where to_regprocedure(expected.signature) is null or md5(pg_get_functiondef(to_regprocedure(expected.signature))) <> expected.definition_md5) THEN
    RAISE EXCEPTION 'Catalog drift; stop staging adaptation';
  END IF;
END $drift$;
CREATE SCHEMA ytrace_staging_renewal AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA ytrace_staging_renewal FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE ytrace_staging_renewal.fixture (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  project_ref text NOT NULL CHECK(project_ref='zroudsvpswqsjlyttkjf'),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organization_profiles(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  baseline jsonb,
  prior_baselines jsonb NOT NULL DEFAULT '[]'::jsonb,
  prepared boolean NOT NULL DEFAULT false,
  mutation_pid integer,mutation_txid bigint,mutation_term uuid,
  bound_by uuid NOT NULL REFERENCES public.admin_accounts(id),
  bound_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE ytrace_staging_renewal.fixture ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ytrace_staging_renewal.fixture FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION ytrace_staging_renewal.assert_project() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth AS $$
DECLARE claims jsonb:=auth.jwt(); ref text;
BEGIN
  -- PostgREST must have cryptographically verified these JWT claims. Never use request headers.
  ref:=coalesce(claims->>'ref',substring(claims->>'iss' FROM '^https://([a-z]{20})\.supabase\.co/auth/v1$'));
  IF ref IS DISTINCT FROM 'zroudsvpswqsjlyttkjf' THEN
    RAISE EXCEPTION 'Exact staging JWT project context required' USING ERRCODE='42501';
  END IF;
END $$;

CREATE FUNCTION ytrace_staging_renewal.authorize(token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth AS $$
DECLARE admin_id uuid;
BEGIN
  PERFORM ytrace_staging_renewal.assert_project();
  SELECT a.id INTO admin_id FROM public.validate_admin_session_token(token) s
  JOIN public.admin_accounts a ON a.id=s.admin_id JOIN public.roles r ON r.id=a.role_id
  WHERE a.is_active IS TRUE AND r.code='super_admin';
  IF admin_id IS NULL THEN RAISE EXCEPTION 'Active Super Admin session required' USING ERRCODE='42501'; END IF;
  RETURN admin_id;
END $$;

CREATE FUNCTION ytrace_staging_renewal.checked_fixture() RETURNS ytrace_staging_renewal.fixture
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth AS $$
DECLARE f ytrace_staging_renewal.fixture; matches integer;
BEGIN
  PERFORM ytrace_staging_renewal.assert_project();
  SELECT * INTO f FROM ytrace_staging_renewal.fixture WHERE singleton FOR UPDATE;
  IF f.organization_id IS NULL THEN RAISE EXCEPTION 'Provision and review the dedicated staging fixture first'; END IF;
  PERFORM 1 FROM auth.users WHERE id=f.user_id FOR SHARE;
  PERFORM 1 FROM public.organization_profiles WHERE id=f.organization_id FOR UPDATE;
  SELECT count(*) INTO matches FROM public.organization_profiles p JOIN auth.users u ON u.id=p.user_id
  WHERE p.id=f.organization_id AND p.user_id=f.user_id
    AND p.organization_email='ytrace-renewal-synthetic@example.invalid'
    AND u.email='ytrace-renewal-synthetic@example.invalid'
    AND u.raw_app_meta_data->>'ytrace_renewal_fixture'='zroudsvpswqsjlyttkjf-v1'
    AND p.organization_name='SYNTHETIC Y-TRACE Renewal Scenario'
    AND p.profile_status='verified';
  IF matches<>1 THEN RAISE EXCEPTION 'Dedicated synthetic binding mismatch' USING ERRCODE='42501'; END IF;
  RETURN f;
END $$;

-- Internal binding, AFTER official Auth Admin creation and normal owner registration/review.
-- Not exposed through PostgREST; no organization ID is accepted by any public scenario RPC.
CREATE FUNCTION ytrace_staging_renewal.bind_fixture(org uuid, token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth AS $$
DECLARE actor uuid; uid uuid;
BEGIN
  actor:=ytrace_staging_renewal.authorize(token);
  PERFORM pg_advisory_xact_lock(hashtextextended('ytrace-staging-renewal-binding',0));
  IF EXISTS(SELECT 1 FROM ytrace_staging_renewal.fixture) THEN RAISE EXCEPTION 'Binding already exists; never replace it'; END IF;
  SELECT p.user_id INTO uid FROM public.organization_profiles p JOIN auth.users u ON u.id=p.user_id
  WHERE p.id=org AND p.organization_email='ytrace-renewal-synthetic@example.invalid'
    AND p.organization_name='SYNTHETIC Y-TRACE Renewal Scenario' AND p.profile_status='verified'
    AND u.email=p.organization_email
    AND u.raw_app_meta_data->>'ytrace_renewal_fixture'='zroudsvpswqsjlyttkjf-v1'
    AND NOT EXISTS(SELECT 1 FROM public.organization_renewals WHERE organization_id=p.id)
    AND NOT EXISTS(SELECT 1 FROM public.budget_requests WHERE organization_id=p.id)
    AND NOT EXISTS(SELECT 1 FROM public.liquidation_reports WHERE organization_id=p.id)
    AND (SELECT count(*) FROM public.organization_accreditations WHERE organization_id=p.id AND status='active')=1
    AND EXISTS(SELECT 1 FROM public.organization_accreditations a WHERE a.organization_id=p.id AND a.status='active' AND a.term_number=1 AND a.id=p.current_accreditation_id)
  FOR UPDATE OF p FOR SHARE OF u;
  IF uid IS NULL THEN RAISE EXCEPTION 'Reviewed dedicated normal registration fixture required'; END IF;
  INSERT INTO ytrace_staging_renewal.fixture(project_ref,organization_id,user_id,bound_by)
  VALUES('zroudsvpswqsjlyttkjf',org,uid,actor);
  -- Presentation flag is not the authority. The private singleton and trusted Auth marker are.
  UPDATE public.organization_profiles SET is_renewal_test_account=true WHERE id=org;
  INSERT INTO public.activity_logs(actor_user_id,organization_id,action,related_type,related_id,description)
  VALUES(actor,org,'staging_renewal_fixture_bound','organization',org,'SYNTHETIC staging-only renewal fixture bound after normal registration approval');
END $$;

CREATE FUNCTION ytrace_staging_renewal.mutation_allowed(org uuid,term uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  -- VOLATILE deliberately observes permits written earlier in this RPC transaction.
  SELECT EXISTS(SELECT 1 FROM ytrace_staging_renewal.fixture f JOIN auth.users u ON u.id=f.user_id
    JOIN public.organization_profiles p ON p.id=f.organization_id AND p.user_id=f.user_id
    WHERE f.singleton AND f.project_ref='zroudsvpswqsjlyttkjf' AND f.organization_id=org
    AND f.mutation_term=term AND f.mutation_pid=pg_backend_pid() AND f.mutation_txid=txid_current()
    AND u.email='ytrace-renewal-synthetic@example.invalid'
    AND p.profile_status='verified' AND p.organization_email=u.email
    AND p.organization_name='SYNTHETIC Y-TRACE Renewal Scenario'
    AND u.raw_app_meta_data->>'ytrace_renewal_fixture'='zroudsvpswqsjlyttkjf-v1')
$$;

CREATE FUNCTION ytrace_staging_renewal.apply(token text,target date,restore boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth AS $$
DECLARE actor uuid; f ytrace_staging_renewal.fixture; a public.organization_accreditations;
  start_on date; end_on date; before_row jsonb; result jsonb;
BEGIN
  actor:=ytrace_staging_renewal.authorize(token);f:=ytrace_staging_renewal.checked_fixture();
  PERFORM 1 FROM public.organization_profiles WHERE id=f.organization_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.organization_renewals WHERE organization_id=f.organization_id
    AND status IN('draft','submitted','under_review','needs_revision','resubmitted')) THEN
    RAISE EXCEPTION 'Preserve in-progress renewal evidence; reset/restore refused';
  END IF;
  BEGIN
    SELECT * INTO STRICT a FROM public.organization_accreditations WHERE organization_id=f.organization_id AND status='active' FOR UPDATE;
  EXCEPTION WHEN no_data_found OR too_many_rows THEN
    RAISE EXCEPTION 'Exactly one active authoritative accreditation required';
  END;
  IF NOT EXISTS(SELECT 1 FROM public.organization_profiles WHERE id=f.organization_id AND current_accreditation_id=a.id) THEN
    RAISE EXCEPTION 'Authoritative accreditation projection mismatch';
  END IF;
  before_row:=to_jsonb(a);
  IF restore THEN
    IF NOT f.prepared THEN
      RETURN jsonb_build_object('success',true,'organizationId',f.organization_id,'endDate',a.end_date,'derivedStatus',public.derive_accreditation_status(a.status,a.end_date));
    END IF;
    IF (f.baseline->>'id')::uuid IS DISTINCT FROM a.id OR EXISTS(SELECT 1 FROM public.organization_renewals WHERE current_accreditation_id=a.id) THEN
      RAISE EXCEPTION 'Completed renewal evidence retained; original term cannot be restored across a lifecycle';
    END IF;
    start_on:=(f.baseline->>'start_date')::date;end_on:=(f.baseline->>'end_date')::date;
  ELSE
    IF target IS NULL OR target<current_date-180 OR target>current_date+1096 THEN RAISE EXCEPTION 'Test expiry outside supported bounds'; END IF;
    end_on:=target;start_on:=(target-interval '3 years')::date;
    IF f.baseline IS NULL OR (f.baseline->>'id')::uuid IS DISTINCT FROM a.id THEN
      UPDATE ytrace_staging_renewal.fixture SET prior_baselines=CASE WHEN baseline IS NULL THEN prior_baselines ELSE prior_baselines||jsonb_build_array(baseline) END,
        baseline=before_row WHERE singleton;
    END IF;
  END IF;
  -- Private transaction-and-term permit, not a client-settable GUC/flag alone.
  UPDATE ytrace_staging_renewal.fixture SET mutation_pid=pg_backend_pid(),mutation_txid=txid_current(),mutation_term=a.id WHERE singleton;
  UPDATE public.organization_accreditations SET start_date=start_on,end_date=end_on WHERE id=a.id;
  UPDATE ytrace_staging_renewal.fixture SET mutation_pid=NULL,mutation_txid=NULL,mutation_term=NULL,prepared=NOT restore WHERE singleton;
  INSERT INTO public.activity_logs(actor_user_id,organization_id,action,related_type,related_id,description,metadata)
  VALUES(actor,f.organization_id,CASE WHEN restore THEN 'staging_renewal_restored' ELSE 'staging_renewal_simulated' END,
    'organization_accreditation',a.id,'SYNTHETIC staging-only time simulation; no historical certificate claim',
    jsonb_build_object('synthetic',true,'before',before_row,'simulatedStart',start_on,'simulatedEnd',end_on,'restored',restore));
  result:=jsonb_build_object('success',true,'organizationId',f.organization_id,'accreditationId',a.id,'termNumber',a.term_number,
    'startDate',start_on,'endDate',end_on,'derivedStatus',public.derive_accreditation_status('active',end_on),
    'daysRemaining',greatest(0,end_on-current_date),'eligibility',public.calculate_organization_renewal_eligibility(f.organization_id));
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_prepare_renewal_test_scenario(p_session_token text,p_expiration_days_ahead integer DEFAULT 30,p_custom_expiration_date date DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN RETURN ytrace_staging_renewal.apply(p_session_token,coalesce(p_custom_expiration_date,current_date+coalesce(p_expiration_days_ahead,30))); END $$;
CREATE OR REPLACE FUNCTION public.admin_reset_renewal_test_scenario(p_session_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN RETURN ytrace_staging_renewal.apply(p_session_token,current_date+30); END $$;
CREATE OR REPLACE FUNCTION public.admin_restore_renewal_test_scenario(p_session_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN RETURN ytrace_staging_renewal.apply(p_session_token,NULL,true); END $$;

CREATE OR REPLACE FUNCTION public.admin_get_or_create_renewal_test_account(p_session_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth AS $$
DECLARE f ytrace_staging_renewal.fixture; p public.organization_profiles; a public.organization_accreditations; r public.organization_renewals; candidates uuid[];
BEGIN
  PERFORM ytrace_staging_renewal.authorize(p_session_token);
  IF NOT EXISTS(SELECT 1 FROM ytrace_staging_renewal.fixture) THEN
    SELECT array_agg(op.id) INTO candidates FROM public.organization_profiles op JOIN auth.users u ON u.id=op.user_id
    WHERE op.organization_email='ytrace-renewal-synthetic@example.invalid'
      AND op.organization_name='SYNTHETIC Y-TRACE Renewal Scenario' AND op.profile_status='verified'
      AND u.email=op.organization_email
      AND u.raw_app_meta_data->>'ytrace_renewal_fixture'='zroudsvpswqsjlyttkjf-v1';
    IF coalesce(cardinality(candidates),0)<>1 THEN RAISE EXCEPTION 'Provision and review exactly one dedicated staging fixture first'; END IF;
    PERFORM ytrace_staging_renewal.bind_fixture(candidates[1],p_session_token);
  END IF;
  f:=ytrace_staging_renewal.checked_fixture();
  SELECT * INTO p FROM public.organization_profiles WHERE id=f.organization_id;
  BEGIN
    SELECT * INTO STRICT a FROM public.organization_accreditations WHERE organization_id=p.id AND status='active';
  EXCEPTION WHEN no_data_found OR too_many_rows THEN
    RAISE EXCEPTION 'Exactly one active authoritative accreditation required';
  END;
  IF p.current_accreditation_id IS DISTINCT FROM a.id THEN RAISE EXCEPTION 'Authoritative accreditation projection mismatch'; END IF;
  SELECT * INTO r FROM public.organization_renewals WHERE organization_id=p.id AND status IN('draft','submitted','under_review','needs_revision','resubmitted') ORDER BY cycle_number DESC LIMIT 1;
  RETURN jsonb_build_object('isNew',false,'credentials',jsonb_build_object('email',p.organization_email,'temporaryPassword',NULL),
    'organization',jsonb_build_object('id',p.id,'userId',p.user_id,'name',p.organization_name,'email',p.organization_email,
      'urn',p.urn,'district',p.district,'barangay',p.barangay,'contactNumber',p.contact_number,'profileStatus',p.profile_status,'isRenewalTestAccount',true),
    'accreditation',CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('id',a.id,'termNumber',a.term_number,'startDate',a.start_date,'endDate',a.end_date,
      'certificateUrn',a.certificate_urn,'status',a.status,'derivedStatus',public.derive_accreditation_status(a.status,a.end_date)) END,
    'eligibility',public.calculate_organization_renewal_eligibility(p.id),
    'activeRenewal',CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object('id',r.id,'cycleNumber',r.cycle_number,'status',r.status,'submittedAt',r.submitted_at,'reviewedAt',r.reviewed_at) END);
END $$;

CREATE OR REPLACE FUNCTION public.admin_ensure_renewal_test_account_profile(p_session_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE state jsonb; p public.organization_profiles;
BEGIN
  state:=public.admin_get_or_create_renewal_test_account(p_session_token);
  SELECT * INTO p FROM public.organization_profiles WHERE id=(state->'organization'->>'id')::uuid;
  RETURN (state->'organization')||jsonb_build_object('success',true,'organizationId',p.id,'organizationName',p.organization_name,
    'representativeName',coalesce(p.representative_name,''),'adviserName',coalesce(p.adviser_name,''),
    'address',coalesce(p.address,''),'majorClassification',coalesce(p.major_classification,''),
    'subClassification',coalesce(p.sub_classification,''),'advocacies',coalesce(to_jsonb(p.advocacies),'[]'::jsonb),
    'facebookPageUrl',coalesce(p.facebook_page_url,''));
END $$;
CREATE OR REPLACE FUNCTION public.admin_seed_renewal_test_registration_documents(p_session_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM public.admin_get_or_create_renewal_test_account(p_session_token);
  RETURN jsonb_build_object('success',true,'seeded',false,'reason','Dedicated fixture uses genuine owner-uploaded synthetic registration files; shared seed assets are not copied');
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ytrace_staging_renewal FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.admin_get_or_create_renewal_test_account(text),public.admin_ensure_renewal_test_account_profile(text),
 public.admin_prepare_renewal_test_scenario(text,integer,date),public.admin_reset_renewal_test_scenario(text),
 public.admin_restore_renewal_test_scenario(text),public.admin_seed_renewal_test_registration_documents(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_renewal_test_account(text),public.admin_ensure_renewal_test_account_profile(text),
 public.admin_prepare_renewal_test_scenario(text,integer,date),public.admin_reset_renewal_test_scenario(text),
 public.admin_restore_renewal_test_scenario(text),public.admin_seed_renewal_test_registration_documents(text) TO anon,authenticated;
-- REVIEW ONLY. Install in the same transaction as staging-adaptation.sql.
CREATE OR REPLACE FUNCTION public.enforce_accreditation_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF tg_op = 'UPDATE' THEN
    IF old.term_number IS DISTINCT FROM new.term_number
       OR old.start_date IS DISTINCT FROM new.start_date
       OR old.end_date IS DISTINCT FROM new.end_date
       OR old.certificate_urn IS DISTINCT FROM new.certificate_urn
       OR old.approved_by IS DISTINCT FROM new.approved_by
       OR old.approved_at IS DISTINCT FROM new.approved_at
       OR old.created_at IS DISTINCT FROM new.created_at
       OR old.is_legacy_inferred IS DISTINCT FROM new.is_legacy_inferred THEN
      -- Controlled exception: permit date adjustments strictly for the designated renewal test account in non-production
      IF old.status='active' AND ytrace_staging_renewal.mutation_allowed(old.organization_id,old.id)
         AND (to_jsonb(old) - ARRAY['start_date','end_date']) = (to_jsonb(new) - ARRAY['start_date','end_date']) THEN
        RETURN new;
      END IF;

      RAISE EXCEPTION 'Historical accreditation term fields are immutable.';
    END IF;

    -- Revocation immutability rules:
    IF old.revoked_at IS NOT NULL AND new.revoked_at IS DISTINCT FROM old.revoked_at THEN
      RAISE EXCEPTION 'Accreditation revocation timestamp is immutable once set.';
    END IF;

    IF old.revocation_reason IS NOT NULL AND new.revocation_reason IS DISTINCT FROM old.revocation_reason THEN
      RAISE EXCEPTION 'Accreditation revocation reason is immutable once set.';
    END IF;

    IF new.status <> 'revoked' AND new.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Non-revoked accreditation terms cannot have a revocation timestamp.';
    END IF;

    -- Valid status transitions only:
    IF old.status = 'superseded' AND new.status <> 'superseded' THEN
      RAISE EXCEPTION 'A superseded accreditation term cannot be reactivated or altered.';
    END IF;

    IF old.status = 'revoked' AND new.status <> 'revoked' THEN
      RAISE EXCEPTION 'A revoked accreditation term cannot be reactivated.';
    END IF;

    IF old.status <> 'revoked' AND new.status = 'revoked' THEN
      IF new.revoked_at IS NULL THEN
        new.revoked_at := clock_timestamp();
      END IF;
    END IF;

    RETURN new;
  END IF;

  IF tg_op = 'DELETE' THEN
    IF current_setting('app.allow_org_deletion', true) = 'true' THEN
      RETURN old;
    END IF;
    RAISE EXCEPTION 'Accreditation terms in the authoritative ledger cannot be deleted.';
  END IF;

  RETURN new;
END;
$function$;


