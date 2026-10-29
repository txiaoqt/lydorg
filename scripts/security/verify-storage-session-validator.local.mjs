// Isolated validator compatibility check. No live RPC or credentials.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { installBaseline } from '../../supabase/tests/storage_fixture_schema.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const directory='docs/production-security/storage-cutover/20261011T113322Z/';
const catalog=JSON.parse(await readFile(directory+'production-catalog-final.json','utf8'));
const expected=catalog.catalog.function_fingerprints.find(x=>x.signature==='validate_admin_session_token(text)');
if(!expected)throw new Error('Expected validator missing');
const db=new PGlite();
try{
  await installBaseline(db);
  // pg_get_functiondef excludes ACLs. Replicate the fresh production explicit
  // grants locally; the earlier fixture's implicit PUBLIC execute was equivalent.
  await db.exec('grant execute on function public.validate_admin_session_token(text) to anon,authenticated,service_role');
  const actual=(await db.query("select md5(prosrc) source_md5,prosecdef security_definer,provolatile volatility,proconfig config,proacl::text acl from pg_proc where oid='public.validate_admin_session_token(text)'::regprocedure")).rows[0];
  const matches=['source_md5','security_definer','volatility','config','acl'].every(k=>JSON.stringify(actual[k])===JSON.stringify(expected[k]));
  await writeFile(directory+'session-validator-source-comparison.json',JSON.stringify({matches,scope:'Isolated captured validator plus explicit production grant fixture versus fresh read-only production catalog; no live validation RPC invocation',actual,expected},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({validatorMatchesFreshProduction:matches}));
  if(!matches)process.exitCode=1;
}finally{await db.close();}

