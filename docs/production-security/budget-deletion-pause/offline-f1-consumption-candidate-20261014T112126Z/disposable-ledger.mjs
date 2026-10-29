// NON-RUNNABLE — NOT AUTHORIZED. No live I/O entrypoint or external transport.
// File sync/reopen is a tested process-restart barrier, NOT a power-loss guarantee.
import { open, lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { need, SyntheticFailure, safeCode, bindSyntheticContext, consumptionLeaf, recordBytes } from './synthetic-f1-core.mjs';
import { admitFixture } from './fixture-harness.mjs';
export const FAULTS = Object.freeze(['NONE', 'AFTER_CREATE', 'PARTIAL_WRITE', 'AFTER_WRITE',
  'SYNC_UNCERTAIN', 'AFTER_SYNC', 'CLOSE_UNCERTAIN', 'READBACK_MISMATCH', 'AFTER_VERIFY']);
export const HOLDS = Object.freeze(['NONE', 'CREATED', 'PARTIAL_WRITTEN', 'SYNCED', 'VERIFIED',
  'OBSERVATION_CALLED', 'OBSERVATION_ACKNOWLEDGED']);
export const OUTCOMES = Object.freeze(['SUCCESS', 'UNCERTAIN_AFTER_ACCEPT', 'UNAVAILABLE']);
export function createSyntheticInvocation({ fixture, context, fault = 'NONE', hold = 'NONE', outcome = 'SUCCESS' }) {
  const binding = bindSyntheticContext(context); // Pure rejection before any fixture access.
  need(FAULTS.includes(fault) && HOLDS.includes(hold) && OUTCOMES.includes(outcome), 'OPTIONS_INVALID');
  let used = false;
  const state = { phase: 'NEW', createCalls: 0, observationCalls: 0, fileSyncAcknowledged: false,
    recordCreated: false, events: [], automaticRetries: 0 };
  const snapshot = () => Object.freeze({ ...state, events: Object.freeze([...state.events]) });
  const stage = async name => {
    state.phase = name; state.events.push(name);
    if (hold === name) { state.phase = 'HELD_' + name; await new Promise(() => {}); }
    const at = { CREATED: 'AFTER_CREATE', WRITTEN: 'AFTER_WRITE', SYNCED: 'AFTER_SYNC', VERIFIED: 'AFTER_VERIFY' };
    if (at[name] === fault) throw new SyntheticFailure('SYNTHETIC_FAULT');
  };
  async function consume() {
    const { root } = await admitFixture(fixture);
    const path = join(root, consumptionLeaf(binding)), expected = recordBytes(binding);
    let handle = null, closeAttempted = false, original;
    try {
      state.createCalls++;
      try { handle = await open(path, 'wx'); }
      catch (error) {
        if (error?.code === 'EEXIST') throw new SyntheticFailure('CONSUMPTION_PRESENT_OR_UNCERTAIN');
        throw new SyntheticFailure('CONSUMPTION_IO_UNCERTAIN');
      }
      state.recordCreated = true; original = await handle.stat();
      await stage('CREATED'); // Empty creation already burns the key.
      if (fault === 'PARTIAL_WRITE' || hold === 'PARTIAL_WRITTEN') {
        await handle.writeFile(expected.subarray(0, 17));
        await stage('PARTIAL_WRITTEN');
        throw new SyntheticFailure('SYNTHETIC_FAULT');
      }
      await handle.writeFile(expected);
      await stage('WRITTEN');
      await handle.sync(); state.fileSyncAcknowledged = true;
      if (fault === 'SYNC_UNCERTAIN') throw new SyntheticFailure('CONSUMPTION_IO_UNCERTAIN');
      await stage('SYNCED');
      closeAttempted = true; await handle.close();
      if (fault === 'CLOSE_UNCERTAIN') throw new SyntheticFailure('CONSUMPTION_IO_UNCERTAIN');
      await admitFixture(fixture);
      const info = await lstat(path), actual = await readFile(path);
      if (fault === 'READBACK_MISMATCH' && actual.length) actual[0] ^= 1; // Memory only, never file repair.
      need(info.isFile() && !info.isSymbolicLink() && info.dev === original.dev && info.ino === original.ino &&
        info.size === expected.length && actual.equals(expected), 'CONSUMPTION_READBACK_INVALID');
      await stage('VERIFIED');
    } finally {
      if (handle && !closeAttempted) {
        closeAttempted = true;
        try { await handle.close(); } catch { throw new SyntheticFailure('CONSUMPTION_IO_UNCERTAIN'); }
      }
      // No unlink, truncate, rename, recovery, retry or record-based resume.
    }
  }
  async function observeInMemory() {
    state.observationCalls++;
    await stage('OBSERVATION_CALLED');
    if (outcome !== 'SUCCESS') throw new SyntheticFailure('OBSERVATION_UNCERTAIN');
    await stage('OBSERVATION_ACKNOWLEDGED');
    return 'SYNTHETIC_OBSERVATION_OK';
  }
  return Object.freeze({ snapshot,
    async run() {
      if (used) return Object.freeze({ status: 'BLOCKED', code: 'INVOCATION_ALREADY_USED',
        ...snapshot(), retainConsumption: true, fixtureOnly: true, productionAuthorized: false });
      used = true; // One-use even if admission fails; a stopped call cannot relaunch this object.
      try {
        await consume();
        await observeInMemory(); // Sole dispatch site, after creation/write/sync/close/readback.
        state.phase = 'DONE';
        return Object.freeze({ status: 'SYNTHETIC_PASS', ...snapshot(), retainConsumption: true,
          fixtureOnly: true, productionAuthorized: false });
      } catch (error) {
        state.phase = 'STOPPED';
        return Object.freeze({ status: 'BLOCKED', code: safeCode(error), ...snapshot(),
          retainConsumption: true, outcomeMustNotResume: true, fixtureOnly: true, productionAuthorized: false });
      }
    },
  });
}
