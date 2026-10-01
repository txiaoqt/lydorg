import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserPortalRedesignView } from "@/components/portal/UserPortalRedesignView";
import { computeLiquidationWorkflowMetrics } from "@/lib/workflow-metrics";
import type { BudgetRequest, LiquidationReport } from "@/types";

/**
 * Pure helper mirroring UserPortal dashboard task computation for budget and liquidation lifecycle
 */
export function getDashboardTasksForFinancials({
  budgetRequests,
  liquidationReports,
  orgId,
  isVerified = true,
  isBudgetEligible = true,
  mockNavigate = vi.fn(),
}: {
  budgetRequests: BudgetRequest[];
  liquidationReports: LiquidationReport[];
  orgId: string;
  isVerified?: boolean;
  isBudgetEligible?: boolean;
  mockNavigate?: (route: string) => void;
}) {
  const dashboardTasks: Array<{
    key: string;
    title: string;
    description: string;
    ctaLabel: string;
    onClick: () => void;
    icon?: any;
    tone?: string;
  }> = [];

  const releasedBudgets = budgetRequests.filter(
    (b) => b.status === "budget_released" || b.status === "completed",
  );
  const revisionBudgets = budgetRequests.filter((b) => b.status === "needs_revision");
  const awaitingReleaseBudgets = budgetRequests.filter((b) => b.status === "awaiting_release");
  const approvedFtfBudgets = budgetRequests.filter((b) => b.status === "approved_for_ftf_green");
  const hardCopyBudgets = budgetRequests.filter((b) => b.status === "hard_copy_submitted");
  const pendingBudgets = budgetRequests.filter((b) => b.status === "submitted" || b.status === "draft");

  const releasedBudgetsWithLiquidation = releasedBudgets.map((b) => {
    const report =
      liquidationReports.find((r) => r.budgetRequestId === b.id && r.organizationId === orgId) ??
      liquidationReports.find((r) => r.budgetRequestId === b.id) ??
      null;
    return { budget: b, report };
  });

  const liquidationNeedingRevision = releasedBudgetsWithLiquidation.find(
    ({ report }) =>
      report &&
      (report.status === "needs_revision" ||
        report.status === "overdue" ||
        report.status === "rejected_red"),
  );

  const unsubmittedLiquidation = releasedBudgetsWithLiquidation.find(
    ({ report }) =>
      !report ||
      report.status === "not_started" ||
      report.status === "draft" ||
      report.status === "pending_activity_completion",
  );

  const underReviewLiquidation = releasedBudgetsWithLiquidation.find(
    ({ report }) =>
      report &&
      (report.status === "submitted" ||
        report.status === "under_review" ||
        report.status === "hard_copy_submitted" ||
        report.status === "approved_for_ftf_green"),
  );

  if (liquidationNeedingRevision?.report) {
    dashboardTasks.push({
      key: `liquidation-revision-${liquidationNeedingRevision.report.id}`,
      title: "Revise your liquidation report",
      description:
        liquidationNeedingRevision.report.remarks?.trim() ||
        "The admin requested corrections to your liquidation report. Review remarks and resubmit.",
      ctaLabel: "Open Liquidation",
      onClick: () => mockNavigate("/liquidation-reporting"),
      tone: "bg-orange-500/10 text-orange-600",
    });
  } else if (revisionBudgets.length > 0) {
    const b = revisionBudgets[0];
    dashboardTasks.push({
      key: `budget-revision-${b.id}`,
      title: "Revise your budget request",
      description:
        b.adminRemarks?.trim() ||
        "The admin requested changes to your latest budget request. Review the remarks and resubmit when ready.",
      ctaLabel: "Open Budget",
      onClick: () => mockNavigate("/budget-request"),
      tone: "bg-orange-500/10 text-orange-600",
    });
  } else if (unsubmittedLiquidation) {
    dashboardTasks.push({
      key: `liquidation-submit-${unsubmittedLiquidation.budget.id}`,
      title: "Submit your liquidation file",
      description:
        "Your budget has already been released, so you can now upload the required liquidation file.",
      ctaLabel: "Open Liquidation",
      onClick: () => mockNavigate("/liquidation-reporting"),
      tone: "bg-primary-soft text-primary",
    });
  } else if (awaitingReleaseBudgets.length > 0) {
    dashboardTasks.push({
      key: "budget-release-wait",
      title: "Awaiting Fund Release",
      description:
        "Your budget request has been approved. The PCYDO admin will notify you once funds are released.",
      ctaLabel: "Open Budget",
      onClick: () => mockNavigate("/budget-request"),
      tone: "bg-primary/10 text-primary",
    });
  } else if (approvedFtfBudgets.length > 0) {
    dashboardTasks.push({
      key: "budget-hardcopy",
      title: "Prepare your hard copy submission",
      description:
        "Your budget request is approved for face-to-face processing. Prepare the required hard copy next.",
      ctaLabel: "Open Budget",
      onClick: () => mockNavigate("/budget-request"),
      tone: "bg-primary/10 text-primary",
    });
  } else if (hardCopyBudgets.length > 0) {
    dashboardTasks.push({
      key: "budget-release-wait",
      title: "Wait for cash release",
      description:
        "Your hard copy has already been submitted. The next update will be the release of your approved budget.",
      ctaLabel: "Open Budget",
      onClick: () => mockNavigate("/budget-request"),
      tone: "bg-primary/10 text-primary",
    });
  } else if (pendingBudgets.length > 0) {
    dashboardTasks.push({
      key: "budget-review",
      title: "Track your budget request",
      description:
        "Your latest budget request is in progress. You can review its current status and attached file anytime.",
      ctaLabel: "Open Budget",
      onClick: () => mockNavigate("/budget-request"),
      tone: "bg-primary/10 text-primary",
    });
  } else if (underReviewLiquidation?.report) {
    dashboardTasks.push({
      key: `liquidation-review-${underReviewLiquidation.report.id}`,
      title: "Wait for liquidation review",
      description:
        "Your liquidation report is under review by the PCYDO administrator. Check back for approval or remarks.",
      ctaLabel: "View Liquidation",
      onClick: () => mockNavigate("/liquidation-reporting"),
      tone: "bg-sky-500/10 text-sky-600",
    });
  } else if (isVerified) {
    if (isBudgetEligible) {
      dashboardTasks.push({
        key: "budget-start",
        title: "Create your next budget request",
        description:
          "Your organization is verified and currently eligible to submit a budget request.",
        ctaLabel: "Open Budget",
        onClick: () => mockNavigate("/budget-request"),
        tone: "bg-primary/10 text-primary",
      });
    }
  }

  return dashboardTasks;
}

describe("Dashboard Liquidation Action Prompt & Lifecycle Consistency", () => {
  const orgId = "org-123";
  const mockNavigate = vi.fn();

  const baseProps = {
    profile: { organizationName: "Youth Advocates for Community Action" },
    currentProfile: { organizationName: "Youth Advocates for Community Action" },
    isVerified: true,
    isProfileSaved: true,
    hasSubmittedDocuments: true,
    stepsCompleted: 3,
    profilePercent: 100,
    dashboardDocumentPercent: 100,
    dashboardDocumentHelper: "All Approved",
    renewalCountdown: null,
    recentActivities: [],
    inquiries: [],
    publicTemplates: [],
    openPreview: vi.fn(),
    inquiryForm: { submitterName: "", organizationName: "", email: "", subject: "", description: "" },
    setInquiryForm: vi.fn(),
    submittingInquiry: false,
    handleSendInquiry: vi.fn(),
    onViewAllInquiries: vi.fn(),
    onViewAllActivities: vi.fn(),
    navigate: mockNavigate,
    userRouteMap: {
      "organization-profile": "/organization-profile",
      "document-submission": "/document-submission",
      "budget-request": "/financial-grant",
      "liquidation-reporting": "/liquidation-reporting",
      "templates": "/templates",
      "news-releases": "/news-releases",
      "ypop-scoring": "/ypop",
    },
  };

  it("Scenario 1: No released budgets -> no liquidation prompt", () => {
    const tasks = getDashboardTasksForFinancials({
      budgetRequests: [],
      liquidationReports: [],
      orgId,
    });

    expect(tasks.some((t) => t.title.includes("liquidation"))).toBe(false);
    expect(tasks[0]?.title).toBe("Create your next budget request");
  });

  it("Scenario 2: CASE A — 1 Budget Released, No Liquidation Report -> Prompts 'Submit your liquidation file'", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-1",
        organizationId: orgId,
        projectTitle: "Youth Leadership Summit",
        status: "budget_released",
        amountRequested: 50000,
        amountApproved: 50000,
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
    ];

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports: [],
      orgId,
      mockNavigate,
    });

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].title).toBe("Submit your liquidation file");
    expect(tasks[0].description).toBe(
      "Your budget has already been released, so you can now upload the required liquidation file.",
    );
    expect(tasks[0].ctaLabel).toBe("Open Liquidation");

    // Render in UI view
    render(
      <UserPortalRedesignView
        {...baseProps}
        budgetPercent={100}
        budgetOverviewLabel="All Released"
        liquidationPercent={0}
        liquidationOverviewLabel="No Reports"
        dashboardTasks={tasks}
      />,
    );

    expect(screen.getByText("Submit your liquidation file")).toBeInTheDocument();
    const ctaBtn = screen.getByRole("button", { name: /Open Liquidation →/i });
    expect(ctaBtn).toBeInTheDocument();
    fireEvent.click(ctaBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/liquidation-reporting");
  });

  it("Scenario 3: CASE B — 1 Budget Released, Liquidation Under Review -> Prompts 'Wait for liquidation review' (no duplicate submission)", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-1",
        organizationId: orgId,
        projectTitle: "Youth Leadership Summit",
        status: "budget_released",
        amountRequested: 50000,
        amountApproved: 50000,
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
    ];

    const liquidationReports: LiquidationReport[] = [
      {
        id: "liq-1",
        budgetRequestId: "budget-1",
        organizationId: orgId,
        status: "submitted",
        createdAt: "2026-08-05T00:00:00Z",
      } as LiquidationReport,
    ];

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports,
      orgId,
    });

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].title).toBe("Wait for liquidation review");
    expect(tasks.some((t) => t.title === "Submit your liquidation file")).toBe(false);
  });

  it("Scenario 4: CASE C — 1 Budget Released, Liquidation Needs Revision -> Prompts 'Revise your liquidation report'", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-1",
        organizationId: orgId,
        projectTitle: "Youth Leadership Summit",
        status: "budget_released",
        amountRequested: 50000,
        amountApproved: 50000,
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
    ];

    const liquidationReports: LiquidationReport[] = [
      {
        id: "liq-1",
        budgetRequestId: "budget-1",
        organizationId: orgId,
        status: "needs_revision",
        remarks: "Please attach receipt #402 and the attendance sheet.",
        createdAt: "2026-08-05T00:00:00Z",
      } as LiquidationReport,
    ];

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports,
      orgId,
    });

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].title).toBe("Revise your liquidation report");
    expect(tasks[0].description).toBe("Please attach receipt #402 and the attendance sheet.");
    expect(tasks[0].ctaLabel).toBe("Open Liquidation");
  });

  it("Scenario 5: CASE D — 1 Budget Released, Liquidation Liquidated -> No submission banner, shows next step", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-1",
        organizationId: orgId,
        projectTitle: "Youth Leadership Summit",
        status: "budget_released",
        amountRequested: 50000,
        amountApproved: 50000,
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
    ];

    const liquidationReports: LiquidationReport[] = [
      {
        id: "liq-1",
        budgetRequestId: "budget-1",
        organizationId: orgId,
        status: "completed_liquidated",
        createdAt: "2026-08-05T00:00:00Z",
      } as LiquidationReport,
    ];

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports,
      orgId,
    });

    // Must NOT prompt to submit liquidation file
    expect(tasks.some((t) => t.title === "Submit your liquidation file")).toBe(false);
    expect(tasks[0]?.title).toBe("Create your next budget request");
  });

  it("Scenario 6: Primary Bug Scenario — 2 Released Budgets, BOTH Liquidated -> 100% Liquidated, NO 'Submit your liquidation file' prompt", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-1",
        organizationId: orgId,
        projectTitle: "Youth Leadership Summit",
        status: "budget_released",
        amountRequested: 50000,
        amountApproved: 50000,
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
      {
        id: "budget-2",
        organizationId: orgId,
        projectTitle: "Community Outreach 2026",
        status: "budget_released",
        amountRequested: 35000,
        amountApproved: 35000,
        createdAt: "2026-08-15T00:00:00Z",
      } as BudgetRequest,
    ];

    const liquidationReports: LiquidationReport[] = [
      {
        id: "liq-1",
        budgetRequestId: "budget-1",
        organizationId: orgId,
        status: "completed_liquidated",
        createdAt: "2026-08-05T00:00:00Z",
      } as LiquidationReport,
      {
        id: "liq-2",
        budgetRequestId: "budget-2",
        organizationId: orgId,
        status: "completed_liquidated",
        createdAt: "2026-08-20T00:00:00Z",
      } as LiquidationReport,
    ];

    // Check metric calculations
    const liquidationMetrics = computeLiquidationWorkflowMetrics(liquidationReports);
    expect(liquidationMetrics.completionPercent).toBe(100);
    expect(liquidationMetrics.overviewLabel).toBe("Fully Liquidated");

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports,
      orgId,
    });

    // Check dashboard task consistency
    expect(tasks.some((t) => t.title === "Submit your liquidation file")).toBe(false);
    expect(tasks.some((t) => t.title.includes("Revise your liquidation"))).toBe(false);

    // Render in UI view to ensure visual consistency
    render(
      <UserPortalRedesignView
        {...baseProps}
        budgetPercent={100}
        budgetOverviewLabel="All Released"
        liquidationPercent={liquidationMetrics.completionPercent}
        liquidationOverviewLabel={liquidationMetrics.overviewLabel}
        dashboardTasks={tasks}
      />,
    );

    expect(screen.getAllByText("Fully Liquidated").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Submit your liquidation file")).not.toBeInTheDocument();
    expect(screen.getByText("Create your next budget request")).toBeInTheDocument();
  });

  it("Scenario 7: CASE E — 2 Released Budgets, 1 Liquidated + 1 Missing Liquidation -> Accurately prompts 'Submit your liquidation file' for the missing one", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-1",
        organizationId: orgId,
        projectTitle: "Youth Leadership Summit",
        status: "budget_released",
        amountRequested: 50000,
        amountApproved: 50000,
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
      {
        id: "budget-2",
        organizationId: orgId,
        projectTitle: "Community Outreach 2026",
        status: "budget_released",
        amountRequested: 35000,
        amountApproved: 35000,
        createdAt: "2026-08-15T00:00:00Z",
      } as BudgetRequest,
    ];

    // Only budget-1 has a liquidation report
    const liquidationReports: LiquidationReport[] = [
      {
        id: "liq-1",
        budgetRequestId: "budget-1",
        organizationId: orgId,
        status: "completed_liquidated",
        createdAt: "2026-08-05T00:00:00Z",
      } as LiquidationReport,
    ];

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports,
      orgId,
    });

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].title).toBe("Submit your liquidation file");
    expect(tasks[0].key).toBe("liquidation-submit-budget-2");
  });

  it("Scenario 8: CASE E2 — 2 Released Budgets, 1 Liquidated + 1 Needs Revision -> Accurately prompts 'Revise your liquidation report'", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-1",
        organizationId: orgId,
        projectTitle: "Youth Leadership Summit",
        status: "budget_released",
        amountRequested: 50000,
        amountApproved: 50000,
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
      {
        id: "budget-2",
        organizationId: orgId,
        projectTitle: "Community Outreach 2026",
        status: "budget_released",
        amountRequested: 35000,
        amountApproved: 35000,
        createdAt: "2026-08-15T00:00:00Z",
      } as BudgetRequest,
    ];

    const liquidationReports: LiquidationReport[] = [
      {
        id: "liq-1",
        budgetRequestId: "budget-1",
        organizationId: orgId,
        status: "completed_liquidated",
        createdAt: "2026-08-05T00:00:00Z",
      } as LiquidationReport,
      {
        id: "liq-2",
        budgetRequestId: "budget-2",
        organizationId: orgId,
        status: "needs_revision",
        remarks: "Please resubmit with signed liquidation voucher.",
        createdAt: "2026-08-20T00:00:00Z",
      } as LiquidationReport,
    ];

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports,
      orgId,
    });

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].title).toBe("Revise your liquidation report");
    expect(tasks[0].description).toBe("Please resubmit with signed liquidation voucher.");
  });

  it("Scenario 9: Multiple liquidation records correctly matched via canonical budgetRequestId regardless of array order", () => {
    const budgetRequests: BudgetRequest[] = [
      {
        id: "budget-b",
        organizationId: orgId,
        projectTitle: "Project B",
        status: "budget_released",
        createdAt: "2026-08-10T00:00:00Z",
      } as BudgetRequest,
      {
        id: "budget-a",
        organizationId: orgId,
        projectTitle: "Project A",
        status: "budget_released",
        createdAt: "2026-08-01T00:00:00Z",
      } as BudgetRequest,
    ];

    // Liquidation reports array in reverse order or different IDs
    const liquidationReports: LiquidationReport[] = [
      {
        id: "liq-a",
        budgetRequestId: "budget-a",
        organizationId: orgId,
        status: "completed_liquidated",
        createdAt: "2026-08-02T00:00:00Z",
      } as LiquidationReport,
      {
        id: "liq-b",
        budgetRequestId: "budget-b",
        organizationId: orgId,
        status: "completed_liquidated",
        createdAt: "2026-08-11T00:00:00Z",
      } as LiquidationReport,
    ];

    const tasks = getDashboardTasksForFinancials({
      budgetRequests,
      liquidationReports,
      orgId,
    });

    expect(tasks.some((t) => t.title === "Submit your liquidation file")).toBe(false);
    expect(tasks[0]?.title).toBe("Create your next budget request");
  });
});
