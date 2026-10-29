// Offline artifact generator. Never connects to Supabase or loads environment files.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const directory = 'docs/production-security/test-utility-containment';
export const disabledNames = [
  'admin_cleanup_yorp_sample_dataset', 'admin_ensure_renewal_test_account_profile',
  'admin_get_or_create_renewal_test_account', 'admin_prepare_renewal_test_scenario',
  'admin_reset_renewal_test_scenario', 'admin_restore_renewal_test_scenario',
  'admin_seed_renewal_test_registration_documents', 'admin_seed_yorp_sample_dataset',
  'admin_seed_yorp_sample_dataset_core', 'diversify_yorp_seed_projects_and_budgets',
  'rebalance_yorp_seed_reporting_quarters', 'repair_yorp_seeded_fixture_relationships',
];
export const changedNames = [...disabledNames, 'is_development_or_test_environment',
  'admin_get_yorp_sample_dataset_status', 'enforce_accreditation_immutability',
  'enforce_renewal_terminal_immutability', 'guard_organization_identity_privileges'];
const md5 = value => createHash('md5').update(value).digest('hex');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const body = definition => {
  const match = definition.match(/AS (\$[a-z_]*\$)([\s\S]*)\1\s*;?\s*$/i);
  if (!match) throw Error('Function delimiter drift');
  return match[2];
};
const original = JSON.parse(await readFile(`${directory}/original-catalog.json`, 'utf8'));
const manifest = JSON.parse(await readFile(`${directory}/expected-production-manifest.json`, 'utf8'));
const manifestSql = (await readFile(`${directory}/catalog-manifest.sql`, 'utf8')).trim().replace(/;$/, '');
const fn = name => {
  const matches = original.functions.filter(f => f.name === name);
  if (matches.length !== 1) throw Error(`Unexpected overload: ${name}`);
  return matches[0];
};
if (original.projectRef !== 'mqqaykksadotbrghbexz' || manifest.functions.length !== 31) throw Error('Baseline target drift');
if (!fn('admin_get_or_create_renewal_test_account').definition.includes('[REDACTED LEGACY CREDENTIAL]')) throw Error('Unredacted baseline prohibited');
for (const f of original.functions) {
  if (md5(f.definition) !== f.definition_md5 && !f.definition_redacted) throw Error(`Original definition drift: ${f.name}`);
}
const replacements = [];
const deniedBody = "\nBEGIN\n  RAISE EXCEPTION 'Test-only mutation is disabled in production.' USING ERRCODE = '42501';\nEND;\n";
for (const name of disabledNames) {
  const f = fn(name);
  replacements.push({ name, signature: f.signature, securityDefiner: false, volatility: 'v', source: deniedBody,
    sql: `CREATE OR REPLACE FUNCTION public.${name}(${f.arguments})\nRETURNS ${f.result}\nLANGUAGE plpgsql VOLATILE SECURITY INVOKER\nSET search_path = pg_catalog, pg_temp\nAS $disabled$${deniedBody}$disabled$;\nREVOKE ALL ON FUNCTION public.${f.signature} FROM PUBLIC, anon, authenticated, service_role;` });
}
const envBody = '\n  SELECT false;\n';
replacements.push({name: 'is_development_or_test_environment', signature: fn('is_development_or_test_environment').signature,
  securityDefiner: false, volatility: 's', source: envBody,
  sql: `CREATE OR REPLACE FUNCTION public.is_development_or_test_environment()\nRETURNS boolean\nLANGUAGE sql STABLE SECURITY INVOKER\nSET search_path = pg_catalog, pg_temp\nAS $environment$${envBody}$environment$;`});

let status = fn('admin_get_yorp_sample_dataset_status').definition;
const oldAuthorization = `  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat LIMIT 1;
  IF _admin_id IS NULL THEN RAISE EXCEPTION 'Admin account is not authorized.'; END IF;`;
if (!status.includes(oldAuthorization)) throw Error('Sample status authorization drift');
status = status.replace(oldAuthorization, `  SELECT vat.admin_id INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  JOIN public.admin_accounts aa ON aa.id = vat.admin_id AND aa.is_active
  JOIN public.roles r ON r.id = aa.role_id
  WHERE r.code::text = 'super_admin'
  LIMIT 1;
  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'A valid Super Admin session is required.' USING ERRCODE = '42501';
  END IF;`);
replacements.push({name:'admin_get_yorp_sample_dataset_status',signature:fn('admin_get_yorp_sample_dataset_status').signature,
  securityDefiner:true,volatility:'v',source:body(status),sql:status.trim() + ';\n' +
  'REVOKE EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text,text) FROM PUBLIC;'});

let immutable = fn('enforce_accreditation_immutability').definition;
immutable = immutable.replace('      -- Controlled exception: permit date adjustments strictly for the designated renewal test account in non-production\n','');
let removed = 0;
immutable = immutable.replace(/([ \t]*)IF current_setting\('app\.allow_test_scenario_prep', true\) = 'true' THEN\n\s*IF EXISTS \([\s\S]*?\n\s*RETURN (?:new|old);\n\s*END IF;\n\1END IF;\n/g, () => { removed++; return ''; });
if (removed !== 3 || /allow_test_scenario_prep|is_renewal_test_account|renewal\.test@/.test(immutable)) throw Error('Accreditation test exception drift');
if (!immutable.includes("current_setting('app.allow_org_deletion', true)")) throw Error('Normal deletion exception lost');
replacements.push({name:'enforce_accreditation_immutability',signature:fn('enforce_accreditation_immutability').signature,
  securityDefiner:true,volatility:'v',source:body(immutable),sql:immutable.trim()+';'});

let renewalImmutable = fn('enforce_renewal_terminal_immutability').definition;
let renewalExceptionsRemoved = 0;
renewalImmutable = renewalImmutable.replace(/([ \t]*)IF current_setting\('app\.allow_test_scenario_prep', true\) = 'true' THEN\n\s*IF EXISTS \([\s\S]*?\n\s*RETURN (?:new|old);\n\s*END IF;\n\1END IF;\n/g, () => {renewalExceptionsRemoved++;return '';});
if (renewalExceptionsRemoved !== 2 || /allow_test_scenario_prep|is_renewal_test_account|renewal\.test@/.test(renewalImmutable)) throw Error('Renewal terminal exception drift');
if (!renewalImmutable.includes("current_setting('app.allow_org_deletion', true)")) throw Error('Normal renewal deletion exception lost');
replacements.push({name:'enforce_renewal_terminal_immutability',signature:fn('enforce_renewal_terminal_immutability').signature,
  securityDefiner:true,volatility:'v',source:body(renewalImmutable),sql:renewalImmutable.trim()+';'});

let identityGuard = fn('guard_organization_identity_privileges').definition;
const markerCheck = `
 -- Fixture markers are frozen in production, including through SECURITY DEFINER callers.
 -- No editable profile field, custom GUC, JWT claim, or Admin token bypasses this check.
 if tg_op='INSERT' then
   if coalesce(new.is_renewal_test_account,false) or coalesce(new.is_seeded_sample_data,false)
     or new.seed_batch is not null or new.seed_source_year is not null
     or new.seed_source_record_number is not null then
     raise exception 'Production fixture markers cannot be created.' using errcode='42501';
   end if;
 elsif row(new.is_renewal_test_account,new.is_seeded_sample_data,new.seed_batch,new.seed_source_year,new.seed_source_record_number)
   is distinct from row(old.is_renewal_test_account,old.is_seeded_sample_data,old.seed_batch,old.seed_source_year,old.seed_source_record_number) then
   raise exception 'Production fixture markers are immutable.' using errcode='42501';
 end if;
`;
if (!/\r?\nbegin\r?\n/.test(identityGuard)) throw Error('Identity trigger drift');
identityGuard = identityGuard.replace(/\r?\nbegin\r?\n/, '\nbegin\n'+markerCheck);
replacements.push({name:'guard_organization_identity_privileges',signature:fn('guard_organization_identity_privileges').signature,
  securityDefiner:false,volatility:'v',source:body(identityGuard),sql:identityGuard.trim()+';'});

const expectedPost = replacements.map(f=>({signature:f.signature,name:f.name,source_md5:md5(f.source),security_definer:f.securityDefiner,volatility:f.volatility}));
const selectManifest = `SELECT q.manifest INTO _actual FROM (${manifestSql}) q;`;
const markerTables = ['budget_requests','liquidation_reports','document_submissions','document_submission_files'];
const markerTrigger = 'a_production_fixture_markers_guard';
const markerBody = `
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.is_seeded_sample_data,false) OR NEW.seed_batch IS NOT NULL THEN
      RAISE EXCEPTION 'Production fixture markers cannot be created.' USING ERRCODE='42501';
    END IF;
  ELSIF ROW(NEW.is_seeded_sample_data,NEW.seed_batch) IS DISTINCT FROM ROW(OLD.is_seeded_sample_data,OLD.seed_batch) THEN
    RAISE EXCEPTION 'Production fixture markers are immutable.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
`;
const markerSql = `CREATE SCHEMA ytrace_production_containment AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA ytrace_production_containment FROM PUBLIC, anon, authenticated, service_role;
CREATE FUNCTION ytrace_production_containment.freeze_fixture_markers()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $markers$${markerBody}$markers$;
REVOKE ALL ON FUNCTION ytrace_production_containment.freeze_fixture_markers() FROM PUBLIC, anon, authenticated, service_role;
${markerTables.map(table=>`CREATE TRIGGER ${markerTrigger} BEFORE INSERT OR UPDATE ON public.${table}
FOR EACH ROW EXECUTE FUNCTION ytrace_production_containment.freeze_fixture_markers();`).join('\n')}`;
if (manifestSql.split('AND NOT t.tgisinternal)').length !== 2) throw Error('Trigger manifest query drift');
// Ignore only our four fully asserted new triggers when comparing the old catalog after DDL.
const postManifestSql = manifestSql.replace('AND NOT t.tgisinternal)', `AND NOT t.tgisinternal AND t.tgname <> '${markerTrigger}')`);
const selectPostManifest = `SELECT q.manifest INTO _actual FROM (${postManifestSql}) q;`;
const header = `-- REVIEW ONLY: production mqqaykksadotbrghbexz; NOT INSTALLED.
-- Externally pin the exact control-plane project and verify TLS connection identity.
-- SQL settings/client-supplied project refs are not trusted proof of project identity.
-- Keep outside supabase/migrations. Never replay the dirty checkout's migrations.
-- DDL + one migration receipt only. No Auth, business-record, Storage, or fixture writes.
-- Quiesce test-utility calls before installation; a catalog gate cannot revoke an in-flight call.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;
`;
const gate = `
DO $containment_gate$
DECLARE
 _expected jsonb := $expected_catalog$${JSON.stringify(manifest)}$expected_catalog$::jsonb;
 _actual jsonb;
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' THEN
   RAISE EXCEPTION 'Direct verified postgres installation connection required';
 END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('ytrace.production.test-utility-containment',0)) THEN
   RAISE EXCEPTION 'Another containment installation is in progress';
 END IF;
 ${selectManifest}
 IF _actual IS DISTINCT FROM _expected THEN
   RAISE EXCEPTION 'Production containment catalog drift; stop for independent review';
 END IF;
 IF to_regnamespace('ytrace_production_containment') IS NOT NULL OR EXISTS(
   SELECT 1 FROM pg_trigger WHERE tgname='${markerTrigger}' AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Production fixture guard namespace or trigger collision';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
   AND pid<>pg_backend_pid() AND state='active'
   AND query ~ '(admin_(get_or_create_renewal_test|ensure_renewal_test|prepare_renewal_test|reset_renewal_test|restore_renewal_test|seed_renewal_test|seed_yorp_sample|cleanup_yorp_sample)|diversify_yorp_seed|rebalance_yorp_seed|repair_yorp_seeded)') THEN
   RAISE EXCEPTION 'Active test utility call detected; quiesce before installation';
 END IF;
END $containment_gate$;
`;
const post = `
DO $containment_postconditions$
DECLARE
 _expected jsonb := $expected_catalog$${JSON.stringify(manifest)}$expected_catalog$::jsonb;
 _post jsonb := $expected_post$${JSON.stringify(expectedPost)}$expected_post$::jsonb;
 _actual jsonb; f jsonb; original_function jsonb; changed boolean;
BEGIN
 ${selectPostManifest}
 IF (_actual-'functions') IS DISTINCT FROM (_expected-'functions') THEN
   RAISE EXCEPTION 'Unrelated catalog, permissions, or migration state changed';
 END IF;
 FOR f IN SELECT value FROM jsonb_array_elements(_actual->'functions') LOOP
   SELECT value INTO original_function FROM jsonb_array_elements(_expected->'functions') WHERE value->>'signature'=f->>'signature';
   SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(_post) x WHERE x->>'signature'=f->>'signature') INTO changed;
   IF NOT changed AND f IS DISTINCT FROM original_function THEN
     RAISE EXCEPTION 'Normal business function changed: %',f->>'signature';
   END IF;
 END LOOP;
 FOR f IN SELECT value FROM jsonb_array_elements(_post) LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(f->>'signature')
      AND pg_get_userbyid(p.proowner)='postgres' AND md5(p.prosrc)=f->>'source_md5'
      AND p.prosecdef=(f->>'security_definer')::boolean AND p.provolatile::text=f->>'volatility') THEN
     RAISE EXCEPTION 'Containment replacement differs: %',f->>'signature';
   END IF;
 END LOOP;
 FOR f IN SELECT value FROM jsonb_array_elements(_post) WHERE value->>'name' IN (${disabledNames.map(quote).join(',')}) LOOP
   IF has_function_privilege('anon',to_regprocedure(f->>'signature'),'EXECUTE')
      OR has_function_privilege('authenticated',to_regprocedure(f->>'signature'),'EXECUTE')
      OR has_function_privilege('service_role',to_regprocedure(f->>'signature'),'EXECUTE')
      OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=to_regprocedure(f->>'signature') AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN
     RAISE EXCEPTION 'Disabled function still has API execution privilege: %',f->>'signature';
   END IF;
 END LOOP;
 IF public.is_development_or_test_environment() IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'Production environment must always fail closed';
 END IF;
 -- Custom Admin sessions use anon/authenticated transport; token + active Super Admin role is checked in SQL.
 IF NOT has_function_privilege('anon','public.admin_get_yorp_sample_dataset_status(text,text)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.admin_get_yorp_sample_dataset_status(text,text)','EXECUTE') THEN
   RAISE EXCEPTION 'Retained custom Admin status transport grant lost';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ytrace_production_containment.freeze_fixture_markers()')
   AND pg_get_userbyid(p.proowner)='postgres' AND NOT p.prosecdef AND md5(p.prosrc)=${quote(md5(markerBody))}
   AND p.proconfig=ARRAY['search_path=pg_catalog, pg_temp']::text[]) THEN
   RAISE EXCEPTION 'Fixture guard body or execution context differs';
 END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname='${markerTrigger}' AND NOT tgisinternal) <> 4 THEN
   RAISE EXCEPTION 'Fixture guard trigger count differs';
 END IF;
 FOR f IN SELECT to_jsonb(x) FROM (VALUES ${markerTables.map(table=>`(${quote(table)})`).join(',')}) x(table_name) LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.'||(f->>'table_name'))
     AND t.tgname='${markerTrigger}' AND t.tgenabled='O'
     AND pg_get_triggerdef(t.oid)='CREATE TRIGGER ${markerTrigger} BEFORE INSERT OR UPDATE ON public.'||(f->>'table_name')||' FOR EACH ROW EXECUTE FUNCTION ytrace_production_containment.freeze_fixture_markers()') THEN
     RAISE EXCEPTION 'Fixture marker trigger differs: %',f->>'table_name';
   END IF;
 END LOOP;
 IF has_schema_privilege('anon','ytrace_production_containment','USAGE')
   OR has_schema_privilege('authenticated','ytrace_production_containment','USAGE')
   OR has_schema_privilege('service_role','ytrace_production_containment','USAGE')
   OR has_function_privilege('anon','ytrace_production_containment.freeze_fixture_markers()','EXECUTE')
   OR has_function_privilege('authenticated','ytrace_production_containment.freeze_fixture_markers()','EXECUTE')
   OR has_function_privilege('service_role','ytrace_production_containment.freeze_fixture_markers()','EXECUTE') THEN
   RAISE EXCEPTION 'Private fixture guard permissions differ';
 END IF;
END $containment_postconditions$;

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES ('20261011230000','production_test_utility_containment',ARRAY['Standalone reviewed test-utility containment; see separately recorded candidate SHA-256.']);
COMMIT;
`;
const candidate=header+gate+'\n'+replacements.map(f=>f.sql).join('\n\n')+'\n\n'+markerSql+'\n'+post;
if (/^\s*(?:INSERT INTO\s+auth\.|UPDATE\s+auth\.|DELETE FROM\b|TRUNCATE\b|DROP\b|ALTER POLICY\b|CREATE POLICY\b)/im.test(candidate)) throw Error('Unexpected mutation scope');
if (/\[REDACTED LEGACY CREDENTIAL\]|crypt\s*\(/i.test(candidate)) throw Error('Legacy credential material prohibited in candidate');
await writeFile(`${directory}/production_test_utility_containment.sql`,candidate);
await writeFile(`${directory}/candidate-metadata.json`,JSON.stringify({projectRef:original.projectRef,sha256:sha256(candidate),bytes:Buffer.byteLength(candidate),version:'20261011230000',disabledFunctions:replacements.slice(0,12).map(f=>f.signature),changedFunctions:expectedPost,newPrivateFunction:'ytrace_production_containment.freeze_fixture_markers()',newMarkerTriggers:markerTables.map(table=>({table,name:markerTrigger}))},null,2)+'\n');
console.log(JSON.stringify({artifact:`${directory}/production_test_utility_containment.sql`,sha256:sha256(candidate),disabledFunctions:disabledNames.length,changedFunctions:replacements.length,liveWrites:false}));
