import { writeFile } from 'node:fs/promises';
import { sha256File, runQuiet } from './common.mjs';

export async function uploadR2({ archive, backupId, createdAtUtc, env, execute = runQuiet }) {
  const hash = await sha256File(archive);
  const date = createdAtUtc.slice(0, 10).replaceAll('-', '/');
  const prefix = `manual/${date}/${backupId}/`;
  const archiveName = `ytrace-backup-${backupId}.tar.gz`;
  const key = `${prefix}${archiveName}`;
  const awsEnv = { ...process.env, AWS_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION: 'auto',
    AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '3',
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED', AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_SESSION_TOKEN: '', AWS_PROFILE: '', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' };
  const aws = (args, capture = false) => execute('aws', ['--endpoint-url', env.R2_ENDPOINT, '--region', 'auto', ...args], awsEnv, capture);
  let existing;
  try { existing = JSON.parse(await aws(['s3api', 'list-objects-v2', '--bucket', env.R2_BUCKET_NAME,
    '--prefix', prefix, '--max-keys', '1', '--output', 'json'], true)); }
  catch { throw new Error('R2 destination check failed'); }
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
