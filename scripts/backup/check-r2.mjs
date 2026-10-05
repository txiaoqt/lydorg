import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runQuiet, privateToolErrorCode, validateR2Config } from './common.mjs';
import { classifyR2Error, assertDestinationListable } from './upload-r2.mjs';

/**
 * Diagnostic preflight check for Cloudflare R2.
 * Validates configuration and executes a read-only list-objects-v2 check with max-keys 1.
 * Never touches Supabase, never writes or deletes objects, and never exposes credentials or raw stderr.
 */
export async function checkR2(env = process.env, { execute = runQuiet, getErrorCode = privateToolErrorCode } = {}) {
  try {
    validateR2Config(env);
    await assertDestinationListable({
      env,
      execute,
      getErrorCode,
      phase: 'R2 check failed',
    });
    return { ok: true, bucketListVerified: true };
  } catch (error) {
    const classification = classifyR2Error(error, getErrorCode);
    throw new Error(`R2 check failed: ${classification}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkR2()
    .then(() => {
      console.log('R2 check successful: bucket list access verified');
    })
    .catch(error => {
      const classification = classifyR2Error(error);
      console.error(`R2 check failed: ${classification}`);
      process.exitCode = 1;
    });
}
