import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expectedExistingAuth, authInventoryMatches,
  expectedDocumentFileReferences, documentFileInventoryMatches, isRecoverablePreAuthJournal,
  isRecoverableAuthCreatedJournal,
} from './org-c-registration-revision-guards.mjs';

const fixtureState = () => ({
  actors: Object.fromEntries(['A', 'B', 'S'].map((label) => [label, {
    userId: `user-${label}`, email: `org-${label.toLowerCase()}@example.invalid`,
  }])),
  reviewer: {
    userId: 'user-zero-permission-admin',
    email: 'ytrace-staging-no-permissions@example.invalid',
    username: 'staging-no-permissions',
    adminId: 'admin-zero-permission',
  },
  renewalScenario: { userId: 'user-renewal', email: 'renewal@example.invalid' },
});

test('exact allowlist includes the preserved zero-permission Admin Auth identity', () => {
  const expected = expectedExistingAuth(fixtureState());
  assert.equal(expected.length, 5);
  assert.equal(expected.find((entry) => entry.fixtureActor === 'no-permissions-admin-activation')?.userId,
    'user-zero-permission-admin');
});

test('rejects a missing or duplicate journal identity', () => {
  const missingReviewer = fixtureState();
  missingReviewer.reviewer = undefined;
  assert.throws(() => expectedExistingAuth(missingReviewer), /five journal-recorded/);

  const duplicateId = fixtureState();
  duplicateId.reviewer.userId = duplicateId.actors.A.userId;
  assert.throws(() => expectedExistingAuth(duplicateId), /five journal-recorded/);
});

test('exact inventory rejects missing, substituted, duplicate, and unexpected Auth users', () => {
  const expected = expectedExistingAuth(fixtureState());
  const users = expected.map((entry) => ({ id: entry.userId, email: entry.email }));
  assert.equal(authInventoryMatches(users, expected), true);
  assert.equal(authInventoryMatches(users.slice(0, -1), expected), false);
  assert.equal(authInventoryMatches([...users.slice(0, -1), { id: 'unexpected', email: 'unexpected@example.invalid' }], expected), false);
  assert.equal(authInventoryMatches([...users, { id: 'extra', email: 'extra@example.invalid' }], expected), false);
  assert.equal(authInventoryMatches([...users.slice(0, -1), users[0]], expected), false);
});

test('overlapping preserved journals deduplicate document IDs but accept only a recorded URI', () => {
  const entry = (n, suffix = '') => ({
    metadataId: `file-${n}`, bucket: 'organization-documents', storageUri: `storage://organization-documents/test/${n}${suffix}.pdf`,
    path: `test/${n}${suffix}.pdf`,
  });
  const prior = Array.from({ length: 8 }, (_, i) => entry(i + 1, i < 2 ? '-old' : ''));
  const renewal = Array.from({ length: 13 }, (_, i) => entry(i < 2 ? i + 1 : i + 7));
  const expected = expectedDocumentFileReferences({ files: prior, renewalScenario: { files: renewal } });
  assert.equal(prior.length + renewal.length, 21);
  assert.equal(expected.size, 19);

  const liveRows = [...expected].map(([id, uris]) => ({ id, file_url: [...uris][0] }));
  assert.equal(documentFileInventoryMatches(liveRows, expected), true);
  assert.equal(documentFileInventoryMatches(liveRows.map((row, i) => i === 0 ? { ...row, file_url: 'unrecorded-path' } : row), expected), false);
  assert.equal(documentFileInventoryMatches(liveRows.slice(0, -1), expected), false);
  assert.throws(() => expectedDocumentFileReferences({ files: [entry(1)], renewalScenario: { files: [] } }), /19 unique/);
  assert.throws(() => expectedDocumentFileReferences({
    files: [{ ...entry(1), storageUri: 'storage://unexpected/file.pdf' }], renewalScenario: { files: [] },
  }), /reference is incomplete/);
});

test('resumes only an untouched journal whose prior EPERM is proven pre-dispatch', () => {
  const journal = {
    projectRef: 'zroudsvpswqsjlyttkjf', email: 'ytrace-org-c-revision@example.invalid',
    organizationName: 'SYNTHETIC Org C Registration Revision Test', phase: 'prepared',
    authCreateAttempted: true, authCreated: false, authUserId: null, organizationId: null,
    submissionId: null, files: [], corrected: null,
  };
  const report = {
    projectRef: journal.projectRef,
    stopReason: { code: 'EPERM' },
    steps: [
      { name: 'Fresh exact-target staging preflight', status: 'PASS' },
      { name: 'Stopped without retry or cleanup', status: 'BLOCKED', code: 'EPERM' },
    ],
    http: [{ method: 'GET', endpoint: '/auth/v1/admin/users', status: 200 }],
  };
  assert.equal(isRecoverablePreAuthJournal(journal, report), true);

  assert.equal(isRecoverablePreAuthJournal(journal, { ...report, projectRef: 'production' }), false);
  assert.equal(isRecoverablePreAuthJournal(journal, { ...report, stopReason: { code: 'ETIMEDOUT' } }), false);
  assert.equal(isRecoverablePreAuthJournal(journal, { ...report, http: [...report.http, { method: 'POST', endpoint: '/auth/v1/admin/users' }] }), false);
  assert.equal(isRecoverablePreAuthJournal(journal, { ...report, steps: report.steps.slice(1) }), false);
  assert.equal(isRecoverablePreAuthJournal({ ...journal, authUserId: 'unexpected' }, report), false);
  assert.equal(isRecoverablePreAuthJournal({ ...journal, authCreateRecovery: { confirmedNotDispatched: true } }, report), false);
});

test('resumes an Auth-created journal only after the exact profile constraint failure and no profile write', () => {
  const journal = {
    projectRef: 'zroudsvpswqsjlyttkjf', email: 'ytrace-org-c-revision@example.invalid',
    organizationName: 'SYNTHETIC Org C Registration Revision Test', phase: 'auth-created',
    authCreateAttempted: true, authCreated: true, authUserId: 'recorded-c-user',
    organizationId: null, submissionId: null, files: [], corrected: null,
  };
  const report = {
    projectRef: journal.projectRef,
    stopReason: { code: '23514' },
    steps: [
      { name: 'Create exactly one confirmed synthetic Auth user via server-side Auth Admin SDK', status: 'PASS' },
      { name: 'Authenticate synthetic Org C with a genuine owner JWT', status: 'PASS' },
      { name: 'Stopped without retry or cleanup', status: 'BLOCKED', code: '23514', reason: 'violates check constraint' },
    ],
    http: [
      { method: 'POST', endpoint: '/auth/v1/admin/users', status: 200 },
      { method: 'POST', endpoint: '/auth/v1/token', status: 200 },
      { method: 'POST', endpoint: '/rest/v1/organization_profiles', status: 400 },
    ],
  };
  assert.equal(isRecoverableAuthCreatedJournal(journal, report), true);

  assert.equal(isRecoverableAuthCreatedJournal(journal, { ...report, projectRef: 'production' }), false);
  assert.equal(isRecoverableAuthCreatedJournal(journal, { ...report, stopReason: { code: 'ETIMEDOUT' } }), false);
  assert.equal(isRecoverableAuthCreatedJournal(journal, { ...report, http: [...report.http, { method: 'POST', endpoint: '/rest/v1/document_submissions', status: 201 }] }), false);
  assert.equal(isRecoverableAuthCreatedJournal({ ...journal, organizationId: 'unexpected-profile' }, report), false);
  assert.equal(isRecoverableAuthCreatedJournal({ ...journal, authUserId: null }, report), false);
});
