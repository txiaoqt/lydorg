import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { verifyTarget, client, requireEnv, loadState, MARKER, REF, hash, ok, evidence, setContext } from './synthetic-validation-common.mjs';
verifyTarget();
setContext('Read-only fixture inventory', 'Identity repair preflight');
const state = await loadState();
const service = client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
const anonymous = client();
const checks = [];
const users = (await ok(service.auth.admin.listUsers({ page: 1, perPage: 100 }))).users;
const expected = [...Object.values(state.actors), state.reviewer];
assert.equal(users.length, 4);
for (const actor of expected) {
  const { user } = await ok(service.auth.admin.getUserById(actor.userId));
  assert.equal(user.id, actor.userId); assert.equal(user.email, actor.email);
  assert.ok(user.email.endsWith('@example.invalid'));
  assert.equal(user.app_metadata.ytrace_security_fixture, MARKER);
  assert.equal(user.identities.length, 1); assert.equal(user.identities[0].provider, 'email');
}
checks.push({ check: 'Exact four journal-recorded synthetic Auth identities', status: 'PASS' });
const admins = await ok(service.from('admin_accounts').select('id,username,is_active,is_password_set,role_id'));
assert.equal(admins.length, 2);
const roles = await ok(service.from('roles').select('id,code,permission_codes'));
const superAdmin = admins.find(a => a.username === 'staging-super-admin');
const reviewer = admins.find(a => a.id === state.reviewer.adminId);
assert.ok(superAdmin?.is_active && superAdmin.is_password_set);
assert.equal(roles.find(r => r.id === superAdmin.role_id).code, 'super_admin');
assert.ok(reviewer?.is_active && reviewer.is_password_set);
assert.equal(roles.find(r => r.id === reviewer.role_id).permission_codes.length, 0);
checks.push({ check: 'Existing activated Super Admin and zero-permission Admin', status: 'PASS' });
const buckets = await ok(service.storage.listBuckets());
assert.equal(buckets.length, 10);
const privateBuckets = new Set(['organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files','template-files']);
const publicBuckets = new Set(['news-release-images','brand-logo','registration-seed-file','transparency-attachments']);
for (const bucket of buckets) {
  assert.ok(privateBuckets.has(bucket.id) || publicBuckets.has(bucket.id));
  assert.equal(bucket.public, publicBuckets.has(bucket.id));
}
checks.push({ check: 'Ten existing buckets with unchanged visibility', status: 'PASS' });
for (const [label, ref] of [['template',state.template],['news',state.newsImage]]) {
  const bytes = await ok(anonymous.storage.from(ref.bucket).download(ref.path));
  assert.equal(hash(Buffer.from(await bytes.arrayBuffer())), ref.sha256);
  checks.push({ check: `Preserved synthetic ${label} bytes match journal hash`, status: 'PASS' });
}
const report = { projectRef: REF, timestamp: new Date().toISOString(), checks, evidence };
await writeFile('docs/staging-validation/2026-10-10/identity-schema/fixture-preflight.json', JSON.stringify(report,null,2));
console.log(JSON.stringify({ projectRef: REF, checks }));
