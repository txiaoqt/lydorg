import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YpopSemesterWorkspace, type YpopSemesterWorkspaceProps } from "./YpopSemesterWorkspace";
import { resolveBudgetEligibility } from "@/lib/budget-eligibility";
import { resolveBudgetWorkflowEligibility } from "@/lib/user-workflow-eligibility";
import { UserPortalBudgetWorkspaceView } from "../UserPortalBudgetWorkspaceView";
import type { YPOPPeriod, YPOPEntry, OrganizationProfile } from "@/lib/lydo-connect-data";

describe("YPOP Semester Workspace - Budget Request Entry Point Matrix", () => {
  const basePeriod: YPOPPeriod = {
    id: "period-1",
    semesterKey: "2026-S1",
    semesterLabel: "2026 First Semester",
    status: "open",
    validationDeadline: "2026-06-30T23:59:59Z",
    orgLedTiers: [{ minProjects: 1, bonus: 10 }],
    createdAt: "2026-01-01T00:00:00Z",
  };

  const closedPeriod: YPOPPeriod = {
    ...basePeriod,
    id: "period-closed",
    semesterKey: "2025-S2",
    semesterLabel: "2025 Second Semester",
    status: "closed",
    validationDeadline: "2025-12-31T23:59:59Z",
  };

  const createEntry = (status: YPOPEntry["status"], periodKey = "2026-S1"): YPOPEntry => ({
    id: `entry-${status}-${periodKey}`,
    organizationId: "org-1",
    semester: periodKey,
    pointsEarned: status === "qualified" ? 85 : 40,
    cityLedPoints: status === "qualified" ? 75 : 40,
    orgBonusPoints: status === "qualified" ? 10 : 0,
    status,
    remarks: "Admin evaluation remarks",
    updatedAt: "2026-06-01T00:00:00Z",
  });

  const baseProfile: OrganizationProfile = {
    id: "org-1",
    userId: "user-1",
    organizationName: "Test Youth Council",
    organizationType: "Barangay Youth Council",
    purok: "Purok 1",
    barangay: "San Nicolas",
    district: "District 1",
    mission: "Empowering youth",
    vision: "Vibrant youth leaders",
    advocacies: ["youth_empowerment"],
    presidentName: "John Doe",
    contactNumber: "09171234567",
    email: "test@example.com",
    organizationEmail: "test@example.com",
    status: "active",
    registrationType: "fresh",
    verifiedAt: "2026-01-01T00:00:00Z",
    registrationPaymentStatus: "paid",
  };

  const createProps = (
    overrides?: Partial<YpopSemesterWorkspaceProps>
  ): YpopSemesterWorkspaceProps => ({
    period: basePeriod,
    allPeriods: [basePeriod, closedPeriod],
    entry: createEntry("qualified"),
    allEntries: [createEntry("qualified")],
    cityActivities: [],
    participations: [],
    eventFiles: [],
    orgActivities: [],
    orgActivityFiles: [],
    profile: baseProfile,
    organizationId: "org-1",
    userId: "user-1",
    canEditParticipation: true,
    userRouteMap: {
      "budget-request": "/budget-request",
      ypop: "/ypop",
    },
    navigate: vi.fn(),
    formatShortPortalDate: (d: string) => d,
    onBack: vi.fn(),
    onEntryUpdated: vi.fn(),
    onParticipationCreated: vi.fn(),
    onParticipationUpdated: vi.fn(),
    onEventFileCreated: vi.fn(),
    onEventFileDeleted: vi.fn(),
    onOrgActivitySaved: vi.fn(),
    onOrgActivityDeleted: vi.fn(),
    onOrgFileCreated: vi.fn(),
    onOrgFileDeleted: vi.fn(),
    ...overrides,
  });

  it("1. Qualified + Open -> New Budget Request visible, active, and not disabled", () => {
    const props = createProps({
      period: basePeriod,
      entry: createEntry("qualified", basePeriod.semesterKey),
    });

    render(<YpopSemesterWorkspace {...props} />);

    const button = screen.getByRole("button", { name: /\+? ?New Budget Request/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(screen.queryByText("Active Submission Window")).not.toBeInTheDocument();
  });

  it("2. Qualified + Closed -> New Budget Request visible and active if eligibility remains valid", () => {
    const props = createProps({
      period: closedPeriod,
      entry: createEntry("qualified", closedPeriod.semesterKey),
    });

    render(<YpopSemesterWorkspace {...props} />);

    const button = screen.getByRole("button", { name: /\+? ?New Budget Request/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(screen.queryByText("Validation Period Closed")).not.toBeInTheDocument();
  });

  it("3. Not Qualified + Open -> button hidden (entry point absent, not disabled)", () => {
    const props = createProps({
      period: basePeriod,
      entry: createEntry("not_qualified", basePeriod.semesterKey),
    });

    render(<YpopSemesterWorkspace {...props} />);

    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
  });

  it("4. Not Qualified + Closed -> button hidden (entry point absent, not disabled)", () => {
    const props = createProps({
      period: closedPeriod,
      entry: createEntry("not_qualified", closedPeriod.semesterKey),
    });

    render(<YpopSemesterWorkspace {...props} />);

    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
  });

  it("5. Draft -> button hidden", () => {
    const props = createProps({
      period: basePeriod,
      entry: createEntry("draft", basePeriod.semesterKey),
    });

    render(<YpopSemesterWorkspace {...props} />);

    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
  });

  it("6. Submitted / Under Review -> button hidden", () => {
    const propsSubmitted = createProps({
      period: basePeriod,
      entry: createEntry("submitted", basePeriod.semesterKey),
    });

    const { unmount } = render(<YpopSemesterWorkspace {...propsSubmitted} />);
    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
    unmount();

    const propsUnderReview = createProps({
      period: basePeriod,
      entry: createEntry("under_review", basePeriod.semesterKey),
    });
    render(<YpopSemesterWorkspace {...propsUnderReview} />);
    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
  });

  it("7. Needs Revision -> button hidden", () => {
    const props = createProps({
      period: basePeriod,
      entry: createEntry("needs_revision", basePeriod.semesterKey),
    });

    render(<YpopSemesterWorkspace {...props} />);

    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
  });

  it("8. Rejected (not_qualified) -> button hidden", () => {
    const props = createProps({
      period: basePeriod,
      entry: createEntry("not_qualified", basePeriod.semesterKey),
    });

    render(<YpopSemesterWorkspace {...props} />);

    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
  });

  it("9. Clicking New Budget Request navigates to the existing Budget Request workspace", () => {
    const navigateMock = vi.fn();
    const entry = createEntry("qualified", basePeriod.semesterKey);
    const props = createProps({
      period: basePeriod,
      entry,
      navigate: navigateMock,
      userRouteMap: { "budget-request": "/budget-request" },
    });

    render(<YpopSemesterWorkspace {...props} />);

    const button = screen.getByRole("button", { name: /\+? ?New Budget Request/i });
    fireEvent.click(button);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(`/budget-request?ypopEntryId=${encodeURIComponent(entry.id)}`);
  });

  it("10. Budget Request eligibility guard remains intact", () => {
    const qualifiedEntry = createEntry("qualified");
    const nonQualifiedEntry = createEntry("not_qualified");

    // Qualified organization is eligible
    const eligibleResult = resolveBudgetEligibility({
      organizationId: "org-1",
      periods: [basePeriod],
      entries: [qualifiedEntry],
    });
    expect(eligibleResult.eligible).toBe(true);
    expect(eligibleResult.reason).toBe("qualified");

    // Non-qualified organization is NOT eligible
    const nonEligibleResult = resolveBudgetEligibility({
      organizationId: "org-1",
      periods: [basePeriod],
      entries: [nonQualifiedEntry],
    });
    expect(nonEligibleResult.eligible).toBe(false);
    expect(nonEligibleResult.reason).toBe("ypop_not_qualified");

    // Workflow eligibility also enforces YPOP qualification
    const workflowCheck = resolveBudgetWorkflowEligibility({
      profile: baseProfile,
      requiredTemplates: [],
      documentFiles: [],
      ypopEligibility: nonEligibleResult,
    });
    expect(workflowCheck.eligible).toBe(false);
  });

  it("11. User cannot bypass qualification through missing or null entry", () => {
    const props = createProps({
      period: basePeriod,
      entry: null,
    });

    render(<YpopSemesterWorkspace {...props} />);

    expect(screen.queryByRole("button", { name: /Budget Request/i })).not.toBeInTheDocument();
  });

  it("12. Budget Request workspace New Budget Request button activates form and calls startEditingBudgetRequest(null)", () => {
    const startEditingBudgetRequestMock = vi.fn();
    const setShowBudgetFormMock = vi.fn();

    const budgetProps: any = {
      budgetWorkflowEligibility: { eligible: true },
      budgetRequests: [],
      budgetFilesByRequestId: new Map(),
      budgetNotesByRequestId: {},
      submittingBudgetId: null,
      showBudgetForm: false,
      setShowBudgetForm: setShowBudgetFormMock,
      editingBudgetRequest: null,
      startEditingBudgetRequest: startEditingBudgetRequestMock,
      handleDeleteBudgetRequest: vi.fn(),
      openFile: vi.fn(),
      navigate: vi.fn(),
      searchParams: new URLSearchParams(),
      userRouteMap: { "budget-request": "/budget-request" },
      buildPublicRecordCode: () => "BR-001",
      formatCurrency: (n: number) => `PHP ${n}`,
      formatShortPortalDate: (d: string) => d,
      formatDateTimeLabel: (d: string) => d,
      formatStatusLabel: (s: string) => s,
      newActivityTitle: "",
      setNewActivityTitle: vi.fn(),
      newActivityDescription: "",
      setNewActivityDescription: vi.fn(),
      newPurposeCategory: "",
      setNewPurposeCategory: vi.fn(),
      newActivityDate: "",
      setNewActivityDate: vi.fn(),
      newVenue: "",
      setNewVenue: vi.fn(),
      newRequestedAmount: "",
      setNewRequestedAmount: vi.fn(),
      newRemarks: "",
      setNewRemarks: vi.fn(),
      handleCreateOrUpdateBudgetRequest: vi.fn(),
    };

    render(<UserPortalBudgetWorkspaceView {...budgetProps} />);

    const button = screen.getByRole("button", { name: /New Budget Request/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(startEditingBudgetRequestMock).toHaveBeenCalledWith(null);
    expect(setShowBudgetFormMock).toHaveBeenCalledWith(true);
  });

  it("13. Budget Request workspace New Budget Request button and view are locked by FeatureGate when ineligible", () => {
    const startEditingBudgetRequestMock = vi.fn();
    const setShowBudgetFormMock = vi.fn();

    const budgetProps: any = {
      budgetWorkflowEligibility: { eligible: false, requirements: [] },
      budgetRequests: [],
      budgetFilesByRequestId: new Map(),
      budgetNotesByRequestId: {},
      submittingBudgetId: null,
      showBudgetForm: false,
      setShowBudgetForm: setShowBudgetFormMock,
      editingBudgetRequest: null,
      startEditingBudgetRequest: startEditingBudgetRequestMock,
      handleDeleteBudgetRequest: vi.fn(),
      openFile: vi.fn(),
      navigate: vi.fn(),
      searchParams: new URLSearchParams(),
      userRouteMap: { "budget-request": "/budget-request" },
      buildPublicRecordCode: () => "BR-001",
      formatCurrency: (n: number) => `PHP ${n}`,
      formatShortPortalDate: (d: string) => d,
      formatDateTimeLabel: (d: string) => d,
      formatStatusLabel: (s: string) => s,
      newActivityTitle: "",
      setNewActivityTitle: vi.fn(),
      newActivityDescription: "",
      setNewActivityDescription: vi.fn(),
      newPurposeCategory: "",
      setNewPurposeCategory: vi.fn(),
      newActivityDate: "",
      setNewActivityDate: vi.fn(),
      newVenue: "",
      setNewVenue: vi.fn(),
      newRequestedAmount: "",
      setNewRequestedAmount: vi.fn(),
      newRemarks: "",
      setNewRemarks: vi.fn(),
      handleCreateOrUpdateBudgetRequest: vi.fn(),
    };

    render(<UserPortalBudgetWorkspaceView {...budgetProps} />);

    expect(screen.queryByRole("button", { name: /New Budget Request/i })).not.toBeInTheDocument();
    expect(screen.getByText("Complete eligibility requirements first")).toBeInTheDocument();
    expect(startEditingBudgetRequestMock).not.toHaveBeenCalled();
    expect(setShowBudgetFormMock).not.toHaveBeenCalled();
  });
});
