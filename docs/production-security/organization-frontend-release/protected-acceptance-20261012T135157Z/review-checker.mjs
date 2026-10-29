// Offline review of the unchanged operator checker. No network or browser access.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const previous=path.join(root,'docs/production-security/organization-frontend-release/candidate-deployment-20261012T122419Z');
const review=path.join(root,'docs/production-security/organization-frontend-release/vercel24-20261012T114439Z');
const checker=await fs.readFile(path.join(previous,'operator-hosted-check.js'));
const text=checker.toString('utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
const checkerSha256='02f37c21c749a846eca2fb96912641600204204b6802d41f80e7478de52bfde0';
const inventorySha256='bae8f79337d04020eb14b6fbb936b476cfe3cf2530db1596ca8a35138a336d94';
const origin='https://yorbmsuser-bbr407hfc-toffs-projects-81b2ce10.vercel.app';
assert.equal(sha(checker),checkerSha256);
const expected=JSON.parse(text.match(/const expected=(\[.*?\]);/s)[1]);
const headers=JSON.parse(text.match(/const expectedHeaders=(\{.*?\});/s)[1]);
const manifest=JSON.parse(await fs.readFile(path.join(review,'static-manifest.json'),'utf8'));
assert.equal(expected.length,53);
assert.equal(sha(JSON.stringify(expected)),inventorySha256);
assert.deepEqual(expected,manifest.files);
assert.equal(manifest.staticInventorySha256,inventorySha256);
const config=JSON.parse(await fs.readFile(path.join(root,'.agent/organization-candidate-deploy-20261012T122419Z/source/vercel.json'),'utf8'));
assert.deepEqual(headers,Object.fromEntries(config.headers[0].headers.map(h=>[h.key.toLowerCase(),h.value])));

const outcomes=[];
async function exercise(name,{testOrigin=origin,body='public mock response',status=null,controller=false,altered=text}={}){
  const calls=[],logs=[];
  const forbidden=new Proxy({}, {get(){throw Error('FORBIDDEN_BROWSER_SECRET_ACCESS');}});
  const globals={
    location:{origin:testOrigin},navigator:{serviceWorker:{controller:controller?{}:null}},
    crypto:webcrypto,TextEncoder,TextDecoder,URL,Uint8Array,AbortSignal,
    atob:s=>Buffer.from(s,'base64').toString('binary'),
    localStorage:forbidden,sessionStorage:forbidden,
    document:forbidden,indexedDB:forbidden,caches:forbidden,
    console:{log:value=>logs.push(value)},
    fetch:async (url,options)=>{
      assert.equal(url.origin,origin);assert.equal(url.search,'');assert.equal(url.hash,'');
      assert.ok(['GET','OPTIONS'].includes(options.method));
      assert.equal(options.mode,'same-origin');assert.equal(options.credentials,'same-origin');
      assert.equal(options.redirect,'manual');assert.equal(options.cache,'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      assert.ok(url.pathname==='/api/sync-run-once'||!url.pathname.startsWith('/api/'));
      calls.push({path:url.pathname,method:options.method});
      const code=status??(url.pathname==='/api/sync-run-once'?(options.method==='GET'?405:204):200);
      return new Response(code===204?null:body,{status:code,headers:{...headers,'content-type':'text/plain'}});
    }
  };
  let failure=null;
  try{await vm.runInNewContext(altered,globals,{timeout:2000});}catch(error){failure=error.message;}
  const evidence=logs.length?JSON.parse(logs.at(-1).split('YTRACE_HOSTED_ACCEPTANCE_JSON\n')[1]):null;
  const output={name,calls:calls.length,failure,status:evidence?.status??null,evidence,capturedLogs:logs};
  return output;
}
let r=await exercise('fixed request scope');
assert.equal(r.calls,62);assert.equal(r.failure,null);
assert.equal(r.status,'FAIL'); // Mock bytes intentionally differ; never treat as hosted integrity evidence.
outcomes.push({check:r.name,status:'PASS',mockRequests:r.calls,meaning:'All requests stay in the bounded read-only allowlist; mock artifact mismatch remains FAIL.'});
r=await exercise('wrong origin',{testOrigin:'https://example.invalid'});
assert.equal(r.calls,0);assert.equal(r.failure,'WRONG_CANDIDATE_ORIGIN_STOPPED');
outcomes.push({check:r.name,status:'PASS',mockRequests:r.calls});
r=await exercise('changed inventory',{altered:text.replace('5878','5879')});
assert.equal(r.calls,0);assert.equal(r.failure,'PINNED_INVENTORY_MISMATCH');
outcomes.push({check:r.name,status:'PASS',mockRequests:r.calls});
r=await exercise('redirect blocked',{status:302});
assert.equal(r.calls,1);assert.equal(r.status,'BLOCKED');
outcomes.push({check:r.name,status:'PASS',mockRequests:r.calls});
r=await exercise('public canary stops without disclosing contents',{body:'fixture-server-secret-never-client'});
assert.equal(r.calls,1);assert.equal(r.status,'FAIL');
assert.ok(!r.capturedLogs.join('').includes('fixture-server-secret-never-client'));
outcomes.push({check:r.name,status:'PASS',mockRequests:r.calls});
r=await exercise('worker limitation retained',{controller:true});
assert.equal(r.evidence.serviceWorkerControllerPresent,true);
assert.match(r.evidence.serviceWorkerLimitation,/fresh edge provenance is not established/);
outcomes.push({check:r.name,status:'PASS',mockRequests:r.calls});
assert.equal(sha(await fs.readFile(path.join(previous,'operator-hosted-check.js'))),checkerSha256);

const result={capturedAt:new Date().toISOString(),status:'PASS',checkerSha256,checkerUnmodified:true,staticInventorySha256:inventorySha256,inventoryEntries:expected.length,inventoryMatchesApprovedManifest:true,expectedHeadersMatchReviewedVercelConfig:true,reviewType:'Source inspection and offline browser mocks only; no hosted requests or application workflows executed',maximumRequests:62,methods:['GET','OPTIONS'],timeoutMs:30000,maximumDefaultResponseBytes:12000000,credentialHandling:'No browser credential reads. Existing same-origin browser cookies accompany requests automatically; never inspected or exported.',publicSamplePdf:'Only the versioned public templates/pcydo-move-application-form.pdf build artifact is fetched; no private documents.',offlineChecks:outcomes,limitations:['No independent proof of service-worker bypass; operator must report DevTools Bypass for network.','Counters cover requests initiated by the checker only. Existing application background activity is outside scope.','The bounded literal/canary scan is not an exhaustive secrets audit.','No hosted or owner-smoke result can be inferred from these mocks.']};
await fs.writeFile(path.join(here,'checker-security-review.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,checkerSha256,inventoryEntries:expected.length,offlineChecks:outcomes.length,hostedRequests:0,checkerModified:false}));
