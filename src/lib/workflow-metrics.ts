import type { BudgetRequest, LiquidationReport } from "./lydo-connect-data";

export type BudgetStatusHelper = {
  totalRequests: number;
  approvedCount: number;
  underReviewCount: number;
  needsRevisionCount: number;
  completionPercent: number;
  overviewLabel: string;
  helperText: string;
};

export type LiquidationStatusHelper = {
  totalReports: number;
  completedCount: number;
  underReviewCount: number;
  needsRevisionCount: number;
  pendingUploadCount: number;
  completionPercent: number;
  overviewLabel: string;
  helperText: string;
};

export const isBudgetApprovedStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === "approved" ||
    s === "approved_for_ftf_green" ||
    s === "budget_released" ||
    s === "completed" ||
    s === "approved_released" ||
    s === "budget_approved_green"
  );
};

export const isBudgetPendingStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === "submitted" ||
    s === "pending_review" ||
    s === "under_review" ||
    s === "submitted_for_review" ||
    s === "under_admin_review" ||
    s === "processing" ||
    s === "hard_copy_submitted"
  );
};

export const isBudgetRevisionStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === "needs_revision" ||
    s === "needs_correction" ||
    s === "rejected" ||
    s === "rejected_red"
  );
};

export const computeBudgetWorkflowMetrics = (
  budgetRequests: Array<BudgetRequest | { status?: string }>
): BudgetStatusHelper => {
  const totalRequests = budgetRequests.length;
  if (totalRequests === 0) {
    return {
      totalRequests: 0,
      approvedCount: 0,
      underReviewCount: 0,
      needsRevisionCount: 0,
      completionPercent: 0,
      overviewLabel: "No Requests",
      helperText: "No requests submitted",
    };
  }

  const approvedCount = budgetRequests.filter((r) => isBudgetApprovedStatus(r.status)).length;
  const underReviewCount = budgetRequests.filter((r) => isBudgetPendingStatus(r.status)).length;
  const needsRevisionCount = budgetRequests.filter((r) => isBudgetRevisionStatus(r.status)).length;

  const completionPercent = Math.round((approvedCount / totalRequests) * 100);

  let overviewLabel = `${approvedCount}/${totalRequests} Approved`;
  if (completionPercent === 100) {
    overviewLabel = "All Approved";
  } else if (underReviewCount > 0) {
    overviewLabel = `${underReviewCount} In Review`;
  } else if (needsRevisionCount > 0) {
    overviewLabel = `${needsRevisionCount} Needs Action`;
  }

  const helperText = `${approvedCount} of ${totalRequests} approved (${completionPercent}%)`;

  return {
    totalRequests,
    approvedCount,
    underReviewCount,
    needsRevisionCount,
    completionPercent,
    overviewLabel,
    helperText,
  };
};

export const computeLiquidationWorkflowMetrics = (
  liquidationReports: Array<LiquidationReport | { status?: string }>
): LiquidationStatusHelper => {
  const totalReports = liquidationReports.length;
  if (totalReports === 0) {
    return {
      totalReports: 0,
      completedCount: 0,
      underReviewCount: 0,
      needsRevisionCount: 0,
      pendingUploadCount: 0,
      completionPercent: 0,
      overviewLabel: "No Reports",
      helperText: "No liquidation reports",
    };
  }

  const completedCount = liquidationReports.filter(
    (r) => r.status === "completed_liquidated" || r.status === "approved"
  ).length;

  const underReviewCount = liquidationReports.filter(
    (r) => r.status === "submitted" || r.status === "hard_copy_submitted" || r.status === "approved_for_ftf_green"
  ).length;

  const needsRevisionCount = liquidationReports.filter(
    (r) => r.status === "needs_revision" || r.status === "overdue" || r.status === "rejected_red"
  ).length;

  const pendingUploadCount = liquidationReports.filter(
    (r) => r.status === "pending_activity_completion" || r.status === "not_started" || r.status === "draft"
  ).length;

  const completionPercent = Math.round((completedCount / totalReports) * 100);

  let overviewLabel = `${completedCount}/${totalReports} Liquidated`;
  if (completionPercent === 100) {
    overviewLabel = "Fully Liquidated";
  } else if (underReviewCount > 0) {
    overviewLabel = `${underReviewCount} Under Review`;
  } else if (needsRevisionCount > 0) {
    overviewLabel = `${needsRevisionCount} Needs Action`;
  } else if (pendingUploadCount > 0) {
    overviewLabel = `${pendingUploadCount} Pending Upload`;
  }

  const helperText = `${completedCount} of ${totalReports} completed (${completionPercent}%)`;

  return {
    totalReports,
    completedCount,
    underReviewCount,
    needsRevisionCount,
    pendingUploadCount,
    completionPercent,
    overviewLabel,
    helperText,
  };
};
