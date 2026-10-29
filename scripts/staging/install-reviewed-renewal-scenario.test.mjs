import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installReviewed} from './install-reviewed-renewal-scenario.mjs';
const ref='zroudsvpswqsjlyttkjf';
const env={YTRACE_STAGING_PROJECT_REF:ref,YTRACE_STAGING_SUPABASE_URL:`https://${ref}.supabase.co`,SUPABASE_ACCESS_TOKEN:'mock-only'};
const expected=JSON.parse(await readFile('docs/staging-validation/2026-10-11/renewal-scenario/final-catalog-manifest.json','utf8'));
const project={id:ref,name:'ytrace-staging',status:'ACTIVE_HEALTHY',database:{host:`db.${ref}.supabase.co`}};
function client(p=project,m=expected){const calls=[];return {calls,fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>calls.length===1?p:[{manifest:m}]};}};}
test('wrong environment or missing control-plane credential stops before network',async()=>{for(const e of [{...env,YTRACE_STAGING_PROJECT_REF:'mqqaykksadotbrghbexz'},{...env,YTRACE_STAGING_SUPABASE_URL:'https://unknown.supabase.co'},{...env,SUPABASE_ACCESS_TOKEN:''}]){const c=client();await assert.rejects(installReviewed({env:e,...c}));assert.equal(c.calls.length,0);}});
test('project identity mismatch refuses catalog request and DDL',async()=>{const c=client({...project,id:'mqqaykksadotbrghbexz'});await assert.rejects(installReviewed({env,...c}),/identity/);assert.equal(c.calls.length,1);});
test('read-only default checks exact catalog without installing',async()=>{const c=client();const r=await installReviewed({env,...c});assert.equal(r.status,'READ_ONLY_REVIEW');assert.equal(c.calls.length,2);assert.equal(JSON.parse(c.calls[1].options.body).read_only,true);assert.ok(c.calls.every(x=>x.url.startsWith(`https://api.supabase.com/v1/projects/${ref}`)));});
test('changed function, role, column, constraint, index, trigger, policy or grant stops install',async()=>{for(const key of Object.keys(expected)){const m=structuredClone(expected);m[key]=[];const c=client(project,m);await assert.rejects(installReviewed({env,...c}),/catalog drift/);assert.equal(c.calls.length,2);}});
test('unreviewed SQL cannot execute',async()=>{const c=client();await assert.rejects(installReviewed({env,...c,apply:true,expectedSha256:'wrong'}),/SHA256/);assert.equal(c.calls.length,0);});
test('explicit reviewed installation or disable is staging-only and single request',async()=>{for(const mode of ['install','disable']){const dry=await installReviewed({env,...client(),mode});const c=client();await installReviewed({env,...c,mode,apply:true,expectedSha256:dry.sha256});assert.equal(c.calls.length,mode==='install'?3:2);assert.ok(JSON.parse(c.calls.at(-1).options.body).query.startsWith('--'));}});
