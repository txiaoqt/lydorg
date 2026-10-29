import { readFile,writeFile } from 'node:fs/promises';
const dir='docs/production-security/budget-deletion-pause/20261012T165000Z';
function diagnostics(text){
 const lines=text.replaceAll('\\','/').split(/\r?\n/);const out=[];
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^(.*)\((\d+),(\d+)\): error (TS\d+): (.*)$/);if(!m)continue;
  let file=m[1];const sourceIndex=file.lastIndexOf('/source/');if(sourceIndex>=0)file=file.slice(sourceIndex+8);
  let message=m[5];while(i+1<lines.length&&/^\s+\S/.test(lines[i+1]))message+='\n'+lines[++i];
  message=message.replace(/C:\/Users\/Christopher x Angel\/Documents\/lydo-connect-org-focused\/\.agent\/[^\s"']+?\/source\//g,'<source>/').replace(/\.agent\/[^\s"']+?\/source\//g,'<source>/');
  out.push({file,code:m[4],message,identity:JSON.stringify([file,m[4],message])});
 }
 return out;
}
const old=diagnostics(await readFile(`${dir}/isolated-base-typescript.log`,'utf8'));
const current=diagnostics(await readFile(`${dir}/isolated-admin-typescript.log`,'utf8'));
function difference(a,b){const counts=new Map();for(const x of b)counts.set(x.identity,(counts.get(x.identity)||0)+1);return a.filter(x=>{const n=counts.get(x.identity)||0;if(n){counts.set(x.identity,n-1);return false;}return true;}).map(({identity,...x})=>x);}
const introduced=difference(current,old),removed=difference(old,current);
const runtime=['src/admin/AdminPortal.tsx','src/admin/components/BudgetRequestsTable.tsx','src/lib/lydo-connect-supabase.ts','src/lib/admin-budget-deletion-pause.ts'];
const result={actualAppTypecheck:'FAIL',baselineErrors:old.length,currentErrors:current.length,newDiagnosticIdentities:introduced.length,removedDiagnosticIdentities:removed.length,newDiagnostics:introduced,removedDiagnostics:removed,runtimeScopeBaselineDiagnostics:old.filter(d=>runtime.includes(d.file)).length,runtimeScopeCurrentDiagnostics:current.filter(d=>runtime.includes(d.file)).length,limitation:'Existing app errors remain real technical debt; no compiler options or assertions were weakened. This comparison covers the immutable live Admin source plus the four-file overlay, not the unrelated dirty root or the separate Organization baseline.'};
await writeFile(`${dir}/typescript-comparison.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,newDiagnostics:undefined,removedDiagnostics:undefined}));
