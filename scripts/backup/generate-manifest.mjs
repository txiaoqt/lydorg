import { readFile, writeFile, lstat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { BASE_DATABASE_ARTIFACTS } from './backup-database.mjs';
import { REQUIRED_SECRETS, databaseEnvironment, localPath, regularFiles, sha256File } from './common.mjs';

export async function rejectCredentials(filename, env) {
  const secrets = REQUIRED_SECRETS.filter(name => !['R2_BUCKET_NAME', 'SUPABASE_URL', 'R2_ENDPOINT'].includes(name))
    .map(name => env[name]).filter(Boolean);
  if (env.SUPABASE_DB_URL) secrets.push(databaseEnvironment(env.SUPABASE_DB_URL).PGPASSWORD);
  const needles = secrets.map(value => Buffer.from(value));
  const overlap = Math.max(1, ...needles.map(value => value.length)) - 1;
  let tail = Buffer.alloc(0);
  for await (const chunk of createReadStream(filename)) {
    const data = Buffer.concat([tail, chunk]);
    if (needles.some(value => data.includes(value))) throw new Error('Configured credential found in backup content; refusing upload');
    tail = overlap ? data.subarray(Math.max(0, data.length - overlap)) : Buffer.alloc(0);
  }
}

export async function generateManifest({ root, backupId, createdAtUtc, gitCommitSha, env = {} }) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{6}Z-\d+-\d+$/.test(backupId) || !/^[a-f0-9]{40}$/.test(gitCommitSha)) throw new Error('Invalid backup identity');
  if (!Number.isFinite(Date.parse(createdAtUtc))) throw new Error('Invalid backup timestamp');
  const database = JSON.parse(await readFile(localPath(root, 'database-coverage.json'), 'utf8'));
  const storage = JSON.parse(await readFile(localPath(root, 'storage-inventory.json'), 'utf8'));
  if (!storage.enumerationComplete || !storage.secondInventoryMatched) throw new Error('Storage inventory is incomplete');
  const required = BASE_DATABASE_ARTIFACTS.map(file => `database/${file}`);
  if (!['users-and-identities-only', 'not-included'].includes(database.authCoverage)) throw new Error('Invalid Auth coverage');
  if (database.authCoverage === 'users-and-identities-only') required.push('database/auth-users-identities-schema-reference.sql', 'database/auth-users-identities-data.sql');
  if (!Array.isArray(database.artifacts) || required.some(file => !database.artifacts.includes(file))) throw new Error('Incomplete database artifact declaration');
  const fileList = await regularFiles(root);
  for (const file of required) {
    const stat = await lstat(localPath(root, file));
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) throw new Error(`Missing/empty database artifact: ${file}`);
  }
  if (/\bPASSWORD\s+(?:E)?'/i.test(await readFile(localPath(root, 'database/roles.sql'), 'utf8'))) {
    throw new Error('Role dump contains a password value; refusing upload');
  }
  if (!fileList.some(file => file.startsWith('recovery/migrations/') && file.endsWith('.sql'))) throw new Error('Recovery migration sources missing');
  const checksums = {};
  for (const file of fileList) {
    await rejectCredentials(localPath(root, file), env);
    checksums[file] = await sha256File(localPath(root, file));
  }
  const bucketIds = new Set(storage.buckets.map(bucket => bucket.id)), expectedFiles = new Set();
  if (bucketIds.size !== storage.buckets.length) throw new Error('Duplicate bucket metadata');
  let storageTotalBytes = 0;
  for (const object of storage.objects) {
    const expectedPath = `storage/${object.bucket}/${object.path}`;
    const checksum = checksums[expectedPath];
    if (!bucketIds.has(object.bucket) || object.relativePath !== expectedPath || expectedFiles.has(expectedPath) ||
        !checksum || checksum.size !== object.size || checksum.sha256 !== object.sha256) throw new Error('Storage object missing, duplicate, or checksum mismatch');
    expectedFiles.add(expectedPath); storageTotalBytes += object.size;
  }
  if (fileList.some(file => file.startsWith('storage/') && !expectedFiles.has(file))) throw new Error('Uninventoried Storage file');
  const readme = `Y-TRACE logical recovery package (format 1)\nBackup: ${backupId}\nCommit: ${gitCommitSha}\n\n` +
    'database/ contains public schema/data, password-free roles, separate migration history, managed policy/trigger reference metadata, and conditional Auth users/identities artifacts.\n' +
    'storage/ contains actual authenticated binary downloads at original bucket/object paths. Bucket settings and metadata are in manifest.json.\n' +
    'recovery/migrations/ preserves repository SQL sources for reviewed reconstruction of application/managed customizations.\n' +
    `Auth coverage: ${database.authCoverage}\n\n` + database.warnings.join('\n') + '\n' +
    'Storage performs a matching second inventory but is not a versioned/atomic snapshot. Same-size changes without metadata changes may escape detection.\n' +
    'No restore is automated. Validate SHA256SUMS before a separately authorized recovery into an isolated project. Do not blindly replay managed schema DDL or reuse old admin sessions.\n' +
    'The checksum file covers manifest.json and every payload file; it cannot include its own checksum. Archive checksum is stored alongside the R2 archive.\n';
  await writeFile(localPath(root, 'RECOVERY_README.txt'), readme, { flag: 'wx', mode: 0o600 });
  checksums['RECOVERY_README.txt'] = await sha256File(localPath(root, 'RECOVERY_README.txt'));
  const manifest = { backupFormatVersion: 1, backupId, createdAtUtc, gitCommitSha, triggerType: 'workflow_dispatch',
    databaseArtifacts: required.map(file => ({ path: file, ...checksums[file] })), databaseCoverage: database,
    storageBuckets: storage.buckets, storageObjectCount: storage.objects.length, storageTotalBytes,
    storageObjects: storage.objects, storageStartedAtUtc: storage.startedAtUtc, storageCompletedAtUtc: storage.completedAtUtc,
    checksums, warnings: [...database.warnings, 'Storage/database are not an atomic snapshot; restore has not been proven by this backup run.'] };
  await writeFile(localPath(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await rejectCredentials(localPath(root, 'manifest.json'), env);
  await rejectCredentials(localPath(root, 'RECOVERY_README.txt'), env);
  const manifestChecksum = await sha256File(localPath(root, 'manifest.json'));
  const sums = { ...checksums, 'manifest.json': manifestChecksum };
  await writeFile(localPath(root, 'SHA256SUMS'), Object.keys(sums).sort().map(file => `${sums[file].sha256}  ${file}\n`).join(''), { flag: 'wx', mode: 0o600 });
  return manifest;
}
