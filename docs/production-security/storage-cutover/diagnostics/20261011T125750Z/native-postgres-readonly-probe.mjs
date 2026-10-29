// READ-ONLY ONLY. No installation branch, .env loading, retries, or URL override.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, isAbsolute } from 'node:path';
import { Client } from 'pg';

const project = 'mqqaykksadotbrghbexz';
const host = `db.${project}.supabase.co`;
const expectedSqlSha256 = 'e7c094c31be9c62cb8938b815813436fd16d4b57a55c93449dd79b43798c7ba2';
const sqlPath = resolve('docs/production-security/storage-cutover/20261011T113322Z/production_storage_foundation_review.sql');
const required = ['YTRACE_PRODUCTION_DB_PASSWORD', 'YTRACE_PRODUCTION_DB_CA_FILE', 'YTRACE_PRODUCTION_DB_CA_SHA256'];
const missing = required.filter(name => !process.env[name]);
const args = process.argv.slice(2);
if (args.some(value => value !== '--same-size') || args.length > 1) {
  console.log(JSON.stringify({status:'FAIL',reason:'Only optional --same-size is supported; this probe cannot install SQL.'}));
  process.exitCode = 2;
} else if (missing.length) {
  console.log(JSON.stringify({status:'BLOCKED',project,missing,connectionAttempted:false,sqlInstallationSupported:false}));
  process.exitCode = 2;
} else {
  let client;
  try {
    const artifact = await readFile(sqlPath);
    if (createHash('sha256').update(artifact).digest('hex') !== expectedSqlSha256 || artifact.length !== 47407) throw new Error('artifact_guard');
    const caPath = process.env.YTRACE_PRODUCTION_DB_CA_FILE;
    if (!isAbsolute(caPath) || !/^[a-fA-F0-9]{64}$/.test(process.env.YTRACE_PRODUCTION_DB_CA_SHA256)) throw new Error('ca_guard');
    const ca = await readFile(caPath);
    if (createHash('sha256').update(ca).digest('hex') !== process.env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase()) throw new Error('ca_guard');
    client = new Client({
      host, port:5432, database:'postgres', user:'postgres',
      password:process.env.YTRACE_PRODUCTION_DB_PASSWORD,
      ssl:{ca:ca.toString('utf8'),rejectUnauthorized:true,servername:host},
      sslnegotiation:'postgres', enableChannelBinding:true,
      application_name:'ytrace-foundation-readonly-diagnostic',
      options:'-c default_transaction_read_only=on -c statement_timeout=5000',
      client_encoding:'UTF8', connectionTimeoutMillis:10000, query_timeout:15000,
      keepAlive:true, keepAliveInitialDelayMillis:10000,
    });
    // No raw driver error, notice, SQL, credential or configuration is logged.
    client.on('error', () => {});
    await client.connect();
    let query = "BEGIN READ ONLY; SET LOCAL statement_timeout='5s'; SELECT current_database() AS database,current_user AS current_user,session_user AS session_user,current_setting('transaction_read_only') AS read_only,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls,(SELECT version FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls_version,to_regnamespace('ytrace_storage_private') IS NOT NULL AS foundation_present;";
    if (args.includes('--same-size')) {
      const suffix='*/COMMIT;';
      query+='/*'+'.'.repeat(47407-Buffer.byteLength(query)-2-Buffer.byteLength(suffix))+suffix;
    } else query+='COMMIT;';
    const result = await client.query(query);
    const results = Array.isArray(result) ? result : [result];
    const row = results.find(value => value.command === 'SELECT')?.rows[0];
    if (!row || row.database !== 'postgres' || row.current_user !== 'postgres' || row.session_user !== 'postgres' || row.read_only !== 'on' || row.tls !== true || row.foundation_present !== false || results.at(-1)?.command !== 'COMMIT') throw new Error('identity_guard');
    console.log(JSON.stringify({status:'PASS',project,host,readOnly:true,tlsVerified:true,requestBytes:Buffer.byteLength(query),result:row,sqlInstallationSupported:false}));
  } catch (error) {
    const code = typeof error.code === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(error.code) ? error.code : null;
    console.log(JSON.stringify({status:'FAIL',project,errorCode:code,reason:'Read-only connection, TLS, identity, artifact or query verification failed; no retry.',sqlInstallationSupported:false}));
    process.exitCode = 1;
  } finally {
    if (client) await client.end().catch(() => {});
  }
}
