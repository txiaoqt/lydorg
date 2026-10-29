// Synthetic in-memory protocol tests ONLY. No fs/process/environment/network
// imports; no real wrapper/native runner/preflight/helper mode is invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createIntegrationEngine, ARTIFACT_PINS, TARGET, NATIVE_LAUNCH } from './integration-engine.mjs';
import { createTrustedIOIntegration } from './trusted-io-integration.mjs';
const t0 = Date.parse('2031-03-01T00:00:00Z');
const iso = ms => new Date(t0 + ms).toISOString();
const hash = b => createHash('sha256').update(b).digest('hex');
const metadata = { createdAt: iso(-900000), writtenAt: iso(-600000),
  owner: 'OFFLINE_SYNTHETIC_OWNER', aclSha256: 'a'.repeat(64) };
const leaf = 'preflight-20310301T000000000Z-11111111-2222-4333-8444-555555555555.json';
const nativeRequest = Object.freeze({
  ...TARGET, mode: '--preflight', candidateBundleSha256: ARTIFACT_PINS.nativeBundle,
});
function syntheticProof(ts) {
  return Buffer.from(JSON.stringify({
    project: TARGET.project, host: TARGET.host, status: 'ACTIVE_HEALTHY',
    verifiedVia: 'supabase-control-plane-get-project', verifiedAt: ts,
  }) + '\n');
}
function fakeReviewedWrapper(io) {
  return {
    async run(ctx) {
      try {
        assert.equal(hash(ctx.proofBytes), ctx.expectedProofSha256);
        assert.equal(ctx.references.syntheticOnly, true);
        const child = await io.launch(nativeRequest);
        assert.equal(child.exitCode, 0); assert.equal(child.signal, null);
        const result = JSON.parse(child.stdout);
        assert.equal(result.status, 'PASS'); assert.equal(result.mode, 'READ_ONLY_PREFLIGHT');
        assert.equal(result.installationActivated, false);
        assert.equal(result.evidenceFile, leaf);
        const before = await io.verifyEvidenceAcl(leaf);
        assert.deepEqual(before, { status: 'PASS', rootVerified: true, fileVerified: true, noRedirect: true });
        const first = await io.readEvidence(leaf), second = await io.readEvidence(leaf);
        assert.deepEqual(first, second);
        const after = await io.verifyEvidenceAcl(leaf);
        assert.deepEqual(after, before);
        const evidence = JSON.parse(first);
        assert.equal(evidence.syntheticOnly, true);
        assert.deepEqual(evidence.inventory, Array.from({ length: 57 }, (_, i) => i));
        assert.equal(evidence.migrations, 164); assert.equal(evidence.policies, 15);
        assert.equal(evidence.objects, 378);
        assert.equal(hash(first), result.syntheticExpectedHash);
        return { status: 'PASS', mode: 'READ_ONLY_PREFLIGHT_WRAPPER', exitCode: 0,
          launchCount: 1, automaticRetries: 0, evidenceRetained: true,
          installationActivated: false, freshnessAndValidityVerified: true,
          independentPreservationVerified: true, evidenceFile: leaf, evidenceSha256: hash(first) };
      } catch {
        return { status: 'BLOCKED', exitCode: 2, retainAllEvidence: true };
      }
    },
  };
}
function sharedState() {
  return { now: t0, mono: 0, active: syntheticProof(iso(-600000)), archives: new Map(),
    evidence: new Map(), log: [], getCalls: 0, nativeLaunches: 0 };
}
function fixture(options = {}, state = sharedState()) {
  const observedCalls = {};
  const input = {
    approval: { reference: 'OFFLINE-SYNTHETIC-CONTEXT', approver: 'SYNTHETIC_REVIEWER',
      approvedAt: iso(-1000), validityStartUtc: iso(-1000), validityEndUtc: iso(600000) },
    expectedStale: { sha256: hash(state.active), bytes: state.active.length, metadata: { ...metadata } },
    references: { syntheticOnly: true },
  };
  const wrap = (name, fn) => async request => {
    state.log.push(name); observedCalls[name] = (observedCalls[name] ?? 0) + 1;
    const value = await fn(request);
    await options.hooks?.[name]?.(state, value, observedCalls[name], request);
    return value;
  };
  const ports = {
    verifyArtifacts: wrap('verifyArtifacts', () => ({ ...ARTIFACT_PINS })),
    verifyLocalSecurity: wrap('verifyLocalSecurity', () => ({
      ...TARGET, nodeVersion: 'v24.21.0', nativeForceUnset: true, environmentLoaderApproved: true,
      credentialAvailablePrivately: true, rootVerified: true, noRedirect: true,
      forbiddenStateAbsent: true, rejectUnauthorized: true, hostnameAndSniRequired: true,
      noPoolerOrFallback: true,
      caSha256: '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7',
      configuredCaMatches: true, caFileMatches: true, caProvenanceAndValidityVerified: true,
    })),
    inspectProof: wrap('inspectProof', req => ({
      bytes: Buffer.from(state.active ?? Buffer.alloc(0)), metadata: { ...metadata },
      rootVerified: true, artifactVerified: true, noRedirect: true, forbiddenStateAbsent: true,
      destinationAbsent: !state.archives.has(req.archiveLeaf),
    })),
    getProject: wrap('getProject', req => {
      assert.deepEqual(req, { id: TARGET.project, method: 'get_project' });
      state.getCalls++;
      return { project: TARGET.project, host: TARGET.host, status: 'ACTIVE_HEALTHY',
        verifiedVia: 'supabase-control-plane-get-project', verifiedAt: new Date(state.now).toISOString() };
    }),
    archiveProof: wrap('archiveProof', async req => {
      await options.archiveBarrier?.();
      // Linearizable in-memory CAS MODEL only; not a Windows or cross-process test.
      if (state.archives.has(req.archiveLeaf) || !state.active || hash(state.active) !== req.expectedSha256) {
        throw Error('synthetic archive collision');
      }
      state.archives.set(req.archiveLeaf, Buffer.from(state.active)); state.active = null;
      return { sameDirectory: true, noOverwrite: true, sourceAbsent: true, archiveLeaf: req.archiveLeaf,
        sha256: req.expectedSha256, bytes: req.expectedBytes, metadata: { ...metadata },
        rootVerified: true, artifactVerified: true, noRedirect: true, noTimestampReset: true };
    }),
    createProof: wrap('createProof', req => {
      assert.equal(req.createMode, 'wx'); assert.equal(req.encoding, 'utf8-no-bom');
      assert.equal(req.requireSync, true);
      if (state.active !== null) throw Error('synthetic create-new collision');
      state.active = Buffer.from(req.bytes);
      return { exclusive: true, synced: true, sha256: hash(state.active), bytes: state.active.length,
        rootVerified: true, artifactVerified: true, noRedirect: true };
    }),
    readNewProof: wrap('readNewProof', () => ({
      bytes: Buffer.from(state.active), rootVerified: true, artifactVerified: true, noRedirect: true,
    })),
    launchNative: wrap('launchNative', req => {
      assert.equal(req, NATIVE_LAUNCH);
      assert.deepEqual(req.args, [
        '--env-file=.env.foundation.local',
        'docs/production-security/budget-deletion-pause/native-adapter-candidate-20261013T161403Z/native-budget-pause-runner.mjs',
        '--preflight',
      ]);
      state.nativeLaunches++;
      const b = Buffer.from(JSON.stringify({ syntheticOnly: true, inventory: Array.from({ length: 57 }, (_, i) => i),
        migrations: 164, policies: 15, objects: 378 }));
      state.evidence.set(leaf, b);
      return { exitCode: 0, signal: null, stdout: JSON.stringify({ status: 'PASS',
        mode: 'READ_ONLY_PREFLIGHT', installationActivated: false, evidenceFile: leaf,
        syntheticExpectedHash: hash(b) }) };
    }),
    readEvidence: wrap('readEvidence', name => {
      assert.equal(name, leaf);
      if (!state.evidence.has(name)) throw Error('synthetic missing evidence');
      return Buffer.from(state.evidence.get(name));
    }),
    verifyEvidenceAcl: wrap('verifyEvidenceAcl', () => ({
      status: 'PASS', rootVerified: true, fileVerified: true, noRedirect: true,
    })),
  };
  const engine = createIntegrationEngine({
    ports, makePreflight: options.makePreflight ?? fakeReviewedWrapper,
    now: () => state.now, monotonicNow: () => state.mono,
  });
  return { engine, input, state, ports, observedCalls };
}
function advance(state, ms) { state.now += ms; state.mono += ms; }

test('synthetic protocol succeeds only after ordered gates and complete evidence', async () => {
  const f = fixture(), old = Buffer.from(f.state.active);
  const out = await f.engine.run(f.input);
  assert.equal(out.status, 'PASS'); assert.equal(out.launches, 1);
  assert.equal(out.calls.getProject, 1); assert.equal(out.calls.inspectProof, 2);
  assert.equal(out.calls.archiveProof, 1); assert.equal(out.calls.createProof, 1);
  assert.equal(out.calls.readEvidence, 2); assert.equal(out.automaticRetries, 0);
  assert.deepEqual(f.state.log.slice(0, 8), ['verifyArtifacts', 'verifyLocalSecurity', 'inspectProof',
    'getProject', 'inspectProof', 'archiveProof', 'createProof', 'readNewProof']);
  assert.deepEqual([...f.state.archives.values()][0], old);
  assert.equal(JSON.parse(f.state.active).verifiedAt, iso(0));
  assert.ok(f.state.evidence.has(leaf)); assert.equal(out.installationActivated, false);
});
test('validity start/end and five-minute exact completion boundaries are inclusive', async () => {
  for (const delta of [0, 300000]) {
    const f = fixture({ hooks: { launchNative: s => advance(s, delta) } });
    f.input.approval.validityStartUtc = iso(0);
    f.input.approval.validityEndUtc = iso(300000);
    assert.equal((await f.engine.run(f.input)).status, 'PASS');
  }
});
for (const [label, change] of [
  ['missing time', a => { delete a.validityEndUtc; }],
  ['timezone-free', a => { a.validityStartUtc = '2031-03-01T00:00:00'; }],
  ['numeric coercion', a => { a.validityStartUtc = 0; }],
  ['reversed', a => { a.validityStartUtc = iso(1000); a.validityEndUtc = iso(0); }],
  ['not yet valid', a => { a.validityStartUtc = iso(1); }],
  ['expired window', a => { a.validityEndUtc = iso(-1); }],
  ['future approval', a => { a.approvedAt = iso(1); }],
  ['old authorization', a => { a.reference = 'YTRACE-BDP-DECISION-A-20261014-01'; }],
]) test('context rejected before any I/O: ' + label, async () => {
  const f = fixture(); change(f.input.approval);
  assert.equal((await f.engine.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.log.length, 0);
});
const stages = ['verifyArtifacts', 'verifyLocalSecurity', 'inspectProof', 'getProject',
  'archiveProof', 'createProof', 'readNewProof', 'launchNative', 'verifyEvidenceAcl', 'readEvidence'];
for (const name of stages) test('approval expiry during asynchronous ' + name + ' stops without retry', async () => {
  const f = fixture({ hooks: { [name]: s => advance(s, 600001) } });
  const out = await f.engine.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.retainAllEvidence, true);
  assert.equal(out.automaticRetries, 0); assert.ok(out.launches <= 1);
  await f.engine.run(f.input);
  assert.ok(f.state.nativeLaunches <= 1); assert.ok((f.observedCalls[name] ?? 0) <= 1);
});
for (const name of ['getProject', 'inspectProof', 'archiveProof', 'createProof', 'readNewProof',
  'launchNative', 'verifyEvidenceAcl', 'readEvidence']) {
  test('five-minute crossing during asynchronous ' + name + ' stops and retains', async () => {
    const f = fixture({ hooks: { [name]: (s, value, n) => {
      if (name !== 'inspectProof' || n === 2) advance(s, 300001);
    } } });
    const out = await f.engine.run(f.input);
    assert.equal(out.status, 'BLOCKED'); assert.equal(out.retainAllEvidence, true);
    assert.equal(out.automaticRetries, 0); assert.ok(f.state.nativeLaunches <= 1);
    if (f.state.archives.size) assert.equal(f.state.archives.size, 1);
  });
}
test('later evidence read and ACL checkpoints are individually guarded', async () => {
  for (const name of ['readEvidence', 'verifyEvidenceAcl']) {
    const f = fixture({ hooks: { [name]: (s, v, n) => { if (n === 2) advance(s, 300001); } } });
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
    assert.ok(f.state.evidence.has(leaf));
  }
});
test('wrong project, host, status, scope or future observation cannot archive', async () => {
  for (const patch of [
    { project: 'other' }, { host: 'other.supabase.co' }, { status: 'PAUSED' },
    { verifiedVia: 'alternate-api' }, { verifiedAt: iso(1) }, { verifiedAt: iso(-1) },
    { verifiedAt: '2031-03-01T00:00:00' }, { verifiedAt: 0 },
    { extra: 'UNEXPECTED_FIELD' },
  ]) {
    const f = fixture({ hooks: { getProject: (s, value) => Object.assign(value, patch) } });
    const old = Buffer.from(f.state.active);
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
    assert.equal(f.state.archives.size, 0); assert.deepEqual(f.state.active, old);
  }
});
test('unavailable scoped observation fails without an alternative or refresh', async () => {
  const f = fixture({ hooks: { getProject: () => { throw Error('synthetic unavailable'); } } });
  assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
  assert.equal(f.state.getCalls, 1); assert.equal(f.state.archives.size, 0);
});
test('artifact drift, CA/TLS/loader/root failures stop before control-plane', async () => {
  for (const [name, patch] of [
    ['verifyArtifacts', { nativeBundle: '0'.repeat(64) }],
    ['verifyLocalSecurity', { rejectUnauthorized: false }],
    ['verifyLocalSecurity', { caSha256: '0'.repeat(64) }],
    ['verifyLocalSecurity', { rootVerified: false }],
    ['verifyLocalSecurity', { nativeForceUnset: false }],
    ['verifyLocalSecurity', { noPoolerOrFallback: false }],
    ['verifyLocalSecurity', { credentialAvailablePrivately: false }],
  ]) {
    const f = fixture({ hooks: { [name]: (s, value) => Object.assign(value, patch) } });
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
    assert.equal(f.state.getCalls, 0); assert.equal(f.state.nativeLaunches, 0);
  }
});
test('proof hash/metadata/state/destination recheck must pass immediately before rename', async () => {
  for (const patch of [
    { destinationAbsent: false }, { forbiddenStateAbsent: false }, { noRedirect: false },
    { metadata: { ...metadata, owner: 'DIFFERENT_SYNTHETIC_OWNER' } }, { bytes: Buffer.from('invalid') },
  ]) {
    const f = fixture({ hooks: { inspectProof: (s, value, n) => { if (n === 2) Object.assign(value, patch); } } });
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
    assert.equal(f.state.getCalls, 1); assert.equal(f.state.archives.size, 0);
  }
});
test('initial malformed or nonstale proof stops before scoped observation', async () => {
  for (const timestamp of [iso(0), iso(1), '2031-03-01T00:00:00']) {
    const f = fixture(); f.state.active = syntheticProof(timestamp);
    f.input.expectedStale.sha256 = hash(f.state.active); f.input.expectedStale.bytes = f.state.active.length;
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.getCalls, 0);
  }
});
test('archive receipt uncertainty retains actual synthetic rename and never creates new proof', async () => {
  const f = fixture({ hooks: { archiveProof: (s, value) => { value.noOverwrite = false; } } });
  const out = await f.engine.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.archiveAttempted, true);
  assert.equal(f.state.archives.size, 1); assert.equal(f.state.active, null);
  assert.equal(f.observedCalls.createProof ?? 0, 0);
});
test('create-new failure retains archive and any partial synthetic proof', async () => {
  const f = fixture({ hooks: { createProof: s => {
    s.active = Buffer.alloc(0); throw Error('synthetic uncertain write');
  } } });
  const out = await f.engine.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(f.state.archives.size, 1);
  assert.ok(Buffer.isBuffer(f.state.active)); assert.equal(f.state.active.length, 0);
  assert.equal(f.state.nativeLaunches, 0);
});
test('new proof must be read back exactly; observation timestamp cannot be reset', async () => {
  const f = fixture({ hooks: { readNewProof: (s, value) => { value.bytes = syntheticProof(iso(1000)); } } });
  assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
  assert.equal(f.state.archives.size, 1); assert.equal(f.state.nativeLaunches, 0);
  assert.equal(JSON.parse(f.state.active).verifiedAt, iso(0));
});
for (const kind of ['timeout', 'cancellation', 'process-error', 'unknown-outcome']) {
  test('native ' + kind + ' is blocked, retained and not relaunched', async () => {
    const f = fixture({ hooks: { launchNative: () => { throw Error(kind + ' password=CANARY_DO_NOT_ECHO'); } } });
    const out = await f.engine.run(f.input);
    assert.equal(out.status, 'BLOCKED'); assert.equal(out.launches, 1);
    assert.equal(out.automaticRetries, 0); assert.ok(f.state.evidence.has(leaf));
    assert.ok(!JSON.stringify(out).includes('CANARY_DO_NOT_ECHO'));
    await f.engine.run(f.input); assert.equal(f.state.nativeLaunches, 1);
  });
}
test('zero exit, stopped label, nonzero exit or signal cannot imply success', async () => {
  for (const patch of [
    { exitCode: 2 }, { signal: 'SIGTERM' }, { stdout: '{"status":"BLOCKED"}' },
    { stdout: '{"status":"PASS"}' }, { stdout: '' }, { stdout: '{}\n{}' },
  ]) {
    const f = fixture({ hooks: { launchNative: (s, value) => Object.assign(value, patch) } });
    const out = await f.engine.run(f.input);
    assert.equal(out.status, 'BLOCKED'); assert.equal(f.state.nativeLaunches, 1);
  }
});
test('incomplete, corrupt, missing or unstable synthetic evidence never passes', async () => {
  for (const alter of [
    (s, v, n) => { if (n === 1) s.evidence.delete(leaf); },
    (s, v) => v.fill(0),
    (s, v, n) => { if (n === 2) v[0] = 0; },
  ]) {
    const f = fixture({ hooks: { readEvidence: alter } });
    const out = await f.engine.run(f.input);
    assert.equal(out.status, 'BLOCKED'); assert.equal(f.state.nativeLaunches, 1);
  }
});
test('PASS label without a launch or complete evidence is rejected by coordinator', async () => {
  const f = fixture({ makePreflight: () => ({ run: async () => ({ status: 'PASS', exitCode: 0 }) }) });
  assert.equal((await f.engine.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.nativeLaunches, 0);
});
test('wrong wrapper evidence hash or incomplete preservation receipt is rejected', async () => {
  const f = fixture({ makePreflight: io => {
    const realFake = fakeReviewedWrapper(io);
    return { run: async ctx => ({ ...await realFake.run(ctx), evidenceSha256: '0'.repeat(64) }) };
  } });
  assert.equal((await f.engine.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.nativeLaunches, 1);
});
test('wall and monotonic clock changes fail closed between asynchronous stages', async () => {
  for (const clock of ['now', 'mono']) {
    const f = fixture({ hooks: {
      verifyArtifacts: s => advance(s, 100),
      verifyLocalSecurity: s => { s[clock] -= 1; },
    } });
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.getCalls, 0);
  }
});
test('one-use guard also prevents a concurrent second call of the same integration', async () => {
  const f = fixture();
  const outcomes = await Promise.all([f.engine.run(f.input), f.engine.run(f.input)]);
  assert.equal(outcomes.filter(x => x.status === 'PASS').length, 1);
  assert.equal(outcomes.filter(x => x.reason === 'INTEGRATION_ALREADY_CONSUMED').length, 1);
  assert.equal(f.state.getCalls, 1); assert.equal(f.state.nativeLaunches, 1);
});
test('atomic archive CAS model permits one preflight across two modeled invocations', async () => {
  let arrivals = 0, release;
  const barrier = new Promise(r => { release = r; });
  const archiveBarrier = async () => { if (++arrivals === 2) release(); await barrier; };
  const state = sharedState();
  const a = fixture({ archiveBarrier }, state), b = fixture({ archiveBarrier }, state);
  const result = await Promise.all([a.engine.run(a.input), b.engine.run(b.input)]);
  assert.equal(result.filter(x => x.status === 'PASS').length, 1);
  assert.equal(result.filter(x => x.status === 'BLOCKED').length, 1);
  assert.equal(state.archives.size, 1); assert.equal(state.nativeLaunches, 1);
  assert.equal(state.getCalls, 2); // Not a durable one-observation guarantee.
});
test('public integration cannot replace the reviewed wrapper or validator', () => {
  const f = fixture();
  for (const patch of [{ makePreflight: fakeReviewedWrapper }, { wrapperFactory: () => {} },
    { evidenceValidator: () => ({ status: 'PASS' }) }]) {
    assert.throws(() => createTrustedIOIntegration({ ports: f.ports, ...patch }));
  }
});
test('cleanup/reset/alternate-provider capabilities are excluded from the port set', () => {
  const f = fixture();
  assert.throws(() => createIntegrationEngine({
    ports: { ...f.ports, cleanup: () => {} }, makePreflight: fakeReviewedWrapper,
  }));
});
test('fixed launch request is immutable and contains only reviewed native --preflight route', () => {
  assert.ok(Object.isFrozen(NATIVE_LAUNCH)); assert.ok(Object.isFrozen(NATIVE_LAUNCH.args));
  assert.equal(NATIVE_LAUNCH.route, 'native-pg-direct-tls');
  assert.equal(NATIVE_LAUNCH.args.at(-1), '--preflight');
  assert.equal(NATIVE_LAUNCH.host, TARGET.host);
});

test('a second native launch request is blocked before provider dispatch and counted once', async () => {
  const f = fixture({ makePreflight: io => ({ run: async () => {
    await io.launch(nativeRequest);
    await io.launch(nativeRequest);
    throw Error('unreachable');
  } }) });
  const out = await f.engine.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.launches, 1);
  assert.equal(out.calls.launchNative, 1); assert.equal(f.state.nativeLaunches, 1);
  assert.ok(f.state.evidence.has(leaf));
});
test('an extra evidence read is denied before provider dispatch', async () => {
  const f = fixture({ makePreflight: io => {
    const fake = fakeReviewedWrapper(io);
    return { run: async ctx => { const value = await fake.run(ctx); await io.readEvidence(leaf); return value; } };
  } });
  const out = await f.engine.run(f.input);
  assert.equal(out.status, 'BLOCKED'); assert.equal(out.calls.readEvidence, 2);
  assert.equal(f.observedCalls.readEvidence, 2); assert.ok(f.state.evidence.has(leaf));
});
test('changed native scope cannot reach the provider', async () => {
  for (const patch of [{ mode: '--install-worker' }, { host: 'other' }, { project: 'other' }]) {
    const f = fixture({ makePreflight: io => ({ run: async () => io.launch({ ...nativeRequest, ...patch }) }) });
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
    assert.equal(f.state.nativeLaunches, 0);
  }
});
test('deadline crossing during final wrapper validation cannot report PASS', async () => {
  const s = sharedState();
  const f = fixture({ makePreflight: io => {
    const fake = fakeReviewedWrapper(io);
    return { run: async ctx => { const value = await fake.run(ctx); advance(s, 300001); return value; } };
  } }, s);
  assert.equal((await f.engine.run(f.input)).status, 'BLOCKED');
  assert.equal(s.nativeLaunches, 1); assert.ok(s.evidence.has(leaf));
});
test('invalid wall/monotonic clocks fail before I/O instead of numeric coercion', async () => {
  for (const [field, value] of [['now', '2031-03-01T00:00:00Z'], ['now', NaN],
    ['mono', '0'], ['mono', Infinity]]) {
    const f = fixture(); f.state[field] = value;
    assert.equal((await f.engine.run(f.input)).status, 'BLOCKED'); assert.equal(f.state.log.length, 0);
  }
});
