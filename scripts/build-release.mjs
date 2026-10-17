import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const buildTargets = Object.freeze({
  admin: Object.freeze({ projectId: 'prj_J36xqAUQELX8NttCaFFInsxcCEaI', teamId: 'team_lrnDtn1fujS9WebCMQoWHmGR', script: 'build-admin-release.mjs' }),
  user: Object.freeze({ projectId: 'prj_ywvIWJbULZOdCMtrt6JPcMqguA2N', teamId: 'team_lrnDtn1fujS9WebCMQoWHmGR', script: 'build-organization-release.mjs' }),
});

export function selectBuildSurface(input) {
  if (input.VERCEL === '1') {
    const surface = Object.keys(buildTargets).find(name => buildTargets[name].projectId === input.VERCEL_PROJECT_ID);
    const target = buildTargets[surface];
    if (!target || input.VERCEL_ENV !== 'production' ||
        (input.VERCEL_TARGET_ENV !== undefined && input.VERCEL_TARGET_ENV !== 'production') ||
        ['VERCEL_ORG_ID', 'VERCEL_TEAM_ID'].some(name => input[name] !== undefined && input[name] !== target.teamId)) {
      throw Error('VERCEL_TARGET_REJECTED');
    }
    if (input.VITE_DEPLOY_SURFACE !== surface) throw Error('DEPLOY_SURFACE_PROJECT_MISMATCH');
    return surface;
  }
  if (['VERCEL', 'VERCEL_PROJECT_ID', 'VERCEL_ENV', 'VERCEL_TARGET_ENV', 'VERCEL_ORG_ID', 'VERCEL_TEAM_ID'].some(name => Object.hasOwn(input, name))) {
    throw Error('INCOMPLETE_VERCEL_CONTEXT');
  }
  if (input.VITE_DEPLOY_SURFACE !== 'admin' && input.VITE_DEPLOY_SURFACE !== 'user') {
    throw Error('EXPLICIT_RELEASE_SURFACE_REQUIRED');
  }
  return input.VITE_DEPLOY_SURFACE;
}

const safeCodes = new Set([
  'BUILD_ARGUMENT_REJECTED', 'VERCEL_TARGET_REJECTED', 'DEPLOY_SURFACE_PROJECT_MISMATCH',
  'INCOMPLETE_VERCEL_CONTEXT', 'EXPLICIT_RELEASE_SURFACE_REQUIRED', 'NODE24_REQUIRED',
  'ADMIN_BUILD_WORKER_FAILED', 'ORGANIZATION_BUILD_WORKER_FAILED',
]);
export const safeBuildError = error => error instanceof Error && safeCodes.has(error.message) ? error.message : 'RELEASE_BUILD_FAILED';

export async function buildRelease() {
  if (process.argv.length !== 2) throw Error('BUILD_ARGUMENT_REJECTED');
  const surface = selectBuildSurface(process.env);
  if (surface === 'admin') {
    const { buildAdminRelease } = await import('./build-admin-release.mjs');
    await buildAdminRelease();
  } else {
    const { buildOrganizationRelease } = await import('./build-organization-release.mjs');
    await buildOrganizationRelease();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await buildRelease(); }
  catch (error) { console.error(JSON.stringify({ status: 'FAIL', reason: safeBuildError(error) })); process.exitCode = 1; }
}
