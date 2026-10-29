// Creates an ignored Vite env directory containing only the staging URL and anon key.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const ref='zroudsvpswqsjlyttkjf',expected=`https://${ref}.supabase.co`;
const raw=await readFile('.env.staging.local','utf8');
const values=new Map();
for(const line of raw.split(/\r?\n/)){
 const m=line.match(/^\s*(YTRACE_STAGING_SUPABASE_URL|YTRACE_STAGING_PROJECT_REF|YTRACE_STAGING_ANON_KEY)\s*=\s*(.*?)\s*$/);
 if(m){let v=m[2];if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);values.set(m[1],v);}
}
if(values.get('YTRACE_STAGING_PROJECT_REF')!==ref||values.get('YTRACE_STAGING_SUPABASE_URL')?.replace(/\/$/,'')!==expected)throw Error('Exact staging endpoint guard failed');
const key=values.get('YTRACE_STAGING_ANON_KEY');
if(!key)throw Error('Staging anon key unavailable');
let payload;try{payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'));}catch{throw Error('Expected legacy anon JWT key; refusing unknown key type');}
if(payload.role!=='anon'||payload.ref!==ref)throw Error('Refusing non-staging anon browser key');
const dir='tmp/ytrace-staging-vite';await mkdir(dir,{recursive:true});
const path=dir+'/.env.local';
await writeFile(path,`VITE_SUPABASE_URL=${expected}\nVITE_SUPABASE_ANON_KEY=${key}\nVITE_DEPLOY_SURFACE=combined\nVITE_ENABLE_STANDALONE_USER_PWA_UI=${process.argv.includes('--pwa-preview')?'true':'false'}\n`,{mode:0o600});
const ignored=execFileSync('git',['-c','core.fsmonitor=false','check-ignore',path],{encoding:'utf8'}).trim();
if(!ignored)throw Error('Vite staging key file is not git-ignored');
const config=dir+'/vite.config.ts';
await writeFile(config,`import base from '../../vite.config.ts';\nimport path from 'node:path';\nexport default async env => { const c=await base(env); return { ...c, envDir:path.resolve(process.cwd(),'${dir}') }; };\n`,{mode:0o600});
console.log(JSON.stringify({status:'PASS',projectRef:ref,publicAnonKeyRole:payload.role,onlyPublicSupabaseValuesWritten:true,ignored:true}));
