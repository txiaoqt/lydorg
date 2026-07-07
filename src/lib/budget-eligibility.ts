import type { YPOPEntry, YPOPPeriod } from "./lydo-connect-data";

export type BudgetEligibilityReason =
  | "qualified"
  | "ypop_not_submitted"
  | "ypop_under_review"
  | "ypop_not_qualified"
  | "ypop_needs_revision"
  | "no_active_period";

export type BudgetEligibility = {
  eligible: boolean;
  reason: BudgetEligibilityReason;
  period: YPOPPeriod | null;
  entry: YPOPEntry | null;
};

const reviewStatuses = new Set(["submitted", "under_review"]);

export function resolveBudgetEligibility({
  organizationId,
  periods,
  entries,
}: {
  organizationId: string;
  periods: YPOPPeriod[];
  entries: YPOPEntry[];
}): BudgetEligibility {
  const period = [...periods]
    .filter((item) => item.status === "open")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;

  if (!period) {
    return { eligible: false, reason: "no_active_period", period: null, entry: null };
  }

  const entry = [...entries]
    .filter((item) => item.organizationId === organizationId && item.semester === period.semesterKey)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

  if (!entry || entry.status === "draft") {
    return { eligible: false, reason: "ypop_not_submitted", period, entry };
  }
  if (entry.status === "qualified") {
    return { eligible: true, reason: "qualified", period, entry };
  }
  if (entry.status === "needs_revision") {
    return { eligible: false, reason: "ypop_needs_revision", period, entry };
  }
  if (entry.status === "not_qualified") {
    return { eligible: false, reason: "ypop_not_qualified", period, entry };
  }
  if (reviewStatuses.has(entry.status)) {
    return { eligible: false, reason: "ypop_under_review", period, entry };
  }

  return { eligible: false, reason: "ypop_not_submitted", period, entry };
}

export const budgetEligibilityMessage: Record<
  Exclude<BudgetEligibilityReason, "qualified">,
  { title: string; description: string; actionLabel: string }
> = {
  ypop_not_submitted: {
    title: "Complete YPOP validation first",
    description: "Join the active YPOP period and complete its validation before creating a budget request.",
    actionLabel: "Open YPOP Incentive",
  },
  ypop_under_review: {
    title: "YPOP validation is under review",
    description: "You can view existing requests, but a new request can only be created after your organization qualifies.",
    actionLabel: "View YPOP Status",
  },
  ypop_needs_revision: {
    title: "YPOP validation needs revision",
    description: "Review the admin remarks and complete the required corrections before creating a new request.",
    actionLabel: "Review YPOP Submission",
  },
  ypop_not_qualified: {
    title: "Not currently qualified for the incentive",
    description: "Existing requests remain available, but new budget creation is unavailable for this YPOP period.",
    actionLabel: "View YPOP Status",
  },
  no_active_period: {
    title: "No active YPOP period",
    description: "Existing requests remain available. New requests will open when an active YPOP period is available.",
    actionLabel: "View YPOP Status",
  },
};

