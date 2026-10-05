import { writeFile } from 'node:fs/promises';
import { sha256File, runQuiet, privateToolErrorCode } from './common.mjs';

export const SAFE_R2_ERROR_CODES = Object.freeze([
  'access_denied',
  'invalid_access_key',
  'signature_mismatch',
  'bucket_not_found',
  'endpoint_unreachable',
  'invalid_argument',
  'invalid_endpoint',
  'ssl_error',
  'credentials_error',
  'redirect_or_region_error',
  'malformed_response',
]);

export function classifyR2Diagnostic(diagnostic) {
  const output = String(diagnostic ?? '').toLowerCase();

  // 1. Invalid argument / command options / parameter validation
  if (/paramvalidationerror|parameter validation failed|unknown argument|unknown option|invalid choice|argument --|the following arguments are required|unrecognized argument|invalid argument|missing required argument|usage:\s*aws/.test(output)) {
    return 'invalid_argument';
  }

  // 2. Invalid endpoint / URL format or endpoint resolution error
  if (/endpointresolutionerror|could not resolve endpoint|invalid endpoint|invalid url|failed to parse endpoint|invalid scheme/.test(output)) {
    return 'invalid_endpoint';
  }

  // 3. SSL / TLS certificate / handshake failures
  if (/certificate_verify_failed|certificate verify failed|sslvalidationfailed|\bsslerror\b|ssl error|self signed certificate|unable to get local issuer certificate|ssl handshake|tls handshake|certificateverificationerror|tlsv1_alert/.test(output)) {
    return 'ssl_error';
  }

  // 4. Invalid access key ID specifically
  if (/invalidaccesskeyid|invalid access key|access key id.{0,30}invalid|access key id you provided does not exist/.test(output)) {
    return 'invalid_access_key';
  }

  // 5. Signature mismatch
  if (/signaturedoesnotmatch|signature mismatch|signature does not match|request signature.{0,30}does not match/.test(output)) {
    return 'signature_mismatch';
  }

  // 6. Credentials missing, unloaded, or invalid token
  if (/unable to locate credentials|nocredentialserror|partialcredentialserror|credentialretrievalerror|credentials could not be loaded|invalid credentials|security token.{0,30}(?:invalid|expired)|invalidtoken|expiredtoken|tokenrefresherror|missing credentials/.test(output)) {
    return 'credentials_error';
  }

  // 7. Region, location constraint, redirection or malformed authorization header
  if (/authorizationheadermalformed|permanentredirect|illegallocationconstraintexception|locationconstraint|region.{0,30}(?:wrong|invalid|mismatch|expecting)|specify a region|regionresolutionerror|send all future requests to this (?:address|endpoint)|\b301\b|\b307\b/.test(output)) {
    return 'redirect_or_region_error';
  }

  // 8. Bucket does not exist
  if (/nosuchbucket|no such bucket|bucket.{0,30}not found|bucket does not exist/.test(output)) {
    return 'bucket_not_found';
  }

  // 9. Access denied / authorization failure
  if (/accessdenied|access denied|\bforbidden\b|\b403\b|\bunauthorized\b|\b401\b|not authorized/.test(output)) {
    return 'access_denied';
  }

  // 10. Network unreachable, timeout, connection failure, DNS resolution failure
  if (/endpointconnectionerror|could not connect|connect timeout|connection (?:timed out|refused|reset)|name or service not known|temporary failure in name resolution|network is unreachable|host is unreachable|no route to host|failed to establish a new connection|newconnectionerror|max retries exceeded with url/.test(output)) {
    return 'endpoint_unreachable';
  }

  // 11. Malformed response, XML parser error, server/gateway errors from edge
  if (/responseparsingerror|responseparsererror|unable to parse response|xmlsyntaxerror|malformedxml|invalid xml|bad gateway|\b502\b|service unavailable|\b503\b|gateway timeout|\b504\b|internalerror|internal server error|\b500\b|\b520\b|\b521\b|\b522\b|\b524\b|invalid r2 list response/.test(output)) {
    return 'malformed_response';
  }

  return 'unknown_r2_error';
}

export function classifyR2Error(error, getErrorCode = privateToolErrorCode) {
  const code = getErrorCode(error);
  if (SAFE_R2_ERROR_CODES.includes(code)) return code;
  if (error && SAFE_R2_ERROR_CODES.includes(error.code)) return error.code;
  if (typeof error?.message === 'string') {
    const match = error.message.match(/(?:R2 check failed|R2 preflight failed|R2 destination check failed):\s*([a-z_]+)/);
    if (match && SAFE_R2_ERROR_CODES.includes(match[1])) return match[1];
  }
  if (error instanceof SyntaxError || error?.message?.includes('invalid R2 list response')) {
    return 'malformed_response';
  }
  return 'unknown_r2_error';
}

function destinationPrefix(backupId, createdAtUtc) {
  const date = createdAtUtc.slice(0, 10).replaceAll('-', '/');
  return `manual/${date}/${backupId}/`;
}

export async function assertDestinationListable({ env, prefix, execute = runQuiet, getErrorCode = privateToolErrorCode, phase = 'R2 preflight failed' }) {
  const awsEnv = { ...process.env, AWS_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION: 'auto',
    AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '3',
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED', AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_SESSION_TOKEN: '', AWS_PROFILE: '', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' };
  const args = [
    '--endpoint-url', env.R2_ENDPOINT,
    '--region', 'auto',
    's3api', 'list-objects-v2',
    '--bucket', env.R2_BUCKET_NAME,
    ...(prefix !== undefined ? ['--prefix', prefix] : []),
    '--max-keys', '1',
    '--output', 'json',
  ];
  try {
    const output = await execute('aws', args, awsEnv, true, classifyR2Diagnostic);
    const result = JSON.parse(output);
    if (!Number.isSafeInteger(result.KeyCount) || result.KeyCount < 0 ||
        (result.Contents !== undefined && !Array.isArray(result.Contents))) throw new Error('invalid R2 list response');
    return result;
  } catch (error) {
    const classification = classifyR2Error(error, getErrorCode);
    throw new Error(`${phase}: ${classification}`);
  }
}

/** Check endpoint and bucket list access before the potentially expensive archive packaging step. */
export async function preflightR2({ backupId, createdAtUtc, env, execute = runQuiet, getErrorCode = privateToolErrorCode }) {
  const prefix = destinationPrefix(backupId, createdAtUtc);
  const existing = await assertDestinationListable({ env, prefix, execute, getErrorCode, phase: 'R2 preflight failed' });
  if (existing.KeyCount !== 0 || existing.IsTruncated === true || existing.Contents?.length) {
    throw new Error('R2 backup prefix already exists; refusing to overwrite');
  }
  return { prefix, bucketListVerified: true };
}

export async function uploadR2({ archive, backupId, createdAtUtc, env, execute = runQuiet, getErrorCode = privateToolErrorCode }) {
  const hash = await sha256File(archive);
  const prefix = destinationPrefix(backupId, createdAtUtc);
  const archiveName = `ytrace-backup-${backupId}.tar.gz`;
  const key = `${prefix}${archiveName}`;
  const awsEnv = { ...process.env, AWS_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION: 'auto',
    AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '3',
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED', AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_SESSION_TOKEN: '', AWS_PROFILE: '', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' };
  const aws = (args, capture = false) => execute('aws', ['--endpoint-url', env.R2_ENDPOINT, '--region', 'auto', ...args], awsEnv, capture, classifyR2Diagnostic);
  const existing = await assertDestinationListable({ env, prefix, execute, getErrorCode, phase: 'R2 destination check failed' });
  if (existing.KeyCount !== 0 || existing.IsTruncated === true || existing.Contents?.length) throw new Error('Backup prefix already exists; refusing to overwrite');
  await aws(['s3', 'cp', archive, `s3://${env.R2_BUCKET_NAME}/${key}`, '--only-show-errors',
    '--content-type', 'application/gzip', '--metadata', `sha256=${hash.sha256}`]);
  const checksumFile = `${archive}.sha256`;
  await writeFile(checksumFile, `${hash.sha256}  ${archiveName}\n`, { flag: 'wx', mode: 0o600 });
  await aws(['s3', 'cp', checksumFile, `s3://${env.R2_BUCKET_NAME}/${key}.sha256`, '--only-show-errors', '--content-type', 'text/plain']);
  let head;
  try { head = JSON.parse(await aws(['s3api', 'head-object', '--bucket', env.R2_BUCKET_NAME, '--key', key, '--output', 'json'], true)); }
  catch { throw new Error('R2 archive HEAD verification failed'); }
  if (head.ContentLength !== hash.size || head.Metadata?.sha256 !== hash.sha256) throw new Error('R2 archive size/checksum metadata mismatch');
  const sidecar = JSON.parse(await aws(['s3api', 'head-object', '--bucket', env.R2_BUCKET_NAME, '--key', `${key}.sha256`, '--output', 'json'], true));
  const localSidecar = await sha256File(checksumFile);
  if (sidecar.ContentLength !== localSidecar.size) throw new Error('R2 checksum sidecar size mismatch');
  // R2 ETags are not SHA-256 (especially for multipart uploads). Metadata alone is not a byte verification.
  const readback = `${archive}.readback`;
  await aws(['s3', 'cp', `s3://${env.R2_BUCKET_NAME}/${key}`, readback, '--only-show-errors']);
  const remoteHash = await sha256File(readback);
  if (remoteHash.size !== hash.size || remoteHash.sha256 !== hash.sha256) throw new Error('R2 read-back archive checksum mismatch');
  return { key, size: hash.size, sha256: hash.sha256, readBackVerified: true };
}
