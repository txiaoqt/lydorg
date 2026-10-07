import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8").replaceAll("\r", "");
const portal = read("src/admin/AdminPortal.tsx");
const migration = read("supabase/migrations/20261007203541_admin_quarterly_export_filters.sql");
describe("quarter reporting architecture regressions", () => {
  it.each(["budget", "liquidation"])("resets the %s queue and keeps the reporting period in the bounded query", resource => {
    const state = resource === "budget" ? "budgetReportPeriod" : "liquidationReportPeriod";
    const page = resource === "budget" ? "BudgetReviewPage" : "LiquidationReviewPage";
    expect(portal).toMatch(new RegExp(`useEffect\\(\\(\\) => set${page}\\(0\\), \\[.*${state}\\]\\)`));
    expect(portal).toContain(`set${page}(0); set${resource === "budget" ? "BudgetReportPeriod" : "LiquidationReportPeriod"}(period);`);
    expect(portal).toContain(`...reportRange(${state})`);
    expect(portal).toMatch(new RegExp(`resource: "${resource === "budget" ? "budgets" : "liquidations"}", page: .*pageSize: 20`));
  });
  it("keeps both all-pages loaders inside explicit export handlers and out of queries and the store", () => {
    const budgetHandler = portal.slice(portal.indexOf("const handleReportExport"), portal.indexOf("const handleReportExport") + 6000);
    const liquidationHandler = portal.slice(portal.indexOf("const handleLiquidationReportsExport"), portal.indexOf("const handleLiquidationReportsExport") + 6000);
    expect(budgetHandler).toContain("await fetchAllAdminReviewResourceRows");
    expect(liquidationHandler).toContain("await fetchAllAdminReviewResourceRows");
    expect(portal.match(/await fetchAllAdminReviewResourceRows/g)).toHaveLength(2);
    expect(portal).not.toMatch(/queryFn:.*fetchAllAdmin/);
    expect(budgetHandler).not.toContain("mergeRemoteState"); expect(liquidationHandler).not.toContain("mergeRemoteState");
    expect(budgetHandler).not.toContain("fetchAdminBudgetRequestDetail");
    expect(liquidationHandler).not.toContain("fetchAdminLiquidationReportDetail");
  });
  it("uses one existing monitoring period for scoped loading, metrics and both exports", () => {
    expect(portal).toContain("loadAdminBudgetMonitoringPeriod(budgetMonitoringFilters.fiscalPeriod, signal)");
    expect(portal).toContain("matchesFiscalPeriod(request, budgetMonitoringFilters.fiscalPeriod)");
    for (const config of ["budgetMonitoringExportConfig", "allocationByBarangayExportConfig"]) {
      expect(portal).toContain(`withAdminReportPeriod(${config}, fromBudgetMonitoringPeriod(budgetMonitoringFilters.fiscalPeriod))`);
    }
  });
  it("clears relative dates when choosing a log period and clears the period when choosing relative dates", () => {
    expect(portal).toContain('setActivityDateFilter("all"); setAdminListPage(0); setActivityReportPeriod(period);');
    expect(portal).toContain('setActivityReportPeriod({ mode: "all" }); setActivityDateFilter(value);');
  });
  it("preserves safe authorization, grants, pagination and guards in a single forward migration", () => {
    for (const token of ["validate_admin_session_token", "aa.is_active = true", "_required_permission", "SECURITY DEFINER", "_safe_page_size",
      "FROM PUBLIC", "TO anon, authenticated, service_role", "'pg_catalog'", "'pg_temp'", "_start_date date DEFAULT NULL::date", "_end_date_exclusive date DEFAULT NULL::date"]) {
      expect(migration).toContain(token);
    }
    expect(migration).not.toMatch(/(?:ALTER TABLE.*ROW LEVEL|GRANT.*ON TABLE|DROP FUNCTION.*CASCADE)/i);
    expect(migration).toContain("IF strpos(_definition, _needle) = 0 THEN RAISE EXCEPTION");
    expect(migration).toContain("COALESCE(br.activity_date, (br.created_at AT TIME ZONE");
    expect(migration).toContain("lr.created_at >="); expect(migration).toContain("lr.created_at <");
    expect(migration).toContain("l.created_at >="); expect(migration).toContain("l.created_at <");
    expect(migration).toContain("AND lr.status::text <> ''draft''");
    // The predicate lives in filtered CTEs; numbered references and offset pages remain untouched.
    expect(migration).not.toContain("OFFSET"); expect(migration).not.toContain("LIMIT 10000");
  });
  it("keeps Section 35 and static Administrator export semantics separate", () => {
    const officialDialog = read("src/components/reports/YorpQuarterlyReportDialog.tsx");
    expect(officialDialog).toContain("fetchYorpQuarterlyReportInSupabase(year, quarter)");
    expect(officialDialog).not.toContain("AdminReportingPeriodSelector");
    const adminDialog = portal.slice(portal.indexOf("open={administratorsExportDialogOpen}"), portal.indexOf("open={administratorsExportDialogOpen}") + 650);
    expect(adminDialog).not.toContain("periodFilter");
  });
});
