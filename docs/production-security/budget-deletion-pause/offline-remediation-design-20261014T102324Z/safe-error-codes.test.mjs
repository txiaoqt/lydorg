// NON-RUNNABLE — NOT AUTHORIZED. Synthetic error/model tests only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WrapperFailure } from '../outer-preflight-wrapper-candidate-20261014T054751Z/deadline-controls.mjs';
import { SAFE_ERROR_CODES, safeErrorCode } from './safe-error-codes.mjs';
import { createIntegrationEngine, PORT_NAMES } from './integration-engine.mjs';
const canary = 'PRIVATE_SYNTHETIC_CANARY';
for (const code of SAFE_ERROR_CODES) test('fixed safe typed code: ' + code, () => {
  assert.equal(safeErrorCode(new WrapperFailure(code)), code);
});
function typed(value) { const e = new WrapperFailure('ARTIFACT_DRIFT'); e.code = value; return e; }
for (const [name, value] of [
  ['unknown', canary], ['url', 'https://synthetic.invalid/file?token=' + canary],
  ['newline', 'ARTIFACT_DRIFT\n' + canary], ['oversize', canary.repeat(10000)],
  ['number', 42], ['null', null], ['undefined', undefined], ['object', { privateValue: canary }],
  ['array', [canary]], ['symbol', Symbol(canary)],
]) test('unsafe typed code suppressed: ' + name, () => {
  assert.equal(safeErrorCode(typed(value)), 'TRUSTED_IO_FAILED');
});
test('plain, foreign and untyped errors never confer safe-code trust', () => {
  for (const e of [Error(canary), Object.assign(Error(canary), { code: 'ARTIFACT_DRIFT' }),
    { code: 'ARTIFACT_DRIFT' }, null, undefined, canary]) {
    assert.equal(safeErrorCode(e), 'TRUSTED_IO_FAILED');
  }
});
test('code accessors and inherited code are not evaluated or accepted', () => {
  let reads = 0;
  const e = new WrapperFailure('ARTIFACT_DRIFT');
  Object.defineProperty(e, 'code', { get() { reads++; throw Error(canary); } });
  assert.equal(safeErrorCode(e), 'TRUSTED_IO_FAILED'); assert.equal(reads, 0);
  const inherited = new WrapperFailure('ARTIFACT_DRIFT'); delete inherited.code;
  assert.equal(safeErrorCode(inherited), 'TRUSTED_IO_FAILED');
});
test('hostile descriptor trap fails closed and cannot escape the sanitizer', () => {
  const e = new Proxy(new WrapperFailure('ARTIFACT_DRIFT'), {
    getOwnPropertyDescriptor() { throw Error(canary); },
  });
  assert.equal(safeErrorCode(e), 'TRUSTED_IO_FAILED');
});
test('non-string code is never string-coerced', () => {
  let reads = 0;
  assert.equal(safeErrorCode(typed({ toString() { reads++; throw Error(canary); } })), 'TRUSTED_IO_FAILED');
  assert.equal(reads, 0);
});
test('allowlist is immutable and has no PASS or arbitrary identifier escape', () => {
  assert.ok(Object.isFrozen(SAFE_ERROR_CODES));
  assert.throws(() => SAFE_ERROR_CODES.push(canary));
  assert.equal(safeErrorCode(typed('PASS')), 'TRUSTED_IO_FAILED');
  assert.equal(safeErrorCode(typed('ARTIFACT_DRIFT_' + canary)), 'TRUSTED_IO_FAILED');
});
function input() {
  return { approval: { reference: 'OFFLINE-SYNTHETIC-F5', approver: 'SYNTHETIC_REVIEWER',
    approvedAt: '2031-02-28T23:59:59Z', validityStartUtc: '2031-03-01T00:00:00Z',
    validityEndUtc: '2031-03-01T00:10:00Z' },
  expectedStale: { sha256: 'a'.repeat(64), bytes: 1,
    metadata: { createdAt: '2031-02-28T23:00:00Z', writtenAt: '2031-02-28T23:00:00Z',
      owner: 'SYNTHETIC_OWNER', aclSha256: 'b'.repeat(64) } }, references: {} };
}
for (const [name, error, expected] of [
  ['ordinary', Error(canary), 'TRUSTED_IO_FAILED'],
  ['typed arbitrary', new WrapperFailure(canary), 'TRUSTED_IO_FAILED'],
  ['typed safe', new WrapperFailure('ARTIFACT_DRIFT'), 'ARTIFACT_DRIFT'],
]) test('coordinator provider boundary: ' + name, async () => {
  let calls = 0;
  const ports = Object.fromEntries(PORT_NAMES.map(name => [name, async () => {
    calls++; assert.equal(name, 'verifyArtifacts'); throw error;
  }]));
  const engine = createIntegrationEngine({ ports,
    makePreflight: () => { throw Error('must not construct wrapper'); },
    now: () => Date.parse('2031-03-01T00:00:00Z'), monotonicNow: () => 0 });
  const result = await engine.run(input());
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, expected);
  assert.equal(result.launches, 0); assert.equal(calls, 1);
  assert.ok(!JSON.stringify(result).includes(canary));
  await engine.run(input()); assert.equal(calls, 1);
});
test('final catch also sanitizes a typed clock exception without provider calls', async () => {
  let calls = 0;
  const ports = Object.fromEntries(PORT_NAMES.map(name => [name, async () => { calls++; }]));
  const engine = createIntegrationEngine({ ports,
    makePreflight: () => { throw Error('unused'); },
    now: () => { throw new WrapperFailure(canary); }, monotonicNow: () => 0 });
  const result = await engine.run(input());
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, 'TRUSTED_IO_FAILED');
  assert.equal(calls, 0); assert.ok(!JSON.stringify(result).includes(canary));
});
