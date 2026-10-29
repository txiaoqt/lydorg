// Local validation only. Node --env-file performs loading; this code never reads
// the private env file, opens a database connection, or prints supplied values.
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FOUNDATION_KEYS = Object.freeze([
  'YTRACE_PRODUCTION_DB_PASSWORD',
  'YTRACE_PRODUCTION_DB_CA_FILE',
  'YTRACE_PRODUCTION_DB_CA_SHA256',
]);

export async function verifyFoundationEnvironment(env = process.env) {
  const result = {
    status: 'BLOCKED',
    variables: FOUNDATION_KEYS.map((name) => ({
      name,
      present: typeof env[name] === 'string' && env[name].trim().length > 0,
    })),
    caFileExists: null,
    caSha256Matches: null,
    networkAttempted: false,
  };
  if (result.variables.some((variable) => !variable.present)) {
    return { ...result, reason: 'MISSING_REQUIRED_VARIABLES' };
  }
  if (env.YTRACE_PRODUCTION_DB_PASSWORD === 'REPLACE_WITH_DATABASE_PASSWORD') {
    return { ...result, reason: 'EXAMPLE_PLACEHOLDER_NOT_A_CREDENTIAL' };
  }
  if (!isAbsolute(env.YTRACE_PRODUCTION_DB_CA_FILE)) {
    return { ...result, reason: 'CA_PATH_MUST_BE_ABSOLUTE' };
  }
  if (!/^[a-fA-F0-9]{64}$/.test(env.YTRACE_PRODUCTION_DB_CA_SHA256)) {
    return { ...result, reason: 'CA_FINGERPRINT_MUST_BE_64_HEX' };
  }
  try {
    const info = await stat(env.YTRACE_PRODUCTION_DB_CA_FILE);
    result.caFileExists = true;
    if (!info.isFile()) return { ...result, reason: 'CA_PATH_NOT_A_REGULAR_FILE' };
    const ca = await readFile(env.YTRACE_PRODUCTION_DB_CA_FILE);
    result.caSha256Matches = createHash('sha256').update(ca).digest('hex') ===
      env.YTRACE_PRODUCTION_DB_CA_SHA256.toLowerCase();
    return result.caSha256Matches
      ? { ...result, status: 'PASS' }
      : { ...result, reason: 'CA_FINGERPRINT_MISMATCH' };
  } catch (error) {
    if (error?.code === 'ENOENT') result.caFileExists = false;
    return { ...result, reason: 'CA_FILE_MISSING_OR_UNREADABLE' };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyFoundationEnvironment().then((result) => {
    console.log(JSON.stringify(result));
    if (result.status !== 'PASS') process.exitCode = 2;
  }).catch(() => {
    console.log(JSON.stringify({ status: 'BLOCKED', reason: 'LOCAL_VALIDATION_FAILED', networkAttempted: false }));
    process.exitCode = 2;
  });
}
