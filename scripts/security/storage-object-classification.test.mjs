import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyObject, parseReference, buildInventory } from './storage-object-classification.mjs';
const origin = 'https://fixture.supabase.co';
const object = { id: 'object-1', bucket_id: 'budget-request-files', name: 'parent/private.pdf', current_references: [], history_references: [], owner_organizations: [] };
test('canonical paths are exact and URL query/fragment never become object names', () => {
  assert.deepEqual(parseReference('storage://budget-request-files/parent/a%20b.pdf', origin), { bucket: 'budget-request-files', path: 'parent/a%20b.pdf' });
  assert.deepEqual(parseReference(origin + '/storage/v1/object/sign/budget-request-files/parent/a%20b.pdf?token=secret#fragment', origin), { bucket: 'budget-request-files', path: 'parent/a b.pdf' });
});
test('foreign hosts, URL userinfo and malformed UTF-8 are rejected', () => {
  for (const v of ['https://evil.invalid/storage/v1/object/public/template-files/a.pdf', origin + '.evil.invalid/storage/v1/object/public/template-files/a.pdf', 'https://fixture.supabase.co@evil.invalid/storage/v1/object/public/template-files/a.pdf', origin + '/storage/v1/object/public/template-files/a%FF.pdf']) assert.equal(parseReference(v, origin), null);
});
test('exact current and historical references require preservation', () => {
  assert.equal(classifyObject({ ...object, current_references: [{}] }).classification, 'Legitimately retained');
  assert.equal(classifyObject({ ...object, history_references: [{}] }).classification, 'Required historical evidence');
});
test('test ownership and reset/deletion correlation never prove an object unused', () => {
  const result = classifyObject({ ...object, owner_organizations: [{ id: 'test-org' }] }, { audit_groups: [{ action: 'reset', exact_uri_matches: 0, exact_path_matches: 0 }] }, ['test-org']);
  assert.equal(result.classification, 'Unresolved'); assert.equal(result.decision_group, 'legacy-test-owner');
});
test('missing owner, old age and a surviving parent prefix are not authorization evidence', () => {
  const r = classifyObject({ ...object, owner_auth_exists: false, created_at: '2000-01-01', path_parent_candidates: [{}] });
  assert.equal(r.classification, 'Unresolved'); assert.equal(r.existing_path_parent_count, 1);
});
test('unreferenced template versions are not labelled inactive or unused', () => {
  const r = classifyObject({ ...object, bucket_id: 'template-files', path_template_candidates: [{ active: true }] });
  assert.equal(r.classification, 'Unresolved'); assert.equal(r.decision_group, 'unreferenced-template-version');
});
test('other archived references and exact audit strings require review rather than automatic relinking', () => {
  const r = classifyObject({ ...object, additional_references: [{}] }, { audit_groups: [{ exact_uri_matches: 1, exact_path_matches: 1 }] });
  assert.equal(r.classification, 'Unresolved'); assert.equal(r.other_reference_count, 1);
});
test('redacted output contains no original path, filename, organization ID, or audit payload', () => {
  const r = buildInventory([{ ...object, owner_organizations: [{ id: 'sensitive-org' }] }], [], []);
  assert.equal(r.unmatched.length, 1); assert.equal(r.unmatched_classifications['Verified unused'], 0);
  const json = JSON.stringify(r); for (const privateValue of [object.name, 'private.pdf', 'sensitive-org']) assert.ok(!json.includes(privateValue));
});
