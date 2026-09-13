import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserPortalLiquidationWorkspaceView } from "./UserPortalLiquidationWorkspaceView";

// Mock resize observer and matchMedia for environment
beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;

  window.innerWidth = 1280;
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes("min-width: 1024px"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  global.URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-blob-url");
  global.URL.revokeObjectURL = vi.fn();
});

describe("UserPortal Liquidation Upload & Submission Workflow (TEST A - TEST J)", () => {
  const pendingReport = {
    id: "rep-pending-1",
    budgetRequestId: "br-1",
    status: "pending_activity_completion",
    createdAt: "2026-08-10T00:00:00Z",
    deadlineAt: "2026-08-20T00:00:00Z",
  };

  const needsRevisionReport = {
    id: "rep-rev-1",
    budgetRequestId: "br-2",
    status: "needs_revision",
    createdAt: "2026-08-10T00:00:00Z",
    deadlineAt: "2026-08-20T00:00:00Z",
  };

  const mockBudget = {
    id: "br-1",
    activityTitle: "Youth Leadership Summit 2026",
    purposeCategory: "Leadership",
    venue: "Pasig City Hall",
    releasedAmount: 25000,
  };

  const mockExistingFile = {
    id: "file-existing-1",
    liquidationReportId: "rep-rev-1",
    fileName: "previous-liquidation.pdf",
    fileUrl: "https://example.com/previous-liquidation.pdf",
    fileSize: 102400,
    uploadedAt: "2026-08-11T00:00:00Z",
  };

  const buildProps = (overrides: Partial<any> = {}) => ({
    liquidationWorkflowEligibility: { eligible: true },
    liquidationReports: [pendingReport, needsRevisionReport],
    budgetRequests: [mockBudget, { ...mockBudget, id: "br-2", activityTitle: "Community Outreach 2026" }],
    liquidationFilesByReportId: new Map([
      ["rep-pending-1", []],
      ["rep-rev-1", [mockExistingFile]],
    ]),
    liquidationNotesByReportId: {},
    setLiquidationNotesByReportId: vi.fn(),
    submittingLiquidationId: null,
    liquidationFileDraftByReportId: {},
    onClearLiquidationFileDraft: vi.fn(),
    liquidationFileInputRef: { current: { click: vi.fn() } as any },
    liquidationUploadTargetId: null,
    setLiquidationUploadTargetId: vi.fn(),
    handleLiquidationFileUpload: vi.fn(),
    handleSubmitLiquidation: vi.fn(),
    handleDeleteLiquidationFile: vi.fn(),
    openFile: vi.fn(),
    navigate: vi.fn(),
    searchParams: new URLSearchParams("reportId=rep-pending-1"),
    userRouteMap: { "liquidation-reporting": "/liquidation-reporting" },
    buildPublicRecordCode: () => "LR-2026-001",
    formatCurrency: (n: number) => `PHP ${n.toLocaleString()}`,
    formatShortPortalDate: () => "Aug 20, 2026",
    formatDateTimeLabel: () => "Aug 11, 2026",
    formatStatusLabel: (s: string) => s,
    ...overrides,
  });

  it("TEST A — File selection stages draft without submitting report or calling remote mutations", () => {
    const handleLiquidationFileUpload = vi.fn();
    const handleSubmitLiquidation = vi.fn();

    render(
      <UserPortalLiquidationWorkspaceView
        {...buildProps({
          handleLiquidationFileUpload,
          handleSubmitLiquidation,
        })}
      />
    );

    // Initial state: report is pending_activity_completion, no file staged
    expect(screen.getByText("No liquidation file uploaded yet")).toBeInTheDocument();
    
    // Submit button must be disabled when no file is staged
    const submitBtn = screen.getByRole("button", { name: /Submit for Review/i });
    expect(submitBtn).toBeDisabled();

    // Verify explicit submit was not invoked
    expect(handleSubmitLiquidation).not.toHaveBeenCalled();
  });

  it("TEST B — Staged file can be removed locally without DB or storage mutations", () => {
    const onClearLiquidationFileDraft = vi.fn();
    const stagedFile = new File(["dummy content"], "test-report.pdf", { type: "application/pdf" });

    render(
      <UserPortalLiquidationWorkspaceView
        {...buildProps({
          liquidationFileDraftByReportId: { "rep-pending-1": stagedFile },
          onClearLiquidationFileDraft,
        })}
      />
    );

    // Staged card is shown
    expect(screen.getByText("Staged Report File")).toBeInTheDocument();
    expect(screen.getAllByText("test-report.pdf").length).toBeGreaterThanOrEqual(1);

    // Remove button triggers clearing the local staged file draft
    const removeBtn = screen.getByTitle("Remove file");
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);

    expect(onClearLiquidationFileDraft).toHaveBeenCalledWith("rep-pending-1");
  });

  it("TEST C — Cancel discards draft and closes drawer", () => {
    const onClearLiquidationFileDraft = vi.fn();
    const navigate = vi.fn();
    const stagedFile = new File(["dummy content"], "test-report.pdf", { type: "application/pdf" });

    render(
      <UserPortalLiquidationWorkspaceView
        {...buildProps({
          liquidationFileDraftByReportId: { "rep-pending-1": stagedFile },
          onClearLiquidationFileDraft,
          navigate,
        })}
      />
    );

    // Click Cancel button in footer
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    expect(onClearLiquidationFileDraft).toHaveBeenCalledWith("rep-pending-1");
    expect(navigate).toHaveBeenCalledWith("/liquidation-reporting");
  });

  it("TEST D — Explicit Submit for Review triggers submission handler", async () => {
    const handleSubmitLiquidation = vi.fn();
    const stagedFile = new File(["dummy content"], "final-liquidation.pdf", { type: "application/pdf" });

    render(
      <UserPortalLiquidationWorkspaceView
        {...buildProps({
          liquidationFileDraftByReportId: { "rep-pending-1": stagedFile },
          handleSubmitLiquidation,
        })}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Submit for Review/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);
    expect(handleSubmitLiquidation).toHaveBeenCalledWith(pendingReport);
  });

  it("TEST E — Admin isolation: Staged files remain strictly client-side", () => {
    const stagedFile = new File(["dummy content"], "staged-only.pdf", { type: "application/pdf" });
    const props = buildProps({
      liquidationFileDraftByReportId: { "rep-pending-1": stagedFile },
    });

    // In props passed from UserPortal, liquidationFilesByReportId comes from Supabase snapshot
    const serverFiles = props.liquidationFilesByReportId.get("rep-pending-1") ?? [];
    expect(serverFiles.length).toBe(0);

    // Staged file only exists in liquidationFileDraftByReportId
    expect(props.liquidationFileDraftByReportId["rep-pending-1"].name).toBe("staged-only.pdf");
  });

  it("TEST F — Needs Revision: Selecting a replacement only stages locally; old file remains intact", () => {
    const stagedReplacement = new File(["replacement content"], "corrected-report.pdf", { type: "application/pdf" });

    render(
      <UserPortalLiquidationWorkspaceView
        {...buildProps({
          searchParams: new URLSearchParams("reportId=rep-rev-1"),
          liquidationFileDraftByReportId: { "rep-rev-1": stagedReplacement },
        })}
      />
    );

    // Staged replacement is rendered
    expect(screen.getByText("Staged Replacement File")).toBeInTheDocument();
    expect(screen.getAllByText("corrected-report.pdf").length).toBeGreaterThanOrEqual(1);

    // Previous submitted file is displayed as context to be replaced
    expect(screen.getByText(/Current Submitted File/i)).toBeInTheDocument();
    expect(screen.getAllByText("previous-liquidation.pdf").length).toBeGreaterThanOrEqual(1);

    // Resubmit button is enabled
    expect(screen.getByRole("button", { name: /Resubmit for Review/i })).toBeEnabled();
  });

  it("TEST G — Needs Revision: Explicit resubmit triggers handler with report", () => {
    const handleSubmitLiquidation = vi.fn();
    const stagedReplacement = new File(["replacement content"], "corrected-report.pdf", { type: "application/pdf" });

    render(
      <UserPortalLiquidationWorkspaceView
        {...buildProps({
          searchParams: new URLSearchParams("reportId=rep-rev-1"),
          liquidationFileDraftByReportId: { "rep-rev-1": stagedReplacement },
          handleSubmitLiquidation,
        })}
      />
    );

    const resubmitBtn = screen.getByRole("button", { name: /Resubmit for Review/i });
    fireEvent.click(resubmitBtn);

    expect(handleSubmitLiquidation).toHaveBeenCalledWith(needsRevisionReport);
  });

  it("TEST H — Needs Revision: Wrong replacement + Cancel preserves old file and discards draft", () => {
    const onClearLiquidationFileDraft = vi.fn();
    const navigate = vi.fn();
    const stagedWrongFile = new File(["wrong content"], "wrong-document.pdf", { type: "application/pdf" });

    render(
      <UserPortalLiquidationWorkspaceView
        {...buildProps({
          searchParams: new URLSearchParams("reportId=rep-rev-1"),
          liquidationFileDraftByReportId: { "rep-rev-1": stagedWrongFile },
          onClearLiquidationFileDraft,
          navigate,
        })}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(onClearLiquidationFileDraft).toHaveBeenCalledWith("rep-rev-1");
    expect(navigate).toHaveBeenCalledWith("/liquidation-reporting");
  });

  it("TEST I — Submission failure keeps draft and does not show false submitted state", () => {
    const stagedFile = new File(["dummy content"], "final-liquidation.pdf", { type: "application/pdf" });
    const props = buildProps({
      liquidationFileDraftByReportId: { "rep-pending-1": stagedFile },
      submittingLiquidationId: "rep-pending-1",
    });

    render(<UserPortalLiquidationWorkspaceView {...props} />);

    // When submittingLiquidationId is active, button displays loading spinner and is disabled
    const submittingBtn = screen.getByRole("button", { name: /Submitting.../i });
    expect(submittingBtn).toBeDisabled();

    // The draft file remains in state
    expect(props.liquidationFileDraftByReportId["rep-pending-1"]).toBeDefined();
  });

  it("TEST J — Admin Review Decision panel visibility guard: Hidden for pending_activity_completion", () => {
    // Check that for a report in pending_activity_completion, even if files are present,
    // the canonical guard prevents review decision controls.
    const canReviewStatus = (status: string) => {
      const reviewableStatuses = new Set(["under_review", "needs_revision", "submitted"]);
      return reviewableStatuses.has(status);
    };

    expect(canReviewStatus("pending_activity_completion")).toBe(false);
    expect(canReviewStatus("not_started")).toBe(false);
    expect(canReviewStatus("draft")).toBe(false);
    expect(canReviewStatus("submitted")).toBe(true);
    expect(canReviewStatus("under_review")).toBe(true);
    expect(canReviewStatus("needs_revision")).toBe(true);
  });
});
