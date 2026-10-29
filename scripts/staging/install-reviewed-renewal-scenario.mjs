// Staging-only control-plane installer. Read-only by default. No root .env loading.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
const ref='zroudsvpswqsjlyttkjf';
const dir='docs/staging-validation/2026-10-11/renewal-scenario/';
export async function installReviewed({env=process.env,fetchImpl=fetch,apply=false,expectedSha256,mode='install'}={}) {
  if(env.YTRACE_STAGING_PROJECT_REF!==ref || env.YTRACE_STAGING_SUPABASE_URL!==`https://${ref}.supabase.co`) throw new Error('Exact staging environment required');
  if(!env.SUPABASE_ACCESS_TOKEN) throw new Error('Staging-authorized control-plane access token required; never paste into chat');
  if(!['install','disable'].includes(mode)) throw new Error('Unknown operation');
  const sql=await readFile(dir+(mode==='install'?'staging-adaptation.sql':'disable-scenario.sql'),'utf8');
  const hash=createHash('sha256').update(sql).digest('hex');
  if(apply && expectedSha256!==hash) throw new Error('Reviewed SQL SHA256 mismatch');
  const request=async(path,body)=>{
    const r=await fetchImpl(`https://api.supabase.com/v1/projects/${ref}${path}`,{
      method:body?'POST':'GET',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})});
    if(!r.ok) throw new Error(`Staging control-plane request failed: HTTP ${r.status}`);
    return r.json();
  };
  const project=await request('');
  if(project.id!==ref || project.name!=='ytrace-staging' || project.database?.host!==`db.${ref}.supabase.co` || project.status!=='ACTIVE_HEALTHY') throw new Error('Staging project identity/health mismatch');
  if(mode==='install') {
    const query=await readFile(dir+'final-catalog-query.sql','utf8');
    const rows=await request('/database/query',{query,read_only:true});
    const expected=JSON.parse(await readFile(dir+'final-catalog-manifest.json','utf8'));
    if(!Array.isArray(rows) || rows.length!==1 || !isDeepStrictEqual(rows[0].manifest,expected)) throw new Error('Exact staging catalog drift');
  }
  // SQL repeats the gate inside its transaction; disable has a synthetic installation anchor.
  if(apply) await request('/database/query',{query:sql});
  return {project:ref,operation:mode,status:apply?'APPLIED':'READ_ONLY_REVIEW',sha256:hash};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const args=process.argv.slice(2);
  try { console.log(JSON.stringify(await installReviewed({apply:args.includes('--apply-reviewed'),mode:args.includes('--disable')?'disable':'install',expectedSha256:args.find(a=>a.startsWith('--sha256='))?.slice(9)}))); }
  catch { console.error('Staging renewal operation stopped. Check project, permissions, reviewed hash and catalog drift; no automatic retry.');process.exitCode=1; }
}
