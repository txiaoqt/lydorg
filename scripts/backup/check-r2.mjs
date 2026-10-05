import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runQuiet, privateToolErrorCode, privateToolDiagnostic, validateR2Config } from './common.mjs';
import { assertDestinationListable, getR2Diagnostic, formatR2Diagnostic } from './upload-r2.mjs';

/**
 * Diagnostic preflight check for Cloudflare R2.
 * Validates configuration and executes a read-only list-objects-v2 check with max-keys 1.
 * Never touches Supabase, never writes or deletes objects, and never exposes credentials or raw stderr.
 */
export async function checkR2(env = process.env, {
  execute = runQuiet,
  getErrorCode = privateToolErrorCode,
  getDiagnostic = privateToolDiagnostic,
} = {}) {
  try {
    validateR2Config(env);
    await assertDestinationListable({
      env,
      execute,
      getErrorCode,
      getDiagnostic,
      phase: 'R2 check failed',
    });
    return { ok: true, bucketListVerified: true };
  } catch (error) {
    const diag = getR2Diagnostic(error, getDiagnostic, getErrorCode);
    const message = formatR2Diagnostic(diag, 'R2 check failed');
    const err = new Error(message);
    err.code = diag.code;
    if (diag.serviceCode) err.serviceCode = diag.serviceCode;
    if (diag.httpStatus) err.httpStatus = diag.httpStatus;
    throw err;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkR2()
    .then(() => {
      console.log('R2 check successful: bucket list access verified');
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
