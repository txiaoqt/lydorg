// Local synthetic bytes only. No real env file, credentials or database access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { FOUNDATION_KEYS, verifyFoundationEnvironment } from './verify-foundation-environment.mjs';

const directory = await mkdtemp(resolve(tmpdir(), 'ytrace-env-setup-'));
const caPath = resolve(directory, 'local-fixture-ca.crt');
const caBytes = Buffer.from('Synthetic hash fixture; not a trusted certificate.');
await writeFile(caPath, caBytes);
const caHash = createHash('sha256').update(caBytes).digest('hex');
const fixture = {
  YTRACE_PRODUCTION_DB_PASSWORD: 'synthetic-parser-fixture#with$dollar',
  YTRACE_PRODUCTION_DB_CA_FILE: caPath,
  YTRACE_PRODUCTION_DB_CA_SHA256: caHash,
};

test('empty required assignments report only variable names and presence', async () => {
  const result = await verifyFoundationEnvironment(Object.fromEntries(FOUNDATION_KEYS.map((key) => [key, ''])));
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'MISSING_REQUIRED_VARIABLES');
  assert.ok(result.variables.every((item) => item.present === false));
  assert.equal(result.networkAttempted, false);
});

test('example placeholder cannot be mistaken for configured credentials', async () => {
  assert.equal((await verifyFoundationEnvironment({ ...fixture, YTRACE_PRODUCTION_DB_PASSWORD: 'REPLACE_WITH_DATABASE_PASSWORD' })).reason, 'EXAMPLE_PLACEHOLDER_NOT_A_CREDENTIAL');
});

test('existing local CA bytes must match the supplied fingerprint', async () => {
  const result = await verifyFoundationEnvironment(fixture);
  assert.equal(result.status, 'PASS');
  assert.equal(result.caFileExists, true);
  assert.equal(result.caSha256Matches, true);
  for (const value of Object.values(fixture)) assert.ok(!JSON.stringify(result).includes(value));
});

test('relative CA path is rejected', async () => {
  assert.equal((await verifyFoundationEnvironment({ ...fixture, YTRACE_PRODUCTION_DB_CA_FILE: 'relative-ca.crt' })).reason, 'CA_PATH_MUST_BE_ABSOLUTE');
});

test('malformed fingerprint is rejected', async () => {
  assert.equal((await verifyFoundationEnvironment({ ...fixture, YTRACE_PRODUCTION_DB_CA_SHA256: 'not-a-fingerprint' })).reason, 'CA_FINGERPRINT_MUST_BE_64_HEX');
});

test('missing CA is reported without exposing its path or driver error', async () => {
  const path = resolve(directory, 'missing-sensitive-path.crt');
  const result = await verifyFoundationEnvironment({ ...fixture, YTRACE_PRODUCTION_DB_CA_FILE: path });
  assert.equal(result.reason, 'CA_FILE_MISSING_OR_UNREADABLE');
  assert.equal(result.caFileExists, false);
  assert.ok(!JSON.stringify(result).includes(path));
});

test('directory cannot be used as CA file', async () => {
  assert.equal((await verifyFoundationEnvironment({ ...fixture, YTRACE_PRODUCTION_DB_CA_FILE: directory })).reason, 'CA_PATH_NOT_A_REGULAR_FILE');
});

test('wrong fingerprint fails closed', async () => {
  const result = await verifyFoundationEnvironment({ ...fixture, YTRACE_PRODUCTION_DB_CA_SHA256: '0'.repeat(64) });
  assert.equal(result.reason, 'CA_FINGERPRINT_MISMATCH');
  assert.equal(result.caSha256Matches, false);
});

function cleanEnvironment() {
  const env = { ...process.env };
  for (const key of FOUNDATION_KEYS) delete env[key];
  delete env.NODE_OPTIONS;
  return env;
}

test('supported Node --env-file loads quoted values into only its child process', async () => {
  const file = resolve(directory, 'synthetic.env');
  await writeFile(file, Object.entries(fixture).map(([key, value]) => `${key}='${value}'`).join('\n') + '\n');
  const env = cleanEnvironment();
  const child = spawnSync(process.execPath, [`--env-file=${file}`, 'scripts/security/verify-foundation-environment.mjs'], { env, encoding: 'utf8' });
  assert.equal(child.status, 0);
  assert.equal(JSON.parse(child.stdout).status, 'PASS');
  for (const value of Object.values(fixture)) assert.ok(!child.stdout.includes(value));
  for (const key of FOUNDATION_KEYS) assert.equal(env[key], undefined);
});

const configCheck = `
import { loadConfigFromFile } from 'vite';
try {
 const result = await loadConfigFromFile({ command: 'build', mode: process.env.YTRACE_TEST_MODE || 'production' }, 'vite.config.ts', process.cwd(), 'silent');
 console.log(JSON.stringify({ status: 'PASS', envPrefix: result.config.envPrefix }));
} catch {
 console.log(JSON.stringify({ status: 'BLOCKED' })); process.exitCode = 2;
}`;

test('Vite refuses foundation mode before loading the private env file', () => {
  // .env.foundation.local can also be .env.[mode] for foundation.local, and
  // Windows resolves case variants to the same private file.
  for (const mode of ['foundation', 'foundation.local', 'FOUNDATION', 'Foundation.local']) {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', configCheck], { env: { ...cleanEnvironment(), YTRACE_TEST_MODE: mode }, encoding: 'utf8' });
    assert.equal(child.status, 2);
    assert.equal(JSON.parse(child.stdout).status, 'BLOCKED');
  }
});

test('Vite refuses inherited private operator variables, including empty ones', () => {
  for (const key of FOUNDATION_KEYS) {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', configCheck], { env: { ...cleanEnvironment(), [key]: '' }, encoding: 'utf8' });
    assert.equal(child.status, 2);
    assert.equal(JSON.parse(child.stdout).status, 'BLOCKED');
  }
});

test('ordinary production config resolves with only VITE_ client exposure', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', configCheck], { env: cleanEnvironment(), encoding: 'utf8' });
  assert.equal(child.status, 0);
  assert.deepEqual(JSON.parse(child.stdout), { status: 'PASS', envPrefix: 'VITE_' });
});
