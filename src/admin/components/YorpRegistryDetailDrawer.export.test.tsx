import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { seedState } from "@/lib/lydo-connect-data";
import { reportEntry, reportPeriod, reportYpopEntry, reportDetail, reportFiles } from "@/lib/yorp-organization-report.fixtures";
import { YorpRegistryDetailDrawer } from "./YorpRegistryDetailDrawer";
const mocks = vi.hoisted(() => ({ documents: vi.fn(), ypop: vi.fn(), resolve: vi.fn(), pdf: vi.fn(), save: vi.fn(), toast: vi.fn(), state: {} as typeof seedState }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "admin", roleCode: "super_admin", permissionCodes: ["yorp.read"] } }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/lib/lydo-connect-store", () => ({ useLydoConnect: () => ({ state: mocks.state }) }));
vi.mock("@/lib/lydo-connect-supabase", () => ({ fetchAdminYorpRegistrationDocuments: mocks.documents, fetchAdminYorpRegistryYpopDetail: mocks.ypop, resolveSupabaseFileUrl: mocks.resolve }));
vi.mock("@/lib/yorp-organization-report", async () => ({ ...await vi.importActual<object>("@/lib/yorp-organization-report"), generateOrganizationReportPdf: mocks.pdf }));
const mount = (client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  const view = render(<QueryClientProvider client={client}><YorpRegistryDetailDrawer entry={reportEntry} onOpenChange={vi.fn()} /></QueryClientProvider>);
  return { ...view, client };
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = { ...seedState, ypopPeriods: [reportPeriod], ypopEntries: [reportYpopEntry],
    ypopCityActivities: [], ypopEventParticipations: [], ypopOrgActivities: [] };
  mocks.documents.mockResolvedValue(reportFiles); mocks.ypop.mockResolvedValue(reportDetail);
  mocks.pdf.mockResolvedValue({ save: mocks.save });
});
afterEach(cleanup);
describe("drawer organization report export", () => {
  it("loads just the selected organization on click even without opening either tab; never signs/downloads files", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    mount();
    expect(mocks.documents).not.toHaveBeenCalled(); expect(mocks.ypop).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Export Report" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.documents).toHaveBeenCalledExactlyOnceWith("org-report", expect.any(AbortSignal));
    expect(mocks.ypop).toHaveBeenCalledExactlyOnceWith("org-report", "2026-s1");
    const data = mocks.pdf.mock.calls[0][0];
    expect(data.organizationName).toBe("Pasig Youth Council");
    expect(JSON.stringify(data)).toContain("Community Garden"); expect(JSON.stringify(data)).toContain("Constitution.pdf");
    expect(mocks.save).toHaveBeenCalledWith("yorp-organization-report-pasig-youth-council-01-26-103.pdf");
    expect(mocks.resolve).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
    network.mockRestore();
  });
  it("reuses scoped caches and blocks duplicate clicks", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["admin", "yorp-registration-documents", "admin", "super_admin", "yorp.read", "org-report"], reportFiles);
    client.setQueryData(["admin", "yorp-registry-ypop-detail", "admin", "org-report", "2026-s1", "super_admin", "yorp.read"], reportDetail);
    mount(client);
    const button = screen.getByRole("button", { name: "Export Report" });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.documents).not.toHaveBeenCalled(); expect(mocks.ypop).not.toHaveBeenCalled();
  });
  it("exports empty documents and no open YPOP period", async () => {
    mocks.state.ypopPeriods = []; mocks.documents.mockResolvedValue([]);
    mount(); fireEvent.click(screen.getByRole("button", { name: "Export Report" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.ypop).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.pdf.mock.calls[0][0])).toContain("No YPOP participation data is available");
  });
  it("reports failed metadata loading instead of exporting an empty section", async () => {
    mocks.documents.mockRejectedValue(new Error("Unauthorized metadata request"));
    mount(); fireEvent.click(screen.getByRole("button", { name: "Export Report" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Unauthorized metadata request", variant: "destructive" })));
    expect(mocks.pdf).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not save a report after the drawer switches organizations", async () => {
    let finish!: (files: typeof reportFiles) => void;
    mocks.documents.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { rerender, client } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Export Report" }));
    await waitFor(() => expect(mocks.documents).toHaveBeenCalled());
    rerender(<QueryClientProvider client={client}><YorpRegistryDetailDrawer entry={{ ...reportEntry, org: { ...reportEntry.org, id: "other" } }} onOpenChange={vi.fn()} /></QueryClientProvider>);
    finish(reportFiles);
    await waitFor(() => expect(screen.getByRole("button", { name: "Export Report" })).not.toBeDisabled());
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
