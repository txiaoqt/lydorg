import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import { YorpRegistryPage } from "./YorpRegistry";

const store = vi.hoisted(() => ({ organizations: [] as OrganizationProfile[] }));
vi.mock("@/lib/lydo-connect-store", () => ({
  useLydoConnect: () => ({
    state: { organizationProfiles: store.organizations, ypopPeriods: [], ypopEntries: [] },
    removeOrganizationAccountFromCache: vi.fn(),
  }),
}));
vi.mock("@/admin/components/YorpRegistryDetailDrawer", () => ({ YorpRegistryDetailDrawer: () => null }));

const organization = (dates: Partial<OrganizationProfile> = {}): OrganizationProfile => ({
  id: "renewal-fixture", organizationName: "Renewal Fixture", urn: "01-23-999",
  profileStatus: "verified", district: "District 1", barangay: "Kapitolyo",
  majorClassification: "Youth Organization", advocacies: [],
  createdAt: "2026-10-05T02:00:00Z", verifiedAt: "2026-10-05T02:42:53Z",
  ...dates,
} as OrganizationProfile);

describe("YORP registry accreditation dates", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-05T04:00:00Z"));
    window.history.replaceState({}, "", "/");
  });
  afterEach(() => vi.useRealTimers());

  const renderRegistry = () => render(<MemoryRouter><YorpRegistryPage /></MemoryRouter>);

  it("uses the seeded 2023 term and finds it under Expiring Soon despite 2026 verification", () => {
    store.organizations = [organization({
      accreditationStartDate: "2023-10-05",
      accreditationExpiresAt: "2026-11-04T00:00:00Z",
    })];
    renderRegistry();
    expect(screen.getByText("5 Oct 2023")).toBeInTheDocument();
    expect(screen.getByText("4 Nov 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expiring Soon" }));
    expect(screen.getByText("Renewal Fixture")).toBeInTheDocument();
  });

  it("uses a renewed term instead of deriving expiration from the old URN year", () => {
    store.organizations = [organization({
      accreditationStartDate: "2026-11-04",
      accreditationExpiresAt: "2029-11-04T00:00:00Z",
    })];
    renderRegistry();
    expect(screen.getByText("4 Nov 2029")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(screen.getByText("Renewal Fixture")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expiring Soon" }));
    expect(screen.queryByText("Renewal Fixture")).not.toBeInTheDocument();
  });

  it("keeps the legacy three-year fallback when accreditation dates are unavailable", () => {
    store.organizations = [organization()];
    renderRegistry();
    expect(screen.getByText("5 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("5 Oct 2029")).toBeInTheDocument();
  });
});
