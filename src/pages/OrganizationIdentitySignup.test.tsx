import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const mocks=vi.hoisted(()=>({identity:vi.fn(),fetch:vi.fn(),upsert:vi.fn(),signup:vi.fn()}));
vi.mock('@/hooks/use-organization-identity-check',()=>({useOrganizationIdentityCheck:mocks.identity}));
vi.mock('@/hooks/use-auth',()=>({useAuth:()=>({user:{id:'google-user',email:'owner@gmail.com',givenName:'Youth',familyName:'Leader'},isInitialized:true,isAuthenticated:true,role:'guest',signOut:vi.fn(),signUp:mocks.signup})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/lib/lydo-connect-store',()=>({useLydoConnect:()=>({upsertOrganizationProfile:vi.fn()})}));
vi.mock('@/lib/lydo-connect-supabase',()=>({fetchOrganizationProfileInSupabase:mocks.fetch,upsertOrganizationProfileInSupabase:mocks.upsert}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:vi.fn().mockResolvedValue({data:false,error:null}),auth:{signInWithOAuth:vi.fn()},
 from:()=>({select:()=>({eq:()=>({order:()=>({order:()=>({limit:()=>({maybeSingle:()=>Promise.resolve({data:null})})})})})})})},isSupabaseConfigured:()=>true}));
import GoogleOnboarding,{saveGoogleOnboardingDraft} from './GoogleOnboarding';
import SignUp from './SignUp';
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();sessionStorage.clear();mocks.fetch.mockResolvedValue(null);mocks.identity.mockReturnValue('POSSIBLE_MATCH');window.scrollTo=vi.fn();
 vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}});
});
it('Google onboarding shows a generic candidate warning and rechecks headquarters changes',async()=>{
 saveGoogleOnboardingDraft('google-user',{organizationName:'Similar Youth Org.',barangay:'Palatiw',addressBarangay:'Palatiw',addressStreet:'Test Street',addressZipCode:'1600'});
 render(<MemoryRouter><GoogleOnboarding/></MemoryRouter>);
 const input=await screen.findByLabelText(/Organization Name/i);fireEvent.change(input,{target:{value:'Changed Organization Name'}});
 await waitFor(()=>expect(mocks.identity).toHaveBeenCalledWith('Changed Organization Name','Palatiw',''));
 expect(screen.getByText(/Similar names can belong to different organizations/)).toBeInTheDocument();expect(mocks.upsert).not.toHaveBeenCalled();
});
it('Google onboarding prevents submitting an exact URN claim through profile upsert',async()=>{
 mocks.identity.mockReturnValue('EXACT_URN_CONFLICT');
 saveGoogleOnboardingDraft('google-user',{organizationName:'Claim Organization',barangay:'Palatiw',addressBarangay:'Palatiw',addressStreet:'Test Street',addressZipCode:'1600',isExistingOrganization:true,organizationIdentifierNumber:'17-26-010'});
 render(<MemoryRouter><GoogleOnboarding/></MemoryRouter>);
 const name=await screen.findByLabelText(/Organization Name/i);fireEvent.submit(name.closest('form')!);
 expect(await screen.findByText('This URN cannot be claimed through a new registration. Contact PCYDO for account recovery.')).toBeInTheDocument();
 expect(mocks.upsert).not.toHaveBeenCalled();
});
it.each(['NO_MATCH','POSSIBLE_MATCH','CHECK_UNAVAILABLE','VERIFIED_SEPARATE'])('email signup shows advisory %s without private candidate data',async outcome=>{
 mocks.identity.mockReturnValue(outcome);render(<MemoryRouter><SignUp/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText(/Organization Name/i),{target:{value:'Similar Youth Org.'}});
 expect(screen.getByRole('status')).toBeInTheDocument();expect(screen.queryByText('private-id')).not.toBeInTheDocument();expect(mocks.signup).not.toHaveBeenCalled();
});
it('email signup prevents continuing an exact URN conflict',()=>{
 mocks.identity.mockReturnValue('EXACT_URN_CONFLICT');render(<MemoryRouter><SignUp/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText(/Organization Name/i),{target:{value:'URN Claim Organization'}});
 expect(screen.getByRole('button',{name:/Continue to Account Details/i})).toBeDisabled();
 expect(screen.getByText(/Contact PCYDO for existing-organization verification/)).toBeInTheDocument();
});
