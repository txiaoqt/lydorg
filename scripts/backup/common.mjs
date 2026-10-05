import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const REQUIRED_R2_SECRETS = [
  'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET_NAME',
];

export const REQUIRED_SECRETS = [
  ...REQUIRED_R2_SECRETS,
  'SUPABASE_DB_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY',
];

export function validateR2Config(env) {
  for (const name of ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    if (!env[name]?.trim()) {
      const error = new Error(`Missing required secret: ${name}`);
      error.code = 'credentials_error';
      throw error;
    }
  }
  if (!env.R2_ENDPOINT?.trim()) {
    const error = new Error('Missing required secret: R2_ENDPOINT');
    error.code = 'invalid_endpoint';
    throw error;
  }
  let url;
  try { url = new URL(env.R2_ENDPOINT); } catch {
    const error = new Error('Invalid R2_ENDPOINT');
    error.code = 'invalid_endpoint';
    throw error;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    const error = new Error('R2_ENDPOINT must be an HTTPS origin without credentials, path, or query');
    error.code = 'invalid_endpoint';
    throw error;
  }
  if (!env.R2_BUCKET_NAME?.trim() || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET_NAME)) {
    const error = new Error('Invalid R2_BUCKET_NAME');
    error.code = 'invalid_argument';
    throw error;
  }
}

export function validateSecrets(env) {
  validateR2Config(env);
  for (const name of ['SUPABASE_DB_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY']) {
    if (!env[name]?.trim()) throw new Error(`Missing required secret: ${name}`);
  }
  let url;
  try { url = new URL(env.SUPABASE_URL); } catch { throw new Error('Invalid SUPABASE_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SUPABASE_URL must be an HTTPS origin without credentials, path, or query');
  }
  const database = databaseEnvironment(env.SUPABASE_DB_URL);
  const projectHost = new URL(env.SUPABASE_URL).hostname;
  if (projectHost.endsWith('.supabase.co')) {
    const projectRef = projectHost.slice(0, -'.supabase.co'.length);
    const databaseRef = database.PGHOST.startsWith('db.') && database.PGHOST.endsWith('.supabase.co')
      ? database.PGHOST.slice(3, -'.supabase.co'.length)
      : database.PGHOST.endsWith('.pooler.supabase.com') && database.PGUSER.includes('.')
        ? database.PGUSER.slice(database.PGUSER.lastIndexOf('.') + 1) : null;
    if (databaseRef && databaseRef !== projectRef) throw new Error('Database and Storage secrets refer to different Supabase projects');
  }
}

export function databaseEnvironment(connectionString) {
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('Invalid SUPABASE_DB_URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || !url.pathname.slice(1) || url.hash) {
    throw new Error('SUPABASE_DB_URL must be a password-authenticated PostgreSQL connection');
  }
  if (url.port === '6543') throw new Error('Use the direct or session pooler database connection, not the transaction pooler');
  if ([...url.searchParams.keys()].some(key => key !== 'sslmode') ||
      (url.searchParams.has('sslmode') && !['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode')))) {
    throw new Error('Unsupported database URL parameters; use a TLS direct/session connection');
  }
  return {
    PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get('sslmode') || 'require', PGCONNECT_TIMEOUT: '30',
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=1800000',
  };
}

// Reject rather than normalize keys: normalization can alias distinct Storage objects.
export function safeRelativePath(value) {
  if (typeof value !== 'string' || !value || /[\\:]/.test(value) ||
      [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
      value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Unsafe bucket/object path');
  }
  return value;
}

export function localPath(root, relative) {
  safeRelativePath(relative);
  const destination = path.resolve(root, ...relative.split('/'));
  if (!destination.startsWith(path.resolve(root) + path.sep)) throw new Error('Path escapes backup directory');
  return destination;
}

export async function sha256File(filename) {
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(filename)) { hash.update(chunk); size += chunk.length; }
  return { sha256: hash.digest('hex'), size };
}

export async function regularFiles(root, prefix = '') {
  const files = [];
  for (const name of (await readdir(prefix ? localPath(root, prefix) : root)).sort()) {
    const relative = prefix ? `${prefix}/${name}` : name;
    const stat = await lstat(localPath(root, relative));
    if (stat.isSymbolicLink()) throw new Error('Symlinks are forbidden in backups');
    if (stat.isDirectory()) files.push(...await regularFiles(root, relative));
    else if (stat.isFile()) files.push(relative);
    else throw new Error('Non-regular backup artifact');
  }
  return files;
}

// Tool output may contain a credential-bearing URL. Never forward it to CI logs.
const toolDiagnostics = new WeakMap();

// Only a short classification survives the child process; raw stderr is never attached to errors.
export function privateToolErrorCode(error) { return toolDiagnostics.get(error) ?? ''; }

export function runQuiet(command, args, env = process.env, capture = false, classifyStderr = null) {
  return new Promise((resolve, reject) => {
    const captureStderr = typeof classifyStderr === 'function';
    const child = spawn(command, args, { env, shell: false, stdio: ['ignore', capture ? 'pipe' : 'ignore', captureStderr ? 'pipe' : 'ignore'] });
    let output = '';
    let diagnostic = '';
    child.stdout?.on('data', chunk => {
      output += chunk;
      if (output.length > 1024 * 1024) child.kill();
    });
    child.stderr?.on('data', chunk => {
      if (captureStderr && diagnostic.length < 8192) diagnostic += chunk.toString().slice(0, 8192 - diagnostic.length);
    });
    child.on('error', () => reject(new Error(`Unable to start ${path.basename(command)}`)));
    child.on('close', code => {
      if (code === 0) return resolve(output);
      const error = new Error(`${path.basename(command)} failed (exit ${code}); tool output withheld to protect credentials`);
      if (captureStderr) {
        try {
          const code = classifyStderr(diagnostic);
          if (typeof code === 'string' && /^[a-z_]{1,48}$/.test(code)) toolDiagnostics.set(error, code);
        } catch { /* Preserve the redacted tool failure if classification itself fails. */ }
      }
      reject(error);
    });
  });
}

export function redact(message, env = process.env) {
  const secrets = REQUIRED_SECRETS.map(name => env[name]).filter(Boolean);
  try { secrets.push(databaseEnvironment(env.SUPABASE_DB_URL).PGPASSWORD); } catch { /* Not configured. */ }
  let clean = String(message);
  for (const secret of secrets) clean = clean.split(secret).join('[redacted]');
  return clean.replace(/(?:https?|postgres(?:ql)?):\/\/[^\s]+/gi, '[URL redacted]');
}
