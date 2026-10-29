// Offline guard tests only. Child processes receive no real database credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const probe = fileURLToPath(new URL('./native-postgres-readonly-probe.mjs', import.meta.url));
const sentinel = 'OFFLINE_TEST_VALUE_NOT_A_REAL_CREDENTIAL';
function invoke(args, extra = {}) {
  const environment = {};
  for (const name of ['SystemRoot', 'WINDIR', 'PATH', 'TEMP', 'TMP']) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  const result = spawnSync(process.execPath, [probe, ...args], {
    cwd: process.cwd(), env: {...environment, ...extra},
    encoding: 'utf8', timeout: 10000, windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 2);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.includes(sentinel), false);
  return JSON.parse(result.stdout);
}

test('missing credentials stop before any connection', () => {
  const result = invoke([]);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.connectionAttempted, false);
  assert.equal(result.sqlInstallationSupported, false);
  assert.deepEqual(result.missing, [
    'YTRACE_PRODUCTION_DB_PASSWORD', 'YTRACE_PRODUCTION_DB_CA_FILE',
    'YTRACE_PRODUCTION_DB_CA_SHA256',
  ]);
});

test('same-size read-only mode still requires TLS prerequisites and never prints password', () => {
  const result = invoke(['--same-size'], {YTRACE_PRODUCTION_DB_PASSWORD: sentinel});
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.connectionAttempted, false);
  assert.equal(result.sqlInstallationSupported, false);
  assert.deepEqual(result.missing, ['YTRACE_PRODUCTION_DB_CA_FILE', 'YTRACE_PRODUCTION_DB_CA_SHA256']);
});

test('installation arguments are rejected; no write mode exists', () => {
  const result = invoke(['--execute'], {YTRACE_PRODUCTION_DB_PASSWORD: sentinel});
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /cannot install SQL/);
});
