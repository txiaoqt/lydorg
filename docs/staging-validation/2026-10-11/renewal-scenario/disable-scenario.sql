-- STAGING ONLY. Review/authorize before execution. Preserve fixtures, evidence and strict trigger.
BEGIN;
SET LOCAL lock_timeout='5s';
-- BEGIN STAGING DISABLE GATE
DO $disable$ BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Reviewed postgres installation owner required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_accounts a JOIN public.roles r ON r.id=a.role_id
 WHERE a.id='f3cd6008-41ee-46dd-969d-35f86bacf063' AND a.username='staging-super-admin'
 AND a.email='ytrace-staging-super-admin@example.invalid' AND a.is_active AND a.is_password_set
 AND r.code='super_admin') THEN RAISE EXCEPTION 'Verified staging installation anchor missing'; END IF;
 IF to_regclass('ytrace_staging_renewal.fixture') IS NULL THEN RAISE EXCEPTION 'Scenario installation missing'; END IF;
END $disable$;
-- END STAGING DISABLE GATE



CREATE OR REPLACE FUNCTION public.admin_ensure_renewal_test_account_profile(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;
CREATE OR REPLACE FUNCTION public.admin_get_or_create_renewal_test_account(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;
CREATE OR REPLACE FUNCTION public.admin_prepare_renewal_test_scenario(p_session_token text, p_expiration_days_ahead integer DEFAULT 30, p_custom_expiration_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;
CREATE OR REPLACE FUNCTION public.admin_reset_renewal_test_scenario(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;
CREATE OR REPLACE FUNCTION public.admin_restore_renewal_test_scenario(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;
CREATE OR REPLACE FUNCTION public.admin_seed_renewal_test_registration_documents(p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'storage'
AS $function$
BEGIN
  RAISE EXCEPTION 'Disabled in isolated staging until synthetic fixtures are reviewed';
END;
$function$;
CREATE OR REPLACE FUNCTION ytrace_staging_renewal.mutation_allowed(org uuid,term uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$SELECT false$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ytrace_staging_renewal FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
