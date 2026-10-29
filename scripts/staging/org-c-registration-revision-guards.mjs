const EXPECTED_AUTH_COUNT = 5;
const REVIEWER_EMAIL = 'ytrace-staging-no-permissions@example.invalid';
const PROJECT_REF = 'zroudsvpswqsjlyttkjf';
const ORG_C_EMAIL = 'ytrace-org-c-revision@example.invalid';
const ORG_C_NAME = 'SYNTHETIC Org C Registration Revision Test';

export function expectedExistingAuth(state) {
  const rows = [
    ...['A', 'B', 'S'].map((label) => ({ ...state.actors?.[label], fixtureActor: label })),
    { ...state.reviewer, fixtureActor: 'no-permissions-admin-activation' },
    { ...state.renewalScenario, renewalFixture: true },
  ];
  const ids = rows.map((row) => row.userId);
  const emails = rows.map((row) => String(row.email ?? '').toLowerCase());
  if (rows.length !== EXPECTED_AUTH_COUNT || rows.some((row) => !row.userId || !row.email) ||
    new Set(ids).size !== EXPECTED_AUTH_COUNT || new Set(emails).size !== EXPECTED_AUTH_COUNT ||
    state.reviewer?.username !== 'staging-no-permissions' || state.reviewer?.email !== REVIEWER_EMAIL ||
    !state.reviewer?.adminId) {
    throw new Error('Expected the five journal-recorded synthetic Auth identities, including the retained zero-permission Admin.');
  }
  return rows;
}

export function authInventoryMatches(users, expected) {
  if (!Array.isArray(users) || !Array.isArray(expected) || users.length !== expected.length ||
    new Set(users.map((user) => user.id)).size !== users.length ||
    new Set(users.map((user) => String(user.email ?? '').toLowerCase())).size !== users.length) return false;
  return expected.every((entry) => users.some((user) =>
    user.id === entry.userId && String(user.email ?? '').toLowerCase() === String(entry.email).toLowerCase()));
}

export function expectedDocumentFileReferences(state) {
  const references = [
    ...(state.files ?? []),
    ...(state.renewalScenario?.files ?? []),
  ].filter((file) => file.bucket === 'organization-documents' && file.metadataId);
  const byId = new Map();
  for (const file of references) {
    if (!file.storageUri || !file.path || file.storageUri !== `storage://${file.bucket}/${file.path}`) {
      throw new Error('A journaled document file reference is incomplete.');
    }
    const current = byId.get(file.metadataId) ?? new Set();
    current.add(file.storageUri);
    byId.set(file.metadataId, current);
  }
  if (byId.size !== 19) throw new Error('Expected exactly 19 unique journaled staging document records.');
  return byId;
}

export function documentFileInventoryMatches(rows, expectedReferences) {
  if (!Array.isArray(rows) || !(expectedReferences instanceof Map) || rows.length !== expectedReferences.size ||
    new Set(rows.map((row) => row.id)).size !== rows.length) return false;
  return rows.every((row) => expectedReferences.get(row.id)?.has(row.file_url) === true);
}

export function isRecoverablePreAuthJournal(journal, report) {
  if (!journal || journal.projectRef !== PROJECT_REF || journal.email !== ORG_C_EMAIL ||
    journal.organizationName !== ORG_C_NAME || journal.phase !== 'prepared' ||
    journal.authCreateAttempted !== true || journal.authCreated === true || journal.authUserId ||
    journal.organizationId || journal.submissionId || !Array.isArray(journal.files) || journal.files.length !== 0 ||
    journal.corrected || journal.authCreateRecovery) return false;
  if (!report || report.projectRef !== PROJECT_REF || report.stopReason?.code !== 'EPERM' ||
    !Array.isArray(report.steps) || !Array.isArray(report.http)) return false;
  const preflightPassed = report.steps.some((step) => step.name === 'Fresh exact-target staging preflight' && step.status === 'PASS');
  const stoppedWithExpectedCode = report.steps.some((step) => step.name === 'Stopped without retry or cleanup' &&
    step.status === 'BLOCKED' && step.code === 'EPERM');
  const createUserStepRecorded = report.steps.some((step) => /create exactly one confirmed synthetic auth user/i.test(step.name));
  const authCreateRequestObserved = report.http.some((request) => String(request.method).toUpperCase() === 'POST' &&
    String(request.endpoint).startsWith('/auth/v1/admin/users'));
  return preflightPassed && stoppedWithExpectedCode && !createUserStepRecorded && !authCreateRequestObserved;
}

export function isRecoverableAuthCreatedJournal(journal, report) {
  if (!journal || journal.projectRef !== PROJECT_REF || journal.email !== ORG_C_EMAIL ||
    journal.organizationName !== ORG_C_NAME || journal.phase !== 'auth-created' ||
    journal.authCreateAttempted !== true || journal.authCreated !== true || !journal.authUserId ||
    journal.organizationId || journal.submissionId || !Array.isArray(journal.files) || journal.files.length !== 0 ||
    journal.corrected) return false;
  if (!report || report.projectRef !== PROJECT_REF || report.stopReason?.code !== '23514' ||
    !Array.isArray(report.steps) || !Array.isArray(report.http)) return false;
  const authCreated = report.steps.some((step) => step.name === 'Create exactly one confirmed synthetic Auth user via server-side Auth Admin SDK' && step.status === 'PASS');
  const ownerAuthenticated = report.steps.some((step) => step.name === 'Authenticate synthetic Org C with a genuine owner JWT' && step.status === 'PASS');
  const failedAtProfileConstraint = report.steps.some((step) => step.name === 'Stopped without retry or cleanup' &&
    step.status === 'BLOCKED' && step.code === '23514' && step.reason === 'violates check constraint');
  const authCreateResponse = report.http.filter((request) => String(request.method).toUpperCase() === 'POST' &&
    request.endpoint === '/auth/v1/admin/users' && request.status === 200);
  const ownerLoginResponse = report.http.filter((request) => String(request.method).toUpperCase() === 'POST' &&
    request.endpoint === '/auth/v1/token' && request.status === 200);
  const profileFailures = report.http.filter((request) => String(request.method).toUpperCase() === 'POST' &&
    request.endpoint === '/rest/v1/organization_profiles');
  const successfulSubmissionOrUpload = report.http.some((request) => String(request.method).toUpperCase() === 'POST' &&
    (request.endpoint === '/rest/v1/document_submissions' || request.endpoint === '/rest/v1/document_submission_files' ||
      (request.endpoint.startsWith('/storage/v1/object/') && !request.endpoint.includes('/list/'))));
  return authCreated && ownerAuthenticated && failedAtProfileConstraint && authCreateResponse.length === 1 &&
    ownerLoginResponse.length === 1 && profileFailures.length === 1 && profileFailures[0].status === 400 &&
    !successfulSubmissionOrUpload;
}
