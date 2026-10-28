import { expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock("./supabase",()=>({supabase:mocks}));
import {fetchPublicSystemSettings} from "./admin-system-settings";
it("shares only overlapping public settings requests, then reads fresh settings",async()=>{
  let finish!: (value:any)=>void;
  mocks.rpc.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const first=fetchPublicSystemSettings();
  const second=fetchPublicSystemSettings();
  expect(second).toBe(first);
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  finish({data:[{setting_key:"general.office_name",value_json:"Updated office"}],error:null});
  expect((await second)["general.office_name"]).toBe("Updated office");
  mocks.rpc.mockResolvedValue({data:[],error:null});
  await fetchPublicSystemSettings();
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it("does not retain a failed request",async()=>{
  mocks.rpc.mockRejectedValueOnce(new Error("Temporary network failure"));
  await expect(fetchPublicSystemSettings()).resolves.toEqual({});
  mocks.rpc.mockResolvedValueOnce({data:[],error:null});
  await expect(fetchPublicSystemSettings()).resolves.toEqual({});
});
