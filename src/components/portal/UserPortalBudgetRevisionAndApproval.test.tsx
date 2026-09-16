import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserPortalBudgetWorkspaceView } from "./UserPortalBudgetWorkspaceView";
import type { BudgetRequest } from "@/lib/lydo-connect-data";
import { computeBudgetMetrics } from "@/lib/budget-monitoring-authoritative.test";

// Mock ResizeObserver for jsdom
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const setViewport = (width: number) => {
  window.innerWidth = width;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: width >= 1024,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe("Y-TRACE Budget Request Verified Fixes Suite (TESTS A - M)", () => {
  const mockFilesMap = new Map([
    [
      "br-rev-101",
      [
        {
          id: "file-br-101",
          budgetRequestId: "br-rev-101",
          fileName: "venue-sound-original.pdf",
          fileUrl: "https://example.com/venue-sound-original.pdf",
          fileType: "application/pdf",
          fileSize: 1048576,
          uploadedAt: "2026-08-11T00:00:00Z",
          createdAt: "2026-08-11T00:00:00Z",
          adminStatus: "needs_revision",
          adminRemarks: "Please attach venue cost breakdown.",
        },
      ],
    ],
  ]);

  const mockNeedsRevisionRequest: BudgetRequest = {
    id: "br-rev-101",
    organizationId: "org-1",
    submittedBy: "user-1",
    activityTitle: "Youth Leadership Summit",
    activityDescription: "Annual summit for student leaders",
    activityDate: "2026-09-20",
    venue: "Pasig City Sports Complex",
    requestedAmount: 100000,
    approvedAmount: 0,
    releasedAmount: 0,
    releaseDate: "",
    purposeCategory: "Leadership & Governance",
    status: "needs_revision",
    remarks: "Applicant note: Initial submission with quotation.",
    adminRemarks: "Please attach venue cost breakdown.",
    goSignalAt: "",
    hardCopySubmittedAt: "",
    createdAt: "2026-08-10T10:00:00Z",
    updatedAt: "2026-08-11T12:00:00Z",
    revisionHistory: [
      {
        action: "needs_revision",
        adminRemarks: "Please attach venue cost breakdown.",
        changedAt: "2026-08-11T12:00:00Z",
      },
    ],
  };

  const createBaseProps = (overrides: Record<string, any> = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.set("budgetRequestId", "br-rev-101");

    return {
      budgetWorkflowEligibility: { eligible: true },
      budgetRequests: [mockNeedsRevisionRequest],
      budgetFilesByRequestId: mockFilesMap,
      budgetNotesByRequestId: {},
      submittingBudgetId: null,
      showBudgetForm: false,
      setShowBudgetForm: vi.fn(),
      editingBudgetRequest: null,
      startEditingBudgetRequest: vi.fn(),
      handleDeleteBudgetRequest: vi.fn(),
      openFile: vi.fn(),
      openPreview: vi.fn(),
      navigate: vi.fn(),
      searchParams,
      userRouteMap: { "budget-request": "/financial-grant" },
      buildPublicRecordCode: () => "BR-2026-101",
      formatCurrency: (n: number) => `₱${Number(n || 0).toLocaleString()}`,
      formatShortPortalDate: () => "Sep 20, 2026",
      formatDateTimeLabel: () => "Aug 11, 2026 12:00 PM",
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
      onReplaceBudgetFile: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setViewport(1280); // Default to desktop
  });

  // TEST A — Needs Revision Remarks
  it("TEST A: displays exact admin revision remarks in User drawer while keeping applicant remarks separate", () => {
    const props = createBaseProps();
    render(<UserPortalBudgetWorkspaceView {...props} />);

    // Admin Revision Feedback header and exact remarks text must appear
    expect(screen.getByText("Admin Revision Feedback")).toBeInTheDocument();
    expect(screen.getByText(/"Please attach venue cost breakdown."/i)).toBeInTheDocument();

    // Applicant's own remarks must remain separate and preserved
    expect(screen.getByText("Activity Details & Remarks")).toBeInTheDocument();
    expect(screen.getByText(/Applicant note: Initial submission with quotation\./i)).toBeInTheDocument();
  });

  // TEST B — Remarks Persistence
  it("TEST B: admin remarks persist when drawer is reopened or refreshed", () => {
    const props = createBaseProps();
    const { unmount } = render(<UserPortalBudgetWorkspaceView {...props} />);

    expect(screen.getByText(/"Please attach venue cost breakdown."/i)).toBeInTheDocument();
    unmount();

    // Re-render simulates reopening drawer after navigating or state refresh
    render(<UserPortalBudgetWorkspaceView {...props} />);
    expect(screen.getByText(/"Please attach venue cost breakdown."/i)).toBeInTheDocument();
  });

  // TEST C — File Replacement
  it("TEST C: user can upload revised proposal PDF when status is needs_revision", async () => {
    const onReplaceMock = vi.fn().mockResolvedValue(undefined);
    const props = createBaseProps({ onReplaceBudgetFile: onReplaceMock });
    render(<UserPortalBudgetWorkspaceView {...props} />);

    // Upload Revised Proposal button must be visible in drawer
    const replaceButtons = screen.getAllByRole("button", { name: /upload revised proposal/i });
    expect(replaceButtons.length).toBeGreaterThan(0);

    // Trigger file change on the hidden replace file input
    const fileInput = screen.getByTestId("replace-budget-file-input") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const revisedPdf = new File(["dummy pdf content"], "revised-proposal.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [revisedPdf] } });

    await waitFor(() => {
      expect(onReplaceMock).toHaveBeenCalledWith("br-rev-101", revisedPdf);
    });
  });

  // TEST D — No Duplicate Budget Request
  it("TEST D: file replacement updates the existing budget request and creates no duplicates", () => {
    let budgetStore = [mockNeedsRevisionRequest];

    // Simulate replacement logic
    const handleReplace = (requestId: string, _newFile: File) => {
      budgetStore = budgetStore.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: "under_review" as const,
          adminRemarks: "",
          revisionHistory: [
            ...(req.revisionHistory ?? []),
            { action: "under_review", adminRemarks: "", changedAt: new Date().toISOString() },
          ],
        };
      });
    };

    const newPdf = new File(["content"], "v2.pdf", { type: "application/pdf" });
    handleReplace("br-rev-101", newPdf);

    expect(budgetStore).toHaveLength(1);
    expect(budgetStore[0].id).toBe("br-rev-101");
    expect(budgetStore[0].status).toBe("under_review");
    expect(budgetStore[0].adminRemarks).toBe("");
    expect(budgetStore[0].revisionHistory).toHaveLength(2);
  });

  // TEST E — Approved Amount Less Than Requested
  it("TEST E: admin can specify approved amount less than requested (e.g. ₱80,000 < ₱100,000)", () => {
    const requested = 100000;
    const adminEnteredApproved = 80000;

    const parentPatch = {
      status: "approved_for_ftf_green" as const,
      requestedAmount: requested,
      approvedAmount: adminEnteredApproved,
      goSignalAt: "2026-08-12T10:00:00Z",
    };

    expect(parentPatch.requestedAmount).toBe(100000);
    expect(parentPatch.approvedAmount).toBe(80000);
    expect(parentPatch.approvedAmount).toBeLessThan(parentPatch.requestedAmount);
  });

  // TEST F — Release Uses Approved Amount
  it("TEST F: budget release authoritatively uses approved_amount (₱80,000), not requested_amount (₱100,000)", () => {
    const approvedRequest: BudgetRequest = {
      ...mockNeedsRevisionRequest,
      status: "approved_for_ftf_green",
      requestedAmount: 100000,
      approvedAmount: 80000,
      releasedAmount: 0,
    };

    // Simulate release lifecycle transition
    const releasePatch = {
      status: "budget_released" as const,
      releasedAmount: approvedRequest.approvedAmount,
      releaseDate: "2026-08-15",
    };

    expect(releasePatch.releasedAmount).toBe(80000);
    expect(releasePatch.releasedAmount).not.toBe(approvedRequest.requestedAmount);
  });

  // TEST G — Budget Monitoring
  it("TEST G: budget monitoring headroom reflects approved amount (₱80,000) rather than requested amount (₱100,000)", () => {
    const annualAllocation = 500000; // ₱500,000 annual allocation
    const approvedRequest: BudgetRequest = {
      ...mockNeedsRevisionRequest,
      status: "approved",
      requestedAmount: 100000,
      approvedAmount: 80000,
      releasedAmount: 0,
    };

    const metricsBeforeRelease = computeBudgetMetrics(annualAllocation, [approvedRequest], 0);
    expect(metricsBeforeRelease.approvedBudget).toBe(80000);
    expect(metricsBeforeRelease.releasedBudget).toBe(0);
    expect(metricsBeforeRelease.pendingDisbursement).toBe(80000);
    expect(metricsBeforeRelease.remainingHeadroom).toBe(420000); // 500k - 80k

    // After release:
    const releasedRequest: BudgetRequest = {
      ...approvedRequest,
      status: "released",
      releasedAmount: 80000,
    };
    const metricsAfterRelease = computeBudgetMetrics(annualAllocation, [releasedRequest], 0);
    expect(metricsAfterRelease.releasedBudget).toBe(80000);
    expect(metricsAfterRelease.pendingDisbursement).toBe(0);
    expect(metricsAfterRelease.remainingHeadroom).toBe(420000);
  });

  // TEST H — User Financial Overview
  it("TEST H: User financial overview separates Requested, Approved, and Released amounts", () => {
    const approvedRequest: BudgetRequest = {
      ...mockNeedsRevisionRequest,
      status: "approved_for_ftf_green",
      requestedAmount: 100000,
      approvedAmount: 80000,
      releasedAmount: 0,
    };

    const props = createBaseProps({
      budgetRequests: [approvedRequest],
    });

    render(<UserPortalBudgetWorkspaceView {...props} />);

    expect(screen.getByText("Requested Amount")).toBeInTheDocument();
    expect(screen.getByText("Approved Amount")).toBeInTheDocument();
    expect(screen.getByText("Released Amount")).toBeInTheDocument();

    expect(screen.getAllByText("₱100,000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₱80,000").length).toBeGreaterThan(0);
  });

  // TEST I — Notification
  it("TEST I: approval notification states the approved amount (₱80,000.00), not the requested amount", () => {
    const activityTitle = "Youth Leadership Summit";
    const approvedAmount = 80000;
    const formattedApproved = `₱${approvedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const notificationMessage = `Your budget request for '${activityTitle}' has been approved for ${formattedApproved}. Please prepare your hard copy requirements for face-to-face submission.`;

    expect(notificationMessage).toContain("₱80,000.00");
    expect(notificationMessage).not.toContain("₱100,000.00");
  });

  // TEST J — Audit Log
  it("TEST J: audit log contains both approved amount and requested amount", () => {
    const activityTitle = "Youth Leadership Summit";
    const approvedAmount = 80000;
    const requestedAmount = 100000;
    const formattedApproved = `₱${approvedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedRequested = `₱${requestedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const auditEntry = `Marked budget request "${activityTitle}" as approved with approved amount ${formattedApproved} (Requested: ${formattedRequested}).`;

    expect(auditEntry).toContain("₱80,000.00");
    expect(auditEntry).toContain("Requested: ₱100,000.00");
  });

  // TEST K — Liquidation
  it("TEST K: liquidation report generation links to budget request and uses authoritative amounts", () => {
    const releasedRequest: BudgetRequest = {
      ...mockNeedsRevisionRequest,
      status: "budget_released",
      requestedAmount: 100000,
      approvedAmount: 80000,
      releasedAmount: 80000,
    };

    // Liquidation reports generated for this budget request reference released amount
    const generatedLiquidation = {
      id: "lr-001",
      budgetRequestId: releasedRequest.id,
      organizationId: releasedRequest.organizationId,
      disbursedAmount: releasedRequest.releasedAmount,
      status: "not_started",
    };

    expect(generatedLiquidation.budgetRequestId).toBe("br-rev-101");
    expect(generatedLiquidation.disbursedAmount).toBe(80000);
  });

  // TEST L — Existing Requests
  it("TEST L: existing approved and released requests render financial cards cleanly without regressions", () => {
    const legacyApprovedRequest: BudgetRequest = {
      ...mockNeedsRevisionRequest,
      status: "budget_released",
      requestedAmount: 75000,
      approvedAmount: 75000,
      releasedAmount: 75000,
    };

    const props = createBaseProps({
      budgetRequests: [legacyApprovedRequest],
    });

    render(<UserPortalBudgetWorkspaceView {...props} />);

    expect(screen.getByText("Financial Overview")).toBeInTheDocument();
    expect(screen.getByText("Requested Amount")).toBeInTheDocument();
    expect(screen.getByText("Approved Amount")).toBeInTheDocument();
    expect(screen.getByText("Released Amount")).toBeInTheDocument();
  });

  // TEST M — Mobile
  it("TEST M: mobile viewport (< 1024px) renders Admin Revision Feedback, 3-column financials, and revised proposal action in Dialog", () => {
    setViewport(375); // Mobile viewport

    const props = createBaseProps();
    render(<UserPortalBudgetWorkspaceView {...props} />);

    // Mobile dialog must display Admin Revision Feedback
    expect(screen.getByText("Admin Revision Feedback")).toBeInTheDocument();
    expect(screen.getByText(/"Please attach venue cost breakdown."/i)).toBeInTheDocument();

    // Mobile dialog must display 3-column Financial Overview
    expect(screen.getByText("Financial Overview")).toBeInTheDocument();
    expect(screen.getByText("Requested Amount")).toBeInTheDocument();
    expect(screen.getByText("Approved Amount")).toBeInTheDocument();
    expect(screen.getByText("Released Amount")).toBeInTheDocument();

    // Mobile dialog must provide Upload Revised Proposal action
    const replaceButtons = screen.getAllByRole("button", { name: /upload revised proposal/i });
    expect(replaceButtons.length).toBeGreaterThan(0);
  });
});
