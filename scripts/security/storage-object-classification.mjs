// Offline evidence review only. This module has no Supabase client or network API.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRIVATE_BUCKETS = new Set(['organization-documents', 'budget-request-files', 'liquidation-report-files', 'ypop-files', 'move-files']);
const digest = value => createHash('sha256').update(value).digest('hex');
const alias = value => value ? digest(String(value)).slice(0, 16) : null;

/** Exact canonical/trusted-origin reference matching; never authorize from this parser. */
export function parseReference(value, origin) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('storage://')) {
    const match = /^storage:\/\/([^/]+)\/(.+)$/.exec(value);
    return match ? { bucket: match[1], path: match[2] } : null;
  }
  try {
    const url = new URL(value);
    if (url.origin !== new URL(origin).origin || url.username || url.password) return null;
    const match = /^\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/.exec(url.pathname);
    return match ? { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) } : null;
  } catch { return null; }
}

/** Correlation, a reset audit, age, a missing owner, or a test marker never proves disuse. */
export function classifyObject(object, audit, legacyTestOrganizationIds = []) {
  const current = object.current_references ?? [], history = object.history_references ?? [];
  const additional = object.additional_references ?? [];
  const owners = object.owner_organizations ?? [];
  const groups = audit?.audit_groups ?? [];
  const linked = current.length + history.length > 0;
  const bucket = object.bucket_id;
  const ownerGroup = bucket === 'template-files' ? 'unreferenced-template-version'
    : owners.some(owner => legacyTestOrganizationIds.includes(owner.id)) ? 'legacy-test-owner'
    : owners.length ? 'current-nontest-owner' : 'no-surviving-owner-organization';
  return {
    object_id: object.id, bucket, path_sha256: digest(object.name),
    classification: history.length ? 'Required historical evidence' : linked ? 'Legitimately retained' : 'Unresolved',
    decision_group: linked ? 'supported-reference' : ownerGroup,
    owner_auth_exists: !!object.owner_auth_exists,
    owner_organization_aliases: owners.map(x => alias(x.id)),
    current_references: current.map(x => ({ source: x.source ?? x.kind, row_alias: alias(x.id ?? x.row_id), organization_alias: alias(x.organization_id) })),
    historical_reference_count: history.length,
    other_reference_count: additional.length,
    existing_path_parent_count: (object.path_parent_candidates ?? []).length,
    existing_path_organization_count: (object.path_organization_candidates ?? []).length,
    existing_template_prefix_count: (object.path_template_candidates ?? []).length,
    contextual_audit_groups: groups.length,
    exact_uri_audit_matches: groups.reduce((n, x) => n + x.exact_uri_matches, 0),
    exact_path_audit_matches: groups.reduce((n, x) => n + x.exact_path_matches, 0),
    next_action: linked ? 'Preserve; validate access through authoritative metadata.'
      : bucket === 'template-files' ? 'Owner decides version retention/access; deny unknown signing. No automatic deletion.'
      : ownerGroup === 'current-nontest-owner' ? 'Owner confirms historical need and authoritative parent; preserve and deny unresolved access.'
      : ownerGroup === 'legacy-test-owner' ? 'Records owner decides test-evidence retention; preserve in place and deny unresolved access.'
      : 'Establish ownership/retention from authoritative records; preserve in place and deny unresolved access.',
  };
}

export function buildInventory(objects, audits, legacyIds) {
  const byId = new Map(audits.map(x => [x.object_id, x]));
  const matrix = objects.filter(x => PRIVATE_BUCKETS.has(x.bucket_id) || x.bucket_id === 'template-files')
    .map(x => classifyObject(x, byId.get(x.id), legacyIds)).sort((a, b) => a.object_id.localeCompare(b.object_id, 'en'));
  const unmatched = matrix.filter(x => x.classification === 'Unresolved');
  return {
    scope: 'Metadata and audit correlation only. No object downloads, deletions, or access grants. Hashes are path identifiers, not file-content hashes.',
    classifications: matrix.reduce((a, x) => (a[x.classification] = (a[x.classification] ?? 0) + 1, a), {}),
    unmatched_classifications: { 'Required historical evidence': 0, 'Legitimately retained': 0, 'Verified unused': 0, Unresolved: unmatched.length },
    decision_counts: unmatched.reduce((a, x) => (a[x.decision_group] = (a[x.decision_group] ?? 0) + 1, a), {}),
    matrix, unmatched,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [inputDirectory, outputDirectory] = process.argv.slice(2);
  if (!inputDirectory || !outputDirectory) throw new Error('Usage: node scripts/security/storage-object-classification.mjs <restricted-input-directory> <new-output-directory>');
  const objects = JSON.parse(await readFile(resolve(inputDirectory, 'analyzed-objects.json'), 'utf8'));
  const audits = JSON.parse(await readFile(resolve(inputDirectory, 'object-audit.json'), 'utf8'));
  const legacyIds = audits.fixture_context.filter(x => x.renewal_test_marker === true).map(x => x.organization_id);
  const result = buildInventory(objects, audits.object_audits, legacyIds);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'historical-object-matrix.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ objectsReviewed: result.matrix.length, unmatched: result.unmatched.length, decisionCounts: result.decision_counts }));
}
