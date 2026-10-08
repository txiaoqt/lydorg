import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as baseRender, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { YorpRegistryDetailDrawer } from "./YorpRegistryDetailDrawer";
import type { YorpRegistryEntry } from "./YorpRegistryTable";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const render = (ui: React.ReactElement) => baseRender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "admin-1", roleCode: "super_admin", permissionCodes: [] } }) }));
vi.mock("@/lib/supabase", () => ({ supabase: null }));
const mockNavigate = vi.fn();

// Mock dependencies
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/lydo-connect-store", () => ({
  useLydoConnect: () => ({
    state: {
      documentSubmissions: [],
      documentSubmissionFiles: [],
      templateDocuments: [],
      templates: [],
      ypopActivities: [],
      ypopSubmissions: [],
      ypopSubmissionFiles: [],
      ypopScoringSettings: [],
      ypopPeriods: [
        {
          id: "period-1",
          semesterKey: "2026-s1",
          semesterLabel: "1st Semester 2026",
          status: "open",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      ypopEntries: [
        {
          id: "entry-1",
          organizationId: "org-123",
          semester: "2026-s1",
          status: "under_review",
        },
      ],
      ypopCityActivities: [
        {
          id: "act-1",
          name: "Youth Leadership Summit",
          category: "mandatory",
          points: 20,
          semesterKey: "2026-s1",
        },
      ],
      ypopEventParticipations: [
        {
          id: "part-1",
          organizationId: "org-123",
          activityId: "act-1",
          activityName: "Youth Leadership Summit",
          status: "verified",
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      ypopOrgActivities: [
        {
          id: "org-act-1",
          ypopEntryId: "entry-1",
          activityName: "Tree Planting Activity",
          activityDate: "2026-02-15",
          status: "approved",
          createdAt: "2026-02-15T00:00:00.000Z",
        },
      ],
    },
  }),
}));

vi.mock("@/lib/lydo-connect-supabase", () => ({
  resolveSupabaseFileUrl: vi.fn(),
}));

describe("YorpRegistryDetailDrawer", () => {
  const mockEntry: YorpRegistryEntry = {
    org: {
      id: "org-123",
      userId: "user-123",
      organizationName: "Pasig Youth Council",
      organizationEmail: "daniella@pasig.gov.ph",
      contactNumber: "09123456789",
      district: "District 1",
      barangay: "Kapitolyo",
      address: "123 Youth Blvd, Pasig City",
      majorClassification: "Community-Based",
      subClassification: "Youth Organization",
      advocacies: ["Education", "Environment"],
      representativeName: "Daniella Simara",
      adviserName: "Adviser Test",
      facebookPageUrl: "https://facebook.com/pasigyouthcouncil",
      pcyNumber: "PCY-2026-001",
      referenceId: "REG-2026-001",
      profileStatus: "verified",
      isExistingOrganization: false,
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-01-15T00:00:00.000Z",
      verifiedAt: "2026-01-15T00:00:00.000Z",
      urn: "URN-2026-001",
      urnReviewStatus: "verified",
    },
    registrationDate: new Date("2026-01-15T00:00:00.000Z"),
    expiryDate: new Date("2029-01-15T00:00:00.000Z"),
    yorpStatus: "active",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders only person name in Head of Organization and Adviser cards", () => {
    render(
      <YorpRegistryDetailDrawer
        entry={mockEntry}
        onOpenChange={vi.fn()}
      />,
    );

    // Head of Organization card
    const headCardHeader = screen.getByText("Head of Organization");
    expect(headCardHeader).toBeDefined();
    const headName = screen.getByText("Daniella Simara");
    expect(headName).toBeDefined();

    // Adviser card
    const adviserCardHeader = screen.getByText("Adviser");
    expect(adviserCardHeader).toBeDefined();
    const adviserName = screen.getByText("Adviser Test");
    expect(adviserName).toBeDefined();

    // Find the RepresentativeCard containers (parent elements)
    const headContainer = headCardHeader.closest(".bg-admin-surface");
    const adviserContainer = adviserCardHeader.closest(".bg-admin-surface");

    expect(headContainer).not.toBeNull();
    expect(adviserContainer).not.toBeNull();

    // Neither Head nor Adviser card should contain email or phone numbers
    expect(headContainer?.textContent).toContain("Daniella Simara");
    expect(headContainer?.textContent).not.toContain("daniella@pasig.gov.ph");
    expect(headContainer?.textContent).not.toContain("09123456789");

    expect(adviserContainer?.textContent).toContain("Adviser Test");
    expect(adviserContainer?.textContent).not.toContain("daniella@pasig.gov.ph");
    expect(adviserContainer?.textContent).not.toContain("09123456789");

    // Contact & Socials section must still preserve Primary Email and Mobile Number
    const contactSectionHeader = screen.getByText("Contact & Socials");
    expect(contactSectionHeader).toBeDefined();
    expect(screen.getByText("Primary Email")).toBeDefined();
    expect(screen.getByText("daniella@pasig.gov.ph")).toBeDefined();
    expect(screen.getByText("Mobile Number")).toBeDefined();
    expect(screen.getByText("09123456789")).toBeDefined();
    expect(screen.getByText("Facebook Page")).toBeDefined();
  });

  it("navigates to YPOP Validation with city_led tab when View All is clicked on City-Led Activities", () => {
    const onOpenChange = vi.fn();
    render(
      <YorpRegistryDetailDrawer
        entry={mockEntry}
        onOpenChange={onOpenChange}
      />,
    );

    // Switch to YPOP tab
    const ypopTabBtn = screen.getByRole("button", { name: "YPOP" });
    fireEvent.click(ypopTabBtn);

    // Locate the View All buttons
    const viewAllButtons = screen.getAllByRole("button", { name: "View All" });
    expect(viewAllButtons).toHaveLength(2);

    // Click first View All (City-Led Activities Joined)
    fireEvent.click(viewAllButtons[0]);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith("/admin/ypop-validation?orgId=org-123&tab=city_led");
  });

  it("navigates to YPOP Validation with org_led tab when View All is clicked on Organization-Initiated Activities", () => {
    const onOpenChange = vi.fn();
    render(
      <YorpRegistryDetailDrawer
        entry={mockEntry}
        onOpenChange={onOpenChange}
      />,
    );

    // Switch to YPOP tab
    const ypopTabBtn = screen.getByRole("button", { name: "YPOP" });
    fireEvent.click(ypopTabBtn);

    // Locate the View All buttons
    const viewAllButtons = screen.getAllByRole("button", { name: "View All" });
    expect(viewAllButtons).toHaveLength(2);

    // Click second View All (Organization-Initiated Activities)
    fireEvent.click(viewAllButtons[1]);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith("/admin/ypop-validation?orgId=org-123&tab=org_led");
  });
});
