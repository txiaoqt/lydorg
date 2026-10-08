import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({existing:null as Record<string,unknown>|null,from:vi.fn(),insert:vi.fn(),update:vi.fn(),eq:vi.fn()}));
vi.mock('./supabase',()=>({supabase:{auth:{getSession:vi.fn().mockResolvedValue({data:{session:{user:{id:'owner',email:'owner@gmail.com',app_metadata:{}}}}})},from:mocks.from},supabaseUrl:'https://mock.supabase.co'}));
import {upsertOrganizationProfileInSupabase} from './lydo-connect-supabase';
import {createBlankOrganizationProfile} from './organization-profile-domain';
beforeEach(()=>{
 vi.clearAllMocks();mocks.existing=null;
 const writer={eq:mocks.eq,select:()=>({single:()=>Promise.resolve({data:{id:'org',user_id:'owner',organization_name:'Profile Club',profile_status:mocks.existing?.profile_status||'draft',organization_email:'owner@gmail.com'},error:null})})};
 mocks.eq.mockReturnValue(writer);mocks.insert.mockReturnValue(writer);mocks.update.mockReturnValue(writer);
 mocks.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:()=>Promise.resolve({data:mocks.existing,error:null})})}),insert:mocks.insert,update:mocks.update});
});
const draft=()=>({...createBlankOrganizationProfile('owner'),organizationName:'Profile Club',organizationEmail:'owner@gmail.com',barangay:'Palatiw',addressBarangay:'Palatiw',addressZipCode:'1600'});
it('uses INSERT for a new profile and never submits server review notes/timestamps',async()=>{
 await upsertOrganizationProfileInSupabase({...draft(),internalNotes:'must not send',verifiedAt:'2026-01-01'});
 expect(mocks.insert).toHaveBeenCalledTimes(1);expect(mocks.update).not.toHaveBeenCalled();
 const payload=mocks.insert.mock.calls[0][0];expect(payload).not.toHaveProperty('verified_at');expect(payload).not.toHaveProperty('internal_notes');
});
it('uses a scoped UPDATE for existing verified profiles and preserves official identifiers/status',async()=>{
 mocks.existing={id:'original',user_id:'owner',profile_status:'verified',verified_at:'2026-01-01',urn_review_status:'not_applicable',registration_type:'new_organization',urn:'17-26-010',organization_identifier_number:''};
 await upsertOrganizationProfileInSupabase({...draft(),profileStatus:'pending_review',urn:'wrong',organizationIdentifierNumber:'wrong',registrationType:'existing_urn'});
 expect(mocks.insert).not.toHaveBeenCalled();expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({profile_status:'verified',registration_type:'new_organization',urn:'17-26-010',organization_identifier_number:''}));
 expect(mocks.eq).toHaveBeenCalledWith('id','original');expect(mocks.eq).toHaveBeenCalledWith('user_id','owner');
});
