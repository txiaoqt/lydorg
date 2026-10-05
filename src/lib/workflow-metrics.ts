import type { BudgetRequest, LiquidationReport } from "./lydo-connect-data";

export type BudgetStatusHelper = {
  totalRequests: number;
  approvedCount: number;
  releasedCount: number;
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

export const isBudgetReleasedStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === "budget_released";
};

export const isBudgetApprovedStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === "approved" ||
    s === "awaiting_release" ||
    s === "approved_for_ftf_green" ||
    s === "budget_released" ||
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
      releasedCount: 0,
      underReviewCount: 0,
      needsRevisionCount: 0,
      completionPercent: 0,
      overviewLabel: "No Requests",
      helperText: "No requests submitted",
    };
  }

  const approvedCount = budgetRequests.filter((r) => isBudgetApprovedStatus(r.status)).length;
  const releasedCount = budgetRequests.filter((r) => isBudgetReleasedStatus(r.status)).length;
  const underReviewCount = budgetRequests.filter((r) => isBudgetPendingStatus(r.status)).length;
  const needsRevisionCount = budgetRequests.filter((r) => isBudgetRevisionStatus(r.status)).length;

  const completionPercent = totalRequests > 0 ? Math.round((releasedCount / totalRequests) * 100) : 0;

  let overviewLabel = `${releasedCount}/${totalRequests} Released`;
  if (completionPercent === 100 && totalRequests > 0) {
    overviewLabel = "All Released";
  } else if (underReviewCount > 0) {
    overviewLabel = `${underReviewCount} In Review`;
  } else if (needsRevisionCount > 0) {
    overviewLabel = `${needsRevisionCount} Needs Action`;
  }

  const helperText = `${releasedCount} of ${totalRequests} released (${completionPercent}%)`;

  return {
    totalRequests,
    approvedCount,
    releasedCount,
    underReviewCount,
    needsRevisionCount,
    completionPercent,
    overviewLabel,
    helperText,
  };
};

export const computeBudgetWorkflowMetricsFromStatusCounts = (
  statusCounts: Record<string, number>,
  totalRequests: number,
): BudgetStatusHelper => {
  const countWhere = (predicate: (status: string) => boolean) =>
    Object.entries(statusCounts).reduce((sum, [status, count]) => sum + (predicate(status) ? count : 0), 0);
  const approvedCount = countWhere(isBudgetApprovedStatus);
  const releasedCount = countWhere(isBudgetReleasedStatus);
  const underReviewCount = countWhere(isBudgetPendingStatus);
  const needsRevisionCount = countWhere(isBudgetRevisionStatus);
  const completionPercent = totalRequests > 0 ? Math.round((releasedCount / totalRequests) * 100) : 0;
  let overviewLabel = totalRequests ? `${releasedCount}/${totalRequests} Released` : "No Requests";
  if (totalRequests && completionPercent === 100) overviewLabel = "All Released";
  else if (underReviewCount > 0) overviewLabel = `${underReviewCount} In Review`;
  else if (needsRevisionCount > 0) overviewLabel = `${needsRevisionCount} Needs Action`;
  return {
    totalRequests,
    approvedCount,
    releasedCount,
    underReviewCount,
    needsRevisionCount,
    completionPercent,
    overviewLabel,
    helperText: totalRequests ? `${releasedCount} of ${totalRequests} released (${completionPercent}%)` : "No requests submitted",
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

export const computeLiquidationWorkflowMetricsFromStatusCounts = (
  statusCounts: Record<string, number>,
  totalReports: number,
): LiquidationStatusHelper => {
  const count = (...statuses: string[]) => statuses.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);
  const completedCount = count("completed_liquidated", "approved");
  const underReviewCount = count("submitted", "hard_copy_submitted", "approved_for_ftf_green");
  const needsRevisionCount = count("needs_revision", "overdue", "rejected_red");
  const pendingUploadCount = count("pending_activity_completion", "not_started", "draft");
  const completionPercent = totalReports > 0 ? Math.round((completedCount / totalReports) * 100) : 0;
  let overviewLabel = totalReports ? `${completedCount}/${totalReports} Liquidated` : "No Reports";
  if (totalReports && completionPercent === 100) overviewLabel = "Fully Liquidated";
  else if (underReviewCount > 0) overviewLabel = `${underReviewCount} Under Review`;
  else if (needsRevisionCount > 0) overviewLabel = `${needsRevisionCount} Needs Action`;
  else if (pendingUploadCount > 0) overviewLabel = `${pendingUploadCount} Pending Upload`;
  return {
    totalReports,
    completedCount,
    underReviewCount,
    needsRevisionCount,
    pendingUploadCount,
    completionPercent,
    overviewLabel,
    helperText: totalReports ? `${completedCount} of ${totalReports} completed (${completionPercent}%)` : "No liquidation reports",
  };
};
