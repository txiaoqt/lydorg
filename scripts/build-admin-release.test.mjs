import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareBuildEnvironment, configurationHash, emptyEnvironmentDirectory, vercelFrameworkMetadata } from './build-admin-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const token = claims => `fixture.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.not-a-real-key`;
const env = { VITE_DEPLOY_SURFACE: 'admin', VITE_SUPABASE_URL: 'https://mqqaykksadotbrghbexz.supabase.co', VITE_ADMIN_APP_URL: 'https://y-trace-admin.vercel.app', VITE_SUPABASE_ANON_KEY: token({ role: 'anon', ref: 'mqqaykksadotbrghbexz' }) };
const policy = { publicNames: Object.keys(env).sort(), publicConfigurationSha256: configurationHash(env), projectId: 'prj_J36xqAUQELX8NttCaFFInsxcCEaI' };
const build = input => prepareBuildEnvironment(input, policy, '24.21.0');
test('Node 24 accepts the reviewed public configuration', () => assert.equal(build(env).VITE_DEPLOY_SURFACE, 'admin'));
test('Node 22 is rejected', () => assert.throws(() => prepareBuildEnvironment(env, policy, '22.14.0'), /NODE24_REQUIRED/));
test('another Vercel project is rejected', () => assert.throws(() => build({ ...env, VERCEL:'1', VERCEL_PROJECT_ID:'prj_other', VERCEL_ENV:'production' }), /VERCEL_TARGET_REJECTED/));
test('Vercel preview is rejected', () => assert.throws(() => build({ ...env, VERCEL:'1', VERCEL_PROJECT_ID:policy.projectId, VERCEL_ENV:'preview' }), /VERCEL_TARGET_REJECTED/));
test('the exact production Vercel target is accepted', () => assert.equal(build({ ...env, VERCEL:'1', VERCEL_PROJECT_ID:policy.projectId, VERCEL_ENV:'production' }).VITE_DEPLOY_SURFACE, 'admin'));
test('organization surface is rejected', () => assert.throws(() => build({ ...env, VITE_DEPLOY_SURFACE:'user' }), /ADMIN_SURFACE_REQUIRED/));
test('a different Supabase origin is rejected', () => assert.throws(() => build({ ...env, VITE_SUPABASE_URL:'https://example.invalid' }), /PRODUCTION_ORIGIN_REQUIRED/));
test('a different Admin URL is rejected', () => assert.throws(() => build({ ...env, VITE_ADMIN_APP_URL:'https://example.invalid' }), /ADMIN_URL_REQUIRED/));
test('service-role key class is rejected before fingerprint comparison', () => assert.throws(() => build({ ...env, VITE_SUPABASE_ANON_KEY:token({role:'service_role',ref:'mqqaykksadotbrghbexz'}) }), /PUBLIC_KEY_PROJECT_OR_ROLE_REJECTED/));
test('an anon key from another project is rejected', () => assert.throws(() => build({ ...env, VITE_SUPABASE_ANON_KEY:token({role:'anon',ref:'other'}) }), /PUBLIC_KEY_PROJECT_OR_ROLE_REJECTED/));
test('unexpected public variables are rejected', () => assert.throws(() => build({ ...env, VITE_SERVICE_ROLE_KEY:'fixture-only' }), /UNREVIEWED_PUBLIC_VARIABLE/));
test('the irrelevant standalone user PWA flag is rejected', () => assert.throws(() => build({ ...env, VITE_ENABLE_STANDALONE_USER_PWA_UI:'true' }), /UNREVIEWED_PUBLIC_VARIABLE/));
test('otherwise valid configuration drift is rejected', () => assert.throws(() => build({ ...env, VITE_SUPABASE_ANON_KEY:token({role:'anon',ref:'mqqaykksadotbrghbexz',extra:true}) }), /PUBLIC_CONFIGURATION_DRIFT/));
test('server, operator, PostgreSQL and session values do not enter the worker', () => {
  const clean = build({ ...env, SUPABASE_SERVICE_ROLE_KEY:'fixture-only', YTRACE_PRODUCTION_DB_PASSWORD:'fixture-only', YTRACE_ADMIN_SESSION_TOKEN:'fixture-only', VERCEL_OIDC_TOKEN:'fixture-only', NODE_OPTIONS:'--inspect' });
  assert.equal(Object.keys(clean).some(k=>/^(YTRACE_|SUPABASE_|VERCEL_|NODE_OPTIONS)/.test(k)), false);
});
test('the Vite environment directory must stay empty', () => {
  const dir=mkdtempSync(path.join(tmpdir(),'ytrace-build-env-')); const empty=emptyEnvironmentDirectory(dir);
  assert.equal(empty.endsWith('.admin-build-env'),true); const file=path.join(empty,'.env');writeFileSync(file,'VITE_FIXTURE=not-a-secret\n');
  assert.throws(()=>emptyEnvironmentDirectory(dir),/BUILD_ENV_DIRECTORY_NOT_EMPTY/);
  unlinkSync(file);rmdirSync(empty);rmdirSync(path.dirname(empty));rmdirSync(dir);
});
test('npm and Vercel entrypoints invoke the packaged deterministic wrapper', () => {
  const pkg=JSON.parse(readFileSync(path.join(root,'package.json'))); const vercel=JSON.parse(readFileSync(path.join(root,'vercel.json')));
  assert.equal(pkg.scripts.build,'vite build');assert.equal(pkg.scripts['build:vercel'],'node scripts/build-release.mjs');assert.equal(pkg.scripts['build:admin'],'node scripts/build-admin-release.mjs');
  assert.equal(vercel.buildCommand,'npm run build:vercel');assert.equal(vercel.installCommand,'npm ci --include=dev --no-audit --no-fund');assert.equal(vercel.outputDirectory,'build');
});
test('package-lock, API code, SPA routes and CSP retain their reviewed identities', () => {
  const config=JSON.parse(readFileSync(path.join(root,'scripts/admin-release-config.json')));const hash=b=>createHash('sha256').update(b).digest('hex');
  for(const f of config.preservedFiles)assert.equal(hash(readFileSync(path.join(root,f.path))),f.sha256);
  const vercel=JSON.parse(readFileSync(path.join(root,'vercel.json')));assert.equal(hash(JSON.stringify({rewrites:vercel.rewrites,headers:vercel.headers})),config.routingAndHeadersSha256);
});

const providerEnvironment = { ...env, VERCEL:'1', VERCEL_PROJECT_ID:policy.projectId, VERCEL_ENV:'production' };
test('documented Vercel framework metadata is accepted and discarded', () => {
  const injected=Object.fromEntries(vercelFrameworkMetadata.map(name=>[name, name==='VITE_VERCEL_ENV'||name==='VITE_VERCEL_TARGET_ENV'?'production':'fixture-metadata']));
  const clean=build({ ...providerEnvironment, ...injected });
  assert.deepEqual(Object.keys(clean).filter(name=>name.startsWith('VITE_')).sort(),Object.keys(env).sort());
  for(const name of vercelFrameworkMetadata)assert.equal(clean[name],undefined);
});
test('unknown provider-prefixed variables are discarded after production target verification', () => {
  const clean=build({...providerEnvironment,VITE_VERCEL_FUTURE_METADATA:'fixture-future-provider-never-client'});
  assert.deepEqual(clean,build(providerEnvironment));
  assert.equal(clean.VITE_VERCEL_FUTURE_METADATA,undefined);
});
test('provider framework metadata cannot bypass the verified Vercel context', () => assert.throws(()=>build({...env,VITE_VERCEL_URL:'fixture.invalid'}),/UNREVIEWED_PUBLIC_VARIABLE/));
test('conflicting provider framework environment is rejected', () => {
  assert.throws(()=>build({...providerEnvironment,VITE_VERCEL_ENV:'preview'}),/VERCEL_FRAMEWORK_ENVIRONMENT_DRIFT/);
  assert.throws(()=>build({...providerEnvironment,VITE_VERCEL_TARGET_ENV:'custom'}),/VERCEL_FRAMEWORK_ENVIRONMENT_DRIFT/);
});

test('observability metadata stays opaque and is discarded in the verified production context', () => {
  const clean=build({...providerEnvironment,VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG:'fixture-observability-metadata-never-client: not JSON'});
  assert.deepEqual(clean,build(providerEnvironment));
  assert.equal(clean.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG,undefined);
  assert.equal(JSON.stringify(clean).includes('fixture-observability-metadata-never-client'),false);
});

test('observability metadata is rejected outside Vercel', () => {
  assert.throws(()=>build({...env,VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG:'fixture-only'}),/UNREVIEWED_PUBLIC_VARIABLE/);
});

test('observability metadata cannot bypass the exact Vercel project', () => {
  assert.throws(()=>build({...providerEnvironment,VERCEL_PROJECT_ID:'prj_other',VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG:'fixture-only'}),/VERCEL_TARGET_REJECTED/);
});

test('observability metadata cannot enable a preview build', () => {
  assert.throws(()=>build({...providerEnvironment,VERCEL_ENV:'preview',VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG:'fixture-only'}),/VERCEL_TARGET_REJECTED/);
});

test('similarly named observability extras are discarded rather than forwarded', () => {
  const clean=build({...providerEnvironment,VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG_EXTRA:'fixture-only'});
  assert.deepEqual(clean,build(providerEnvironment));
  assert.equal(clean.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG_EXTRA,undefined);
});

test('a completely unknown public-prefixed variable is discarded in the verified context', () => {
  const clean=build({...providerEnvironment,VITE_UNKNOWN_BUILD_INPUT:'fixture-arbitrary-public-never-client'});
  assert.deepEqual(clean,build(providerEnvironment));
  assert.equal(clean.VITE_UNKNOWN_BUILD_INPUT,undefined);
});

test('a sensitive canary under an unknown public name never enters clean inputs', () => {
  const canary='fixture-sensitive-canary-never-client-20261012';
  const clean=build({...providerEnvironment,VITE_SYNTHETIC_SENSITIVE_INPUT:canary});
  assert.deepEqual(clean,build(providerEnvironment));
  assert.equal(JSON.stringify(clean).includes(canary),false);
});

test('unknown values are not inspected while constructing verified production inputs', () => {
  const input={...providerEnvironment};
  Object.defineProperty(input,'VITE_FUTURE_OPAQUE_INPUT',{enumerable:true,get(){throw Error('UNKNOWN_VALUE_READ');}});
  assert.deepEqual(build(input),build(providerEnvironment));
});

test('unknown provider metadata still rejects a wrong project before discarding', () => {
  assert.throws(()=>build({...providerEnvironment,VERCEL_PROJECT_ID:'prj_other',VITE_VERCEL_FUTURE_METADATA:'fixture-only'}),/VERCEL_TARGET_REJECTED/);
});

test('unknown public metadata cannot permit preview, staging or development targets', () => {
  for(const target of ['preview','staging','development']) {
    assert.throws(()=>build({...providerEnvironment,VERCEL_ENV:target,VITE_UNKNOWN_BUILD_INPUT:'fixture-only'}),/VERCEL_TARGET_REJECTED/);
  }
});

test('provider identity and production environment are both mandatory before discarding', () => {
  const missingProject={...providerEnvironment,VITE_UNKNOWN_BUILD_INPUT:'fixture-only'};delete missingProject.VERCEL_PROJECT_ID;
  const missingEnvironment={...providerEnvironment,VITE_UNKNOWN_BUILD_INPUT:'fixture-only'};delete missingEnvironment.VERCEL_ENV;
  assert.throws(()=>build(missingProject),/VERCEL_TARGET_REJECTED/);
  assert.throws(()=>build(missingEnvironment),/VERCEL_TARGET_REJECTED/);
});

test('standalone builds reject unknown provider and arbitrary public names', () => {
  for(const name of ['VITE_VERCEL_FUTURE_METADATA','VITE_UNKNOWN_BUILD_INPUT','VITE_SYNTHETIC_SENSITIVE_INPUT']) {
    assert.throws(()=>build({...env,[name]:'fixture-only'}),/UNREVIEWED_PUBLIC_VARIABLE/);
  }
});

test('missing or invalid hosted-context flags never enable public-input discarding', () => {
  for(const flag of [undefined,'0','true','2']) {
    const input={...env,VERCEL_PROJECT_ID:policy.projectId,VERCEL_ENV:'production',VITE_UNKNOWN_BUILD_INPUT:'fixture-only'};
    if(flag!==undefined)input.VERCEL=flag;
    assert.throws(()=>build(input),/UNREVIEWED_PUBLIC_VARIABLE/);
  }
});

test('each required application variable remains mandatory with extra metadata present', () => {
  for(const name of policy.publicNames) {
    const input={...providerEnvironment,VITE_UNKNOWN_BUILD_INPUT:'fixture-only'};delete input[name];
    assert.throws(()=>build(input));
  }
});

test('each changed approved application variable still fails closed in production', () => {
  const changes={VITE_DEPLOY_SURFACE:'user',VITE_SUPABASE_URL:'https://zroudsvpswqsjlyttkjf.supabase.co',VITE_ADMIN_APP_URL:'https://example.invalid',VITE_SUPABASE_ANON_KEY:token({role:'anon',ref:'mqqaykksadotbrghbexz',changed:true})};
  for(const [name,value]of Object.entries(changes))assert.throws(()=>build({...providerEnvironment,[name]:value,VITE_UNKNOWN_BUILD_INPUT:'fixture-only'}));
});

test('server-role keys remain rejected even when unknown metadata is discarded', () => {
  assert.throws(()=>build({...providerEnvironment,VITE_SUPABASE_ANON_KEY:token({role:'service_role',ref:'mqqaykksadotbrghbexz'}),VITE_UNKNOWN_BUILD_INPUT:'fixture-only'}),/PUBLIC_KEY_PROJECT_OR_ROLE_REJECTED/);
});

test('parent release-version overrides do not enter the worker or change the pinned identity', () => {
  const clean=build({...providerEnvironment,VITE_APP_VERSION:'fixture-version-override-never-client'});
  assert.equal(clean.VITE_APP_VERSION,undefined);
  const config=JSON.parse(readFileSync(path.join(root,'scripts/admin-release-config.json')));
  assert.equal(config.fixedVersion,'1.0.0-admin-integration-rc+20261015173334.vercel24');
  assert.deepEqual(config.publicNames,policy.publicNames);
});

test('only reviewed runtime inputs and four public variables reach a real child process', () => {
  const input={...providerEnvironment,PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,
    VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG:'fixture-observability-metadata-never-client',
    VITE_VERCEL_FUTURE_METADATA:'fixture-future-provider-never-client',
    VITE_UNKNOWN_BUILD_INPUT:'fixture-arbitrary-public-never-client',
    VITE_SYNTHETIC_SENSITIVE_INPUT:'fixture-sensitive-canary-never-client-20261012',
    VITE_APP_VERSION:'fixture-version-override-never-client',
    SUPABASE_SERVICE_ROLE_KEY:'fixture-server-secret-never-client',
    YTRACE_ADMIN_SESSION_TOKEN:'fixture-admin-session-never-client',
    YTRACE_PRODUCTION_DB_PASSWORD:'fixture-database-password-never-client',
    VERCEL_OIDC_TOKEN:'fixture-private-metadata',NODE_OPTIONS:'--inspect',UNREVIEWED_RUNTIME_INPUT:'fixture-only'};
  const clean=build(input);
  const allowedRuntime=['PATH','SystemRoot','WINDIR','TEMP','TMP','TMPDIR','ComSpec','PATHEXT','LANG','LC_ALL','NODE_ENV','TZ'];
  assert.equal(Object.keys(clean).every(name=>policy.publicNames.includes(name)||allowedRuntime.includes(name)),true);
  const code=`const expected=${JSON.stringify(policy.publicNames)};const names=Object.keys(process.env);const actual=names.filter(n=>n.startsWith('VITE_')).sort();const valid=JSON.stringify(actual)===JSON.stringify(expected)&&!names.some(n=>/^(YTRACE_|SUPABASE_|VERCEL_|NODE_OPTIONS|UNREVIEWED_RUNTIME_INPUT)/.test(n))&&process.env.NODE_ENV==='production'&&process.env.TZ==='UTC';process.stdout.write(valid?'ISOLATED_CHILD_PASS':'ISOLATED_CHILD_FAIL');process.exitCode=valid?0:1;`;
  const child=spawnSync(process.execPath,['--eval',code],{env:clean,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(child.status,0);
  assert.equal(child.stdout,'ISOLATED_CHILD_PASS');
  assert.equal(child.stderr,'');
});
