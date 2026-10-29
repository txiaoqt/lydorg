#!/usr/bin/env node
/**
 * One-shot, staging-only post-patch registration revision validation.
 * Creates exactly one synthetic Org C. Never approves the overall registration,
 * grants accreditation, deletes objects, or sends Auth/notification emails.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { open, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  REF, URL, MARKER, client, requireEnv, verifyTarget, loadState, ok,
  syntheticPdf, hash, setContext, evidence,
} from './synthetic-validation-common.mjs';
import {
  expectedExistingAuth, authInventoryMatches,
  expectedDocumentFileReferences, documentFileInventoryMatches,
  isRecoverablePreAuthJournal, isRecoverableAuthCreatedJournal,
} from './org-c-registration-revision-guards.mjs';

const EMAIL = 'ytrace-org-c-revision@example.invalid';
const ORG_NAME = 'SYNTHETIC Org C Registration Revision Test';
const JOURNAL = resolve('.ytrace-org-c-registration-revision.local');
const LOCK = resolve('.ytrace-staging-fixtures-lock.local');
const PREFLIGHT_ONLY = process.argv.includes('--preflight-only');
const RESUME_PREPARED = process.argv.includes('--resume-prepared');
const RESUME_AUTH_CREATED = process.argv.includes('--resume-auth-created');
const REPORT = resolve('docs/staging-validation/2026-10-11/org-c-revision', PREFLIGHT_ONLY
  ? 'preflight-2026-10-11-02.json'
  : 'positive-revision-2026-10-11-07.json');
const EXPECTED_BUCKETS = new Map([
  ['organization-documents', false], ['budget-request-files', false],
  ['liquidation-report-files', false], ['ypop-files', false], ['move-files', false],
  ['template-files', false], ['news-release-images', true], ['brand-logo', true],
  ['registration-seed-file', true], ['transparency-attachments', true],
]);
const EXPECTED_BASE_COUNTS = {
  authUsers: 5, profiles: 4, submissions: 4, submissionFiles: 19,
  renewals: 1, accreditationTerms: 3, storageObjects: 29,
};

const report = { projectRef: REF, startedAt: new Date().toISOString(), steps: [], http: evidence };
let lockHandle;
let ownerClient;
let peerClient;
let adminLogin;
let journal;
let staging;
let stopped = false;
let journalAclVerified = false;

function record(name, status, fields = {}) {
  const row = { name, status, ...fields };
  report.steps.push(row);
  console.log(`${status}: ${name}`);
}

function safeReason(error) {
  const status = Number(error?.status ?? error?.statusCode);
  const code = typeof error?.code === 'string' && /^[a-z0-9_-]{1,40}$/i.test(error.code) ? error.code : undefined;
  const message = String(error?.message ?? '').toLowerCase();
  const reason = [
    'row-level security', 'permission denied', 'duplicate key', 'violates foreign key',
    'violates check constraint', 'already exists', 'not found', 'unauthorized',
    'invalid input', 'network', 'fetch failed', 'timeout', 'expected', 'mismatch',
  ].find((candidate) => message.includes(candidate));
  return { ...(Number.isFinite(status) && status > 0 ? { httpStatus: status } : {}), ...(code ? { code } : {}), reason: reason ?? 'Sanitized operation failure' };
}

function httpSince(index) {
  return evidence.slice(index).map(({ actor, step, method, endpoint, status, durationMs }) => ({ actor, step, method, endpoint, status, durationMs }));
}

async function saveReport() {
  report.finishedAt = new Date().toISOString();
  await mkdir(resolve(REPORT, '..'), { recursive: true });
  await writeFile(REPORT, JSON.stringify(report, null, 2), { flag: 'wx' });
}

async function verifyJournalAcl(path) {
  if (journalAclVerified || process.platform !== 'win32') return;
  const expectedHash = process.env.YTRACE_STAGING_VERIFIED_JOURNAL_SHA256;
  if (!/^[a-f0-9]{64}$/i.test(expectedHash ?? '')) {
    throw new Error('Run the staging PowerShell wrapper to verify the local journal ACL before resuming.');
  }
  const actualHash = hash(await readFile(path));
  if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error('Local journal changed after its ACL was verified.');
  }
  journalAclVerified = true;
}

async function saveJournal(create = false) {
  if (!journal || journal.projectRef !== REF || journal.email !== EMAIL) throw new Error('Local fixture journal context mismatch.');
  if (create || !existsSync(JOURNAL)) throw new Error('A pre-created protected local fixture journal is required.');
  await verifyJournalAcl(JOURNAL);
  await writeFile(JOURNAL, JSON.stringify(journal, null, 2), { mode: 0o600 });
  // Windows can reject fsync on a read-only handle with EPERM. Use r+ on the
  // already-created, ACL-protected journal; this does not replace its DACL.
  const handle = await open(JOURNAL, 'r+');
  await handle.sync();
  await handle.close();
}

async function countTable(table) {
  const result = await staging.from(table).select('id', { count: 'exact', head: true });
  if (result.error || !Number.isInteger(result.count)) throw new Error(`Could not verify table count for ${table}.`);
  return result.count;
}

async function inventoryBucketObjects(bucket) {
  const objects = [];
  let prefixCount = 0;
  const pending = [''];
  while (pending.length) {
    const prefix = pending.pop();
    if (prefix.split('/').filter(Boolean).length > 20 || ++prefixCount > 1000) throw new Error('Storage inventory bound exceeded.');
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await staging.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      for (const entry of data ?? []) {
        const child = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id == null && entry.metadata == null) pending.push(child);
        else if (objects.push(child) > 10_000) throw new Error('Storage object inventory bound exceeded.');
      }
      if ((data ?? []).length < 100) break;
    }
  }
  return objects.sort();
}

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; page <= 50; page += 1) {
    const data = await ok(staging.auth.admin.listUsers({ page, perPage: 200 }));
    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < 200) return users;
  }
  throw new Error('Auth inventory bound exceeded.');
}

async function exactPreflight() {
  verifyTarget();
  const serviceRole = requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY');
  requireEnv('YTRACE_STAGING_ANON_KEY');
  requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD');
  if (requireEnv('YTRACE_STAGING_PROJECT_REF') !== REF || requireEnv('YTRACE_STAGING_SUPABASE_URL').replace(/\/$/, '') !== URL || URL.includes('mqqaykksadotbrghbexz')) {
    throw new Error('Exact staging endpoint guard rejected configuration.');
  }
  if (existsSync(JOURNAL) && !journal) throw new Error('Org C journal exists outside the verified prepared-resume path.');
  if (existsSync(REPORT)) throw new Error('Unique execution report already exists; refusing to overwrite evidence.');

  const prior = await loadState();
  if (prior.registrationRevisionFinished !== true || prior.registrationRevisionStarted !== true || prior.projectRef !== REF || prior.marker !== MARKER) {
    throw new Error('Existing A/B revision fixture journal does not match the preserved completed state.');
  }
  const expected = expectedExistingAuth(prior);
  const users = await listAllAuthUsers();
  const recordedOrgC = journal?.authCreated === true && typeof journal.authUserId === 'string'
    ? [{ userId: journal.authUserId, email: EMAIL, fixtureActor: 'C' }]
    : [];
  const expectedCurrentAuth = [...expected, ...recordedOrgC];
  if (!authInventoryMatches(users, expectedCurrentAuth)) {
    throw new Error('Auth inventory differs from the recorded staging fixtures.');
  }
  for (const entry of expectedCurrentAuth) {
    const full = await ok(staging.auth.admin.getUserById(entry.userId));
    const user = full.user;
    const markerOkay = entry.renewalFixture
      ? user.app_metadata?.ytrace_renewal_fixture === `${REF}-v1`
      : user.app_metadata?.ytrace_security_fixture === MARKER && user.app_metadata?.ytrace_fixture_actor === entry.fixtureActor;
    if (user.id !== entry.userId || user.email?.toLowerCase() !== entry.email.toLowerCase() || !markerOkay ||
      !user.email_confirmed_at || user.identities?.length !== 1 || user.identities[0]?.provider !== 'email' || user.identities[0]?.user_id !== entry.userId) {
      throw new Error('A journal-recorded Auth identity failed strict staging verification.');
    }
  }

  const admins = await ok(staging.from('admin_accounts').select('id,username,is_active,is_password_set,role_id'));
  if (admins.length !== 2) throw new Error('Admin account inventory changed.');
  const superAdmin = admins.find((row) => row.username === 'staging-super-admin');
  if (!superAdmin?.is_active || !superAdmin.is_password_set) throw new Error('Expected the existing active staging Super Admin.');
  const roles = await ok(staging.from('roles').select('id,code').eq('id', superAdmin.role_id));
  if (roles.length !== 1 || roles[0].code !== 'super_admin') throw new Error('Existing Super Admin role assignment changed.');
  const zeroPermissionAdmin = admins.find((row) => row.username === 'staging-no-permissions');
  if (!zeroPermissionAdmin?.is_active || !zeroPermissionAdmin.is_password_set || zeroPermissionAdmin.id !== prior.reviewer.adminId) {
    throw new Error('The retained zero-permission Admin differs from its protected fixture journal.');
  }
  const zeroPermissionRoles = await ok(staging.from('roles').select('id,code,permission_codes').eq('id', zeroPermissionAdmin.role_id));
  if (zeroPermissionRoles.length !== 1 || !Array.isArray(zeroPermissionRoles[0].permission_codes) || zeroPermissionRoles[0].permission_codes.length !== 0) {
    throw new Error('The retained reviewer role is not the recorded zero-permission role.');
  }

  const profiles = await ok(staging.from('organization_profiles').select('*'));
  const expectedProfileIds = [prior.actors.A.organizationId, prior.actors.B.organizationId, prior.actors.S.organizationId, prior.renewalScenario.organizationId];
  if (profiles.length !== EXPECTED_BASE_COUNTS.profiles || new Set(profiles.map((row) => row.id)).size !== profiles.length ||
    expectedProfileIds.some((id) => !profiles.some((row) => row.id === id)) ||
    !profiles.some((row) => row.id === prior.actors.A.organizationId && row.user_id === prior.actors.A.userId && row.profile_status === 'verified') ||
    !profiles.some((row) => row.id === prior.actors.B.organizationId && row.user_id === prior.actors.B.userId && row.profile_status === 'verified') ||
    !profiles.some((row) => row.id === prior.actors.S.organizationId && row.user_id === prior.actors.S.userId && row.profile_status === 'suspended_inactive') ||
    !profiles.some((row) => row.id === prior.renewalScenario.organizationId && row.is_renewal_test_account === true)) {
    throw new Error('Existing organization fixture inventory or protected status changed.');
  }
  if (profiles.some((row) => row.organization_name === ORG_NAME)) throw new Error('Org C synthetic profile already exists.');
  const tableCounts = {
    profiles: profiles.length,
    submissions: await countTable('document_submissions'),
    submissionFiles: await countTable('document_submission_files'),
    renewals: await countTable('organization_renewals'),
    accreditationTerms: await countTable('organization_accreditations'),
  };
  if (Object.entries(tableCounts).some(([key, value]) => value !== EXPECTED_BASE_COUNTS[key])) {
    throw new Error('Protected staging business-record counts changed before Org C creation.');
  }
  const submissions = await ok(staging.from('document_submissions').select('*'));
  const expectedSubmissionIds = [prior.actors.A.registration?.id, prior.actors.B.registration?.id,
    prior.renewalScenario.registration?.id, prior.renewalScenario.renewalSubmission?.id];
  if (expectedSubmissionIds.some((id) => !id) || submissions.length !== expectedSubmissionIds.length ||
    expectedSubmissionIds.some((id) => !submissions.some((row) => row.id === id))) {
    throw new Error('Existing registration/renewal submission identities differ from the preserved journal.');
  }
  const documentFiles = await ok(staging.from('document_submission_files').select('*'));
  const knownFileReferences = expectedDocumentFileReferences(prior);
  if (knownFileReferences.size !== EXPECTED_BASE_COUNTS.submissionFiles ||
    !documentFileInventoryMatches(documentFiles, knownFileReferences)) {
    throw new Error('Existing document metadata IDs differ from the preserved staging fixture journal.');
  }
  const renewals = await ok(staging.from('organization_renewals').select('*'));
  const accreditationTerms = await ok(staging.from('organization_accreditations').select('*'));
  if (renewals.length !== 1 || renewals[0].id !== prior.renewalScenario.renewal?.id || renewals[0].status !== 'approved' ||
    accreditationTerms.length !== EXPECTED_BASE_COUNTS.accreditationTerms) {
    throw new Error('Existing approved renewal or accreditation-term inventory changed.');
  }
  const existingC = users.some((user) => user.email?.toLowerCase() === EMAIL);
  if (existingC !== (recordedOrgC.length === 1) || profiles.some((row) => row.user_id === journal?.authUserId ||
    row.organization_name === ORG_NAME)) {
    throw new Error('Org C Auth identity/profile state differs from the exact prepared or recorded Auth-created stage.');
  }
  const usersByEmail = await staging.from('organization_profiles').select('id').eq('organization_email', EMAIL);
  if (usersByEmail.error || (usersByEmail.data ?? []).length !== 0) throw new Error('The reserved Org C email is already attached to a profile.');

  const buckets = await ok(staging.storage.listBuckets());
  if (buckets.length !== EXPECTED_BUCKETS.size || buckets.some((bucket) => !EXPECTED_BUCKETS.has(bucket.name) ||
    bucket.public !== EXPECTED_BUCKETS.get(bucket.name) || bucket.fileSizeLimit != null || bucket.allowedMimeTypes != null)) {
    throw new Error('Staging Storage bucket inventory/settings differ from the reviewed baseline.');
  }
  let storageObjects = 0;
  const storageInventory = {};
  for (const bucket of EXPECTED_BUCKETS.keys()) {
    storageInventory[bucket] = await inventoryBucketObjects(bucket);
    storageObjects += storageInventory[bucket].length;
  }
  if (storageObjects !== EXPECTED_BASE_COUNTS.storageObjects) throw new Error('Staging Storage object count differs from the preserved baseline.');

  const required = await ok(staging.from('required_document_types')
    .select('id,name,template_scope,is_required,is_active')
    .in('name', ['Constitution and By-Laws', 'NYC YORP Registration Form (Form B)']));
  if (required.length !== 2 || required.some((row) => row.template_scope !== 'document_submission' || !row.is_required || !row.is_active) ||
    new Set(required.map((row) => row.name)).size !== 2) {
    throw new Error('Expected two active required registration document types for the limited Org C test.');
  }

  const loginClient = client();
  const loginRows = await ok(loginClient.rpc('authenticate_admin_account', {
    _username: 'staging-super-admin', _password: requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'),
  }));
  if (!loginRows[0]?.session_token || loginRows[0]?.admin_id !== superAdmin.id) throw new Error('Existing Super Admin normal login failed.');
  adminLogin = { client: loginClient, token: loginRows[0].session_token, adminId: loginRows[0].admin_id };
  const permissions = await ok(loginClient.rpc('get_admin_permission_context', { _session_token: loginRows[0].session_token }));
  if (permissions[0]?.role_code !== 'super_admin') throw new Error('Existing Super Admin permission context failed.');
  const revoked = await loginClient.rpc('revoke_admin_session_token', { _session_token: loginRows[0].session_token });
  if (revoked.error) throw revoked.error;
  adminLogin = null;

  record('Fresh exact-target staging preflight', 'PASS', {
    authUsers: users.length, organizations: profiles.length, submissions: tableCounts.submissions,
    submissionFiles: tableCounts.submissionFiles, renewals: tableCounts.renewals,
    accreditationTerms: tableCounts.accreditationTerms, storageObjects,
    buckets: buckets.length, requiredTestDocuments: required.length,
    priorRevisionPhaseComplete: true, activeSuspendedFixturePreserved: true,
    existingOrgCAuthIdentityReused: recordedOrgC.length === 1,
  });
  return { prior, required, users: users.length, tableCounts, storageObjects, storageInventory,
    protectedProfiles: [...profiles].sort((a, b) => a.id.localeCompare(b.id)),
    protectedSubmissions: [...submissions].sort((a, b) => a.id.localeCompare(b.id)),
    protectedFiles: [...documentFiles].sort((a, b) => a.id.localeCompare(b.id)),
    protectedRenewals: [...renewals].sort((a, b) => a.id.localeCompare(b.id)),
    protectedAccreditationTerms: [...accreditationTerms].sort((a, b) => a.id.localeCompare(b.id)), superAdminId: superAdmin.id };
}

async function createOrgC(preflight) {
  const resumeAuthCreated = RESUME_AUTH_CREATED;
  if (!journal || journal.projectRef !== REF || journal.email !== EMAIL || journal.marker !== MARKER ||
    journal.organizationName !== ORG_NAME || !journal.password || journal.password.length < 48 ||
    journal.organizationId || journal.submissionId || journal.files?.length !== 0 || journal.corrected) {
    throw new Error('Existing local journal differs from the exact prepared or Auth-created recovery state.');
  }
  if (resumeAuthCreated) {
    const priorAttempt = JSON.parse(await readFile(resolve('docs/staging-validation/2026-10-11/org-c-revision/positive-revision-2026-10-11-06.json'), 'utf8'));
    if (!isRecoverableAuthCreatedJournal(journal, priorAttempt)) {
      throw new Error('Auth-created recovery is not proven to stop at the exact uncommitted profile check failure.');
    }
  } else if (!RESUME_PREPARED || journal.phase !== 'prepared' || journal.authCreated === true || journal.authUserId ||
    (journal.authCreateAttempted === true && journal.authCreateRecovery?.confirmedNotDispatched !== true)) {
    throw new Error('Existing local journal is not in the exact pre-Auth prepared state.');
  }
  const savedCounts = journal.preflight ?? {};
  if (savedCounts.authUsers + (resumeAuthCreated ? 1 : 0) !== preflight.users || savedCounts.profiles !== preflight.tableCounts.profiles ||
    savedCounts.submissions !== preflight.tableCounts.submissions || savedCounts.submissionFiles !== preflight.tableCounts.submissionFiles ||
    savedCounts.renewals !== preflight.tableCounts.renewals || savedCounts.accreditationTerms !== preflight.tableCounts.accreditationTerms ||
    savedCounts.storageObjects !== preflight.storageObjects) {
    throw new Error('Prepared journal preflight counts differ from the fresh staging preflight.');
  }

  const anon = client();
  let cursor = evidence.length;
  if (resumeAuthCreated) {
    record('Reuse the exact journal-recorded synthetic Auth identity; no second Auth create call', 'PASS', {
      stagingIdentityRevalidatedByPreflight: true, authCreateCallsInContinuation: 0,
    });
  } else {
    setContext('Privileged staging fixture setup', 'Create the one synthetic Org C Auth identity');
    journal.authCreateAttempted = true;
    journal.authCreateRecovery = null;
    journal.authCreateStartedAt = new Date().toISOString();
    await saveJournal();
    const created = await ok(staging.auth.admin.createUser({
      email: EMAIL,
      password: journal.password,
      email_confirm: true,
      app_metadata: { ytrace_security_fixture: MARKER, ytrace_fixture_actor: 'C' },
      user_metadata: { display_name: 'SYNTHETIC Organization C Test User' },
    }));
    if (!created.user?.id || created.user.email?.toLowerCase() !== EMAIL || created.user.app_metadata?.ytrace_security_fixture !== MARKER ||
      created.user.app_metadata?.ytrace_fixture_actor !== 'C' || !created.user.email_confirmed_at) {
      throw new Error('Auth Admin createUser returned an unexpected identity; stopping without retry.');
    }
    journal.authUserId = created.user.id;
    journal.authCreated = true;
    journal.phase = 'auth-created';
    await saveJournal();
    record('Create exactly one confirmed synthetic Auth user via server-side Auth Admin SDK', 'PASS', {
      http: httpSince(cursor), emailDomain: 'example.invalid', confirmationEmailCall: false,
    });
  }

  setContext('Organization C JWT', 'Normal owner password login');
  cursor = evidence.length;
  const signedIn = await ok(anon.auth.signInWithPassword({ email: EMAIL, password: journal.password }));
  if (signedIn.user?.id !== journal.authUserId || !signedIn.session?.access_token) throw new Error('Normal Organization C login did not return its recorded identity.');
  ownerClient = anon;
  record('Authenticate synthetic Org C with a genuine owner JWT', 'PASS', { http: httpSince(cursor), tokenLogged: false });

  setContext('Organization C JWT', 'Create organization profile using owner-authenticated PostgREST');
  cursor = evidence.length;
  journal.profileCreateAttempted = true;
  journal.profileCreateStartedAt = new Date().toISOString();
  await saveJournal();
  const profile = await ok(ownerClient.from('organization_profiles').insert({
    user_id: journal.authUserId,
    organization_name: ORG_NAME,
    organization_email: EMAIL,
    contact_number: '09000000099',
    barangay: 'Kapitolyo',
    address_barangay: 'Kapitolyo',
    address_city: 'Pasig City',
    address_province: 'Metro Manila',
    address_street: 'Fictional Staging Test Street',
    address_zip_code: '1600',
    major_classification: 'Youth Organization',
    sub_classification: 'Community-Based',
    advocacies: ['Education'],
    representative_first_name: 'SyntheticC',
    representative_last_name: 'Fixture',
    representative_name: 'SyntheticC Fixture',
    adviser_name: 'Fictional Adviser',
    profile_status: 'incomplete',
    registration_type: 'new_organization',
    is_existing_organization: false,
    directory_visibility: false,
  }).select('id,user_id,organization_name,profile_status').single());
  if (profile.user_id !== journal.authUserId || profile.organization_name !== ORG_NAME || profile.profile_status !== 'incomplete') {
    throw new Error('Org C owner profile ownership/status did not match the synthetic fixture plan.');
  }
  journal.organizationId = profile.id;
  journal.phase = 'profile-created';
  await saveJournal();
  record('Create one owner-owned incomplete synthetic organization profile', 'PASS', { http: httpSince(cursor), profileStatus: profile.profile_status });

  setContext('Organization C JWT', 'Create one draft registration submission');
  cursor = evidence.length;
  const submission = await ok(ownerClient.from('document_submissions').insert({
    organization_id: journal.organizationId,
    submitted_by: journal.authUserId,
    status: 'draft',
    user_confirmed: false,
  }).select('id,organization_id,submitted_by,status,user_confirmed').single());
  if (submission.organization_id !== journal.organizationId || submission.submitted_by !== journal.authUserId || submission.status !== 'draft') {
    throw new Error('Org C draft submission relationship/status did not match the fixture plan.');
  }
  journal.submissionId = submission.id;
  journal.phase = 'submission-created';
  await saveJournal();
  record('Create one owner-owned draft registration submission', 'PASS', { http: httpSince(cursor), submissionStatus: submission.status });

  const selectedDocs = ['Constitution and By-Laws', 'NYC YORP Registration Form (Form B)'];
  for (const name of selectedDocs) {
    const type = preflight.required.find((row) => row.name === name);
    if (!type) throw new Error('A required Org C test document type disappeared after preflight.');
    const fileName = name === 'Constitution and By-Laws' ? 'SYNTHETIC-ORG-C-CONSTITUTION.pdf' : 'SYNTHETIC-ORG-C-FORM-B.pdf';
    const bytes = syntheticPdf(`ORG C INITIAL ${name}`);
    const objectPath = `${journal.organizationId}/${type.id}/${Date.now()}-${randomUUID()}-${fileName}`;
    const file = { documentName: name, documentTypeId: type.id, fileName, bucket: 'organization-documents', objectPath,
      storageUri: `storage://organization-documents/${objectPath}`, size: bytes.length, sha256: hash(bytes),
      uploadStarted: false, uploaded: false, metadataId: null };
    journal.files.push(file);
    await saveJournal();
    setContext('Organization C JWT', `Upload one initial synthetic PDF: ${name}`);
    cursor = evidence.length;
    file.uploadStarted = true;
    await saveJournal();
    await ok(ownerClient.storage.from(file.bucket).upload(file.objectPath, bytes, { contentType: 'application/pdf', upsert: false }));
    file.uploaded = true;
    await saveJournal();
    const metadata = await ok(ownerClient.from('document_submission_files').insert({
      submission_id: journal.submissionId,
      document_type_id: type.id,
      file_url: file.storageUri,
      file_name: fileName,
      file_type: 'application/pdf',
      file_size: bytes.length,
      validation_status: 'correct',
      admin_status: 'draft',
    }).select('id,submission_id,document_type_id,file_url,file_name,file_size,admin_status,updated_at,revision_history').single());
    if (metadata.submission_id !== journal.submissionId || metadata.document_type_id !== type.id || metadata.file_url !== file.storageUri || metadata.admin_status !== 'draft') {
      throw new Error('Initial Org C document metadata failed the ownership/path checks.');
    }
    file.metadataId = metadata.id;
    file.updatedAt = metadata.updated_at;
    file.revisionHistoryBefore = metadata.revision_history ?? [];
    await saveJournal();
    record(`Upload and register one initial synthetic PDF: ${name}`, 'PASS', {
      http: httpSince(cursor), size: bytes.length, sha256: file.sha256, storagePathRedacted: true,
    });
  }

  // Mirror submitDocumentSubmissionForReviewInSupabase: promote draft files,
  // derive the parent status from live file statuses, then mark confirmed.
  setContext('Organization C JWT', 'Submit registration documents for Admin review');
  cursor = evidence.length;
  const beforeSubmit = await ok(ownerClient.from('document_submissions')
    .select('id,organization_id,status,submitted_at')
    .eq('id', journal.submissionId).eq('organization_id', journal.organizationId).single());
  if (beforeSubmit.status === 'rejected_red') throw new Error('The registration was rejected and cannot be submitted again.');
  const attachedFiles = await ok(ownerClient.from('document_submission_files')
    .select('id,file_name,file_type').eq('submission_id', journal.submissionId));
  if (!attachedFiles.some((file) => file.file_type === 'application/pdf' && /\.pdf$/i.test(file.file_name))) {
    throw new Error('The application submission guard requires at least one PDF.');
  }
  const submittedAt = new Date().toISOString();
  const promote = await ownerClient.from('document_submission_files').update({
    admin_status: 'under_admin_review', reviewed_at: null, updated_at: submittedAt,
  }).eq('submission_id', journal.submissionId).eq('admin_status', 'draft').select('id,admin_status');
  if (promote.error || promote.data?.length !== 2 || promote.data.some((row) => row.admin_status !== 'under_admin_review')) throw promote.error ?? new Error('Expected two reviewable Org C files.');
  const currentFiles = await ok(ownerClient.from('document_submission_files')
    .select('admin_status').eq('submission_id', journal.submissionId));
  const overallStatus = currentFiles.some((row) => row.admin_status === 'rejected_red') ? 'rejected_red'
    : currentFiles.some((row) => row.admin_status === 'needs_revision') ? 'needs_revision'
      : currentFiles.length > 0 && currentFiles.every((row) => row.admin_status === 'approved_green') ? 'approved_green'
        : currentFiles.some((row) => ['under_admin_review', 'submitted', 'ready_for_review'].includes(row.admin_status)) ? 'under_admin_review'
          : currentFiles.some((row) => row.admin_status === 'uploaded') ? 'uploaded'
            : currentFiles.some((row) => row.admin_status === 'draft') ? 'draft' : 'under_admin_review';
  const parent = await ok(ownerClient.from('document_submissions').update({
    status: overallStatus, user_confirmed: true, submitted_at: beforeSubmit.submitted_at || submittedAt,
  }).eq('id', journal.submissionId).eq('organization_id', journal.organizationId)
    .select('id,status,user_confirmed,submitted_at').single());
  if (parent.status !== 'under_admin_review' || parent.user_confirmed !== true) throw new Error('Org C submission was not placed under review.');
  journal.phase = 'submitted-for-review';
  journal.submittedAt = parent.submitted_at;
  await saveJournal();
  record('Submit the two uploaded PDFs through the existing owner review workflow', 'PASS', { http: httpSince(cursor), parentStatus: parent.status, fileCount: 2 });
}

async function reviewAndReplace(preflight) {
  const service = staging;
  const superLoginResult = await ok(client().rpc('authenticate_admin_account', {
    _username: 'staging-super-admin', _password: requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD'),
  }));
  if (!superLoginResult[0]?.session_token || superLoginResult[0]?.admin_id !== preflight.superAdminId) throw new Error('Normal staging Super Admin login failed during review.');
  adminLogin = { client: client(), token: superLoginResult[0].session_token, adminId: superLoginResult[0].admin_id };
  const permissions = await ok(adminLogin.client.rpc('get_admin_permission_context', { _session_token: adminLogin.token }));
  if (permissions[0]?.role_code !== 'super_admin') throw new Error('Admin review session lacks the existing Super Admin permission context.');
  journal.adminReviewStarted = true;
  await saveJournal();

  const constitution = journal.files.find((file) => file.documentName === 'Constitution and By-Laws');
  const peer = journal.files.find((file) => file.documentName === 'NYC YORP Registration Form (Form B)');
  if (!constitution?.metadataId || !peer?.metadataId || constitution.metadataId === peer.metadataId) throw new Error('Expected exactly two recorded Org C documents.');
  const peerBefore = await ok(service.from('document_submission_files').select('*').eq('id', peer.metadataId).single());
  const targetBefore = await ok(service.from('document_submission_files').select('*').eq('id', constitution.metadataId).single());
  if (targetBefore.admin_status !== 'under_admin_review' || peerBefore.admin_status !== 'under_admin_review') throw new Error('Org C documents are not in the expected first-review state.');

  setContext('Staging Super Admin session', 'Request correction on exactly one Org C document');
  let cursor = evidence.length;
  const revision = await ok(adminLogin.client.rpc('update_admin_document_submission_file_review', {
    _session_token: adminLogin.token, _file_id: constitution.metadataId, _status: 'needs_revision',
    _admin_remarks: 'SYNTHETIC Org C post-patch revision validation: please upload the corrected test PDF.',
  }));
  if (!revision[0]?.id || revision[0].admin_status !== 'needs_revision') throw new Error('Admin review RPC did not flag exactly the selected Org C file.');
  const parentAfterRevision = await ok(service.from('document_submissions').select('status').eq('id', journal.submissionId).single());
  const allAfterRevision = await ok(service.from('document_submission_files').select('id,admin_status').eq('submission_id', journal.submissionId));
  if (parentAfterRevision.status !== 'needs_revision' || allAfterRevision.length !== 2 ||
    allAfterRevision.filter((row) => row.admin_status === 'needs_revision').length !== 1 ||
    allAfterRevision.find((row) => row.id === peer.metadataId)?.admin_status !== 'under_admin_review') {
    throw new Error('Admin revision state is not exactly one flagged file with the peer preserved.');
  }
  journal.phase = 'one-document-needs-revision';
  journal.targetBeforeRevision = targetBefore;
  journal.peerBeforeRevision = peerBefore;
  await saveJournal();
  record('Authorized Super Admin requests revision on one file; peer remains under review', 'PASS', {
    http: httpSince(cursor), flaggedDocuments: 1, unchangedPeerStatus: 'under_admin_review',
  });

  // Approve only the unrelated peer document, leaving the overall registration
  // incomplete and never invoking automatic accreditation approval.
  setContext('Staging Super Admin session', 'Approve the unrelated peer PDF for immutability check');
  cursor = evidence.length;
  const peerApproval = await ok(adminLogin.client.rpc('update_admin_document_submission_file_review', {
    _session_token: adminLogin.token, _file_id: peer.metadataId, _status: 'approved_green',
    _admin_remarks: 'SYNTHETIC Org C peer-document immutability test only.',
  }));
  if (!peerApproval[0]?.id || peerApproval[0].admin_status !== 'approved_green') throw new Error('Peer document did not reach the requested limited review status.');
  const parentWithPeer = await ok(service.from('document_submissions').select('status').eq('id', journal.submissionId).single());
  if (parentWithPeer.status !== 'needs_revision') throw new Error('Partial document review unexpectedly completed the registration.');
  journal.peerApproved = true;
  journal.peerSnapshot = await ok(service.from('document_submission_files').select('*').eq('id', peer.metadataId).single());
  await saveJournal();
  record('Approve only the peer PDF while overall registration remains incomplete', 'PASS', {
    http: httpSince(cursor), peerStatus: 'approved_green', parentStatus: parentWithPeer.status, accreditationApproval: false,
  });

  const ownerRows = await ok(ownerClient.from('document_submission_files').select('id,document_type_id,updated_at,file_url,file_name,file_type,file_size,admin_status')
    .eq('id', constitution.metadataId).single());
  const unchangedTargetSnapshot = await ok(service.from('document_submission_files').select('*').eq('id', constitution.metadataId).single());
  const peerSnapshotBeforeDeniedChecks = journal.peerSnapshot;
  const attemptDenied = async (label, actorClient, file, mode) => {
    setContext(label, mode === 'download' ? 'Attempt unauthorized private document download' : 'Attempt unauthorized document replacement');
    const from = evidence.length;
    let denied = false;
    if (mode === 'download') {
      const response = await actorClient.storage.from('organization-documents').download(file.objectPath);
      denied = Boolean(response.error) && !response.data;
    } else {
      const result = await actorClient.rpc('replace_organization_document_file', {
        _file_id: file.metadataId,
        _document_type_id: file.documentTypeId,
        _expected_updated_at: file.metadataId === peer.metadataId ? peerBefore.updated_at : ownerRows.updated_at,
        _file_url: file.storageUri,
        _file_name: file.fileName,
        _file_type: 'application/pdf',
        _file_size: file.size,
      });
      denied = Boolean(result.error) && !result.data;
    }
    const afterTarget = await ok(service.from('document_submission_files').select('*').eq('id', constitution.metadataId).single());
    const afterPeer = await ok(service.from('document_submission_files').select('*').eq('id', peer.metadataId).single());
    if (!denied || JSON.stringify(afterTarget) !== JSON.stringify(unchangedTargetSnapshot) || JSON.stringify(afterPeer) !== JSON.stringify(peerSnapshotBeforeDeniedChecks)) {
      throw new Error('Unauthorized attempt was not denied without changing the Org C records.');
    }
    record(label, 'PASS', { http: httpSince(from), protectedRowsUnchanged: true });
  };

  peerClient = await (async () => {
    const base = await loadState();
    const { c } = await signInExistingActor(base.actors.A);
    return c;
  })();
  await attemptDenied('Organization A cannot download Org C private document', peerClient, constitution, 'download');
  await attemptDenied('Organization A cannot replace Org C flagged document', peerClient, constitution, 'replace');
  await attemptDenied('Anonymous caller cannot download Org C private document', client(), constitution, 'download');
  await attemptDenied('Anonymous caller cannot replace Org C flagged document', client(), constitution, 'replace');
  await attemptDenied('Owner cannot replace the approved peer document', ownerClient, peer, 'replace');

  const correctedName = 'SYNTHETIC-ORG-C-CONSTITUTION-CORRECTED.pdf';
  const correctedBytes = syntheticPdf('ORG C CORRECTED CONSTITUTION — POST PATCH REVISION');
  const correctedPath = `${journal.organizationId}/${constitution.documentTypeId}/revisions/${Date.now()}-${randomUUID()}-${correctedName}`;
  const corrected = {
    documentName: constitution.documentName, documentTypeId: constitution.documentTypeId, fileName: correctedName,
    bucket: 'organization-documents', objectPath: correctedPath,
    storageUri: `storage://organization-documents/${correctedPath}`, size: correctedBytes.length,
    sha256: hash(correctedBytes), uploadStarted: false, uploaded: false, metadataId: constitution.metadataId,
  };
  journal.corrected = corrected;
  journal.phase = 'corrected-upload-planned';
  await saveJournal();
  setContext('Organization C JWT', 'Upload exactly one corrected PDF through private Storage');
  cursor = evidence.length;
  corrected.uploadStarted = true;
  await saveJournal();
  await ok(ownerClient.storage.from(corrected.bucket).upload(corrected.objectPath, correctedBytes, { contentType: 'application/pdf', upsert: false }));
  corrected.uploaded = true;
  await saveJournal();
  record('Owner uploads exactly one corrected synthetic PDF', 'PASS', { http: httpSince(cursor), size: corrected.size, sha256: corrected.sha256, storagePathRedacted: true });

  setContext('Organization C JWT', 'Replace the flagged document using the portal RPC and optimistic updated_at');
  cursor = evidence.length;
  const replaced = await ok(ownerClient.rpc('replace_organization_document_file', {
    _file_id: constitution.metadataId,
    _document_type_id: constitution.documentTypeId,
    _expected_updated_at: ownerRows.updated_at,
    _file_url: corrected.storageUri,
    _file_name: corrected.fileName,
    _file_type: 'application/pdf',
    _file_size: corrected.size,
  }));
  const updated = Array.isArray(replaced) ? replaced[0] : replaced;
  if (!updated?.id || updated.id !== constitution.metadataId || updated.file_url !== corrected.storageUri || updated.admin_status !== 'under_admin_review') {
    throw new Error('Portal replacement RPC did not link the corrected PDF under review.');
  }
  journal.corrected.metadataUpdated = true;
  journal.phase = 'corrected-linked-resubmitted';
  await saveJournal();
  record('Existing owner replacement RPC links the corrected file and resubmits for review', 'PASS', {
    http: httpSince(cursor), fileStatus: updated.admin_status, resubmission: true,
  });

  const targetAfter = await ok(service.from('document_submission_files').select('*').eq('id', constitution.metadataId).single());
  const parentAfter = await ok(service.from('document_submissions').select('id,status,user_confirmed,submitted_at,reviewed_at,overall_remarks')
    .eq('id', journal.submissionId).single());
  const peerAfter = await ok(service.from('document_submission_files').select('*').eq('id', peer.metadataId).single());
  if (targetAfter.file_url !== corrected.storageUri || targetAfter.admin_status !== 'under_admin_review' ||
    parentAfter.status !== 'under_admin_review' || parentAfter.user_confirmed !== true ||
    JSON.stringify(peerAfter) !== JSON.stringify(peerSnapshotBeforeDeniedChecks) ||
    !Array.isArray(targetAfter.revision_history) || targetAfter.revision_history.length !== (targetBefore.revision_history?.length ?? 0) + 1 ||
    targetAfter.revision_history.at(-1)?.previous_file_url !== targetBefore.file_url) {
    throw new Error('Final Org C revision metadata, parent state, history, or peer preservation check failed.');
  }

  setContext('Organization C JWT', 'Verify original, corrected and peer PDF bytes by SHA-256');
  cursor = evidence.length;
  const downloadHashes = [];
  for (const file of [constitution, corrected, peer]) {
    const blob = await ok(ownerClient.storage.from(file.bucket).download(file.objectPath));
    const bytes = Buffer.from(await blob.arrayBuffer());
    if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw new Error('Downloaded synthetic document hash did not match.');
    downloadHashes.push({ label: file.fileName, size: bytes.length, sha256: hash(bytes) });
  }
  journal.phase = 'verified';
  journal.final = { parentStatus: parentAfter.status, targetStatus: targetAfter.admin_status,
    peerStatus: peerAfter.admin_status, historyCount: targetAfter.revision_history.length, downloadHashes };
  await saveJournal();
  record('Original, corrected and peer PDF downloads match recorded bytes; peer row is unchanged', 'PASS', {
    http: httpSince(cursor), downloadHashes, revisionHistoryEntries: targetAfter.revision_history.length,
    peerRowUnchanged: true, registrationApproved: false, accreditationCreated: false,
  });
  await postflight(preflight);
}

async function postflight(preflight) {
  const expectedExisting = expectedExistingAuth(preflight.prior);
  const authUsers = await listAllAuthUsers();
  if (authUsers.length !== EXPECTED_BASE_COUNTS.authUsers + 1 || !authUsers.some((user) => user.id === journal.authUserId &&
    user.email?.toLowerCase() === EMAIL && user.app_metadata?.ytrace_security_fixture === MARKER &&
    user.app_metadata?.ytrace_fixture_actor === 'C' && user.email_confirmed_at)) {
    throw new Error('Postflight Auth identity inventory failed.');
  }
  for (const existing of expectedExisting) {
    if (!authUsers.some((user) => user.id === existing.userId && user.email?.toLowerCase() === existing.email.toLowerCase())) {
      throw new Error('A preserved existing Auth identity disappeared or changed.');
    }
  }
  const profiles = await ok(staging.from('organization_profiles').select('*'));
  if (profiles.length !== EXPECTED_BASE_COUNTS.profiles + 1 ||
    JSON.stringify(profiles.filter((row) => row.id !== journal.organizationId).sort((a, b) => a.id.localeCompare(b.id))) !== JSON.stringify(preflight.protectedProfiles) ||
    !profiles.some((row) => row.id === journal.organizationId && row.user_id === journal.authUserId &&
      row.organization_name === ORG_NAME && row.profile_status === 'incomplete')) {
    throw new Error('Postflight profile inventory changed outside the single Org C profile.');
  }
  const submissions = await ok(staging.from('document_submissions').select('*'));
  if (submissions.length !== EXPECTED_BASE_COUNTS.submissions + 1 ||
    JSON.stringify(submissions.filter((row) => row.id !== journal.submissionId).sort((a, b) => a.id.localeCompare(b.id))) !== JSON.stringify(preflight.protectedSubmissions) ||
    !submissions.some((row) => row.id === journal.submissionId && row.organization_id === journal.organizationId && row.status === 'under_admin_review')) {
    throw new Error('Postflight submission inventory changed outside Org C.');
  }
  const files = await ok(staging.from('document_submission_files').select('*'));
  if (files.length !== EXPECTED_BASE_COUNTS.submissionFiles + 2 ||
    JSON.stringify(files.filter((row) => !journal.files.some((file) => file.metadataId === row.id)).sort((a, b) => a.id.localeCompare(b.id))) !== JSON.stringify(preflight.protectedFiles)) {
    throw new Error('Postflight document metadata inventory changed outside the two Org C rows.');
  }
  const renewals = await ok(staging.from('organization_renewals').select('*'));
  const terms = await ok(staging.from('organization_accreditations').select('*'));
  if (JSON.stringify(renewals.sort((a, b) => a.id.localeCompare(b.id)) ) !== JSON.stringify(preflight.protectedRenewals) ||
    JSON.stringify(terms.sort((a, b) => a.id.localeCompare(b.id)) ) !== JSON.stringify(preflight.protectedAccreditationTerms)) {
    throw new Error('Postflight modified a renewal or accreditation term.');
  }
  const buckets = await ok(staging.storage.listBuckets());
  if (buckets.length !== EXPECTED_BUCKETS.size || buckets.some((bucket) => bucket.public !== EXPECTED_BUCKETS.get(bucket.name))) {
    throw new Error('Postflight Storage bucket configuration changed.');
  }
  let objectCount = 0;
  let newPaths = [];
  for (const bucket of EXPECTED_BUCKETS.keys()) {
    const current = await inventoryBucketObjects(bucket);
    objectCount += current.length;
    const baseline = preflight.storageInventory[bucket] ?? [];
    if (baseline.some((path) => !current.includes(path))) throw new Error('A preserved Storage object disappeared.');
    newPaths.push(...current.filter((path) => !baseline.includes(path)).map((path) => `${bucket}/${path}`));
  }
  const expectedNewPaths = [...journal.files.map((file) => `organization-documents/${file.objectPath}`),
    `organization-documents/${journal.corrected.objectPath}`].sort();
  if (objectCount !== EXPECTED_BASE_COUNTS.storageObjects + 3 || JSON.stringify(newPaths.sort()) !== JSON.stringify(expectedNewPaths)) {
    throw new Error('Postflight Storage inventory differs from exactly three new Org C PDFs.');
  }
  report.preservation = {
    existingAuthUsers: EXPECTED_BASE_COUNTS.authUsers,
    existingProfiles: EXPECTED_BASE_COUNTS.profiles,
    existingSubmissions: EXPECTED_BASE_COUNTS.submissions,
    existingDocumentFiles: EXPECTED_BASE_COUNTS.submissionFiles,
    renewalCountUnchanged: renewals.length,
    accreditationTermCountUnchanged: terms.length,
    originalStorageObjectsPreserved: EXPECTED_BASE_COUNTS.storageObjects,
    newStorageObjects: 3,
    totalStorageObjects: objectCount,
    protectedExistingRowsUnchanged: true,
  };
  record('Final read-only preservation inventory', 'PASS', report.preservation);
}

async function signInExistingActor(actor) {
  const c = client();
  const signed = await ok(c.auth.signInWithPassword({ email: actor.email, password: actor.password }));
  if (signed.user?.id !== actor.userId || !signed.session?.access_token) throw new Error('Existing Organization A session did not match its recorded identity.');
  return { c };
}

async function releaseLock() {
  if (!lockHandle) return;
  await lockHandle.close();
  const current = JSON.parse(await readFile(LOCK, 'utf8'));
  if (current.pid !== process.pid || current.projectRef !== REF || current.phase !== 'org-c-registration-revision') {
    throw new Error('Fixture lock ownership changed; refusing removal.');
  }
  await unlink(LOCK);
  lockHandle = null;
}

async function main() {
  verifyTarget();
  if (existsSync(LOCK)) throw new Error('The shared staging fixture lock is already held; refusing to proceed.');
  if (existsSync(REPORT)) throw new Error('Unique execution report already exists; refusing to overwrite evidence.');
  if ((PREFLIGHT_ONLY && (RESUME_PREPARED || RESUME_AUTH_CREATED)) || (RESUME_PREPARED && RESUME_AUTH_CREATED)) {
    throw new Error('Preflight-only, prepared-resume, and Auth-created-resume modes are mutually exclusive.');
  }
  if (!PREFLIGHT_ONLY && (!(RESUME_PREPARED || RESUME_AUTH_CREATED) || !existsSync(JOURNAL))) {
    throw new Error('A verified prepared or Auth-created journal and its exact resume mode are required.');
  }
  lockHandle = await open(LOCK, 'wx', 0o600);
  await lockHandle.writeFile(JSON.stringify({ pid: process.pid, projectRef: REF, phase: 'org-c-registration-revision' }));
  await lockHandle.sync();
  staging = client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
  if (!PREFLIGHT_ONLY) {
    await verifyJournalAcl(JOURNAL);
    journal = JSON.parse(await readFile(JOURNAL, 'utf8'));
    const exactJournalContext = journal.projectRef === REF && journal.email === EMAIL && journal.marker === MARKER &&
      journal.organizationName === ORG_NAME && !journal.organizationId && !journal.submissionId &&
      Array.isArray(journal.files) && journal.files.length === 0 && !journal.corrected &&
      typeof journal.password === 'string' && journal.password.length >= 48;
    if (!exactJournalContext) throw new Error('Local Org C journal context or mutation state is unexpected.');
    if (RESUME_PREPARED && (journal.phase !== 'prepared' || journal.authCreated === true || journal.authUserId)) {
      throw new Error('Local Org C journal is not in the prepared pre-Auth state.');
    }
    if (RESUME_AUTH_CREATED && journal.phase !== 'auth-created') {
      throw new Error('Local Org C journal is not in the exact Auth-created state.');
    }
    if (RESUME_PREPARED && journal.authCreateAttempted === true) {
      const failedReportPath = resolve('docs/staging-validation/2026-10-11/org-c-revision/positive-revision-2026-10-11-05.json');
      if (!existsSync(failedReportPath)) throw new Error('Prior Auth-create attempt has no preserved failure evidence.');
      const failedReport = JSON.parse(await readFile(failedReportPath, 'utf8'));
      if (!isRecoverablePreAuthJournal(journal, failedReport)) {
        throw new Error('Prior Auth-create attempt is not proven to have stopped before dispatch.');
      }
      const afterFailureUsers = await listAllAuthUsers();
      if (afterFailureUsers.length !== EXPECTED_BASE_COUNTS.authUsers ||
        afterFailureUsers.some((user) => user.email?.toLowerCase() === EMAIL)) {
        throw new Error('Read-only Auth inventory did not prove the synthetic identity absent after the local pre-dispatch failure.');
      }
      journal.authCreateRecovery = {
        confirmedNotDispatched: true,
        confirmedAt: new Date().toISOString(),
        reason: 'Windows read-only FileHandle.sync returned EPERM before the Auth Admin request call.',
        priorReport: 'positive-revision-2026-10-11-05.json',
        authInventoryCount: afterFailureUsers.length,
        matchingSyntheticIdentityCount: 0,
      };
      await saveJournal();
      record('Resolve prior local pre-dispatch failure by read-only Auth inventory', 'PASS', {
        priorReport: 'positive-revision-2026-10-11-05.json', authUsers: afterFailureUsers.length,
        matchingSyntheticIdentityCount: 0, stagingAuthWritesDuringRecovery: 0,
      });
    } else if (RESUME_PREPARED && journal.authCreateAttempted != null && journal.authCreateAttempted !== false) {
      throw new Error('Auth-create attempt marker has an unrecognized state.');
    }
    if (RESUME_AUTH_CREATED) {
      const priorReportPath = resolve('docs/staging-validation/2026-10-11/org-c-revision/positive-revision-2026-10-11-06.json');
      if (!existsSync(priorReportPath)) throw new Error('Auth-created recovery has no preserved prior report.');
      const priorReport = JSON.parse(await readFile(priorReportPath, 'utf8'));
      if (!isRecoverableAuthCreatedJournal(journal, priorReport)) {
        throw new Error('Auth-created recovery is not proven to have stopped at the exact failed profile constraint.');
      }
    }
  }
  const preflight = await exactPreflight();
  if (PREFLIGHT_ONLY) {
    record('Preflight-only run; no fixture writes performed', 'PASS');
    return;
  }
  await createOrgC(preflight);
  await reviewAndReplace(preflight);
  record('Org C post-patch registration revision/resubmission validation complete', 'PASS', {
    newAuthIdentities: 1, newOrganizationProfiles: 1, newSubmissions: 1,
    initialPdfs: 2, correctedPdfs: 1, objectsDeleted: 0, accreditationApproval: false,
  });
}

try {
  await main();
} catch (error) {
  stopped = true;
  record('Stopped without retry or cleanup', 'BLOCKED', safeReason(error));
  report.stopReason = safeReason(error);
  process.exitCode = 2;
} finally {
  // Only revoke this run's transient custom Admin session. Auth identities,
  // business records, Storage objects and evidence are intentionally retained.
  if (adminLogin?.client && adminLogin.token) {
    try {
      setContext('Staging Super Admin session', 'Revoke this run’s transient Admin session');
      const start = evidence.length;
      const { error } = await adminLogin.client.rpc('revoke_admin_session_token', { _session_token: adminLogin.token });
      if (error) throw error;
      record('Revoke the transient Admin review session', 'PASS', { http: httpSince(start), tokenLogged: false });
    } catch (error) {
      record('Revoke the transient Admin review session', 'BLOCKED', safeReason(error));
      process.exitCode = 2;
    }
  }
  for (const c of [ownerClient, peerClient].filter(Boolean)) {
    try {
      const { error } = await c.auth.signOut({ scope: 'local' });
      record('Sign out a test Organization Auth session', error ? 'BLOCKED' : 'PASS');
      if (error) process.exitCode = 2;
    } catch {
      record('Sign out a test Organization Auth session', 'BLOCKED');
      process.exitCode = 2;
    }
  }
  report.incompleteOrStopped = stopped;
  await saveReport().catch(() => { process.exitCode = 2; });
  await releaseLock().catch(() => { process.exitCode = 2; });
}

