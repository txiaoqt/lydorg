import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "./supabase";
import { fetchAdminReviewResourcePage, fetchAllAdminReviewResourceRows, fetchAdminPortalListPage,
  fetchAllAdminActivityLogs, loadAdminBudgetMonitoringPeriod } from "./lydo-connect-supabase";
import { getAdminReportRange, toBudgetMonitoringPeriod } from "./admin-report-period";

vi.mock("./supabase", () => ({ supabase: { rpc: vi.fn(), from: vi.fn() }, isSupabaseConfigured: () => true }));
const rpc = supabase!.rpc as unknown as ReturnType<typeof vi.fn>;
const range = getAdminReportRange({ mode: "quarter", year: 2026, quarter: 1 });
const organization = { id: "org", organization_name: "Fixture", district: "District I", barangay: "Bagong Ilog", major_classification: "Youth Organization" };
function rawRow(resource: "budgets" | "liquidations", id: string) {
  const record = { id, organization_id: "org", submitted_by: "user", activity_title: "Fixture", activity_date: "2026-02-01", venue: "Pasig",
    status: "under_review", created_at: "2026-02-02T00:00:00Z", updated_at: "2026-02-02T00:00:00Z", revision_history: [] };
  return resource === "budgets" ? { request: record, organization } : { report: { ...record, budget_request_id: "budget" }, budget_request: { ...record, id: "budget" }, organization };
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  localStorage.setItem("lydo_admin_session_v1", JSON.stringify({ id: "admin", username: "admin", displayName: "Admin", email: "admin@example.test", sessionToken: "quarter-test-token", expiresAt: new Date(Date.now() + 86400000).toISOString() }));
});
describe("bounded review pages and explicit exports", () => {
  it.each(["budgets", "liquidations"] as const)("keeps %s browsing at 20 and combines every current filter with SQL range", async resource => {
    rpc.mockResolvedValue({ data: { rows: [], totalCount: 60 }, error: null } as never);
    await fetchAdminReviewResourcePage({ resource, page: 2, search: " Fixture ", status: "pending_review", semester: "2026-1",
      district: "District I", barangay: "Bagong Ilog", classification: "Youth Organization", sort: "oldest", ...range });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("admin_get_review_resource_page", {
      _session_token: "quarter-test-token", _resource: resource, _page: 2, _page_size: 20, _search: "Fixture", _status: "pending_review",
      _semester: "2026-1", _district: "District I", _barangay: "Bagong Ilog", _classification: "Youth Organization", _sort: "oldest",
      _start_date: "2026-01-01", _end_date_exclusive: "2026-04-01",
    });
  });
  it.each(["budgets", "liquidations"] as const)("retrieves all 121 %s metadata records across bounded pages", async resource => {
    rpc.mockImplementation(async (_name, args) => {
      const page = (args as { _page: number })._page;
      return { error: null, data: { rows: Array.from({ length: page < 2 ? 50 : 21 }, (_, index) => rawRow(resource, `row-${page * 50 + index}`)), totalCount: 121, page, pageSize: 50 } } as never;
    });
    expect(rpc).not.toHaveBeenCalled();
    const rows = await fetchAllAdminReviewResourceRows({ resource, search: "Fixture", status: "all", district: "District I", semester: "2026-1", ...range });
    expect(rows).toHaveLength(121);
    expect(rpc).toHaveBeenCalledTimes(3);
    rpc.mock.calls.forEach(([, args], page) => expect(args).toMatchObject({ _page: page, _page_size: 50, _resource: resource,
      _search: "Fixture", _district: "District I", _semester: "2026-1", _start_date: "2026-01-01", _end_date_exclusive: "2026-04-01" }));
  });
  it("does not fall back to snapshots when the export RPC fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Missing migration" } } as never);
    await expect(fetchAllAdminReviewResourceRows({ resource: "budgets", ...range })).rejects.toThrow("Missing migration");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(supabase!.from).not.toHaveBeenCalled();
  });
  it("preserves relative log dates and combines exact log dates with search and category on every export page", async () => {
    rpc.mockImplementation(async (_name, args) => {
      const page = (args as { _page: number })._page;
      return { error: null, data: { rows: [{ id: `log-${page}`, action: "submitted", related_type: "budget_request", created_at: "2026-02-01T00:00:00Z" }], totalCount: 101, pageSize: 50 } } as never;
    });
    const logs = await fetchAllAdminActivityLogs({ search: "submit", category: "budget_request", dateRange: "all", ...range });
    expect(logs).toHaveLength(3);
    rpc.mock.calls.forEach(([, args], page) => expect(args).toMatchObject({ _page: page, _page_size: 50, _search: "submit", _status: "budget_request",
      _start_date: "2026-01-01", _end_date_exclusive: "2026-04-01" }));
    await fetchAdminPortalListPage({ resource: "activity_logs", page: 0, dateRange: "7d" });
    expect(rpc).toHaveBeenLastCalledWith("admin_get_portal_list_page", expect.objectContaining({ _date_range: "7d", _page_size: 10, _start_date: null, _end_date_exclusive: null }));
  });
  it("passes inclusive monitoring quarters to the existing loader without requesting files", async () => {
    const abortSignal = vi.fn().mockResolvedValue({ error: null, data: { budget_requests: [], organization_profiles: [], liquidation_reports: [], next_cursor: null, fiscal_years: [2026] } });
    rpc.mockReturnValue({ abortSignal } as never);
    const signal = new AbortController().signal;
    // jsdom's AbortSignal predates throwIfAborted; production browsers provide it.
    Object.defineProperty(signal, "throwIfAborted", { value: vi.fn() });
    const result = await loadAdminBudgetMonitoringPeriod(toBudgetMonitoringPeriod({ mode: "quarter", year: 2026, quarter: 4 }, 2026), signal);
    expect(rpc).toHaveBeenCalledWith("admin_get_budget_monitoring_page", expect.objectContaining({ _start_date: "2026-10-01", _end_date: "2026-12-31", _fiscal_year: 2026 }));
    expect(result.budgetRequestFiles).toEqual([]); expect(result.liquidationReportFiles).toEqual([]);
    expect(supabase!.from).not.toHaveBeenCalled();
  });
});
