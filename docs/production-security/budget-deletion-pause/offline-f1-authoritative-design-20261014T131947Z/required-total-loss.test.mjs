// NON-RUNNABLE — NOT AUTHORIZED. This strict requirement is intentionally NOT weakened.
// The test must fail if loss of all authoritative history permits another dispatch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesignFixture } from './authoritative-model.mjs';
test('REQUIRED: at most one dispatch after coherent loss of ALL authoritative state', async () => {
  const f = createDesignFixture();
  const first = await f.newBroker().attempt(f.request());
  assert.equal(first.status, 'MODEL_PASS'); assert.equal(f.stats().dispatches, 1);
  f.controls.coherentRollbackOfAllTrustedState();
  // New broker models lost local memory. There is no surviving trusted checkpoint.
  await f.newBroker().attempt(f.request());
  assert.ok(f.stats().dispatches <= 1,
    'Required <=1 dispatch; coherent rollback restored an indistinguishable UNUSED image');
});

