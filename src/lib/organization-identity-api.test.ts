import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),session:vi.fn()}));
vi.mock('./supabase',()=>({supabase:{rpc:mocks.rpc,from:mocks.from}}));
vi.mock('./admin-auth',()=>({readAdminSession:mocks.session}));
import {checkOrganizationIdentity,fetchOrganizationIdentityReview,reviewOrganizationIdentity} from './organization-identity-api';
import {checkSignupUrn} from './urn-validation';
beforeEach(()=>{vi.resetAllMocks();mocks.session.mockReturnValue({sessionToken:'trusted-token'});});
describe('privacy and failure boundaries',()=>{
  it.each(['NO_MATCH','POSSIBLE_MATCH','EXACT_URN_CONFLICT','VERIFIED_SEPARATE','CHECK_UNAVAILABLE'] as const)('accepts generic %s only',async outcome=>{
    mocks.rpc.mockResolvedValue({data:{outcome,id:'private-id',email:'private@example.test',financialRecords:['private']},error:null});
    expect(await checkOrganizationIdentity('Candidate Org','Palatiw','17-26-010')).toBe(outcome);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('check_organization_identity',{_name:'Candidate Org',_barangay:'Palatiw',_urn:'17-26-010'});
  });
  it.each([{data:null,error:{message:'missing RPC'}},{data:{outcome:'UNKNOWN'},error:null}])('fails closed on unavailable/unknown response',async response=>{
    mocks.rpc.mockResolvedValue(response);expect(await checkOrganizationIdentity('Candidate Org')).toBe('CHECK_UNAVAILABLE');
  });
  it('fails closed on rejected network requests and URN checks without private fallback',async()=>{
    mocks.rpc.mockRejectedValue(new Error('offline'));expect(await checkOrganizationIdentity('Candidate Org')).toBe('CHECK_UNAVAILABLE');
    expect(await checkSignupUrn('17-26-010')).toBe('error');expect(mocks.from).not.toHaveBeenCalled();
  });
  it('requires an active admin token before reads and sends expected version/evidence',async()=>{
    mocks.session.mockReturnValue(null);await expect(fetchOrganizationIdentityReview('candidate-id')).rejects.toThrow('active registration reviewer');expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.session.mockReturnValue({sessionToken:'trusted-token'});mocks.rpc.mockResolvedValue({data:{outcome:'POSSIBLE_MATCH'},error:null});
    await reviewOrganizationIdentity('candidate-id',null,'more_information',' reason provided ',' official record ',4);
    expect(mocks.rpc).toHaveBeenCalledWith('admin_review_organization_identity',expect.objectContaining({_session_token:'trusted-token',_organization_id:'candidate-id',_expected_version:4,_reason:'reason provided',_evidence_reference:'official record'}));
  });
});
