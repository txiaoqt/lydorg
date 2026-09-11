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

  it("satisfies eligibility on direct navigation when current active semester is qualified", () => {
    const result = resolveBudgetEligibility({
      organizationId: "org",
      periods: [period],
      entries: [entry("qualified")],
    });
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("qualified");
  });

  it("blocks direct navigation when historical closed semester is qualified but current open semester is not qualified (prevents historical leakage)", () => {
    const historicalClosedPeriod: YPOPPeriod = {
      ...period,
      id: "hist-period",
      semesterKey: "2025-second",
      status: "closed",
      createdAt: "2025-01-01",
    };
    const historicalQualifiedEntry: YPOPEntry = {
      ...entry("qualified"),
      id: "hist-entry",
      semester: "2025-second",
    };
    const currentNotQualifiedEntry: YPOPEntry = {
      ...entry("not_qualified"),
      id: "curr-entry",
      semester: period.semesterKey,
    };

    const result = resolveBudgetEligibility({
      organizationId: "org",
      periods: [period, historicalClosedPeriod],
      entries: [historicalQualifiedEntry, currentNotQualifiedEntry],
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("ypop_not_qualified");
  });

  it("scopes eligibility strictly to semesterContext when ypopEntryId or semesterKey is provided", () => {
    const periodA: YPOPPeriod = { ...period, id: "p-a", semesterKey: "sem-a", status: "open" };
    const periodB: YPOPPeriod = { ...period, id: "p-b", semesterKey: "sem-b", status: "open", createdAt: "2026-06-01" };

    const entryA: YPOPEntry = { ...entry("qualified"), id: "entry-a", semester: "sem-a" };
    const entryB: YPOPEntry = { ...entry("not_qualified"), id: "entry-b", semester: "sem-b" };

    // Scoped to entryA (qualified)
    const resultA = resolveBudgetEligibility({
      organizationId: "org",
      periods: [periodA, periodB],
      entries: [entryA, entryB],
      semesterContext: "entry-a",
    });
    expect(resultA.eligible).toBe(true);
    expect(resultA.reason).toBe("qualified");

    // Scoped to entryB (not qualified)
    const resultB = resolveBudgetEligibility({
      organizationId: "org",
      periods: [periodA, periodB],
      entries: [entryA, entryB],
      semesterContext: "entry-b",
    });
    expect(resultB.eligible).toBe(false);
    expect(resultB.reason).toBe("ypop_not_qualified");
  });
});

