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
  semesterContext,
}: {
  organizationId: string;
  periods: YPOPPeriod[];
  entries: YPOPEntry[];
  semesterContext?: string | null;
}): BudgetEligibility {
  // 1. If explicit semesterContext is provided (such as a semesterKey or ypopEntryId),
  // scope the evaluation strictly to that semester / entry context.
  if (semesterContext) {
    const targetPeriod =
      periods.find((p) => p.semesterKey === semesterContext || p.id === semesterContext) ??
      periods.find((p) =>
        entries.some(
          (e) => (e.id === semesterContext || e.semester === semesterContext) && e.semester === p.semesterKey
        )
      ) ??
      null;

    const targetEntry =
      entries.find(
        (e) =>
          e.organizationId === organizationId &&
          (e.id === semesterContext ||
            e.semester === semesterContext ||
            (targetPeriod && e.semester === targetPeriod.semesterKey))
      ) ?? null;

    const period =
      targetPeriod ??
      (targetEntry ? periods.find((p) => p.semesterKey === targetEntry.semester) ?? null : null);

    if (targetEntry?.status === "qualified") {
      return { eligible: true, reason: "qualified", period, entry: targetEntry };
    }

    if (!period) {
      return { eligible: false, reason: "no_active_period", period: null, entry: targetEntry };
    }

    if (!targetEntry || targetEntry.status === "draft") {
      return { eligible: false, reason: "ypop_not_submitted", period, entry: targetEntry };
    }
    if (targetEntry.status === "needs_revision") {
      return { eligible: false, reason: "ypop_needs_revision", period, entry: targetEntry };
    }
    if (targetEntry.status === "not_qualified") {
      return { eligible: false, reason: "ypop_not_qualified", period, entry: targetEntry };
    }
    if ((targetEntry.status as string) === "pending_evaluation" || reviewStatuses.has(targetEntry.status)) {
      return { eligible: false, reason: "ypop_under_review", period, entry: targetEntry };
    }

    return { eligible: false, reason: "ypop_not_submitted", period, entry: targetEntry };
  }

  // 2. Evaluate against the newest active open period if one exists.
  // Historical qualified semesters must NOT unlock an unrelated active open period (prevents historical leakage).
  const openPeriod = [...periods]
    .filter((item) => item.status === "open")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;

  if (openPeriod) {
    const entry = [...entries]
      .filter((item) => item.organizationId === organizationId && item.semester === openPeriod.semesterKey)
      .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""))[0] ?? null;

    if (entry?.status === "qualified") {
      return { eligible: true, reason: "qualified", period: openPeriod, entry };
    }

    if (!entry || entry.status === "draft") {
      return { eligible: false, reason: "ypop_not_submitted", period: openPeriod, entry };
    }
    if (entry.status === "needs_revision") {
      return { eligible: false, reason: "ypop_needs_revision", period: openPeriod, entry };
    }
    if (entry.status === "not_qualified") {
      return { eligible: false, reason: "ypop_not_qualified", period: openPeriod, entry };
    }
    if ((entry.status as string) === "pending_evaluation" || reviewStatuses.has(entry.status)) {
      return { eligible: false, reason: "ypop_under_review", period: openPeriod, entry };
    }

    return { eligible: false, reason: "ypop_not_submitted", period: openPeriod, entry };
  }

  // 3. When NO active open period exists, check if organization was qualified in a closed period
  // (Maintains budget eligibility for a qualified organization even after the period is closed).
  const qualifiedEntry = [...entries]
    .filter((item) => item.organizationId === organizationId && item.status === "qualified")
    .sort((left, right) =>
      (right.validatedAt || right.updatedAt || "").localeCompare(left.validatedAt || left.updatedAt || "")
    )[0] ?? null;

  if (qualifiedEntry) {
    const period = periods.find((p) => p.semesterKey === qualifiedEntry.semester) ?? null;
    return { eligible: true, reason: "qualified", period, entry: qualifiedEntry };
  }

  return { eligible: false, reason: "no_active_period", period: null, entry: null };
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
