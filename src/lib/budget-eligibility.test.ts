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
  it("requires a qualified entry in the active YPOP period", () => {
    expect(resolveBudgetEligibility({ organizationId: "org", periods: [period], entries: [entry("qualified")] }).eligible).toBe(true);
  });

  it.each([
    ["submitted", "ypop_under_review"],
    ["under_review", "ypop_under_review"],
    ["needs_revision", "ypop_needs_revision"],
    ["not_qualified", "ypop_not_qualified"],
    ["draft", "ypop_not_submitted"],
  ] as const)("maps %s to %s", (status, reason) => {
    expect(resolveBudgetEligibility({ organizationId: "org", periods: [period], entries: [entry(status)] }).reason).toBe(reason);
  });

  it("does not use another organization's qualification", () => {
    expect(resolveBudgetEligibility({ organizationId: "other", periods: [period], entries: [entry("qualified")] }).eligible).toBe(false);
  });

  it("requires an active period", () => {
    expect(resolveBudgetEligibility({ organizationId: "org", periods: [{ ...period, status: "closed" }], entries: [entry("qualified")] }).reason).toBe("no_active_period");
  });

  it("uses the newest open period as the applicable period", () => {
    const newer = { ...period, id: "newer", semesterKey: "2026-second", createdAt: "2026-06-01" };
    expect(resolveBudgetEligibility({ organizationId: "org", periods: [period, newer], entries: [entry("qualified")] }).eligible).toBe(false);
  });
});
