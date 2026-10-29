// NON-RUNNABLE — NOT AUTHORIZED. Pure in-memory specification fixtures only.
// Passing cases assume the modeled checkpoint/fence survives and is authoritative.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesignFixture, IDENTITY } from './authoritative-model.mjs';
function denied(result, calls = 0) {
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.invocationDispatches, calls);
  assert.equal(result.automaticRetries, 0); assert.equal(result.productionAuthorized, false);
}
test('positive current UNUSED enrollment is usable exactly once', async () => {
  const f = createDesignFixture(), broker = f.newBroker();
  const first = await broker.attempt(f.request()); assert.equal(first.status, 'MODEL_PASS');
  assert.equal(first.invocationDispatches, 1); assert.equal(first.totalDispatches, 1);
  denied(await broker.attempt(f.request()));
  denied(await f.newBroker().attempt(f.request()));
  assert.equal(f.stats().dispatches, 1);
});
test('absence is not a new grant and never creates enrollment', async () => {
  const f = createDesignFixture();
  const result = await f.newBroker().attempt({ ...f.request(), authorizationReference: 'SYNTHETIC-AUTH-MISSING' });
  denied(result); assert.equal(result.code, 'NO_POSITIVE_ENROLLMENT'); assert.equal(f.stats().primaryRows, 2);
});
test('a wrong context cannot overwrite positive enrollment', async () => {
  const f = createDesignFixture();
  const result = await f.newBroker().attempt({ ...f.request(), contextDigest: 'b'.repeat(64) });
  denied(result); assert.equal(result.code, 'CONTEXT_CONFLICT'); assert.equal(f.stats().dispatches, 0);
});
for (const [name, extra] of [
  ['root A', { root: 'SYNTHETIC-ROOT-A' }], ['root B', { root: 'SYNTHETIC-ROOT-B' }],
  ['authority', { authorityId: 'SYNTHETIC-OTHER' }], ['endpoint', { endpoint: 'synthetic-only' }],
  ['nonce', { nonce: 'SYNTHETIC-NEW' }], ['hash', { proofHash: 'c'.repeat(64) }],
  ['bundle', { bundle: 'd'.repeat(64) }], ['timestamp', { timestamp: '2031-03-01T00:00:00Z' }],
]) test('caller cannot choose another store or allowance dimension: ' + name, async () => {
  const f = createDesignFixture();
  const result = await f.newBroker().attempt({ ...f.request(), ...extra });
  denied(result); assert.equal(result.code, 'REQUEST_INVALID'); assert.equal(f.stats().dispatches, 0);
});
for (const root of ['SYNTHETIC-ROOT-A', 'SYNTHETIC-ROOT-B']) {
  test('broker construction rejects caller-admitted root: ' + root, () => {
    const f = createDesignFixture(); assert.throws(() => f.newBroker({ root }));
    assert.throws(() => createDesignFixture({ root }));
  });
}
test('two caller brokers with no selectable roots share the same authority', async () => {
  const f = createDesignFixture(), a = f.newBroker(), b = f.newBroker();
  const result = await Promise.all([a.attempt(f.request()), b.attempt(f.request())]);
  assert.equal(result.filter(r => r.status === 'MODEL_PASS').length, 1);
  assert.equal(result.reduce((n, r) => n + r.invocationDispatches, 0), 1);
  assert.equal(f.stats().authorityIdentity, IDENTITY);
});
test('50 interleaved clients share one atomic model commit', async () => {
  const f = createDesignFixture();
  const values = await Promise.all(Array.from({ length: 50 }, () => f.newBroker().attempt(f.request())));
  assert.equal(values.filter(v => v.status === 'MODEL_PASS').length, 1);
  assert.equal(values.reduce((n, v) => n + v.invocationDispatches, 0), 1);
  assert.equal(f.stats().dispatches, 1);
});
test('modeled broker restart does not resume a spent authorization', async () => {
  const f = createDesignFixture();
  assert.equal((await f.newBroker().attempt(f.request())).status, 'MODEL_PASS');
  denied(await f.newBroker().attempt(f.request())); assert.equal(f.stats().dispatches, 1);
});
test('returned status is not a transferable dispatch permit', async () => {
  const f = createDesignFixture(), result = await f.newBroker().attempt(f.request());
  assert.equal(Object.hasOwn(result, 'permit'), false);
  denied(await f.newBroker().attempt({ ...f.request(), status: result.status }));
  denied(await f.newBroker().attempt(f.request()));
});
for (const [fault, originalCalls] of [
  ['LOSS_LOCAL_BEFORE', 0], ['LOSS_LOCAL_AFTER', 1], ['UNKNOWN_COMMITTED', 0],
  ['UNKNOWN_NOT_COMMITTED', 0], ['PARTIAL_PRIMARY', 0], ['STOP_AFTER_COMMIT', 0],
  ['STOP_AFTER_DISPATCH', 1], ['OBSERVATION_UNCERTAIN', 1], ['DROP_PRIMARY_BEFORE_DISPATCH', 0],
]) test('loss/uncertainty/stop remains terminal under the checkpoint contract: ' + fault, async () => {
  const f = createDesignFixture(); f.controls.injectFault(fault);
  const broker = f.newBroker(), first = await broker.attempt(f.request());
  denied(first, originalCalls); denied(await broker.attempt(f.request()));
  denied(await f.newBroker().attempt(f.request()));
  assert.equal(f.stats().dispatches, originalCalls);
});
test('local receipts may disappear; authoritative SPENT still denies', async () => {
  const f = createDesignFixture();
  await f.newBroker().attempt(f.request()); f.controls.loseLocalReceipts();
  assert.equal(f.stats().receiptCount, 0); denied(await f.newBroker().attempt(f.request()));
  assert.equal(f.stats().dispatches, 1);
});
for (const action of ['losePrimaryRow', 'loseAllPrimary', 'rollbackPrimaryOnly', 'rollbackCheckpointOnly']) {
  test('lost/rolled-back primary evidence cannot look unused with a surviving checkpoint: ' + action, async () => {
    const f = createDesignFixture(); await f.newBroker().attempt(f.request());
    f.controls[action](); denied(await f.newBroker().attempt(f.request()));
    assert.equal(f.stats().dispatches, 1); assert.equal(f.stats().fenced, true);
  });
}
test('missing checkpoint denies even a positive unused record', async () => {
  const f = createDesignFixture(); f.controls.loseCheckpoint();
  denied(await f.newBroker().attempt(f.request()));
  assert.equal(f.stats().checkpointPresent, false); assert.equal(f.stats().dispatches, 0);
});
for (const action of ['corruptIdentity', 'corruptEpoch', 'corruptPartialState']) {
  test('unverifiable authority never falls back to another root: ' + action, async () => {
    const f = createDesignFixture(); f.controls[action]();
    denied(await f.newBroker().attempt(f.request())); assert.equal(f.stats().fenced, true);
  });
}
test('unavailable primary fences the namespace in the model; reopening flag is not recovery', async () => {
  const f = createDesignFixture(); f.controls.setStoreAvailable(false);
  denied(await f.newBroker().attempt(f.request())); f.controls.setStoreAvailable(true);
  denied(await f.newBroker().attempt(f.request()));
  assert.equal(f.stats().fenced, true); assert.equal(f.stats().dispatches, 0);
});
test('unknown noncommitted outcome cannot be cleared by a later healthy flag', async () => {
  const f = createDesignFixture(); f.controls.injectFault('UNKNOWN_NOT_COMMITTED');
  denied(await f.newBroker().attempt(f.request())); f.controls.setStoreAvailable(true);
  assert.ok(f.stats().states.includes('UNUSED')); denied(await f.newBroker().attempt(f.request()));
});
test('a distinct positively enrolled authorization is not confused with the first', async () => {
  const f = createDesignFixture(); await f.newBroker().attempt(f.request());
  const result = await f.newBroker().attempt({ ...f.request(), authorizationReference: 'SYNTHETIC-AUTH-BETA' });
  assert.equal(result.status, 'MODEL_PASS'); assert.equal(f.stats().dispatches, 2);
});
test('public broker API cannot enroll, reset, recover or choose a backend', () => {
  const f = createDesignFixture(); assert.deepEqual(Object.keys(f.newBroker()), ['attempt']);
  assert.ok(Object.isFrozen(f.newBroker())); assert.equal(f.stats().modelOnly, true);
});
test('request accessors are not used as authority metadata', async () => {
  const f = createDesignFixture(), request = f.request(); let reads = 0;
  Object.defineProperty(request, 'contextDigest', { enumerable: true, get() { reads++; throw Error('SYNTHETIC_ONLY'); } });
  denied(await f.newBroker().attempt(request)); assert.equal(reads, 0);
});

