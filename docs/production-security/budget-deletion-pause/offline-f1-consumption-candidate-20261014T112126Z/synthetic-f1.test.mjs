// NON-RUNNABLE — NOT AUTHORIZED. Offline fixtures and in-memory observations only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { bindSyntheticContext, PROJECT, PURPOSE } from './synthetic-f1-core.mjs';
import { createSyntheticInvocation, FAULTS } from './disposable-ledger.mjs';
import { createDisposableFixture, destroyDisposableFixture, inspectSyntheticRecord,
  seedSyntheticState, admitFixture } from './fixture-harness.mjs';
const childPath = fileURLToPath(new URL('./synthetic-child.mjs', import.meta.url));
const cwd = fileURLToPath(new URL('.', import.meta.url));
function context(patch = {}) {
  return { authorizationReference: 'SYNTHETIC-AUTH-ALPHA', project: PROJECT, purpose: PURPOSE,
    nonce: 'SYNTHETIC-NONCE-ONE', proofSha256: 'a'.repeat(64), bundleSha256: 'b'.repeat(64),
    approvedAt: '2031-03-01T00:00:00Z', validFromUtc: '2031-03-01T00:00:00Z',
    validUntilUtc: '2031-03-01T01:00:00Z', ...patch };
}
async function fixture(t) {
  const value = await createDisposableFixture();
  t.after(() => destroyDisposableFixture(value));
  return value;
}
const changes = [
  ['nonce', { nonce: 'SYNTHETIC-NONCE-TWO' }],
  ['proof hash', { proofSha256: 'd'.repeat(64) }],
  ['bundle', { bundleSha256: 'e'.repeat(64) }],
  ['approval timestamp', { approvedAt: '2031-02-28T23:59:59Z' }],
  ['validity start', { validFromUtc: '2031-03-01T00:00:01Z' }],
  ['validity end', { validUntilUtc: '2031-03-01T02:00:00Z' }],
];
async function preparedChild(t, options) {
  const child = fork(childPath, [], { cwd, execPath: process.execPath, execArgv: [],
    env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows', TEMP: tmpdir(), TMP: tmpdir() },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });
  let stdout = '', stderr = '', closed = false;
  child.stdout.on('data', b => { stdout += b; }); child.stderr.on('data', b => { stderr += b; });
  const messages = [], waiters = [];
  child.on('message', message => {
    const index = waiters.findIndex(w => w.kind === message.kind);
    if (index >= 0) { const w = waiters.splice(index, 1)[0]; clearTimeout(w.timer); w.resolve(message); }
    else messages.push(message);
  });
  const exit = new Promise(resolve => child.once('close', (code, signal) => { closed = true; resolve({ code, signal }); }));
  const wait = kind => {
    const i = messages.findIndex(m => m.kind === kind);
    if (i >= 0) return Promise.resolve(messages.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { kind, resolve, reject };
      w.timer = setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) waiters.splice(i, 1);
        reject(Error('SYNTHETIC_CHILD_MESSAGE_TIMEOUT')); }, 7000);
      waiters.push(w);
    });
  };
  const stop = async () => {
    if (!closed) child.kill('SIGKILL');
    const result = await exit;
    assert.equal(stdout, ''); assert.equal(stderr, '');
    return result;
  };
  t.after(stop);
  await wait('READY');
  let started = false;
  return {
    start() { assert.equal(started, false); started = true; child.send({ kind: 'SYNTHETIC_RUN', options }); },
    async result() { const value = (await wait('RESULT')).result; const end = await exit;
      assert.equal(end.code, 0); assert.equal(stdout, ''); assert.equal(stderr, ''); return value; },
    held: () => wait('HELD'), stop,
  };
}
async function inChild(t, options) {
  const child = await preparedChild(t, options); child.start(); return child.result();
}
function assertStopped(value, calls = 0) {
  assert.equal(value.status, 'BLOCKED'); assert.equal(value.observationCalls, calls);
  assert.equal(value.automaticRetries, 0); assert.equal(value.retainConsumption, true);
  assert.equal(value.productionAuthorized, false);
}

test('fixed synthetic scope; full context bound while the authorization key is stable', () => {
  const a = bindSyntheticContext(context()); assert.ok(Object.isFrozen(a.context));
  for (const [, patch] of changes) {
    const b = bindSyntheticContext(context(patch)); assert.equal(b.key, a.key); assert.notEqual(b.contextSha256, a.contextSha256);
  }
});
for (const [label, patch] of [
  ['non-synthetic project', { project: 'OTHER-PROJECT' }],
  ['changed purpose', { purpose: 'OTHER-PURPOSE' }],
  ['authorization case alias', { authorizationReference: 'synthetic-auth-alpha' }],
  ['authorization whitespace alias', { authorizationReference: 'SYNTHETIC-AUTH-ALPHA ' }],
  ['timezone-free timestamp', { approvedAt: '2031-03-01T00:00:00' }],
  ['future ordered interval ambiguity', { validFromUtc: '2031-03-01T02:00:00Z' }],
  ['invalid calendar', { approvedAt: '2031-02-30T00:00:00Z' }],
  ['unexpected context field', { extra: 'SYNTHETIC_ONLY' }],
]) test('invalid binding denied before fixture access: ' + label, () => {
  assert.throws(() => createSyntheticInvocation({ fixture: null, context: context(patch) }));
});
test('property getters cannot supply a context field', () => {
  const a = context(); let reads = 0;
  Object.defineProperty(a, 'nonce', { enumerable: true, get() { reads++; throw Error('SYNTHETIC_CANARY'); } });
  assert.throws(() => bindSyntheticContext(a)); assert.equal(reads, 0);
});
test('no production capability, alternate transport, or resume option is exposed', () => {
  const value = createSyntheticInvocation({ fixture: null, context: context() });
  assert.deepEqual(Object.keys(value).sort(), ['run', 'snapshot']); assert.ok(Object.isFrozen(value));
});
test('non-fixture paths are rejected before filesystem inspection', async () => {
  await assert.rejects(admitFixture({ format: 'OFFLINE_F1_DISPOSABLE_FIXTURE_V1',
    fixtureId: '00000000-0000-4000-8000-000000000000', root: 'C:\\offline-invalid-root' }));
});
test('wrong disposable fixture identifier fails closed without consumption', async t => {
  const f = await fixture(t), wrong = { ...f, fixtureId: '00000000-0000-4000-8000-000000000000' };
  const value = await createSyntheticInvocation({ fixture: wrong, context: context() }).run();
  assertStopped(value); assert.equal((await inspectSyntheticRecord(f, context())).exists, false);
});
test('record create/write/sync/readback precede the sole in-memory observation', async t => {
  const f = await fixture(t), run = createSyntheticInvocation({ fixture: f, context: context() });
  const value = await run.run(); assert.equal(value.status, 'SYNTHETIC_PASS');
  assert.equal(value.observationCalls, 1); assert.equal(value.createCalls, 1); assert.equal(value.fileSyncAcknowledged, true);
  assert.ok(value.events.indexOf('VERIFIED') < value.events.indexOf('OBSERVATION_CALLED'));
  assert.ok(value.events.indexOf('SYNCED') < value.events.indexOf('VERIFIED'));
  assert.equal(value.automaticRetries, 0); assert.equal(value.productionAuthorized, false);
  const before = await inspectSyntheticRecord(f, context()); assert.ok(before.exists && before.bytes > 0);
  assertStopped(await run.run(), 1);
  const after = await inspectSyntheticRecord(f, context()); assert.equal(after.sha256, before.sha256);
});
test('40 concurrent invocation objects dispatch at most once for one authorization', async t => {
  const f = await fixture(t);
  const values = await Promise.all(Array.from({ length: 40 }, () => createSyntheticInvocation({ fixture: f, context: context() }).run()));
  assert.equal(values.filter(v => v.status === 'SYNTHETIC_PASS').length, 1);
  assert.equal(values.reduce((n, v) => n + v.observationCalls, 0), 1);
  assert.ok(values.every(v => v.automaticRetries === 0));
});
for (const [label, patch] of changes) test('changing ' + label + ' cannot acquire a second allowance', async t => {
  const f = await fixture(t);
  assert.equal((await createSyntheticInvocation({ fixture: f, context: context() }).run()).status, 'SYNTHETIC_PASS');
  const before = await inspectSyntheticRecord(f, context());
  const value = await createSyntheticInvocation({ fixture: f, context: context(patch) }).run();
  assertStopped(value); assert.equal(value.code, 'CONSUMPTION_PRESENT_OR_UNCERTAIN');
  assert.equal((await inspectSyntheticRecord(f, context())).sha256, before.sha256);
});
for (const kind of ['empty', 'partial', 'malformed', 'conflict', 'forged-not-sent']) {
  test('existing ' + kind + ' consumption is retained and never grants resume', async t => {
    const f = await fixture(t); await seedSyntheticState(f, context(), kind);
    const before = await inspectSyntheticRecord(f, context());
    const value = await createSyntheticInvocation({ fixture: f, context: context() }).run();
    assertStopped(value); assert.equal(value.code, 'CONSUMPTION_PRESENT_OR_UNCERTAIN');
    assert.equal((await inspectSyntheticRecord(f, context())).sha256, before.sha256);
  });
}
for (const fault of FAULTS.filter(x => x !== 'NONE')) test('injected ' + fault + ' burns the key and never retries', async t => {
  const f = await fixture(t), run = createSyntheticInvocation({ fixture: f, context: context(), fault });
  assertStopped(await run.run());
  const before = await inspectSyntheticRecord(f, context()); assert.equal(before.exists, true);
  assertStopped(await run.run());
  assertStopped(await createSyntheticInvocation({ fixture: f, context: context() }).run());
  assert.equal((await inspectSyntheticRecord(f, context())).sha256, before.sha256);
});
for (const outcome of ['UNCERTAIN_AFTER_ACCEPT', 'UNAVAILABLE']) test('uncertain synthetic transport: ' + outcome, async t => {
  const f = await fixture(t), run = createSyntheticInvocation({ fixture: f, context: context(), outcome });
  const value = await run.run(); assertStopped(value, 1); assert.equal(value.code, 'OBSERVATION_UNCERTAIN');
  const before = await inspectSyntheticRecord(f, context());
  assertStopped(await run.run(), 1); assertStopped(await createSyntheticInvocation({ fixture: f, context: context() }).run());
  assert.equal((await inspectSyntheticRecord(f, context())).sha256, before.sha256);
});
test('a genuinely different synthetic authorization has a distinct consumption key', async t => {
  const f = await fixture(t), other = context({ authorizationReference: 'SYNTHETIC-AUTH-BETA' });
  assert.notEqual(bindSyntheticContext(context()).key, bindSyntheticContext(other).key);
  assert.equal((await createSyntheticInvocation({ fixture: f, context: context() }).run()).status, 'SYNTHETIC_PASS');
  assert.equal((await createSyntheticInvocation({ fixture: f, context: other }).run()).status, 'SYNTHETIC_PASS');
});
test('six real disposable Windows children race one create-new key, one observation wins', async t => {
  const f = await fixture(t), children = await Promise.all(Array.from({ length: 6 }, () => preparedChild(t, { fixture: f, context: context() })));
  children.forEach(c => c.start()); const values = await Promise.all(children.map(c => c.result()));
  assert.equal(values.filter(v => v.status === 'SYNTHETIC_PASS').length, 1);
  assert.equal(values.reduce((n, v) => n + v.observationCalls, 0), 1);
  assert.ok(values.every(v => v.automaticRetries === 0));
});
test('fresh real process after successful consumption cannot resume or redispatch', async t => {
  const f = await fixture(t);
  assert.equal((await inChild(t, { fixture: f, context: context() })).status, 'SYNTHETIC_PASS');
  const before = await inspectSyntheticRecord(f, context());
  assertStopped(await inChild(t, { fixture: f, context: context() }));
  assert.equal((await inspectSyntheticRecord(f, context())).sha256, before.sha256);
});
for (const hold of ['CREATED', 'PARTIAL_WRITTEN', 'SYNCED', 'VERIFIED', 'OBSERVATION_CALLED', 'OBSERVATION_ACKNOWLEDGED']) {
  test('terminated real child at ' + hold + ' retains consumption and restart denies', async t => {
    const f = await fixture(t), child = await preparedChild(t, { fixture: f, context: context(), hold });
    child.start(); const held = await child.held();
    const expectedCalls = hold.startsWith('OBSERVATION_') ? 1 : 0;
    assert.equal(held.snapshot.observationCalls, expectedCalls);
    const before = await inspectSyntheticRecord(f, context()); assert.equal(before.exists, true);
    await child.stop();
    assertStopped(await inChild(t, { fixture: f, context: context() }));
    assert.equal((await inspectSyntheticRecord(f, context())).sha256, before.sha256);
  });
}
test('uncertain observation in one real child burns allowance for a fresh process', async t => {
  const f = await fixture(t);
  assertStopped(await inChild(t, { fixture: f, context: context(), outcome: 'UNCERTAIN_AFTER_ACCEPT' }), 1);
  assertStopped(await inChild(t, { fixture: f, context: context() }));
});
test('nonce/proof/bundle/time changes across fresh processes cannot acquire another allowance', async t => {
  const f = await fixture(t);
  assert.equal((await inChild(t, { fixture: f, context: context() })).status, 'SYNTHETIC_PASS');
  for (const [, patch] of changes) assertStopped(await inChild(t, { fixture: f, context: context(patch) }));
});
