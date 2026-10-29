// One newly identified reporting edge case, using saved data and a pure function.
// No Client, network, operator-state reads/writes, locks, or attempt markers.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {classifyReconciliation,PRE_CATALOG_SHA,EXPECTED_FUNCTION} from '../budget-runner-core.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url));
const saved=JSON.parse(await readFile(resolve(directory,'../native-readonly-20261013T103131Z/native-preflight-evidence.json'),'utf8'));
const old=saved.budget;
assert.equal(old.compatibility_sha256,PRE_CATALOG_SHA);assert.equal(old.function.definition_md5,EXPECTED_FUNCTION.definition_md5);
const postViewingOld={...old,phase:'post',catalog_matches:false,function_matches:false};
const withDrift=classifyReconciliation({priorBackendFinished:true,preState:old,postState:postViewingOld,preservationMatches:false});
const noDrift=classifyReconciliation({priorBackendFinished:true,preState:old,postState:postViewingOld,preservationMatches:true});
assert.equal(withDrift.classification,'COMMITTED_WITH_DRIFT');assert.equal(withDrift.stop,true);
assert.equal(noDrift.classification,'NOT_INSTALLED_VERIFIED');assert.equal(noDrift.stop,true);
const result={status:'CONFIRMED_REPORTING_LIMITATION_FAIL_CLOSED',fixture:'Original function and original catalog remain; unrelated preservation drift simulated in memory',catalogRemainsOriginal:true,originalDefinitionMd5:old.function.definition_md5,classificationWithDrift:withDrift,classificationWithoutDrift:noDrift,commitProvenByDriftLabel:false,mutationOrRetryPermittedByResult:false,requiredOperatorMitigation:'Every drift label is a STOP. Determine old/new commit state from exact catalog and RPC fingerprints after the recorded writer backend is finished; never accept the label or exit code as proof.',scope:'New pure reporting-edge reproduction only; completed test suites not rerun',productionConnectionAttempted:false,installationActivated:false};
await writeFile(resolve(directory,'reconciliation-label-review.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
