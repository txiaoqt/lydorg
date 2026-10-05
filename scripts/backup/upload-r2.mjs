import { writeFile } from 'node:fs/promises';
import { sha256File, runQuiet, privateToolErrorCode } from './common.mjs';

export function classifyR2Diagnostic(diagnostic) {
  const output = String(diagnostic ?? '').toLowerCase();
  if (/invalidaccesskeyid|invalid access key|access key id.{0,30}invalid/.test(output)) return 'invalid_access_key';
  if (/signaturedoesnotmatch|signature mismatch|signature does not match/.test(output)) return 'signature_mismatch';
  if (/nosuchbucket|no such bucket|bucket.{0,30}not found/.test(output)) return 'bucket_not_found';
  if (/accessdenied|access denied|\bforbidden\b|\b403\b/.test(output)) return 'access_denied';
  if (/endpointconnectionerror|could not connect|connect timeout|connection (?:timed out|refused|reset)|name or service not known|temporary failure in name resolution|tls handshake|network is unreachable/.test(output)) {
    return 'endpoint_unreachable';
  }
  return 'unknown_r2_error';
}

export function classifyR2Error(error, getErrorCode = privateToolErrorCode) {
  const code = getErrorCode(error);
  return ['access_denied', 'invalid_access_key', 'signature_mismatch', 'bucket_not_found', 'endpoint_unreachable'].includes(code)
    ? code : 'unknown_r2_error';
}

function destinationPrefix(backupId, createdAtUtc) {
  const date = createdAtUtc.slice(0, 10).replaceAll('-', '/');
  return `manual/${date}/${backupId}/`;
}

async function assertDestinationListable({ env, prefix, execute, getErrorCode, phase }) {
  const awsEnv = { ...process.env, AWS_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION: 'auto',
    AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '3',
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED', AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_SESSION_TOKEN: '', AWS_PROFILE: '', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' };
  try {
    const output = await execute('aws', ['--endpoint-url', env.R2_ENDPOINT, '--region', 'auto', 's3api',
      'list-objects-v2', '--bucket', env.R2_BUCKET_NAME, '--prefix', prefix, '--max-keys', '1', '--output', 'json'], awsEnv, true, classifyR2Diagnostic);
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
