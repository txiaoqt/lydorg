// Synthetic in-memory fixtures ONLY. No filesystem, process, environment,
// credentials, protected state, network, database, ACL or native-runner calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseIsoNanoseconds, temporalGate, completionGate, WrapperFailure } from './deadline-controls.mjs';
import { createPreflightWrapperEngine, PINNED_PREFLIGHT_REQUEST } from './preflight-wrapper-engine.mjs';
import { createPreflightWrapper } from './preflight-wrapper.mjs';
import { validateProofBytes, parseReviewedResult, validateReviewedPreflightEvidence } from './preflight-evidence.mjs';
const epoch = Date.parse('2030-02-01T00:00:00Z');
const iso = delta => new Date(epoch + delta).toISOString();
const hash = b => createHash('sha256').update(b).digest('hex');
const filename = 'preflight-20300201T000000000Z-11111111-2222-4333-8444-555555555555.json';
const proofAt = delta => Buffer.from(JSON.stringify({
  project: 'mqqaykksadotbrghbexz', host: 'db.mqqaykksadotbrghbexz.supabase.co',
  status: 'ACTIVE_HEALTHY', verifiedVia: 'supabase-control-plane-get-project', verifiedAt: iso(delta),
}) + '\n');
const times = (proof = iso(0), start = iso(-60000), end = iso(600000)) => ({
  proofTimestamp: proof, validityStartUtc: start, validityEndUtc: end,
});
function syntheticValidator({ result, evidenceBytes }) {
  const body = JSON.parse(evidenceBytes);
  assert.equal(body.synthetic, true);
  assert.equal(body.fixture, 'OFFLINE_ONLY');
  assert.equal(body.inventories.length, 57);
  assert.ok(body.inventories.every((n, i) => n === i));
  assert.equal(body.storageObjects, 378);
  assert.equal(result.syntheticExpectedHash, hash(evidenceBytes));
  return {
    evidenceSha256: hash(evidenceBytes), protectedInventoryCount: 57, storageObjects: 378,
    inventoriesMatch: true, catalogAndFunctionMatch: true, foundationAndProtectionsMatch: true,
    migrationsMatch: true, storagePoliciesMatch: true,
  };
}
function fixture(options = {}) {
  const state = { now: epoch, mono: 1000, launches: 0, reads: 0, aclCalls: 0, validations: 0 };
  const body = Buffer.from(JSON.stringify({
    synthetic: true, fixture: 'OFFLINE_ONLY', inventories: Array.from({ length: 57 }, (_, i) => i),
    storageObjects: 378,
  }));
  const files = new Map([[filename, body]]); // Memory map; NO file is created.
  const result = {
    status: 'PASS', mode: 'READ_ONLY_PREFLIGHT', installationActivated: false,
    evidenceFile: filename, syntheticExpectedHash: hash(body),
  };
  const child = { exitCode: 0, signal: null, stdout: JSON.stringify(result) };
  const input = {
    proofBytes: proofAt(0), validityStartUtc: iso(-60000), validityEndUtc: iso(600000),
    references: {}, expectedProofSha256: '',
  };
  input.expectedProofSha256 = hash(input.proofBytes);
  const io = {
    now: () => state.now, monotonicNow: () => state.mono,
    launch: async request => {
      state.launches++;
      assert.equal(request, PINNED_PREFLIGHT_REQUEST);
      assert.equal(request.mode, '--preflight');
      options.onLaunch?.(state, child, files);
      return child;
    },
    readEvidence: async name => {
      state.reads++;
      options.onRead?.(state, files);
      assert.equal(name, filename);
      if (!files.has(name)) throw Error('synthetic missing evidence');
      return files.get(name);
    },
    verifyEvidenceAcl: async () => {
      state.aclCalls++;
      return options.aclResult ?? { status: 'PASS', rootVerified: true, fileVerified: true, noRedirect: true };
    },
    evidenceValidator: async args => {
      state.validations++;
      options.onValidate?.(state);
      return options.validationResult ?? syntheticValidator(args);
    },
  };
  return { state, files, result, child, input, io, wrapper: createPreflightWrapperEngine(io) };
}
for (const value of [undefined, null, '', '2030-02-01 00:00:00', '2030-02-01T00:00:00',
  '2030-02-30T00:00:00Z', '2030-13-01T00:00:00Z', '2030-02-01T24:00:00Z',
  '2030-02-01T00:00:60Z', '2030-02-01T00:00:00-00:00', '2030-02-01T00:00:00+14:01',
  '2030-02-01T00:00:00+25:00', ' 2030-02-01T00:00:00Z', '2030-02-01T00:00:00.0000000001Z']) {
  test('strict ISO rejects ' + String(value), () => assert.throws(() => parseIsoNanoseconds(value), WrapperFailure));
}
test('explicit +08:00 and UTC describe the same instant', () => {
  assert.equal(parseIsoNanoseconds('2030-02-01T08:00:00+08:00'), parseIsoNanoseconds('2030-02-01T00:00:00Z'));
});
test('UTC +00:00 is allowed for validity', () => {
  assert.doesNotThrow(() => temporalGate(times(iso(0), '2030-01-31T23:59:00+00:00', '2030-02-01T00:10:00+00:00'), epoch));
});
test('valid leap day accepted; invalid leap day rejected', () => {
  assert.doesNotThrow(() => parseIsoNanoseconds('2032-02-29T00:00:00Z'));
  assert.throws(() => parseIsoNanoseconds('2030-02-29T00:00:00Z'));
});
test('nanosecond precision is preserved', () => {
  assert.equal(parseIsoNanoseconds('2030-02-01T00:00:00.000000001Z') - parseIsoNanoseconds(iso(0)), 1n);
});
test('exact five-minute boundary accepted', () => assert.doesNotThrow(() => temporalGate(times(), epoch + 300000)));
test('one millisecond past five minutes rejected', () => assert.throws(() => temporalGate(times(), epoch + 300001)));
test('one nanosecond past five minutes rejected', () => assert.throws(() =>
  temporalGate(times('2030-01-31T23:59:59.999999999Z'), epoch + 300000)));
test('future proof rejected', () => assert.throws(() => temporalGate(times(iso(1)), epoch)));
test('fractional future proof rejected without truncation', () => assert.throws(() =>
  temporalGate(times('2030-02-01T00:00:00.000000001Z'), epoch)));
test('exact validity start accepted', () => assert.doesNotThrow(() => temporalGate(times(iso(0), iso(0)), epoch)));
test('exact validity end accepted', () => assert.doesNotThrow(() => temporalGate(times(iso(0), iso(-1), iso(0)), epoch)));
test('before validity start rejected', () => assert.throws(() => temporalGate(times(iso(0), iso(1)), epoch)));
test('past validity end rejected', () => assert.throws(() => temporalGate(times(iso(0), iso(-1000), iso(-1)), epoch)));
for (const [label, start, end] of [
  ['missing start', undefined, iso(600000)], ['missing end', iso(-1000), undefined],
  ['reversed', iso(1000), iso(0)], ['empty interval', iso(0), iso(0)],
  ['timezone-free', '2030-02-01T00:00:00', iso(600000)],
  ['non-UTC window', '2030-02-01T08:00:00+08:00', iso(600000)],
  ['unknown UTC offset', '2030-02-01T00:00:00-00:00', iso(600000)],
]) test('validity rejects ' + label, () => assert.throws(() => temporalGate({ proofTimestamp: iso(0), validityStartUtc: start, validityEndUtc: end }, epoch)));
for (const clock of [NaN, Infinity, undefined, '1896134400000', epoch + 0.1, -1]) {
  test('invalid wall clock rejected: ' + String(clock), () => assert.throws(() => temporalGate(times(), clock)));
}
test('clock regression rejected even inside approved interval', () => {
  const launch = temporalGate(times(), epoch + 1000);
  assert.throws(() => completionGate(times(), epoch, launch, 100, 101));
});
test('monotonic elapsed time prevents a backward wall adjustment from hiding overrun', () => {
  const launch = temporalGate(times(), epoch);
  assert.throws(() => completionGate(times(), epoch + 1000, launch, 0, 300001));
});
test('monotonic missing or regression fails closed', () => {
  const launch = temporalGate(times(), epoch);
  for (const [a, b] of [[NaN, 1], [0, Infinity], [2, 1], [-1, 2]]) {
    assert.throws(() => completionGate(times(), epoch, launch, a, b));
  }
});
test('verified synthetic result plus complete evidence succeeds', async () => {
  const f = fixture();
  const out = await f.wrapper.run(f.input);
  assert.equal(out.status, 'PASS'); assert.equal(out.exitCode, 0);
  assert.equal(out.launchCount, 1); assert.equal(f.state.launches, 1);
  assert.equal(f.state.reads, 2); assert.equal(f.state.aclCalls, 2);
  assert.equal(out.automaticRetries, 0); assert.equal(out.installationActivated, false);
  assert.ok(f.files.has(filename)); assert.equal(out.evidenceSha256, hash(f.files.get(filename)));
});
test('proof and memory evidence inputs remain unchanged', async () => {
  const f = fixture(); const p = Buffer.from(f.input.proofBytes), e = Buffer.from(f.files.get(filename));
  await f.wrapper.run(f.input);
  assert.deepEqual(f.input.proofBytes, p); assert.deepEqual(f.files.get(filename), e);
});
test('expired prelaunch proof launches nothing; instance consumed', async () => {
  const f = fixture(); f.state.now = epoch + 300001;
  const out = await f.wrapper.run(f.input), again = await f.wrapper.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.code, 'PROOF_EXPIRED');
  assert.equal(f.state.launches, 0); assert.equal(again.code, 'WRAPPER_ALREADY_CONSUMED');
});
test('future proof launches nothing', async () => {
  const f = fixture(); f.input.proofBytes = proofAt(1); f.input.expectedProofSha256 = hash(f.input.proofBytes);
  assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.launches, 0);
});
test('missing validity launches nothing', async () => {
  const f = fixture(); delete f.input.validityEndUtc;
  assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.launches, 0);
});
test('child crosses proof deadline despite zero exit: fail, retain, no retry', async () => {
  const f = fixture({ onLaunch: s => { s.now += 300001; s.mono += 300001; } });
  const before = Buffer.from(f.files.get(filename));
  const out = await f.wrapper.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.exitCode, 2);
  assert.equal(out.code, 'PROOF_EXPIRED'); assert.equal(f.state.launches, 1);
  assert.equal(f.state.reads, 0); assert.equal(out.automaticRetries, 0);
  assert.deepEqual(f.files.get(filename), before);
  await f.wrapper.run(f.input); assert.equal(f.state.launches, 1);
});
test('child crosses approved UTC end despite zero exit: fail and retain', async () => {
  const f = fixture({ onLaunch: s => { s.now += 1001; s.mono += 1001; } });
  f.input.validityEndUtc = iso(1000);
  const out = await f.wrapper.run(f.input);
  assert.equal(out.code, 'OUTSIDE_APPROVED_VALIDITY'); assert.equal(out.exitCode, 2);
  assert.ok(f.files.has(filename)); assert.equal(f.state.launches, 1);
});
test('exact proof boundary at completion succeeds only with complete evidence', async () => {
  const f = fixture({ onLaunch: s => { s.now += 300000; s.mono += 300000; } });
  assert.equal((await f.wrapper.run(f.input)).status, 'PASS');
});
test('exact UTC end at completion succeeds only with complete evidence', async () => {
  const f = fixture({ onLaunch: s => { s.now += 1000; s.mono += 1000; } });
  f.input.validityEndUtc = iso(1000);
  assert.equal((await f.wrapper.run(f.input)).status, 'PASS');
});
test('evidence verification crossing deadline is unsuccessful', async () => {
  const f = fixture({ onValidate: s => { s.now += 300001; s.mono += 300001; } });
  const out = await f.wrapper.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.exitCode, 2); assert.ok(f.files.has(filename));
});
test('evidence reads crossing deadline are unsuccessful', async () => {
  const f = fixture({ onRead: s => { s.now += 160000; s.mono += 160000; } });
  assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.launches, 1);
});
for (const changes of [
  { status: 'BLOCKED' }, { status: 'READ_ONLY_PREFLIGHT_PASS' }, { mode: 'OFFLINE_REVIEW' },
  { installationActivated: true }, { evidenceFile: '../outside.json' }, { evidenceFile: filename + '?token=hidden' },
]) test('zero exit cannot override invalid reviewed result ' + Object.keys(changes).join(','), async () => {
  const f = fixture(); Object.assign(f.result, changes); f.child.stdout = JSON.stringify(f.result);
  assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.launches, 1);
  assert.ok(f.files.has(filename));
});
test('empty or multiple result records rejected even with zero exit', async () => {
  for (const stdout of ['', '{}', '{}\n{}', 'diagnostic\n' + JSON.stringify({ status: 'PASS' })]) {
    const f = fixture(); f.child.stdout = stdout;
    assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.launches, 1);
  }
});
test('nonzero or signaled child does not pass or retry', async () => {
  for (const childPatch of [{ exitCode: 2 }, { signal: 'SIGTERM' }, { exitCode: null }]) {
    const f = fixture(); Object.assign(f.child, childPatch);
    assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.launches, 1);
  }
});
test('throwing child is sanitized and cannot relaunch', async () => {
  const f = fixture();
  f.io.launch = async () => { f.state.launches++; throw Error('password=DO_NOT_ECHO token=PRIVATE_CANARY'); };
  const wrapper = createPreflightWrapperEngine(f.io);
  const out = await wrapper.run(f.input); await wrapper.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.code, 'READONLY_WRAPPER_FAILED');
  assert.equal(f.state.launches, 1); assert.ok(!JSON.stringify(out).includes('PRIVATE_CANARY'));
});
test('missing generated evidence does not pass and leaves all other memory evidence', async () => {
  const f = fixture(); f.files.delete(filename); f.files.set('retained-partial', Buffer.alloc(0));
  assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED'); assert.ok(f.files.has('retained-partial'));
});
test('empty partial evidence retained, no retry', async () => {
  const f = fixture(); f.files.set(filename, Buffer.alloc(0));
  assert.equal((await f.wrapper.run(f.input)).status, 'BLOCKED');
  assert.ok(f.files.has(filename)); assert.equal(f.files.get(filename).length, 0);
});
test('changed second read rejected without modifying retained memory bytes', async () => {
  const f = fixture({ onRead: (s, map) => { if (s.reads === 2) map.set(filename, Buffer.from('changed synthetic evidence')); } });
  assert.equal((await f.wrapper.run(f.input)).code, 'EVIDENCE_CHANGED_BETWEEN_READS');
  assert.equal(f.files.get(filename).toString(), 'changed synthetic evidence');
});
for (const aclResult of [{ status: 'BLOCKED' }, { status: 'PASS' },
  { status: 'PASS', rootVerified: true, fileVerified: true, noRedirect: false }]) {
  test('unverified ACL cannot pass', async () => {
    const f = fixture({ aclResult }); assert.equal((await f.wrapper.run(f.input)).code, 'EVIDENCE_ACL_UNVERIFIED');
    assert.ok(f.files.has(filename));
  });
}
test('incomplete independent verification cannot pass', async () => {
  const f = fixture({ validationResult: { evidenceSha256: '0'.repeat(64) } });
  assert.equal((await f.wrapper.run(f.input)).code, 'INDEPENDENT_EVIDENCE_INCOMPLETE');
});
test('valid proof hash and unambiguous original JSON required', () => {
  const b = proofAt(0);
  assert.throws(() => validateProofBytes(b, '0'.repeat(64)));
  const duplicate = Buffer.from(b.toString().replace('"verifiedAt":', '"verifiedAt":"2029-01-01T00:00:00Z","verifiedAt":'));
  assert.throws(() => validateProofBytes(duplicate, hash(duplicate)), /PROOF_JSON_AMBIGUOUS/);
});
test('secret-bearing child output is rejected without disclosure', async () => {
  const f = fixture(); f.child.stdout = JSON.stringify({ ...f.result, password: 'NEVER_ECHO_THIS' });
  const out = await f.wrapper.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.ok(!JSON.stringify(out).includes('NEVER_ECHO_THIS'));
});
test('public facade disallows replacement of the reviewed evidence validator', () => {
  const f = fixture();
  assert.throws(() => createPreflightWrapper(f.io), /EVIDENCE_VALIDATOR_OVERRIDE_FORBIDDEN/);
});
test('public facade rejects synthetic evidence lacking exact reviewed reference pins', async () => {
  const f = fixture(), { evidenceValidator, ...io } = f.io;
  const out = await createPreflightWrapper(io).run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.exitCode, 2); assert.equal(f.state.launches, 1);
  assert.ok(f.files.has(filename));
});
test('fixed evidence verifier rejects omitted or substituted preservation references', () => {
  assert.throws(() => validateReviewedPreflightEvidence({ references: {} }), /REVIEWED_REFERENCE_PIN_MISMATCH/);
});
test('fixed request has only reviewed direct route and read-only mode', () => {
  assert.ok(Object.isFrozen(PINNED_PREFLIGHT_REQUEST));
  assert.equal(PINNED_PREFLIGHT_REQUEST.route, 'native-pg-direct-tls');
  assert.equal(PINNED_PREFLIGHT_REQUEST.mode, '--preflight');
  assert.equal(PINNED_PREFLIGHT_REQUEST.host, 'db.mqqaykksadotbrghbexz.supabase.co');
});
test('no second launch after a successful invocation', async () => {
  const f = fixture(); assert.equal((await f.wrapper.run(f.input)).status, 'PASS');
  assert.equal((await f.wrapper.run(f.input)).code, 'WRAPPER_ALREADY_CONSUMED'); assert.equal(f.state.launches, 1);
});
test('production result parser does not treat a PASS label alone as success', () => {
  assert.throws(() => parseReviewedResult('{"status":"PASS"}'));
});
