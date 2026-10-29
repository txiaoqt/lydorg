import test from 'node:test';
import assert from 'node:assert/strict';
import { guardedFetch, verifyTarget, safeError, syntheticPdf, hash, REF, URL } from './synthetic-validation-common.mjs';

test('staging target gate rejects production and unknown references before any request', () => {
  const names = ['YTRACE_STAGING_SUPABASE_URL', 'YTRACE_STAGING_PROJECT_REF'];
  const previous = names.map(name => process.env[name]);
  try {
    process.env[names[0]] = URL; process.env[names[1]] = REF; assert.doesNotThrow(verifyTarget);
    process.env[names[1]] = 'mqqaykksadotbrghbexz'; assert.throws(verifyTarget, /target guard/);
    process.env[names[1]] = REF; process.env[names[0]] = 'https://unknown.invalid'; assert.throws(verifyTarget, /target guard/);
  } finally { names.forEach((name, i) => { if (previous[i] == null) delete process.env[name]; else process.env[name] = previous[i]; }); }
});
test('network guard rejects production, arbitrary hosts and alternate protocols before fetch', async () => {
  for (const origin of ['https://mqqaykksadotbrghbexz.supabase.co', 'https://example.invalid', `http://${REF}.supabase.co`]) {
    await assert.rejects(guardedFetch(`${origin}/storage/v1/object/test`), /Non-staging/);
  }
});
test('sanitized errors never retain request bodies, API keys or bearer URLs', () => {
  const r = safeError({ code: '42501', message: 'private-synthetic-secret-token https://example.invalid/?token=private-synthetic-secret-token' });
  assert.deepEqual(r, { code: '42501', reason: 'Sanitized operation failure' });
  assert.equal(JSON.stringify(r).includes('private-synthetic-secret-token'), false);
});
test('synthetic PDF is small, labeled, internally offset-consistent and reproducible', () => {
  const pdf = syntheticPdf('A registration');
  assert.ok(pdf.length < 2048); assert.ok(pdf.toString().startsWith('%PDF-1.4'));
  assert.ok(pdf.toString().includes('SYNTHETIC Y-TRACE STAGING SECURITY TEST ONLY'));
  const start = Number(pdf.toString().match(/startxref\n(\d+)/)[1]);
  assert.equal(pdf.subarray(start, start + 4).toString(), 'xref');
  assert.equal(hash(pdf), hash(syntheticPdf('A registration')));
  assert.notEqual(hash(pdf), hash(syntheticPdf('B registration')));
});
