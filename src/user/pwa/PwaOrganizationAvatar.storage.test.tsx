import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("@/lib/lydo-connect-supabase",()=>({ resolveSupabaseFileUrl:mocks.resolve }));
import { PwaOrganizationAvatar } from "./PwaOrganizationAvatar";
beforeEach(()=>vi.clearAllMocks());
it("reauthorizes the same avatar after an account transition",async()=>{
  mocks.resolve.mockResolvedValueOnce("A-url").mockResolvedValueOnce("");
  render(<PwaOrganizationAvatar className="avatar" organizationName="Org" profileImageUrl="storage://organization-documents/org/profile/avatar.png"/>);
  await screen.findByRole("img");
  act(()=>window.dispatchEvent(new Event("lydo-storage-authorization-change")));
  await waitFor(()=>expect(mocks.resolve).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.queryByRole("img")).toBeNull());
});
it("does not retain a stale in-flight avatar after account switching",async()=>{
  let release!:(url:string)=>void;
  mocks.resolve.mockImplementationOnce(()=>new Promise<string>(resolve=>{release=resolve;})).mockResolvedValueOnce("B-url");
  render(<PwaOrganizationAvatar className="avatar" organizationName="Org" profileImageUrl="storage://organization-documents/org/profile/avatar.png"/>);
  await waitFor(()=>expect(mocks.resolve).toHaveBeenCalledTimes(1));
  act(()=>window.dispatchEvent(new Event("lydo-storage-authorization-change")));
  expect(await screen.findByRole("img")).toHaveAttribute("src","B-url");
  await act(async()=>release("stale-A-url"));
  expect(screen.getByRole("img")).toHaveAttribute("src","B-url");
});
