import { readFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reviewed = JSON.parse(readFileSync(path.join(root, 'scripts/organization-release-config.json'), 'utf8'));
export const configurationHash = config => createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(config).sort()))).digest('hex');

// Known provider metadata examples retained for regression coverage. These are
// never worker inputs. In the verified production context, discard every extra
// VITE_* input, including future metadata, without reading or logging its value.
export const vercelFrameworkMetadata = Object.freeze([
  'VITE_VERCEL_ENV', 'VITE_VERCEL_TARGET_ENV', 'VITE_VERCEL_URL',
  'VITE_VERCEL_BRANCH_URL', 'VITE_VERCEL_PROJECT_PRODUCTION_URL', 'VITE_VERCEL_HASH_SALT',
  'VITE_VERCEL_GIT_PROVIDER', 'VITE_VERCEL_GIT_REPO_SLUG', 'VITE_VERCEL_GIT_REPO_OWNER',
  'VITE_VERCEL_GIT_REPO_ID', 'VITE_VERCEL_GIT_COMMIT_REF', 'VITE_VERCEL_GIT_COMMIT_SHA',
  'VITE_VERCEL_GIT_COMMIT_MESSAGE', 'VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN',
  'VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME', 'VITE_VERCEL_GIT_PULL_REQUEST_ID',
  'VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG',
]);

export function prepareBuildEnvironment(input, policy = reviewed, nodeVersion = process.versions.node) {
  if (Number(nodeVersion.split('.')[0]) !== 24) throw Error('NODE24_REQUIRED');
  if (input.VERCEL === '1' && (input.VERCEL_PROJECT_ID !== policy.projectId || input.VERCEL_ENV !== 'production')) throw Error('VERCEL_TARGET_REJECTED');
  if (input.VERCEL === '1' && ((input.VERCEL_TARGET_ENV !== undefined && input.VERCEL_TARGET_ENV !== 'production') || (input.VERCEL_ORG_ID !== undefined && input.VERCEL_ORG_ID !== policy.teamId) || (input.VERCEL_TEAM_ID !== undefined && input.VERCEL_TEAM_ID !== policy.teamId))) throw Error('VERCEL_TARGET_REJECTED');
  if ((input.VITE_VERCEL_ENV !== undefined && input.VITE_VERCEL_ENV !== input.VERCEL_ENV) || (input.VITE_VERCEL_TARGET_ENV !== undefined && input.VITE_VERCEL_TARGET_ENV !== 'production')) throw Error('VERCEL_FRAMEWORK_ENVIRONMENT_DRIFT');
  if (input.VERCEL !== '1' && Object.keys(input).some(name => name.startsWith('VITE_') && !policy.publicNames.includes(name))) throw Error('UNREVIEWED_PUBLIC_VARIABLE');
  if (policy.publicNames.some(name => typeof input[name] !== 'string' || !input[name].trim())) throw Error('MISSING_PUBLIC_CONFIGURATION');
  const config = Object.fromEntries(policy.publicNames.map(name => [name, String(input[name] ?? '').trim()]));
  if (config.VITE_DEPLOY_SURFACE !== 'user') throw Error('ORGANIZATION_SURFACE_REQUIRED');
  if (config.VITE_SUPABASE_URL !== 'https://mqqaykksadotbrghbexz.supabase.co') throw Error('PRODUCTION_ORIGIN_REQUIRED');
  if (config.VITE_ENABLE_STANDALONE_USER_PWA_UI !== 'true') throw Error('ORGANIZATION_PWA_FLAG_REQUIRED');
  let claims;
  try { claims = JSON.parse(Buffer.from(config.VITE_SUPABASE_ANON_KEY.split('.')[1], 'base64url').toString()); }
  catch { throw Error('PUBLIC_KEY_CLASS_INVALID'); }
  if (claims.role !== 'anon' || claims.ref !== 'mqqaykksadotbrghbexz') throw Error('PUBLIC_KEY_PROJECT_OR_ROLE_REJECTED');
  if (configurationHash(config) !== policy.publicConfigurationSha256) throw Error('PUBLIC_CONFIGURATION_DRIFT');
  const clean = {};
  for (const name of ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'ComSpec', 'PATHEXT', 'LANG', 'LC_ALL']) {
    if (input[name] !== undefined) clean[name] = input[name];
  }
  return { ...clean, ...config, NODE_ENV: 'production', TZ: 'UTC' };
}

export function emptyEnvironmentDirectory(projectRoot) {
  const dir = path.join(projectRoot, 'scripts/.organization-build-env');
  mkdirSync(dir, { recursive: true });
  if (readdirSync(dir).length) throw Error('BUILD_ENV_DIRECTORY_NOT_EMPTY');
  return dir;
}

export async function buildOrganizationRelease() {
  if (process.argv.slice(2).some(a => a !== '--worker')) throw Error('BUILD_ARGUMENT_REJECTED');
  const clean = prepareBuildEnvironment(process.env);
  if (!process.argv.includes('--worker')) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--worker'], { cwd: root, env: clean, stdio: 'inherit' });
    if (result.status !== 0) throw Error('ORGANIZATION_BUILD_WORKER_FAILED');
    return;
  }
  // A fresh worker has no server/operator variables or inherited Vite settings.
  if (Object.keys(process.env).some(n => /^(YTRACE_|SUPABASE_|VERCEL_|NODE_OPTIONS)/.test(n))) throw Error('PRIVATE_WORKER_ENVIRONMENT');
  const { build } = await import('vite');
  await build({
    root, configFile: path.join(root, 'vite.config.ts'), mode: 'production',
    envDir: emptyEnvironmentDirectory(root), logLevel: 'warn',
    define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(reviewed.fixedVersion) },
    build: { outDir: path.join(root, 'build'), emptyOutDir: true, manifest: true },
  });
  console.log(JSON.stringify({ status: 'PASS', surface: 'user', fixedVersion: reviewed.fixedVersion, node: process.version, platform: process.platform, publicConfigurationSha256: reviewed.publicConfigurationSha256, privateEnvironmentPassed: false }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await buildOrganizationRelease(); }
  catch (error) { console.error(JSON.stringify({ status: 'FAIL', reason: /^[A-Z_]+$/.test(error.message) ? error.message : 'ORGANIZATION_BUILD_FAILED' })); process.exitCode = 1; }
}
