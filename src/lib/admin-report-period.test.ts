import { describe, expect, it } from "vitest";
import { adminReportFilename, adminReportMetadata, fromBudgetMonitoringPeriod, getAdminReportFilenameToken,
  getAdminReportPeriodLabel, getAdminReportRange, matchesAdminReportPeriod, toBudgetMonitoringPeriod,
  withAdminReportPeriod, type AdminReportPeriod } from "./admin-report-period";
import { matchesFiscalPeriod } from "./budget-monitoring-filters";
import { getExportFilename } from "./report-export";
import type { BudgetRequest } from "./lydo-connect-data";

describe("Admin reporting periods", () => {
  it.each([
    [1, "2026-01-01", "2026-04-01", "2026-03-31"],
    [2, "2026-04-01", "2026-07-01", "2026-06-30"],
    [3, "2026-07-01", "2026-10-01", "2026-09-30"],
    [4, "2026-10-01", "2027-01-01", "2026-12-31"],
  ] as const)("Q%i has exact SQL and inclusive monitoring boundaries", (quarter, startDate, endDateExclusive, endDate) => {
    const period = { mode: "quarter", year: 2026, quarter } as const;
    expect(getAdminReportRange(period)).toEqual({ startDate, endDateExclusive });
    expect(getAdminReportPeriodLabel(period)).toBe(`Q${quarter} 2026`);
    expect(getAdminReportFilenameToken(period)).toBe(`2026-q${quarter}`);
    expect(matchesAdminReportPeriod(startDate, period)).toBe(true);
    expect(matchesAdminReportPeriod(endDate, period)).toBe(true);
    expect(matchesAdminReportPeriod(endDateExclusive, period)).toBe(false);
    const monitoring = toBudgetMonitoringPeriod(period, 2026);
    expect(monitoring).toEqual({ mode: "custom", fiscalYear: 2026, startDate, endDate });
    expect(fromBudgetMonitoringPeriod(monitoring)).toEqual(period);
    expect(matchesFiscalPeriod({ activityDate: endDate } as BudgetRequest, monitoring)).toBe(true);
    expect(matchesFiscalPeriod({ activityDate: endDateExclusive } as BudgetRequest, monitoring)).toBe(false);
  });
  it("uses Manila midnight instead of UTC or browser timezone", () => {
    const period = { mode: "quarter", year: 2026, quarter: 1 } as const;
    expect(matchesAdminReportPeriod("2025-12-31T16:00:00Z", period)).toBe(true);
    expect(matchesAdminReportPeriod("2025-12-31T15:59:59Z", period)).toBe(false);
    expect(matchesAdminReportPeriod("2026-03-31T15:59:59.999Z", period)).toBe(true);
    expect(matchesAdminReportPeriod("2026-03-31T16:00:00Z", period)).toBe(false);
    expect(matchesAdminReportPeriod("2026-04-01T00:00:00+08:00", period)).toBe(false);
  });
  it("supports All Periods, All Year and custom including leap days", () => {
    expect(getAdminReportRange({ mode: "all" })).toEqual({ startDate: null, endDateExclusive: null });
    expect(matchesAdminReportPeriod(null, { mode: "all" })).toBe(true);
    expect(getAdminReportFilenameToken({ mode: "all" })).toBe("");
    expect(adminReportFilename("budgets", { mode: "all" })).toBe("budgets");
    const year = { mode: "year", year: 2026 } as const;
    expect(getAdminReportRange(year)).toEqual({ startDate: "2026-01-01", endDateExclusive: "2027-01-01" });
    expect(adminReportFilename("budget-requests", year)).toBe("budget-requests-2026-all-year");
    const custom = { mode: "custom", startDate: "2024-02-29", endDate: "2024-02-29" } as const;
    expect(getAdminReportRange(custom).endDateExclusive).toBe("2024-03-01");
    expect(getAdminReportPeriodLabel(custom)).toBe("2024-02-29 – 2024-02-29");
    expect(getAdminReportFilenameToken(custom)).toBe("2024-02-29-to-2024-02-29");
    expect(fromBudgetMonitoringPeriod(toBudgetMonitoringPeriod(custom, 2024))).toEqual(custom);
  });
  it.each([
    { mode: "custom", startDate: "", endDate: "2026-03-31" },
    { mode: "custom", startDate: "2026-02-30", endDate: "2026-03-31" },
    { mode: "custom", startDate: "2026-04-01", endDate: "2026-03-31" },
    { mode: "year", year: NaN },
  ] as AdminReportPeriod[])("rejects invalid periods %j", period => expect(() => getAdminReportRange(period)).toThrow());
  it("adds consistent titles, range metadata and exact quarterly filenames without changing legacy names", () => {
    const period = { mode: "quarter", year: 2026, quarter: 2 } as const;
    const config = withAdminReportPeriod({ title: "Liquidation Reports", filenamePrefix: "liquidation-reports" }, period);
    expect(config.title).toBe("Liquidation Reports - Q2 2026");
    expect(getExportFilename(config.filenamePrefix, "xlsx", config.filenameDateSuffix)).toBe("liquidation-reports-2026-q2.xlsx");
    expect(adminReportMetadata(period)).toEqual(["Reporting Period: Q2 2026", "Date Range: 2026-04-01 – 2026-06-30 (Asia/Manila)"]);
    expect(getExportFilename("administrators", "pdf")).toMatch(/^administrators-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
