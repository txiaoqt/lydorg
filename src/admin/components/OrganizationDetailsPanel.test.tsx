import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { OrganizationDetailsPanel } from "./OrganizationDetailsPanel";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";

const org = {
  id: "org-1", organizationName: "Test Council", referenceId: "REG-2026-0139", urn: "01-26-106",
  majorClassification: "Youth Organization", subClassification: "Community-based", district: "District I", barangay: "Bagong Ilog",
  address: "Blk 9 Lot 9, Bagong Ilog", createdAt: "2026-10-30T00:00:00Z", isExistingOrganization: false,
  organizationEmail: "primary@example.org", additionalEmails: ["alt@example.org"],
  contactNumber: "09934032804", additionalContactNumbers: ["09170000000", "09180000000"],
  facebookPageUrl: "", repFirstName: "Alyssa", repLastName: "Dela Cruz",
} as unknown as OrganizationProfile;

describe("OrganizationDetailsPanel", () => {
  it("lists every email and contact number with primary and alternate labels", () => {
    render(<OrganizationDetailsPanel organization={org} date={org.createdAt} />);
    expect(screen.getByText("REG-2026-0139")).toBeInTheDocument();
    expect(screen.getByText("URN 01-26-106")).toBeInTheDocument();
    expect(screen.getByText("Email Addresses · 2")).toBeInTheDocument();
    expect(screen.getByText("Contact Numbers · 3")).toBeInTheDocument();

    const primaryEmail = screen.getByText("primary@example.org").closest("li")!;
    expect(within(primaryEmail).getByText("Primary")).toBeInTheDocument();
    expect(within(primaryEmail).getByText("Verified portal account")).toBeInTheDocument();
    expect(within(screen.getByText("alt@example.org").closest("li")!).getByText("Alternate")).toBeInTheDocument();
    expect(within(screen.getByText("09180000000").closest("li")!).getByText("Alternate")).toBeInTheDocument();
    expect(screen.getByText("Not provided")).toBeInTheDocument();
  });

  it("collapses to the header when requested", () => {
    render(<OrganizationDetailsPanel organization={org} defaultCollapsed />);
    expect(screen.queryByText("Contact Details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Expand Details/ }));
    expect(screen.getByText("Contact Details")).toBeInTheDocument();
  });
});
