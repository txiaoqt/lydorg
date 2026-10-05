import { mkdir, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { databaseEnvironment, localPath, runQuiet } from './common.mjs';

export const BASE_DATABASE_ARTIFACTS = [
  'roles.sql', 'schema.sql', 'data.sql', 'migration-history-schema.sql', 'migration-history-data.sql',
  'managed-customizations-reference.json',
];

export async function inspectDatabase(client) {
  // Inspection is read-only. Refuse unexpected application schemas instead of silently omitting them.
  const { rows: schemas } = await client.query(`SELECT nspname FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN
    ('information_schema','public','auth','storage','supabase_migrations','extensions','graphql',
     'graphql_public','realtime','supabase_functions','supabase_vault','vault','pgsodium',
     'pgsodium_masks','net','cron','_realtime','_analytics','_supavisor','pgbouncer','tiger','tiger_data','topology')`);
  if (schemas.length) throw new Error('Unrecognized database schemas; review application schema coverage before backing up');
  const { rows } = await client.query(`SELECT current_setting('server_version_num')::integer AS version,
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS migration_history,
    to_regclass('auth.users') IS NOT NULL AND to_regclass('auth.identities') IS NOT NULL AS auth_tables`);
  if (!rows[0].migration_history) throw new Error('Supabase migration history table is missing');
  const major = Math.floor(rows[0].version / 10000);
  if (major < 15 || major > 18) throw new Error('Unsupported PostgreSQL major version; review backup tooling');
  let authReadable = false;
  if (rows[0].auth_tables) {
    const result = await client.query(`SELECT
      has_table_privilege(current_user, 'auth.users', 'SELECT') AND
      has_table_privilege(current_user, 'auth.identities', 'SELECT') AND
      has_schema_privilege(current_user, 'auth', 'USAGE') AS readable`);
    authReadable = result.rows[0].readable === true;
  }
  const { rows: policies } = await client.query(`SELECT schemaname, tablename, policyname, permissive,
    roles, cmd, qual, with_check FROM pg_policies WHERE schemaname IN ('auth','storage')
    ORDER BY schemaname, tablename, policyname`);
  const { rows: triggers } = await client.query(`SELECT ns.nspname AS schema_name, cls.relname AS table_name,
    trg.tgname AS trigger_name, pg_get_triggerdef(trg.oid, true) AS definition
    FROM pg_trigger trg JOIN pg_class cls ON cls.oid = trg.tgrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN pg_proc proc ON proc.oid = trg.tgfoid JOIN pg_namespace fn ON fn.oid = proc.pronamespace
    WHERE NOT trg.tgisinternal AND ns.nspname IN ('auth','storage') AND fn.nspname = 'public'
    ORDER BY ns.nspname, cls.relname, trg.tgname`);
  return { postgresMajorVersion: major, applicationSchemas: ['public'], authReadable,
    managedCustomizations: { policies, publicFunctionTriggers: triggers } };
}

export async function backupDatabase({ root, env, execute = runQuiet, Client = pg.Client }) {
  const startedAtUtc = new Date().toISOString();
  const connectionEnv = databaseEnvironment(env.SUPABASE_DB_URL);
  const client = new Client({
    host: connectionEnv.PGHOST, port: Number(connectionEnv.PGPORT), database: connectionEnv.PGDATABASE,
    user: connectionEnv.PGUSER, password: connectionEnv.PGPASSWORD,
    // Preserve a caller's stronger verification mode; default require encrypts without CA verification.
    ssl: { rejectUnauthorized: connectionEnv.PGSSLMODE !== 'require' }, connectionTimeoutMillis: 30_000,
    options: connectionEnv.PGOPTIONS, query_timeout: 60_000,
  });
  let coverage;
  try { await client.connect(); coverage = await inspectDatabase(client); }
  catch { throw new Error('Database preflight failed; check TLS/session connection, read permissions, version, and schema coverage'); }
  finally { await client.end(); }
  const databaseRoot = localPath(root, 'database');
  await mkdir(databaseRoot, { recursive: true });
  const cli = path.resolve('node_modules/.bin/supabase');
  const toolEnv = { ...process.env, ...connectionEnv, SUPABASE_TELEMETRY_DISABLED: 'true', DO_NOT_TRACK: '1' };
  const dump = (file, flags) => execute(cli, ['db', 'dump', '--db-url', env.SUPABASE_DB_URL,
    '--file', localPath(root, `database/${file}`), ...flags], toolEnv);
  // Public-only is explicit so managed Auth/Storage data cannot leak into the application artifact.
  await dump('roles.sql', ['--role-only']);
  await dump('schema.sql', ['--schema', 'public']);
  await dump('data.sql', ['--schema', 'public', '--data-only', '--use-copy']);
  await dump('migration-history-schema.sql', ['--schema', 'supabase_migrations']);
  await dump('migration-history-data.sql', ['--schema', 'supabase_migrations', '--data-only', '--use-copy']);

  // Match pg_dump to the inspected server major. Secrets pass via environment, never Docker argv/files.
  async function rawDump(file, flags) {
    const pgNames = Object.keys(connectionEnv);
    await execute('docker', ['run', '--rm', '--network', 'host',
      ...pgNames.flatMap(name => ['--env', name]),
      '--mount', `type=bind,src=${databaseRoot},dst=/backup`,
      `postgres:${coverage.postgresMajorVersion}`, 'pg_dump', '--no-owner', '--no-privileges',
      '--file', `/backup/${file}`, ...flags], toolEnv);
  }
  // Catalog inspection avoids needing SELECT/LOCK access to every managed table when Auth reads are restricted.
  await writeFile(localPath(root, 'database/managed-customizations-reference.json'),
    JSON.stringify(coverage.managedCustomizations, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const artifacts = [...BASE_DATABASE_ARTIFACTS];
  const warnings = [
    'Separate logical dumps and Storage downloads are not one atomic cross-service snapshot. Quiesce writes for disaster-recovery consistency.',
    'Managed policy/trigger metadata and Auth table DDL are reference-only. Review custom Auth triggers/Storage RLS against a matching fresh Supabase project; arbitrary managed-schema custom objects require review of migration sources.',
    'Role login passwords are not backed up; assign fresh passwords during a reviewed recovery.',
    'Project settings, JWT/encryption root keys, OAuth/SMTP configuration, Edge Function secrets/deployments and external services are not backed up.',
  ];
  if (coverage.authReadable) {
    await rawDump('auth-users-identities-schema-reference.sql', ['--schema-only', '--table=auth.users', '--table=auth.identities']);
    await rawDump('auth-users-identities-data.sql', ['--data-only', '--column-inserts', '--table=auth.users', '--table=auth.identities']);
    artifacts.push('auth-users-identities-schema-reference.sql', 'auth-users-identities-data.sql');
    warnings.push('Auth coverage is users/identities only (including password hashes). Sessions, refresh tokens, MFA, SSO and Auth configuration are excluded. Review managed schema versions, identities and encryption dependencies before any recovery; successful login is not guaranteed.');
  } else {
    warnings.push('Auth users/identities were NOT backed up: tables missing or the supplied connection lacks read permission. This archive alone cannot recover user authentication.');
  }
  // Preserve actual migration sources, including managed policies, without relying on historical row counts.
  await cp(path.resolve('supabase/migrations'), localPath(root, 'recovery/migrations'), { recursive: true, errorOnExist: true, force: false });
  const result = { ...coverage, startedAtUtc, completedAtUtc: new Date().toISOString(),
    authCoverage: coverage.authReadable ? 'users-and-identities-only' : 'not-included',
    artifacts: artifacts.map(file => `database/${file}`), warnings };
  await writeFile(localPath(root, 'database-coverage.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return result;
}
