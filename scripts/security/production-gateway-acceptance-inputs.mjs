// Preparation only: no gateway request, signing, download or Admin login exists here.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
export const PROJECT = 'mqqaykksadotbrghbexz';
export const ORIGIN = `https://${PROJECT}.supabase.co`;
const localFile = resolve(root, '.agent/security/production-gateway-acceptance/candidates.local.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const guard = (ok, code) => { if (!ok) throw Object.assign(new Error(code), { safeCode: code }); };

// Only current, metadata-linked private PDFs; no path guessing or historical-object fallback.
const candidatesSql = `BEGIN READ ONLY;
SET LOCAL statement_timeout='8s';
SELECT f.id AS document_id, f.file_name, f.admin_status::text AS document_status,
 ds.id AS parent_id, ds.submission_scope, ds.renewal_id, ds.organization_id,
 op.user_id AS owner_user_id, o.id AS storage_object_id, o.bucket_id,
 o.name AS object_name, o.updated_at AS object_updated_at,
 CASE WHEN o.metadata->>'size' ~ '^[0-9]{1,9}$' THEN (o.metadata->>'size')::bigint END AS bytes,
 ref.resource_kind, ref.permissions,
 md5(to_jsonb(f)::text) AS document_row_md5,
 md5(to_jsonb(ds)::text) AS parent_row_md5,
 md5(to_jsonb(o)::text) AS object_row_md5
FROM public.document_submission_files f
JOIN public.document_submissions ds ON ds.id=f.submission_id
JOIN public.organization_profiles op ON op.id=ds.organization_id
JOIN storage.objects o ON o.bucket_id='organization-documents'
 AND f.file_url='storage://'||o.bucket_id||'/'||o.name
 AND coalesce(o.owner_id,o.owner::text)=op.user_id::text
JOIN LATERAL (
 SELECT r.resource_kind,r.permissions
 FROM ytrace_storage_private.resource_references(o.bucket_id,o.name) r
 WHERE r.organization_id=ds.organization_id AND r.parent_id=ds.id AND r.reviewable
 ORDER BY r.resource_kind LIMIT 1
) ref ON true
WHERE f.admin_status::text<>'draft'
 AND (SELECT count(DISTINCT r.organization_id)
      FROM ytrace_storage_private.resource_references(o.bucket_id,o.name) r)=1
 AND o.metadata->>'size' ~ '^[0-9]{1,9}$'
 AND CASE WHEN o.metadata->>'size' ~ '^[0-9]{1,9}$'
          THEN (o.metadata->>'size')::bigint BETWEEN 1 AND 20971520 ELSE false END
 AND (o.metadata->>'mimetype'='application/pdf' OR lower(o.name) LIKE '%.pdf')
ORDER BY bytes,o.created_at,o.id LIMIT 3;
COMMIT;`;

export function prepareRequest(input, manifest, now = Date.now()) {
  guard(input && Object.keys(input).sort().join(',') ===
    'candidateLabel,expectedSha256,sessionExpiresAt,sessionToken', 'INPUT_FIELDS_INVALID');
  guard(manifest?.project === PROJECT && manifest.source === 'verified-native-readonly-production-metadata',
    'CANDIDATE_PROJECT_OR_SOURCE_INVALID');
  const age = now - Date.parse(manifest.capturedAt);
  guard(Number.isFinite(age) && age >= 0 && age < 86400000, 'CANDIDATES_REQUIRE_FRESH_READ_ONLY_REVIEW');
  guard(typeof input.sessionToken === 'string' && input.sessionToken.length >= 20 &&
    input.sessionToken.length <= 4096 && !/\s/.test(input.sessionToken), 'SESSION_INPUT_INVALID');
  guard(typeof input.sessionExpiresAt === 'string' && Date.parse(input.sessionExpiresAt) > now,
    'OPERATOR_REPORTED_SESSION_EXPIRED_OR_INVALID');
  guard(input.expectedSha256 === '' || (typeof input.expectedSha256 === 'string' &&
    /^[a-fA-F0-9]{64}$/.test(input.expectedSha256)), 'EXPECTED_HASH_INVALID');
  guard(/^DOC-0[1-3]$/.test(input.candidateLabel), 'CANDIDATE_LABEL_INVALID');
  const matches = manifest.candidates.filter(candidate => candidate.label === input.candidateLabel);
  guard(matches.length === 1, 'CANDIDATE_NOT_UNIQUELY_IDENTIFIED');
  const file = matches[0];
  guard(file.bucket_id === 'organization-documents' &&
    ['registration', 'renewal'].includes(file.resource_kind) &&
    /^[0-9a-f-]{36}$/i.test(file.parent_id) && typeof file.object_name === 'string' &&
    file.object_name.length > 0 && file.object_name.length <= 2048 &&
    !file.object_name.split('/').some(part => part === '.' || part === '..') &&
    file.document_status !== 'draft' && Number(file.bytes) > 0 && Number(file.bytes) <= 20971520,
    'CANDIDATE_METADATA_INVALID');
  const request = {
    action: 'sign', bucket: file.bucket_id, path: file.object_name,
    resourceId: file.parent_id, fileName: null, sessionToken: input.sessionToken,
  };
  guard(Buffer.byteLength(JSON.stringify(request), 'utf8') <= 8192, 'REQUEST_TOO_LARGE');
  // Never serialize request or token to stdout, disk, errors or command arguments.
  return { request, summary: {
    status: 'PREPARED_NOT_EXECUTED', project: PROJECT, candidateLabel: file.label,
    resourceKind: file.resource_kind, metadataLinked: true, objectOwnershipVerifiedAtSelection: true,
    requiredAnyPermission: file.permissions, superAdminAlsoAllowed: true,
    independentContentHashSupplied: input.expectedSha256 !== '',
    sessionPresence: 'SUPPLIED_BY_OPERATOR', sessionServerValidation: 'NOT_TESTED',
    explicitSessionAndResourceConfirmationRequired: true,
    gatewayRequests: 0, downloads: 0, tokenPersisted: false,
  } };
}

async function exportCandidates() {
  guard(process.platform === 'win32', 'REVIEWED_WINDOWS_ACL_REQUIRED');
  const quotedDirectory = resolve(root, '.agent/security/production-gateway-acceptance').replaceAll("'", "''");
  // Check effective exclusion and current-user/SYSTEM-only ACLs before reading metadata.
  execFileSync('git', ['-c', 'core.fsmonitor=false', 'check-ignore', '--quiet', '--', localFile],
    { cwd: root, stdio: 'pipe', windowsHide: true });
  guard(execFileSync('git', ['-c', 'core.fsmonitor=false', 'ls-files', '--', localFile],
    { cwd: root, encoding: 'utf8', stdio: 'pipe', windowsHide: true }).trim() === '', 'CANDIDATE_FILE_TRACKED');
  const aclCheck = `$ErrorActionPreference='Stop'; $p='${quotedDirectory}'; ` +
    `$a=Get-Acl -LiteralPath $p; $u=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; ` +
    `if(!$a.AreAccessRulesProtected -or $a.Access.Count -ne 2){exit 2}; ` +
    `foreach($r in $a.Access){$s=$r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value; ` +
    `if($s -notin @($u,'S-1-5-18') -or $r.AccessControlType -ne 'Allow'){exit 2}}`;
  // A pwsh parent can export a PSModulePath incompatible with Windows PowerShell.
  // Let the ACL-only child discover its own system modules; do not skip the ACL gate.
  const aclEnvironment = { ...process.env };
  for (const key of Object.keys(aclEnvironment)) if (key.toLowerCase() === 'psmodulepath') delete aclEnvironment[key];
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', aclCheck],
    { cwd: root, stdio: 'pipe', windowsHide: true, env: aclEnvironment });
  const { Client } = await import('pg');
  const core = await import('../../docs/production-security/storage-cutover/native-runner-20261011T132539Z/runner-core.mjs');
  const configuration = await core.connectionConfiguration(process.env, { readOnly: true });
  let client;
  try {
    client = (await core.connectClientOnce(Client, configuration)).client;
    const identitySql = await readFile(resolve(root,
      'docs/production-security/storage-cutover/native-runner-20261011T132539Z/native-identity-privileges-readonly.sql'), 'utf8');
    core.verifyNativeIdentity(core.selectRow(await client.query(identitySql), 'native_identity'));
    guard(client.connection.stream.authorized === true && client.connection.stream.encrypted === true,
      'TLS_VERIFICATION_FAILED');
    const definitions = await client.query(`SELECT n.nspname AS schema,p.proname,md5(p.prosrc) AS source_md5
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE (n.nspname='ytrace_storage_private' AND p.proname='resource_references')
         OR (n.nspname='public' AND p.proname='admin_authorize_storage_operation') ORDER BY p.proname`);
    const expected = JSON.parse(await readFile(resolve(root,
      'docs/production-security/storage-cutover/20261011T113322Z/expected-foundation-functions.json'), 'utf8'));
    guard(definitions.rows.length === 2 && definitions.rows.every(row => expected.some(item =>
      item.signature.startsWith(`${row.schema === 'public' ? '' : row.schema + '.'}${row.proname}(`) &&
      item.source_md5 === row.source_md5)), 'REVIEWED_AUTHORIZATION_RULE_DRIFT');
    const result = await client.query(candidatesSql);
    guard(Array.isArray(result) && result.at(-1)?.command === 'COMMIT', 'READ_ONLY_TRANSACTION_INCOMPLETE');
    const rows = result.flatMap(item => item.rows ?? []);
    guard(rows.length > 0 && rows.length <= 3, 'NO_ELIGIBLE_FILES_OR_UNEXPECTED_INVENTORY');
    const manifest = { project: PROJECT, source: 'verified-native-readonly-production-metadata',
      capturedAt: new Date().toISOString(), tlsChainAndHostnameVerified: true,
      noAdminSessionsRead: true, noSignedUrlsOrBinariesRequested: true,
      candidates: rows.map((row, index) => ({ label: `DOC-0${index + 1}`, ...row })),
    };
    // The caller establishes current-user/SYSTEM-only Windows ACLs before this write.
    const bytes = JSON.stringify(manifest, null, 2) + '\n';
    await writeFile(localFile, bytes, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ status: 'READ_ONLY_SELECTION_READY', project: PROJECT,
      manifestSha256: hash(bytes), candidateCount: rows.length,
      candidates: manifest.candidates.map(file => ({ label: file.label, resourceKind: file.resource_kind,
        documentStatus: file.document_status, bytes: Number(file.bytes), requiredAnyPermission: file.permissions,
        superAdminAlsoAllowed: true, metadataAndObjectOwnerMatch: true })),
      gatewayRequests: 0, binaryDownloads: 0, productionWrites: 0,
    }));
  } finally { if (client) await client.end().catch(() => {}); }
}

async function main() {
  guard(process.argv.length === 3, 'UNEXPECTED_ARGUMENTS');
  if (process.argv[2] === '--list-candidates-readonly') { await exportCandidates(); return; }
  guard(process.argv[2] === '--prepare', 'PREPARATION_ONLY_NO_EXECUTION_MODE');
  guard(process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0', 'INSECURE_TLS_ENVIRONMENT');
  let input = '', count = 0;
  try {
    for await (const chunk of process.stdin) {
      count += chunk.length; guard(count <= 8192, 'INPUT_TOO_LARGE'); input += chunk.toString('utf8');
    }
    const { summary } = prepareRequest(JSON.parse(input), JSON.parse(await readFile(localFile, 'utf8')));
    console.log(JSON.stringify(summary));
  } finally { input = ''; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.log(JSON.stringify({ status: 'BLOCKED', reason: error.safeCode ?? 'LOCAL_OR_READ_ONLY_OPERATION_FAILED',
      gatewayRequests: 0, downloads: 0 })); process.exitCode = 2;
  });
}
