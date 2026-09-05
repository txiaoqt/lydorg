import { describe, expect, it } from "vitest";
import type { YPOPEntry, YPOPPeriod } from "./lydo-connect-data";
import { resolveBudgetEligibility } from "./budget-eligibility";

const period: YPOPPeriod = {
  id: "period",
  semesterKey: "2026-first",
  semesterLabel: "2026 First Semester",
  validationDeadline: "",
  status: "open",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const entry = (status: YPOPEntry["status"]): YPOPEntry => ({
  id: "entry",
  organizationId: "org",
  submittedBy: "user",
  semester: period.semesterKey,
  semesterLabel: period.semesterLabel,
  pointsEarned: 80,
  pointsRequired: 70,
  totalPoints: 100,
  status,
  adminRemarks: "",
  submissionNote: "",
  validationDeadline: "",
  submittedAt: "",
  validatedAt: "",
  createdAt: "2026-01-02",
  updatedAt: "2026-01-02",
});

describe("budget eligibility", () => {
  it("qualifies an organization when entry is qualified in an active YPOP period", () => {
    expect(resolveBudgetEligibility({ organizationId: "org", periods: [period], entries: [entry("qualified")] }).eligible).toBe(true);
  });

  it("maintains budget eligibility for a qualified organization even after the period is closed", () => {
    const closedPeriod = { ...period, status: "closed" as const };
    const result = resolveBudgetEligibility({
      organizationId: "org",
      periods: [closedPeriod],
      entries: [entry("qualified")],
    });
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("qualified");
  });

  it("does not allow an unqualified organization to become eligible when period is closed", () => {
    const closedPeriod = { ...period, status: "closed" as const };
    const result = resolveBudgetEligibility({
      organizationId: "org",
      periods: [closedPeriod],
      entries: [entry("not_qualified")],
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no_active_period");
  });

  it.each([
    ["submitted", "ypop_under_review"],
    ["under_review", "ypop_under_review"],
    ["needs_revision", "ypop_needs_revision"],
    ["not_qualified", "ypop_not_qualified"],
    ["draft", "ypop_not_submitted"],
  ] as const)("maps %s to %s for active period", (status, reason) => {
    expect(resolveBudgetEligibility({ organizationId: "org", periods: [period], entries: [entry(status)] }).reason).toBe(reason);
  });

  it("does not use another organization's qualification", () => {
    expect(resolveBudgetEligibility({ organizationId: "other", periods: [period], entries: [entry("qualified")] }).eligible).toBe(false);
  });

  it("returns no_active_period when there are no open periods and no qualified entries", () => {
    expect(resolveBudgetEligibility({ organizationId: "org", periods: [{ ...period, status: "closed" }], entries: [entry("draft")] }).reason).toBe("no_active_period");
  });
});
