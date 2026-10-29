// Apply the same narrow pause to the dirty workspace and an overlay of the live Admin source.
// The overlay is a release input, not a deployment or a replacement of the dirty tree.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const dir='docs/production-security/budget-deletion-pause/20261012T165000Z';
const deployed='.agent/admin-candidate-deploy-20261012T064113Z/source';
const hash=b=>createHash('sha256').update(b).digest('hex');
const zip=await readFile('.agent/admin-storage-vercel-20261012T061324Z/admin-gateway-vercel24-source.zip');
assert.equal(hash(zip),'a6ba0e4e9dc4684a45dc8c86bdaf448311db571bc7156ea73dbf3cf62d36d465');
const replacements={
 'src/lib/lydo-connect-supabase.ts':s=>{
  const start=s.indexOf('export const deleteAdminBudgetRequestsInSupabase = async (');
  const end=s.indexOf('/**\n * Admin RPC: Explicitly unlock',start);
  assert.ok(start>0&&end>start);
  return 'import { BudgetDeletionPausedError } from "@/lib/admin-budget-deletion-pause";\n'+s.slice(0,start)+`// Keep this API for existing callers; never contact the server or Storage while paused.
export const deleteAdminBudgetRequestsInSupabase = async (
  _requestIds: string[]
): Promise<AdminBudgetRequestsDeleteResult> => {
  throw new BudgetDeletionPausedError();
};

`+s.slice(end);
 },
 'src/admin/AdminPortal.tsx':s=>{
  const start=s.indexOf('  const selectedBudgetRequests = useMemo(() => {');
  const end=s.indexOf('  useEffect(() => {',start);
  assert.ok(start>0&&end>start&&s.slice(start,end).includes('handleConfirmBudgetRequestsDelete'));
  s=s.slice(0,start)+s.slice(end);
  const modal=s.indexOf('            {/* Permanent deletion confirmation modal */}');
  const modalEnd=s.indexOf('            />',modal)+15;
  assert.ok(modal>0&&modalEnd>modal&&s.slice(modal,modalEnd).includes('onConfirm={handleConfirmBudgetRequestsDelete}'));
  s=s.slice(0,modal)+s.slice(modalEnd);
  for(const line of [
   'deleteAdminBudgetRequestsInSupabase, ',
   '  const [isDeleteBudgetRequestsModalOpen, setIsDeleteBudgetRequestsModalOpen] = useState(false);\n',
   '  const [isDeletingBudgetRequests, setIsDeletingBudgetRequests] = useState(false);\n',
   '              onDeleteSelected={handleInitiateBudgetRequestsDelete}\n',
   '              isDeleting={isDeletingBudgetRequests}\n',
  ]){assert.ok(s.includes(line),`Missing reviewed UI boundary: ${line.trim()}`);s=s.replace(line,'');}
  return s;
 },
 'src/admin/components/BudgetRequestsTable.tsx':s=>{
  s='import { BUDGET_DELETION_PAUSED_MESSAGE } from "@/lib/admin-budget-deletion-pause";\n'+s;
  assert.ok(s.includes('  onDeleteSelected,\n  isDeleting = false,\n'));
  s=s.replace('  onDeleteSelected,\n  isDeleting = false,\n','');
  assert.ok(s.includes('              onClick={onDeleteSelected}\n              disabled={isDeleting}'));
  s=s.replace('              onClick={onDeleteSelected}\n              disabled={isDeleting}',`              disabled
              aria-describedby="budget-deletion-pause-message"
              title={BUDGET_DELETION_PAUSED_MESSAGE}`);
  s=s.replace('              Delete selected\n','              Deletion unavailable\n');
  s=s.replace('          <div className="flex items-center gap-2">\n            <button\n              type="button"\n              disabled',`          <div className="flex flex-col items-end gap-2">
            <p id="budget-deletion-pause-message" role="status" className="font-segoe text-xs text-slate-600">
              {BUDGET_DELETION_PAUSED_MESSAGE}
            </p>
            <button
              type="button"
              disabled`);
  assert.ok(s.includes('id="budget-deletion-pause-message"'));
  return s;
 },
};
const identities=[];
const writes=[];
for(const [path,transform] of Object.entries(replacements)){
 for(const [source,target,kind] of [[`${dir}/original-local/${path}`,path,'workspace'],[`${deployed}/${path}`,`${dir}/admin-release-overlay/${path}`,'isolated-live-base-overlay']]){
  const before=await readFile(source,'utf8');const eol=before.includes('\r\n')?'\r\n':'\n';
  const after=transform(before.replaceAll('\r\n','\n')).replaceAll('\n',eol);
  assert.notEqual(after,before);
  if(kind==='workspace')assert.ok([hash(before),hash(after)].includes(hash(await readFile(target))),`Unexpected concurrent local change: ${path}`);
  writes.push({target,after});
  identities.push({kind,path,baseSha256:hash(before),proposedSha256:hash(after)});
 }
}
for(const {target,after} of writes){await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await writeFile(target,after);}
const module=await readFile('src/lib/admin-budget-deletion-pause.ts');
await mkdir(`${dir}/admin-release-overlay/src/lib`,{recursive:true});
await writeFile(`${dir}/admin-release-overlay/src/lib/admin-budget-deletion-pause.ts`,module);
identities.push({kind:'new-shared-message',path:'src/lib/admin-budget-deletion-pause.ts',proposedSha256:hash(module)});
await writeFile(`${dir}/frontend-overlay-identities.json`,JSON.stringify({baseDeployment:'dpl_AZ287kU35oFTVqyTEQRf749qncAA',baseSourceRevision:'0339c4336aeec2f7b4cccef2b9a873d107dae350a97bdc501a62f4e815c8c324',files:identities},null,2)+'\n');
console.log(JSON.stringify({status:'LOCAL_UI_PAUSE_PREPARED',runtimeFiles:4,dirtyTreePreserved:true}));
