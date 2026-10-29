// Offline evidence preparation only: no credentials, network, or database writes.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const reviewed = resolve('docs/production-security/storage-cutover/20261011T113322Z');
const execution = resolve('docs/production-security/storage-cutover/executions/20261011T122743Z');
const sqlPath = resolve(reviewed, 'production_storage_foundation_review.sql');
const sqlBytes = await readFile(sqlPath);
const sql = sqlBytes.toString('utf8');
const sha256 = createHash('sha256').update(sqlBytes).digest('hex');
if (sha256 !== 'e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2') throw new Error('Authorized artifact mismatch');
const fingerprintQuery = await readFile(resolve(reviewed, 'compatibility-fingerprint-readonly.sql'), 'utf8');
const expectedFunctions = JSON.parse(await readFile(resolve(reviewed, 'expected-foundation-functions.json'), 'utf8'));
const reviewedCatalog = JSON.parse(await readFile(resolve(reviewed, 'production-catalog-final.json'), 'utf8'));
const stagingCatalog = JSON.parse(await readFile(resolve(reviewed, 'staging-deployed-catalog.json'), 'utf8'));
const previousData = JSON.parse(await readFile('docs/production-security/document-mutation/executions/20261011105848Z/protected-data-before.json', 'utf8'));
const relationNames = previousData.preserved_data.map(x => x.relation);
const parts = relationNames.filter(x => !x.startsWith('auth.')).map(name => {
  if (!/^(public|storage|ytrace_identity)\.[a-z_]+$/.test(name)) throw new Error('Unexpected relation');
  const [schema, table] = name.split('.');
  return `SELECT '${name}' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "${schema}"."${table}" t`;
});
// Auth inventories contain only identifiers and irreversibly hashed metadata/email, never password/token fields.
parts.push(`SELECT 'auth.users_inventory' AS relation,count(*) AS row_count,md5(coalesce(string_agg(jsonb_build_object('id',id,'email_md5',md5(email),'created_at',created_at,'updated_at',updated_at,'email_confirmed_at',email_confirmed_at,'banned_until',banned_until,'app_metadata_md5',md5(raw_app_meta_data::text),'user_metadata_md5',md5(raw_user_meta_data::text))::text,E'\\n' ORDER BY id),'')) AS content_fingerprint FROM auth.users`);
parts.push(`SELECT 'auth.identities_inventory' AS relation,count(*) AS row_count,md5(coalesce(string_agg(jsonb_build_object('id',id,'user_id',user_id,'provider',provider,'provider_id_md5',md5(provider_id),'created_at',created_at,'updated_at',updated_at,'identity_data_md5',md5(identity_data::text))::text,E'\\n' ORDER BY id),'')) AS content_fingerprint FROM auth.identities`);
const protectedDataQuery = `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL statement_timeout='20s';\nSELECT clock_timestamp() AS captured_at, current_setting('transaction_read_only') AS read_only, jsonb_agg(to_jsonb(x) ORDER BY relation COLLATE "C") AS preserved_data FROM (\n${parts.join('\nUNION ALL\n')}\n) x;\nCOMMIT;\n`;
await writeFile(resolve(execution, 'protected-data-readonly.sql'), protectedDataQuery, {flag:'wx'});
process.stdout.write(JSON.stringify({sql,sha256,sqlBytes:sqlBytes.length,sqlPath,fingerprintQuery,expectedFunctions,reviewedCatalog,stagingCatalog,protectedDataQuery,relationCount:parts.length}));
