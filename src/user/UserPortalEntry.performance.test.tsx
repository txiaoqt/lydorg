import React, {useState} from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const mocks = vi.hoisted(()=>({installed:false}));
vi.mock("@/user/pwa/hooks/useInstalledUserPwa",()=>({useInstalledUserPwa:()=>mocks.installed}));
vi.mock("@/components/PublicPageLoader",()=>({default:()=> <div>Loading portal</div>}));
vi.mock("@/user/UserPortal",()=>({default:({section}:any)=>{const [draft,setDraft]=useState("");return <><h1>{section}</h1><input aria-label="draft" value={draft} onChange={e=>setDraft(e.target.value)}/></>;}}));
import UserPortalEntry from "./UserPortalEntry";
afterEach(()=>{cleanup();mocks.installed=false;});
it("loads the browser portal lazily and retains local input across section changes",async()=>{
  const view=render(<MemoryRouter><UserPortalEntry section="dashboard"/></MemoryRouter>);
  await act(async()=>{});
  expect(screen.getByRole("heading",{name:"dashboard"})).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("draft"),{target:{value:"Unsaved"}});
  view.rerender(<MemoryRouter><UserPortalEntry section="budget-request"/></MemoryRouter>);
  expect(screen.getByLabelText("draft")).toHaveValue("Unsaved");
});
it("preserves browser override elements",()=>{
  render(<MemoryRouter><UserPortalEntry section="templates" browserElement={<p>Override</p>}/></MemoryRouter>);
  expect(screen.getByText("Override")).toBeInTheDocument();
});
it("keeps installed PWA equivalent-route navigation",()=>{
  mocks.installed=true;
  render(<MemoryRouter initialEntries={["/dashboard"]}><Routes><Route path="/dashboard" element={<UserPortalEntry section="dashboard"/>}/><Route path="/app" element={<p>PWA dashboard</p>}/></Routes></MemoryRouter>);
  expect(screen.getByText("PWA dashboard")).toBeInTheDocument();
});
