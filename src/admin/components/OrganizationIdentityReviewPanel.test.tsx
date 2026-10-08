import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),review:vi.fn(),user:{id:'reviewer',roleCode:'admin',permissionCodes:['registrations_management']}}));
vi.mock('@/hooks/use-auth',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/lib/organization-identity-api',()=>({fetchOrganizationIdentityReview:mocks.fetch,reviewOrganizationIdentity:mocks.review}));
import {OrganizationIdentityReviewPanel} from './OrganizationIdentityReviewPanel';
const packet={outcome:'POSSIBLE_MATCH',version:3,canonicalOrganizationId:null,candidateLimitReached:false,historyLimited:true,history:[],
 candidates:[{id:'original',name:'Existing Organization',urn:'17-26-010',barangay:'Palatiw',district:'District I',status:'verified',verifiedAt:null,
 hasRetainedHistory:true,separateDecision:false,signals:{normalizedName:true,sameBarangay:true,sameDistrict:true,exactUrn:false}}]};
beforeEach(()=>{vi.resetAllMocks();mocks.user={id:'reviewer',roleCode:'admin',permissionCodes:['registrations_management']};mocks.fetch.mockResolvedValue(packet);mocks.review.mockResolvedValue({...packet,outcome:'VERIFIED_SEPARATE'});});
it('loads only the selected registration on demand and requires evidence/explicit confirmation',async()=>{
 render(<OrganizationIdentityReviewPanel organizationId="pending"/>);expect(mocks.fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Check Organization Identity'}));await screen.findByText('Existing Organization');expect(mocks.fetch).toHaveBeenCalledWith('pending');
 const save=screen.getByRole('button',{name:'Record Identity Decision'});expect(save).toBeDisabled();
 fireEvent.click(screen.getByRole('radio'));fireEvent.change(screen.getByLabelText('Identity Decision'),{target:{value:'confirmed_different'}});
 fireEvent.change(screen.getByLabelText('Reason / Remarks'),{target:{value:'Different official registration confirmed'}});
 fireEvent.change(screen.getByLabelText('Official Evidence Reference'),{target:{value:'Official registry ref 123'}});
 expect(save).toBeDisabled();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(save);
 await waitFor(()=>expect(mocks.review).toHaveBeenCalledWith('pending','original','confirmed_different','Different official registration confirmed','Official registry ref 123',3));
 expect(await screen.findByText(/Identity check cleared/)).toBeInTheDocument();
});
it('does not display a response from a prior organization or permission scope',async()=>{
 let resolve:(value:unknown)=>void=()=>{};mocks.fetch.mockReturnValue(new Promise(r=>{resolve=r;}));
 const {rerender}=render(<OrganizationIdentityReviewPanel organizationId="pending"/>);fireEvent.click(screen.getByRole('button',{name:'Check Organization Identity'}));
 rerender(<OrganizationIdentityReviewPanel organizationId="other"/>);await act(async()=>{resolve(packet);});expect(screen.queryByText('Existing Organization')).not.toBeInTheDocument();
 mocks.fetch.mockResolvedValue(packet);fireEvent.click(screen.getByRole('button',{name:'Check Organization Identity'}));await screen.findByText('Existing Organization');
 mocks.user={id:'viewer',roleCode:'viewer',permissionCodes:[]};rerender(<OrganizationIdentityReviewPanel organizationId="other"/>);expect(screen.queryByText('Existing Organization')).not.toBeInTheDocument();
});
it('same-organization confirmation shows continuity guidance without a transfer/merge action',async()=>{
 mocks.fetch.mockResolvedValue({...packet,outcome:'CONFIRMED_EXISTING',canonicalOrganizationId:'original',relatedRegistrations:[{id:'pending',name:'Related application',urn:null,status:'pending_review'}]});
 render(<OrganizationIdentityReviewPanel organizationId="pending"/>);fireEvent.click(screen.getByRole('button',{name:'Check Organization Identity'}));
 expect(await screen.findByText(/Original records and obligations remain/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Record Identity Decision'})).not.toBeInTheDocument();
 expect(screen.getByText('Registration ID: pending')).toBeInTheDocument();
});
it('displays overflow warning and server review errors',async()=>{
 mocks.fetch.mockResolvedValue({...packet,candidateLimitReached:true});render(<OrganizationIdentityReviewPanel organizationId="pending"/>);
 fireEvent.click(screen.getByRole('button',{name:'Check Organization Identity'}));expect(await screen.findByRole('alert')).toHaveTextContent('candidate list reached its limit');
 mocks.fetch.mockRejectedValue(new Error('An authorized registration reviewer is required.'));fireEvent.click(screen.getByRole('button',{name:'Reload Identity Review'}));
 expect(await screen.findByText('An authorized registration reviewer is required.')).toBeInTheDocument();
});
