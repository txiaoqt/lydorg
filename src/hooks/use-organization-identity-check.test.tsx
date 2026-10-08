import {act,renderHook} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const check=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/organization-identity-api',()=>({checkOrganizationIdentity:check}));
import {useOrganizationIdentityCheck} from './use-organization-identity-check';
beforeEach(()=>{vi.useFakeTimers();check.mockReset().mockResolvedValue('NO_MATCH');});
afterEach(()=>vi.useRealTimers());
it('debounces keystrokes and checks supporting barangay details without polling',async()=>{
 const {result,rerender}=renderHook(({name,area})=>useOrganizationIdentityCheck(name,area),{initialProps:{name:'Pal',area:''}});
 rerender({name:'Palatiw Youth Org.',area:''});expect(check).not.toHaveBeenCalled();
 await act(async()=>{await vi.advanceTimersByTimeAsync(650);});expect(check).toHaveBeenCalledTimes(1);expect(result.current).toBe('NO_MATCH');
 rerender({name:'Palatiw Youth Org.',area:'Palatiw'});expect(result.current).toBeNull();
 await act(async()=>{await vi.advanceTimersByTimeAsync(650);});expect(check).toHaveBeenLastCalledWith('Palatiw Youth Org.','Palatiw','',expect.any(AbortSignal));
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});expect(check).toHaveBeenCalledTimes(2);
});
it('does not check short names or apply a stale response',async()=>{
 let resolve:(value:string)=>void=()=>{};check.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const {result,rerender}=renderHook(({name})=>useOrganizationIdentityCheck(name),{initialProps:{name:'a'}});
 await act(async()=>{await vi.advanceTimersByTimeAsync(650);});expect(check).not.toHaveBeenCalled();
 rerender({name:'Old Organization'});await act(async()=>{await vi.advanceTimersByTimeAsync(650);});
 rerender({name:'New Organization'});await act(async()=>{resolve('POSSIBLE_MATCH');});expect(result.current).toBeNull();
 await act(async()=>{await vi.advanceTimersByTimeAsync(650);});expect(result.current).toBe('NO_MATCH');
});
