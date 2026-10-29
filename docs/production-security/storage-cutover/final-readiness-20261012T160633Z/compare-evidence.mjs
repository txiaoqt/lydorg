// Local comparison only. No database, HTTP, Auth, or deployment operations.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../../../../', import.meta.url);
const read = name => fs.readFile(new URL(name, root));
const json = async name => JSON.parse(await read(name));
const sha = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b))) : v);
const same = (a,b) => stable(a) === stable(b);
const directory = 'docs/production-security/storage-cutover/final-readiness-20261012T160633Z/';
const previous = await json('docs/production-security/storage-cutover/native-executions/20261011T221428755Z/independent-postflight.json');
const catalog = await json(directory + 'catalog-readonly.json');
const foundation = await json(directory + 'foundation-readonly.json');
const objects = await json(directory + 'storage-readonly.json');
const data = await json(directory + 'preservation-readonly.json');
const ownerException = await json(directory + 'owner-access-exception.json');
const matrix = await json('docs/production-security/storage-cutover/20261011T113322Z/historical-object-matrix.json');
// Restricted names are hashed privately for comparison; never included in output.
const restricted = await json('.agent/security/production-storage-review/20261011T113322Z/historical-object-operator-inventory.json');
const sql = await read('docs/production-security/storage-cutover/20261011T113322Z/production_storage_policy_cutover_review.sql');
const text = sql.toString('utf8');
const embedded = tag => {
  const delimiter = '$' + tag + '$', start = text.indexOf(delimiter), end = text.indexOf(delimiter, start + delimiter.length);
  if (start < 0 || end < 0) throw Error('SQL_REVIEW_MANIFEST_MISSING');
  return JSON.parse(text.slice(start + delimiter.length, end));
};
const expectedFunctions = embedded('reviewed_functions');
const expectedPolicies = embedded('expected');
const finalPolicies = embedded('newpolicies');
const subset = (row,keys) => Object.fromEntries(keys.map(k => [k,row[k]]));
const sort = (rows,key) => [...rows].sort((a,b) => a[key]<b[key]?-1:a[key]>b[key]?1:0);
const currentPolicies = catalog.catalog.all_policies.filter(p => p.schemaname === 'storage' && p.tablename === 'objects');
const functionKeys = Object.keys(expectedFunctions[0]);
const policyKeys = Object.keys(expectedPolicies[0]);
const triggerKey = t => t.table + ':' + t.name;
const triggerSubset = names => catalog.catalog.triggers.filter(t => names.has(triggerKey(t)));
const markerNames = new Set(previous.existingProtections.containmentMarkers.map(triggerKey));
const securityNames = new Set(previous.existingProtections.documentSecurityTriggers.map(triggerKey));
const lookup = new Map(objects.object_projection.map(o => [o.id,o]));
const oldLookup = new Map(restricted.map(o => [o.id,o]));
const unmatched = matrix.unmatched.map(old => {
  const now = lookup.get(old.object_id), raw = oldLookup.get(old.object_id);
  return {object_id: old.object_id, decision_group: old.decision_group, present: !!now,
    identityAndMetadataUnchanged: !!now && !!raw && now.path_sha256 === old.path_sha256 && now.path_sha256 === sha(raw.name) && now.bucket_id === raw.bucket_id && now.metadata_md5 === raw.metadata_md5 && String(now.size) === String(raw.size),
    ownerAssociationUnchanged: !!now && same(now.owner_organization_aliases,old.owner_organization_aliases),
    supportedReferences: now?.supported_references ?? null, parentContextExists: now?.parent_context_exists ?? null,
    ordinaryOwnerReadEligible: now?.ordinary_owner_read_eligible ?? null};
});
const priorData = new Map(previous.protectedData.preserved_data.map(x => [x.relation,x]));
const dataChanges = data.preserved_data.filter(x => !same(x,priorData.get(x.relation))).map(x => ({relation:x.relation,previous:priorData.get(x.relation),current:x}));
const privateRows = objects.object_projection.filter(o => o.bucket_id !== 'template-files' && o.supported_references > 0);
const denied = privateRows.filter(o => !o.ordinary_owner_read_eligible && !o.public_avatar_eligible);
const dropped = [...text.matchAll(/DROP POLICY (?:IF EXISTS )?([a-z_]+) ON storage\.objects;/g)].map(m => m[1]);
const created = [...text.matchAll(/CREATE POLICY ([a-z_]+) ON storage\.objects/g)].map(m => m[1]);
const checks = {
  readOnlySnapshots: [catalog.catalog,foundation,objects,data,ownerException].every(x => x.read_only === 'on'),
  exactCatalog: catalog.compatibility_sha256 === previous.fingerprints.existingCatalogSha256,
  migrationHistory: same(catalog.catalog.migration_history,previous.fingerprints.migrationHistory),
  foundationFunctions: foundation.functions.length === 14 && same(foundation.functions,previous.foundation.functions),
  foundationFunctionGate: same(sort(foundation.functions.map(f => subset(f,functionKeys)),'signature'),sort(expectedFunctions,'signature')),
  foundationTables: foundation.tables.length === 4 && same(foundation.tables,previous.foundation.tables),
  foundationTriggers: foundation.triggers.length === 8 && same(foundation.triggers,previous.foundation.triggers),
  foundationSchemaGrants: foundation.schema_acl === previous.foundation.schema_acl,
  trustedOrigin: same(foundation.trusted_origins,['https://mqqaykksadotbrghbexz.supabase.co']),
  containmentMarkers: markerNames.size === 4 && same(triggerSubset(markerNames),previous.existingProtections.containmentMarkers),
  documentSecurityTriggers: securityNames.size === 3 && same(triggerSubset(securityNames),previous.existingProtections.documentSecurityTriggers),
  productionTestGuardDisabled: foundation.environment_guard === false,
  exact15PolicyGate: currentPolicies.length === 15 && same(sort(currentPolicies.map(p => subset(p,policyKeys)),'policyname'),sort(expectedPolicies,'policyname')),
  exactCutoverArtifact: sql.length === 37926 && sha(sql) === '3f98f268be5a0815873802f6c4f284cd9acf381c65140fb904b9c0c0255a432c',
  policyTransition: dropped.length === 12 && created.length === 6 && finalPolicies.length === 9 && currentPolicies.length - dropped.length + created.length === finalPolicies.length,
  storageObjectsUnchanged: objects.storage_inventory.objects === 378 && objects.storage_inventory.content_fingerprint === priorData.get('storage.objects').content_fingerprint,
  bucketsUnchanged: objects.bucket_inventory.buckets === 10 && objects.bucket_inventory.content_fingerprint === priorData.get('storage.buckets').content_fingerprint,
  unmatchedInventoryUnchanged: unmatched.length === 271 && unmatched.every(o => o.present && o.identityAndMetadataUnchanged && o.ownerAssociationUnchanged && o.supportedReferences === 0 && !o.parentContextExists && !o.ordinaryOwnerReadEligible),
  linkedOwnerAccess: privateRows.length === 71 && denied.length === 1 && denied[0].id === ownerException.object_id && ownerException.context_organization_suspended && ownerException.context_owner_matches_storage_owner && ownerException.linked_metadata.every(x => x.resource_owner_matches_storage_owner && x.resource_organization_matches_path && x.resource_organization_suspended),
  currentPublicAssetsResolved: foundation.current_template_resolution.total === 13 && foundation.current_template_resolution.objects_exist === 13 && foundation.published_news_resolution.published === 3 && foundation.published_news_resolution.objects_exist === 3,
};
const result = {capturedAt:new Date().toISOString(),scope:'Local comparisons of fresh production read-only evidence; no policy installation or live authorization tests.',status:Object.values(checks).every(Boolean)?'PASS':'FAIL',checks,
  artifact:{file:'docs/production-security/storage-cutover/20261011T113322Z/production_storage_policy_cutover_review.sql',bytes:sql.length,sha256:sha(sql),modified:false},
  fingerprints:{...previous.fingerprints,protectedInventoriesSha256:undefined,currentCatalogSha256:catalog.compatibility_sha256},
  policyTransition:{existing:15,dropped,created,retained:currentPolicies.filter(p => !dropped.includes(p.policyname)).map(p => p.policyname),final:finalPolicies.length},
  decisionGroups:Object.fromEntries([...new Set(unmatched.map(x=>x.decision_group))].map(g=>[g,unmatched.filter(x=>x.decision_group===g).length])),
  supportedPrivateObjects:privateRows.length,ownerReadEligible:privateRows.filter(x=>x.ordinary_owner_read_eligible).length,intendedSuspensionDenials:denied.length,
  preservationComparison:{relations:data.preserved_data.length,unchanged:data.preserved_data.length-dataChanges.length,changes:dataChanges,baselineReplaced:false},
  historicalEvidenceLimitation:'Storage metadata fingerprints do not constitute new physical-content hash verification. No private files were downloaded.',
  historicalDisposition:'No unmatched object is established as verified unused by these checks.'};
await fs.writeFile(new URL('./comparison-reviewed.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
if(result.status!=='PASS')process.exitCode=2;
