import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildTargets, selectBuildSurface, safeBuildError } from './build-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hosted = surface => ({ VERCEL: '1', VERCEL_PROJECT_ID: buildTargets[surface].projectId, VERCEL_ENV: 'production', VITE_DEPLOY_SURFACE: surface });

for (const surface of ['admin', 'user']) {
  test(`exact hosted ${surface} project selects its own build`, () => assert.equal(selectBuildSurface(hosted(surface)), surface));
  test(`explicit local ${surface} release is accepted`, () => assert.equal(selectBuildSurface({ VITE_DEPLOY_SURFACE: surface }), surface));
  test(`${surface} project cannot select the other surface`, () => assert.throws(() => selectBuildSurface({ ...hosted(surface), VITE_DEPLOY_SURFACE: surface === 'admin' ? 'user' : 'admin' }), /DEPLOY_SURFACE_PROJECT_MISMATCH/));
  test(`${surface} requires its public surface setting`, () => { const input = hosted(surface); delete input.VITE_DEPLOY_SURFACE; assert.throws(() => selectBuildSurface(input), /DEPLOY_SURFACE_PROJECT_MISMATCH/); });
  for (const name of ['VERCEL_ORG_ID', 'VERCEL_TEAM_ID']) {
    test(`${surface} rejects a different ${name}`, () => assert.throws(() => selectBuildSurface({ ...hosted(surface), [name]: 'team_other' }), /VERCEL_TARGET_REJECTED/));
    test(`${surface} accepts its exact ${name}`, () => assert.equal(selectBuildSurface({ ...hosted(surface), [name]: buildTargets[surface].teamId }), surface));
  }
  for (const environment of ['preview', 'development', 'staging', '', undefined]) {
    test(`${surface} rejects VERCEL_ENV ${String(environment)}`, () => assert.throws(() => selectBuildSurface({ ...hosted(surface), VERCEL_ENV: environment }), /VERCEL_TARGET_REJECTED/));
  }
  test(`${surface} rejects a custom target environment`, () => assert.throws(() => selectBuildSurface({ ...hosted(surface), VERCEL_TARGET_ENV: 'custom' }), /VERCEL_TARGET_REJECTED/));
}

test('unknown project cannot fall back to a public surface', () => assert.throws(() => selectBuildSurface({ ...hosted('admin'), VERCEL_PROJECT_ID: 'prj_other' }), /VERCEL_TARGET_REJECTED/));
test('missing project is rejected', () => { const input = hosted('admin'); delete input.VERCEL_PROJECT_ID; assert.throws(() => selectBuildSurface(input), /VERCEL_TARGET_REJECTED/); });
for (const flag of ['0', 'true', '', undefined]) {
  test(`incomplete hosted flag ${String(flag)} is rejected`, () => assert.throws(() => selectBuildSurface({ ...hosted('admin'), VERCEL: flag }), /INCOMPLETE_VERCEL_CONTEXT/));
}
for (const surface of [undefined, '', 'combined', 'ADMIN', '../admin']) {
  test(`ambiguous local surface ${String(surface)} is rejected`, () => assert.throws(() => selectBuildSurface({ VITE_DEPLOY_SURFACE: surface }), /EXPLICIT_RELEASE_SURFACE_REQUIRED/));
}
test('target declarations are immutable', () => { assert.equal(Object.isFrozen(buildTargets), true); for (const target of Object.values(buildTargets)) assert.equal(Object.isFrozen(target), true); });
test('selection never reads unrelated private values', () => {
  const input = hosted('admin');
  for (const name of ['YTRACE_PRODUCTION_DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_UNKNOWN_BUILD_INPUT']) Object.defineProperty(input, name, { enumerable: true, get() { throw Error('PRIVATE_VALUE_READ'); } });
  assert.equal(selectBuildSurface(input), 'admin');
});
test('unknown and dynamic errors never disclose provider values', () => {
  for (const error of [new Error('private-value'), new Error('VERCEL_TARGET_REJECTED private-value'), new Error('UNREVIEWED_UPPERCASE_DETAIL'), { message: 'VERCEL_TARGET_REJECTED' }, undefined, 'private-value']) assert.equal(safeBuildError(error), 'RELEASE_BUILD_FAILED');
  assert.equal(safeBuildError(new Error('VERCEL_TARGET_REJECTED')), 'VERCEL_TARGET_REJECTED');
});
test('generic local build is preserved and hosted build uses the dispatcher', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'))), config = JSON.parse(readFileSync(path.join(root, 'vercel.json')));
  assert.equal(pkg.scripts.build, 'vite build');
  assert.equal(pkg.scripts['build:vercel'], 'node scripts/build-release.mjs');
  assert.equal(pkg.scripts['build:admin'], 'node scripts/build-admin-release.mjs');
  assert.equal(pkg.scripts['build:organization'], 'node scripts/build-organization-release.mjs');
  assert.equal(pkg.engines.node, '24.x');
  assert.equal(config.buildCommand, 'npm run build:vercel');
  assert.equal(config.installCommand, 'npm ci --include=dev --no-audit --no-fund');
});

function invoke(args, input) {
  const env = {};
  for (const name of ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'ComSpec', 'PATHEXT']) if (process.env[name] !== undefined) env[name] = process.env[name];
  return spawnSync(process.execPath, ['scripts/build-release.mjs', ...args], { cwd: root, env: { ...env, ...input }, encoding: 'utf8', timeout: 10000, maxBuffer: 1048576, windowsHide: true });
}
test('real CLI rejects an unknown hosted target without launching a build', () => {
  const result = invoke([], { ...hosted('admin'), VERCEL_PROJECT_ID: 'prj_other', YTRACE_PRODUCTION_DB_PASSWORD: 'synthetic-canary' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), { status: 'FAIL', reason: 'VERCEL_TARGET_REJECTED' });
  assert.equal(result.stderr.includes('synthetic-canary'), false);
});
test('real CLI rejects arbitrary arguments before build selection', () => {
  const result = invoke(['--project=other'], hosted('admin'));
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(result.stderr), { status: 'FAIL', reason: 'BUILD_ARGUMENT_REJECTED' });
});
