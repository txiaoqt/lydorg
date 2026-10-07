import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { YorpRegistryPage } from "./YorpRegistry";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import { exportReport } from "@/lib/report-export";

const store = vi.hoisted(() => ({ organizations: [] as OrganizationProfile[] }));
vi.mock("@/lib/lydo-connect-store", () => ({ useLydoConnect: () => ({
  state: { organizationProfiles: store.organizations, ypopPeriods: [], ypopEntries: [] }, removeOrganizationAccountFromCache: vi.fn(),
}) }));
vi.mock("@/lib/report-export", async () => ({ ...await vi.importActual<object>("@/lib/report-export"), exportReport: vi.fn() }));
vi.mock("@/admin/components/YorpRegistryDetailDrawer", () => ({ YorpRegistryDetailDrawer: () => null }));
// Keep the page's real filtering/export logic; use simple controls for each table filter.
vi.mock("@/admin/components/YorpRegistryTable", () => ({ YorpRegistryTable: (props: Record<string, (value: string) => void>) =>
  <button onClick={() => {
    props.onSearchChange("Match"); props.onStatusFilterChange("active"); props.onDistrictFilterChange("District I");
    props.onBarangayFilterChange("Bagong Ilog"); props.onClassificationFilterChange("Youth Organization");
  }}>Set registry filters</button> }));
const org = (id: string, changes: Partial<OrganizationProfile> = {}) => ({ id, organizationName: `Match ${id}`, urn: `01-26-${id}`,
  profileStatus: "verified", district: "District I", barangay: "Bagong Ilog", majorClassification: "Youth Organization", advocacies: [],
  createdAt: "2026-01-01T00:00:00Z", verifiedAt: "2026-10-01T00:00:00Z", accreditationStartDate: "2026-02-15",
  accreditationExpiresAt: "2029-02-15T00:00:00Z", ...changes } as OrganizationProfile);

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/?semester=2026-1");
  store.organizations = [org("included"), org("q2", { accreditationStartDate: "2026-04-02" }),
    org("other-semester", { accreditationStartDate: "2026-08-01" }), org("other-search", { organizationName: "Other" }),
    org("expired", { accreditationExpiresAt: "2020-01-01T00:00:00Z" }), org("district", { district: "District II" }),
    org("barangay", { barangay: "Kapitolyo" }), org("classification", { majorClassification: "Youth-Serving Organization" })];
});
afterEach(cleanup);
describe("raw YORP quarterly exports", () => {
  it("intersects quarter with semester and all registry filters using accreditation date", async () => {
    render(<MemoryRouter><YorpRegistryPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Set registry filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2026" } });
    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "q1" } });
    expect(exportReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /generate export/i }));
    await waitFor(() => expect(exportReport).toHaveBeenCalledTimes(1));
    const options = vi.mocked(exportReport).mock.calls[0][1];
    expect(options.rows).toHaveLength(1);
    expect(JSON.stringify(options.rows)).toContain("Match included");
    expect(options.config.title).toContain("Q1 2026");
    expect(options.config.filenamePrefix).toBe("yorp-registry-2026-q1");
    expect(options.filterSummaryLines).toEqual(expect.arrayContaining(["Reporting Period: Q1 2026", "District: District I", "Barangay: Bagong Ilog"]));
  });
});
