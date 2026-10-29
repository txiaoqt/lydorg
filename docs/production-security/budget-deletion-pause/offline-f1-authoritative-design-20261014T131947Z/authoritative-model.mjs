// NON-RUNNABLE — NOT AUTHORIZED. Pure synthetic protocol model; NOT a durable store.
// The checkpoint/fence below is an ASSUMED non-rollback authority in conditional tests.
import { createHash } from 'node:crypto';
export const IDENTITY = 'SYNTHETIC-F1-AUTHORITY-ONE';
export const PROJECT = 'SYNTHETIC-PROJECT-ONE';
export const PURPOSE = 'SYNTHETIC-ONE-OBSERVATION';
export const EPOCH = 'SYNTHETIC-EPOCH-ONE';
export const FAULTS = Object.freeze(['NORMAL', 'LOSS_LOCAL_BEFORE', 'LOSS_LOCAL_AFTER',
  'UNKNOWN_COMMITTED', 'UNKNOWN_NOT_COMMITTED', 'PARTIAL_PRIMARY', 'STOP_AFTER_COMMIT',
  'STOP_AFTER_DISPATCH', 'OBSERVATION_UNCERTAIN', 'DROP_PRIMARY_BEFORE_DISPATCH']);
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = value => structuredClone(value);
class ModelFailure extends Error {
  constructor(code) { super('Synthetic authority blocked'); this.code = code; }
}
const need = (value, code) => { if (!value) throw new ModelFailure(code); };
const SAFE = new Set(['REQUEST_INVALID', 'CONTEXT_CONFLICT', 'CALLER_STORE_OVERRIDE',
  'BROKER_ALREADY_USED', 'AUTHORITY_UNVERIFIABLE', 'AUTHORITY_FENCED', 'NO_POSITIVE_ENROLLMENT',
  'NOT_UNUSED', 'COMMIT_UNCERTAIN', 'LOCAL_RECEIPT_LOST', 'MODELED_STOP', 'OBSERVATION_UNCERTAIN',
  'PERMIT_INVALID', 'MODEL_OPERATION_FAILED']);
function safe(error) {
  try {
    const d = Object.getOwnPropertyDescriptor(error, 'code');
    return error instanceof ModelFailure && d && Object.hasOwn(d, 'value') &&
      typeof d.value === 'string' && SAFE.has(d.value) ? d.value : 'MODEL_OPERATION_FAILED';
  } catch { return 'MODEL_OPERATION_FAILED'; }
}
function binding(input) {
  need(input && Object.getPrototypeOf(input) === Object.prototype &&
    Object.keys(input).sort().join('|') === 'authorizationReference|contextDigest', 'REQUEST_INVALID');
  const reference = Object.getOwnPropertyDescriptor(input, 'authorizationReference');
  const context = Object.getOwnPropertyDescriptor(input, 'contextDigest');
  need(reference && Object.hasOwn(reference, 'value') && typeof reference.value === 'string' &&
    /^SYNTHETIC-AUTH-[A-Z0-9]{1,32}$/.test(reference.value), 'REQUEST_INVALID');
  need(context && Object.hasOwn(context, 'value') && typeof context.value === 'string' &&
    /^[a-f0-9]{64}$/.test(context.value), 'REQUEST_INVALID');
  return Object.freeze({ key: sha([reference.value, PROJECT, PURPOSE]),
    reference: reference.value, contextDigest: context.value });
}
const imageHash = view => sha({ identity: view.identity, epoch: view.epoch, revision: view.revision,
  rows: [...view.rows].sort(([a], [b]) => a.localeCompare(b)) });

// TRUSTED TEST-HARNESS FACTORY ONLY. A second fixture is a different model universe,
// not another caller-admitted backend. This factory proves no real identity/ACL binding.
export function createDesignFixture(...args) {
  need(args.length === 0, 'CALLER_STORE_OVERRIDE');
  const enrolled = ['SYNTHETIC-AUTH-ALPHA', 'SYNTHETIC-AUTH-BETA'].map(reference => {
    const b = binding({ authorizationReference: reference, contextDigest: 'a'.repeat(64) });
    return [b.key, { reference, contextDigest: b.contextDigest, enrollment: 'POSITIVE_ENROLLMENT',
      state: 'UNUSED', version: 1 }];
  });
  const initial = { identity: IDENTITY, epoch: EPOCH, revision: 1, rows: new Map(enrolled) };
  let view = copy(initial);
  let checkpoint = { identity: IDENTITY, epoch: EPOCH, revision: 1,
    imageHash: imageHash(initial), fenced: false };
  const originalCheckpoint = copy(checkpoint);
  let fatalFence = false, storeAvailable = true, nextFault = 'NORMAL', brokerSequence = 0;
  const receipts = new Map(), permits = new WeakMap();
  // TEST ORACLE ONLY. Dispatch history is NOT consulted by admission. Erasing all
  // trusted history can therefore expose a real logical counterexample below.
  const dispatchAudit = [];
  const total = key => dispatchAudit.filter(row => row.key === key).length;
  function fence() {
    fatalFence = true;
    if (checkpoint) checkpoint.fenced = true;
    // This models a durable external fence contract; assignment is NOT persistence.
  }
  function verifyAuthority() {
    if (!storeAvailable || !checkpoint) { fence(); throw new ModelFailure('AUTHORITY_UNVERIFIABLE'); }
    if (fatalFence || checkpoint.fenced) throw new ModelFailure('AUTHORITY_FENCED');
    if (view.identity !== IDENTITY || checkpoint.identity !== IDENTITY || view.epoch !== EPOCH ||
      checkpoint.epoch !== EPOCH || view.revision !== checkpoint.revision ||
      imageHash(view) !== checkpoint.imageHash) {
      fence(); throw new ModelFailure('AUTHORITY_UNVERIFIABLE');
    }
  }
  function claim(b, owner) {
    verifyAuthority();
    const row = view.rows.get(b.key);
    need(row && row.enrollment === 'POSITIVE_ENROLLMENT', 'NO_POSITIVE_ENROLLMENT');
    need(row.contextDigest === b.contextDigest, 'CONTEXT_CONFLICT');
    need(row.state === 'UNUSED' && row.version === 1, 'NOT_UNUSED');
    const fault = nextFault; nextFault = 'NORMAL';
    if (fault === 'UNKNOWN_NOT_COMMITTED') {
      fence(); throw new ModelFailure('COMMIT_UNCERTAIN');
    }
    if (fault === 'PARTIAL_PRIMARY') {
      view.rows.set(b.key, { ...row, state: 'PARTIAL' });
      fence(); throw new ModelFailure('COMMIT_UNCERTAIN');
    }
    // Single synchronous model transition = assumed linearizable irreversible commit.
    // No database/WAL/quorum/filesystem operation or physical durability is implemented.
    view.rows.set(b.key, { ...row, state: 'SPENT', version: 2 });
    view.revision++;
    checkpoint = { ...checkpoint, revision: view.revision, imageHash: imageHash(view) };
    receipts.set(b.key, { revision: view.revision });
    const permit = Object.freeze({});
    permits.set(permit, { key: b.key, owner, used: false, epoch: EPOCH });
    if (fault === 'UNKNOWN_COMMITTED') {
      permits.delete(permit); throw new ModelFailure('COMMIT_UNCERTAIN');
    }
    return { permit, fault };
  }
  function usePermit(permit, owner) {
    verifyAuthority();
    const p = permits.get(permit);
    need(p && p.owner === owner && p.epoch === EPOCH && p.used === false &&
      view.rows.get(p.key)?.state === 'SPENT', 'PERMIT_INVALID');
    p.used = true; permits.delete(permit); // Not transferable, serialized or recoverable.
    return p.key;
  }
  function newBroker(...callerOptions) {
    need(callerOptions.length === 0, 'CALLER_STORE_OVERRIDE');
    const owner = Symbol('MODEL_BROKER_' + (++brokerSequence)), seen = new Set();
    return Object.freeze({
      async attempt(input) {
        let b, calls = 0;
        try {
          b = binding(input);
          need(!seen.has(b.key), 'BROKER_ALREADY_USED'); seen.add(b.key);
          await Promise.resolve(); // Exercise interleaved requests; claim itself is atomic in this model.
          const { permit, fault } = claim(b, owner);
          if (fault === 'LOSS_LOCAL_BEFORE') {
            receipts.delete(b.key); permits.delete(permit); throw new ModelFailure('LOCAL_RECEIPT_LOST');
          }
          if (fault === 'STOP_AFTER_COMMIT') {
            permits.delete(permit); throw new ModelFailure('MODELED_STOP');
          }
          if (fault === 'DROP_PRIMARY_BEFORE_DISPATCH') view.rows.delete(b.key);
          const key = usePermit(permit, owner);
          calls++; dispatchAudit.push({ key, owner: brokerSequence }); // Memory stub only.
          if (fault === 'LOSS_LOCAL_AFTER') {
            receipts.delete(key); throw new ModelFailure('LOCAL_RECEIPT_LOST');
          }
          if (fault === 'STOP_AFTER_DISPATCH') throw new ModelFailure('MODELED_STOP');
          if (fault === 'OBSERVATION_UNCERTAIN') throw new ModelFailure('OBSERVATION_UNCERTAIN');
          return Object.freeze({ status: 'MODEL_PASS', invocationDispatches: calls,
            totalDispatches: total(key), automaticRetries: 0, productionAuthorized: false });
        } catch (error) {
          return Object.freeze({ status: 'BLOCKED', code: safe(error), invocationDispatches: calls,
            totalDispatches: b ? total(b.key) : 0, automaticRetries: 0, productionAuthorized: false });
        }
      },
    });
  }
  const controls = Object.freeze({
    // TRUSTED SYNTHETIC FAULT INJECTION, never caller/provider operations.
    injectFault(value) { need(FAULTS.includes(value), 'REQUEST_INVALID'); nextFault = value; },
    loseLocalReceipts() { receipts.clear(); },
    losePrimaryRow() { view.rows.delete(binding({ authorizationReference: 'SYNTHETIC-AUTH-ALPHA', contextDigest: 'a'.repeat(64) }).key); },
    loseAllPrimary() { view = { identity: IDENTITY, epoch: EPOCH, revision: 0, rows: new Map() }; },
    rollbackPrimaryOnly() { view = copy(initial); },
    rollbackCheckpointOnly() { checkpoint = copy(originalCheckpoint); },
    loseCheckpoint() { checkpoint = null; },
    setStoreAvailable(value) { need(typeof value === 'boolean', 'REQUEST_INVALID'); storeAvailable = value; },
    corruptIdentity() { view.identity = 'SYNTHETIC-IMPOSTOR'; },
    corruptEpoch() { view.epoch = 'SYNTHETIC-OLD-EPOCH'; },
    corruptPartialState() { view.rows.set(enrolled[0][0], { state: 'PARTIAL' }); },
    // UNSUPPORTED FAULT MODEL: erase/roll back EVERY authoritative fact consistently.
    // The separate strict test must FAIL if this permits a second dispatch.
    coherentRollbackOfAllTrustedState() {
      view = copy(initial); checkpoint = copy(originalCheckpoint); fatalFence = false;
      storeAvailable = true; nextFault = 'NORMAL'; receipts.clear();
    },
  });
  return Object.freeze({ newBroker, controls,
    request: () => ({ authorizationReference: 'SYNTHETIC-AUTH-ALPHA', contextDigest: 'a'.repeat(64) }),
    stats: () => Object.freeze({ dispatches: dispatchAudit.length, authorityIdentity: IDENTITY,
      checkpointPresent: checkpoint !== null, fenced: fatalFence || checkpoint?.fenced === true,
      primaryRows: view.rows.size, receiptCount: receipts.size,
      states: Object.freeze([...view.rows.values()].map(r => r.state)), modelOnly: true }),
  });
}

