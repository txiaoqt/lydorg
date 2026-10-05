import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSecrets, redact, runQuiet } from './common.mjs';
import { backupDatabase } from './backup-database.mjs';
import { backupStorage, storageApi } from './backup-storage.mjs';
import { generateManifest } from './generate-manifest.mjs';
import { preflightR2, uploadR2 } from './upload-r2.mjs';

export function backupIdentity(env, now = new Date()) {
  if (!/^\d+$/.test(env.GITHUB_RUN_ID || '') || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT || '') ||
      !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') || env.GITHUB_EVENT_NAME !== 'workflow_dispatch') {
    throw new Error('Backup must run from a manual GitHub Actions dispatch');
  }
  const createdAtUtc = now.toISOString();
  const timestamp = createdAtUtc.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const formatted = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}${timestamp.slice(8)}`;
  return { backupId: `${formatted}-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`, createdAtUtc };
}

export async function runBackup(env = process.env) {
  validateSecrets(env);
  const identity = backupIdentity(env);
  // Parent is allocated by the workflow outside the repository. No credentials go in the package.
  const parent = path.resolve(env.YTRACE_BACKUP_TEMP || '');
  const runnerTemp = path.resolve(env.RUNNER_TEMP || '');
  if (!env.YTRACE_BACKUP_TEMP || !env.RUNNER_TEMP || !parent.startsWith(runnerTemp + path.sep) || !path.basename(parent).startsWith('ytrace-backup.')) {
    throw new Error('Invalid workflow temporary directory');
  }
  const temporary = await mkdtemp(path.join(parent, 'run-'));
  if (!temporary.startsWith(parent + path.sep)) throw new Error('Unsafe cleanup path');
  const root = path.join(temporary, 'payload');
  await mkdir(root, { mode: 0o700 });
  try {
    console.log(`Creating manual backup ${identity.backupId}`);
    await backupDatabase({ root, env });
    console.log('Database artifacts completed');
    const storage = await backupStorage({ root, api: storageApi(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY) });
    console.log(`Storage completed: ${storage.buckets.length} buckets, ${storage.objects.length} objects`);
    const manifest = await generateManifest({ root, ...identity, gitCommitSha: env.GITHUB_SHA, env });
    // Detect corruption/missing artifacts using standard sha256sum before packaging.
    await runQuiet('sh', ['-c', 'cd "$1" && sha256sum --check --strict SHA256SUMS', 'checksum-check', root]);
    console.log(`Integrity verified; Auth coverage: ${manifest.databaseCoverage.authCoverage}`);
    if (manifest.databaseCoverage.authCoverage === 'not-included') console.log('WARNING: Auth users/identities are not included; see manifest limitations');
    await preflightR2({ ...identity, env });
    console.log('R2 preflight verified endpoint and destination bucket list access');
    const archive = path.join(temporary, `ytrace-backup-${identity.backupId}.tar.gz`);
    // Stable order, ownership and timestamps; gzip -n excludes filename/time headers.
    await runQuiet('sh', ['-c', 'set -eu; tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -cf "$2" -C "$1" .; gzip -n "$2"',
      'package-backup', root, archive.slice(0, -3)]);
    await runQuiet('tar', ['-tzf', archive]);
    const remote = await uploadR2({ archive, ...identity, env });
    console.log(`R2 backup verified by HEAD and downloaded SHA-256 (${remote.size} bytes)`);
  } finally {
    // Only delete the unique directory allocated by this run inside the validated temporary parent.
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBackup().catch(error => { console.error(redact(error.message)); process.exitCode = 1; });
}
