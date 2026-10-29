-- UNINSTALLED LOCAL PAUSE CANDIDATE.
-- This additive migration is not the reviewed production-only installation SQL.
-- Apply nowhere without the separate review/authorization appropriate to that target.
-- Only the existing RPC body changes; OID, owner, ACL and all other pg_proc
-- attributes must remain identical. No business rows or other objects are changed.

DO $pause_migration$
DECLARE
  v_oid oid := pg_catalog.to_regprocedure('public.admin_bulk_delete_budget_requests(text,uuid[])');
  v_existing record;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF v_oid IS NULL THEN
    RAISE SQLSTATE '42883' USING MESSAGE = 'Required budget deletion RPC is missing.';
  END IF;

  SELECT p.* INTO STRICT v_existing
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_oid;

  IF v_existing.prorettype <> 'pg_catalog.jsonb'::pg_catalog.regtype
     OR v_existing.proretset
     OR v_existing.prokind <> 'f'
     OR v_existing.prolang <> (SELECT oid FROM pg_catalog.pg_language WHERE lanname = 'plpgsql')
     OR v_existing.proargnames IS DISTINCT FROM ARRAY['_session_token', '_request_ids']::text[]
     OR v_existing.pronargdefaults <> 0
     OR NOT v_existing.prosecdef
     OR v_existing.proisstrict
     OR v_existing.provolatile <> 'v'
     OR v_existing.proparallel <> 'u'
     OR v_existing.procost <> 100
     OR v_existing.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[]
  THEN
    RAISE SQLSTATE '55000' USING MESSAGE = 'Budget deletion RPC contract differs from the local migration baseline.';
  END IF;

  IF pg_catalog.encode(
       pg_catalog.sha256(pg_catalog.convert_to(v_existing.prosrc, 'UTF8')),
       'hex'
     ) IS DISTINCT FROM '22aa1342dced94b20a1ca95346bac835dfb0ef19edf76669503c5e2c13b44926' THEN
    RAISE SQLSTATE '55000' USING MESSAGE = 'Budget deletion RPC body differs from the reviewed pre-pause baseline.';
  END IF;

  v_before := pg_catalog.to_jsonb(v_existing) - 'prosrc';

  EXECUTE $definition$
CREATE OR REPLACE FUNCTION public.admin_bulk_delete_budget_requests(_session_token text, _request_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE CALLED ON NULL INPUT SECURITY DEFINER PARALLEL UNSAFE COST 100
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE SQLSTATE 'PT409' USING
    MESSAGE = 'BUDGET_DELETION_PAUSED: Permanent budget deletion is temporarily unavailable. Existing records and files are preserved.';
END;
$function$;
$definition$;

  SELECT pg_catalog.to_jsonb(p) - 'prosrc' INTO STRICT v_after
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = v_oid;

  IF v_after IS DISTINCT FROM v_before THEN
    RAISE SQLSTATE '55000' USING MESSAGE = 'Budget deletion RPC identity, owner, grants or attributes changed.';
  END IF;
END;
$pause_migration$;
