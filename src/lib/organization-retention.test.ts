import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {getOrganizationRetentionEligibility} from '../../supabase/functions/_shared/organization-retention';
it.each([[false,'allowed'],[true,'retained']] as const)('only accepts explicit retention eligibility %s',async(retained,expected)=>{
 const rpc=vi.fn().mockResolvedValue({data:{retained},error:null});
 expect(await getOrganizationRetentionEligibility({rpc},'session','org')).toBe(expected);
 expect(rpc).toHaveBeenCalledWith('admin_check_organization_retention',{_session_token:'session',_organization_id:'org'});
});
it.each([{data:null,error:null},{data:{},error:null},{data:{retained:'false'},error:null},{data:{retained:false},error:{message:'unauthorized'}}])('fails closed before deletion for invalid RPC result',async result=>{
 expect(await getOrganizationRetentionEligibility({rpc:vi.fn().mockResolvedValue(result)},'session','org')).toBe('unavailable');
});
it('fails closed on network rejection',async()=>{
 expect(await getOrganizationRetentionEligibility({rpc:vi.fn().mockRejectedValue(new Error('offline'))},'session','org')).toBe('unavailable');
});
it('Edge cleanup order gates retention before manifest/database/Auth/Storage',()=>{
 const source=readFileSync('supabase/functions/delete-organization-account/index.ts','utf8');
 const core=source.slice(source.indexOf('const executeSingleDeletionCore'),source.indexOf('// Step 5: Verification of DB profile removal'));
 const stages=['await assertOrganizationRetentionEligibility','await buildDeletionManifest','await client.rpc(rpcName','client.auth.admin.deleteUser','await removeStorageObjects'];
 const positions=stages.map(s=>core.indexOf(s));expect(positions.every(x=>x>=0)).toBe(true);expect(positions).toEqual([...positions].sort((a,b)=>a-b));
});
