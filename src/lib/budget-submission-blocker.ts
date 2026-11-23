import type { BudgetSubmissionBlocker as BudgetSubmissionBlockerData } from "./lydo-connect-data";

export type { BudgetSubmissionBlocker } from "./lydo-connect-data";

const formatStatus = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getBudgetSubmissionBlockerCopy = (blocker: BudgetSubmissionBlockerData) => {
  const title = blocker.activityTitle.trim() || "your current activity";

  if (blocker.kind === "draft") {
    return {
      heading: "Continue your saved draft",
      description: `You already have a saved budget request draft for “${title}”. Continue that draft instead of creating another one.`,
      actionLabel: "Continue Draft",
    };
  }

  if (blocker.kind === "pending_liquidation") {
    const status = blocker.liquidationStatus ? ` Its current status is ${formatStatus(blocker.liquidationStatus)}.` : "";
    return {
      heading: "Complete the pending liquidation first",
      description: `The released budget for “${title}” is not fully liquidated yet.${status} Complete the liquidation and wait until PCYDO marks it fully liquidated before creating a new budget request.`,
      actionLabel: "Open Liquidation",
    };
  }

  return {
    heading: "Resolve your current budget request first",
    description: `Your budget request for “${title}” is still ${formatStatus(blocker.budgetStatus)}. You may submit a new request after this request is rejected or its released budget is fully liquidated.`,
    actionLabel: "View Current Request",
  };
};
