import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";

const mocks=vi.hoisted(()=>({upload:vi.fn(),remove:vi.fn(),rpc:vi.fn(),upsert:vi.fn(),session:{user:{id:"owner"}},existing:[] as Record<string,unknown>[],uploadError:null as unknown,queryError:null as unknown}));
const ids={org:"11111111-1111-4111-8111-111111111111",renewal:"22222222-2222-4222-8222-222222222222",submission:"33333333-3333-4333-8333-333333333333",type:"44444444-4444-4444-8444-444444444444",file:"55555555-5555-4555-8555-555555555555"};
vi.mock("./supabase",()=>({supabaseUrl:"https://fixture.invalid",supabaseAuthStorageKey:"fixture-auth",supabase:{
 auth:{getSession:async()=>({data:{session:mocks.session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})},
 storage:{from:()=>({upload:mocks.upload,remove:mocks.remove})},rpc:mocks.rpc,
 from:(table:string)=>{let payload:Record<string,unknown>|null=null;const q:any={select:()=>q,eq:()=>q,in:()=>q,upsert:(p:Record<string,unknown>)=>{payload=p;mocks.upsert(p);return q;},single:async()=>({data:payload?{id:"55555555-5555-4555-8555-555555555555",...payload}:null,error:null}),then:(resolve:(v:unknown)=>void)=>Promise.resolve({data:table==="document_submission_files"?mocks.existing:table==="document_type_identities"?[{id:ids.type,name:"Synthetic Requirement"}]:[],error:null}).then(resolve)};return q;},
}}));
import {uploadRenewalDocumentFileInSupabase,replaceRenewalDocumentFileInSupabase} from "./lydo-connect-supabase";
function pdf(){return {name:"Synthetic renewal.pdf",type:"application/pdf",size:16,slice:()=>({arrayBuffer:async()=>new TextEncoder().encode("%PDF-").buffer})} as unknown as File;}
const draft=()=>({organizationId:ids.org,renewalId:ids.renewal,submissionId:ids.submission,documentTypeId:ids.type,file:pdf()});
const revision=()=>({organizationId:ids.org,renewalId:ids.renewal,fileId:ids.file,documentTypeId:ids.type,file:pdf()});
beforeEach(()=>{vi.clearAllMocks();mocks.existing=[];mocks.uploadError=null;mocks.queryError=null;mocks.upload.mockImplementation(async()=>({error:mocks.uploadError}));mocks.remove.mockResolvedValue({data:[],error:null});mocks.rpc.mockResolvedValue({data:[{id:ids.file,submission_id:ids.submission,document_type_id:ids.type,file_name:"Synthetic renewal.pdf",file_url:"storage://organization-documents/corrected.pdf",file_type:"application/pdf",file_size:16,admin_status:"under_admin_review",revision_history:[]}],error:null});});
afterEach(()=>{vi.restoreAllMocks();});
describe("Organization Storage cutover compatibility (mocked client)",()=>{
 it("creates distinct renewal objects with INSERT-only storage semantics at the same timestamp",async()=>{
  vi.spyOn(Date,"now").mockReturnValue(1791799200000);
  await uploadRenewalDocumentFileInSupabase(draft());await uploadRenewalDocumentFileInSupabase(draft());
  const calls=mocks.upload.mock.calls;expect(calls).toHaveLength(2);expect(calls[0][0]).not.toBe(calls[1][0]);
  for(const [path,file,options] of calls){expect(path).toMatch(new RegExp(`^${ids.org}/renewal/${ids.renewal}/${ids.type}/`));expect(path).not.toContain("?");expect(options).toEqual({upsert:false,contentType:"application/pdf"});expect(file.name).toBe("Synthetic renewal.pdf");}
  expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
 });
 it("uploads a corrected object and delegates linkage to the supported owner revision RPC",async()=>{
  await replaceRenewalDocumentFileInSupabase(revision());expect(mocks.upload).toHaveBeenCalledOnce();
  const [path,,options]=mocks.upload.mock.calls[0];expect(path).toContain(`${ids.org}/renewal/${ids.renewal}/${ids.type}/revisions/`);expect(options.upsert).toBe(false);
  expect(mocks.rpc).toHaveBeenCalledWith("user_replace_document_submission_file",expect.objectContaining({_file_id:ids.file,_new_file_url:`storage://organization-documents/${path}`,_new_file_name:"Synthetic renewal.pdf"}));
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
 });
 it.each(["approved_green","approved","under_admin_review","submitted","under_review"])("does not upload a locked %s draft document",async status=>{
  mocks.existing=[{id:ids.file,admin_status:status,file_url:"storage://organization-documents/preserved.pdf"}];
  await expect(uploadRenewalDocumentFileInSupabase(draft())).rejects.toThrow();expect(mocks.upload).not.toHaveBeenCalled();expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
 });
 it("stops after denied Storage insertion without a public fallback or metadata linkage",async()=>{
  mocks.uploadError={message:"Storage access denied"};await expect(replaceRenewalDocumentFileInSupabase(revision())).rejects.toThrow("Storage access denied");expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
 });
 it("keeps an authoritative denied revision denied after the new object upload",async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:"Document is locked"}});await expect(replaceRenewalDocumentFileInSupabase(revision())).rejects.toThrow("Document is locked");expect(mocks.rpc).toHaveBeenCalledOnce();expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();
 });
});
