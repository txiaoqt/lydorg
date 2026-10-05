import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
    auth: { getSession: supabaseMocks.getSession },
  },
  supabaseUrl: "https://example.supabase.co",
}));

import {
  loadOrganizationBootstrapState,
  loadOrganizationBudgetRequestPage,
  loadOrganizationDashboardState,
  loadOrganizationInquiryPage,
  loadOrganizationLiquidationReportPage,
  loadOrganizationNotificationsState,
  loadOrganizationNotificationPage,
  loadOrganizationPortalSectionState,
  loadOrganizationYpopSemesterData,
} from "./lydo-connect-supabase";
import { queryClient } from "./query-client";

type RecordedQuery = { table: string; calls: Array<[string, ...unknown[]]> };
let recordedQueries: RecordedQuery[] = [];
let tableData = new Map<string, unknown[]>();
let singleData = new Map<string, unknown>();

const makeBuilder = (table: string) => {
  const record: RecordedQuery = { table, calls: [] };
  recordedQueries.push(record);
  const result = { data: tableData.get(table) ?? [], error: null, count: table === "notifications" ? 77 : table === "budget_requests" ? 221 : table === "liquidation_reports" ? 145 : table === "inquiries" ? 38 : 0 };
  const builder: Record<string, any> = {};
  for (const method of ["select", "eq", "is", "in", "or", "order", "limit", "range", "gte", "lte", "not"]) {
    builder[method] = (...args: unknown[]) => {
      record.calls.push([method, ...args]);
      return builder;
    };
  }
  builder.maybeSingle = async () => ({ data: singleData.get(table) ?? null, error: null });
  builder.single = async () => ({ data: null, error: null });
  builder.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
};

const queryFor = (table: string) => recordedQueries.filter((query) => query.table === table);
const lastCallArgs = (query: RecordedQuery, name: string) =>
  query.calls.filter(([method]) => method === name).at(-1)?.slice(1) ?? [];

describe("organization portal data scopes", () => {
  beforeEach(() => {
    queryClient.clear();
    recordedQueries = [];
    tableData = new Map();
    singleData = new Map();
    supabaseMocks.from.mockImplementation((table: string) => makeBuilder(table));
    supabaseMocks.rpc.mockResolvedValue({ data: { budgets: {}, liquidations: {} }, error: null });
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null } });
  });

  it("bootstraps only the signed-in organization's profile with an explicit projection", async () => {
    await loadOrganizationBootstrapState("user-1");

    expect(recordedQueries.map(({ table }) => table)).toEqual(["organization_profiles"]);
    const projection = lastCallArgs(recordedQueries[0], "select")[0];
    expect(projection).toContain("organization_name");
    expect(projection).not.toBe("*");
    expect(projection).not.toMatch(/seed_(?:batch|source_year|source_record_number)|is_seeded_sample_data/);
  });

  it("shares public template metadata in cache and does not read file contents", async () => {
    await loadOrganizationPortalSectionState("templates", "user-1", "org-1");
    await loadOrganizationPortalSectionState("templates", "user-1", "org-1");

    expect(recordedQueries.map(({ table }) => table)).toEqual(["required_document_types"]);
    const projection = lastCallArgs(recordedQueries[0], "select")[0] as string;
    expect(projection).toContain("template_file_size");
    expect(projection).not.toBe("*");
    expect(recordedQueries.some(({ table }) => table.includes("storage"))).toBe(false);
  });

  it("loads only the recent notification window and unread count for a supplied identity", async () => {
    const state = await loadOrganizationNotificationsState("user-1");

    expect(supabaseMocks.getSession).not.toHaveBeenCalled();
    expect(state?.unreadNotificationCount).toBe(77);
    expect(queryFor("notifications")).toHaveLength(2);
    const recentQuery = queryFor("notifications")[0];
    expect(lastCallArgs(recentQuery, "range")).toEqual([0, 24]);
    expect(lastCallArgs(recentQuery, "select")[0]).not.toBe("*");
    expect(lastCallArgs(queryFor("notifications")[1], "select")[1]).toEqual({ count: "exact", head: true });
  });

  it("keeps Dashboard metrics exact with one aggregate while loading only small recent windows", async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: {
        budgets: { total_count: 1248, released_amount: 925000 },
        liquidations: { total_count: 1110, completed_count: 840 },
      },
      error: null,
    });
    const dashboardState = await loadOrganizationDashboardState("user-1", "org-1");

    expect(supabaseMocks.rpc).toHaveBeenCalledWith("get_organization_portal_dashboard_summary", { p_organization_id: "org-1" });
    expect(dashboardState.organizationDashboardSummary?.budgets.totalCount).toBe(1248);
    expect(dashboardState.organizationDashboardSummary?.budgets.releasedAmount).toBe(925000);
    expect(dashboardState.organizationDashboardSummary?.liquidations.totalCount).toBe(1110);
    expect(lastCallArgs(queryFor("budget_requests")[0], "limit")).toEqual([5]);
    expect(lastCallArgs(queryFor("liquidation_reports")[0], "limit")).toEqual([5]);
    expect(lastCallArgs(queryFor("budget_requests")[0], "select")[0]).not.toMatch(/seed_(?:batch|source_year|source_record_number)|is_seeded_sample_data/);
    expect(lastCallArgs(queryFor("liquidation_reports")[0], "select")[0]).not.toMatch(/seed_(?:batch|source_year|source_record_number)|is_seeded_sample_data/);
    expect(lastCallArgs(queryFor("activity_logs")[0], "limit")).toEqual([8]);
    expect(lastCallArgs(queryFor("inquiries")[0], "limit")).toEqual([10]);
    expect(recordedQueries.some(({ table }) => ["ypop_files", "ypop_event_files", "ypop_org_activity_files"].includes(table))).toBe(false);
  });

  it("has no full-state user refresh or unconditional renewal polling path", async () => {
    const { readFile } = await import("node:fs/promises");
    const [storeSource, portalSource, pwaSource] = await Promise.all([
      readFile("src/lib/lydo-connect-store.tsx", "utf8"),
      readFile("src/user/UserPortal.tsx", "utf8"),
      readFile("src/user/pwa/hooks/usePwaPortalData.ts", "utf8"),
    ]);

    expect(storeSource).not.toContain("loadLydoConnectSupabaseState");
    expect(storeSource).not.toContain("SYNC_INTERVAL_MS");
    expect(portalSource).not.toContain("setInterval");
    expect(pwaSource).not.toContain("loadLydoConnectSupabaseState");
  });

  it("paginates budgets in the database with exact counts and server-side filters", async () => {
    const page = await loadOrganizationBudgetRequestPage("org-1", {
      page: 3,
      pageSize: 25,
      search: "Youth Forum",
      statuses: ["budget_released"],
      sortBy: "requested_amount",
      sortDirection: "asc",
    });

    const query = queryFor("budget_requests")[0];
    expect(page).toMatchObject({ totalCount: 221, page: 3, pageSize: 25, totalPages: 9 });
    expect(lastCallArgs(query, "select")[1]).toEqual({ count: "exact" });
    expect(lastCallArgs(query, "select")[0]).not.toMatch(/seed_(?:batch|source_year|source_record_number)|is_seeded_sample_data/);
    expect(lastCallArgs(query, "in")).toEqual(["status", ["budget_released"]]);
    expect(lastCallArgs(query, "or")[0]).toContain("activity_title.ilike");
    expect(lastCallArgs(query, "range")).toEqual([50, 74]);
    expect(lastCallArgs(query, "order")[0]).toBe("id");
  });

  it("pages liquidations, inquiries, and notifications without fetching the full history", async () => {
    const [liquidations, inquiries, notifications] = await Promise.all([
      loadOrganizationLiquidationReportPage("org-1", { page: 2, pageSize: 25, search: "Youth Forum" }),
      loadOrganizationInquiryPage("org-1", { page: 2, pageSize: 25, statuses: ["closed"] }),
      loadOrganizationNotificationPage("user-1", { page: 2, pageSize: 25, readState: "unread" }),
    ]);

    expect(liquidations).toMatchObject({ totalCount: 145, page: 2, pageSize: 25, totalPages: 6 });
    expect(inquiries).toMatchObject({ totalCount: 38, page: 2, pageSize: 25, totalPages: 2 });
    expect(notifications).toMatchObject({ totalCount: 77, page: 2, pageSize: 25, totalPages: 4 });
    for (const query of [...queryFor("liquidation_reports"), ...queryFor("inquiries"), ...queryFor("notifications")]) {
      expect(lastCallArgs(query, "select")[1]).toEqual({ count: "exact" });
      expect(lastCallArgs(query, "range")).toEqual([25, 49]);
    }
    expect(lastCallArgs(queryFor("liquidation_reports")[0], "select")[0]).not.toMatch(/seed_(?:batch|source_year|source_record_number)|is_seeded_sample_data/);
    expect(recordedQueries.some(({ table }) => table === "budget_request_files" || table === "liquidation_report_files")).toBe(false);
  });

  it("uses only live city-activity columns and derives the category from points", async () => {
    singleData.set("ypop_periods", {
      id: "period-1", semester_key: "2026-second", semester_label: "2026 Second Semester",
      validation_deadline: null, status: "open", org_led_tiers: [], created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
    });
    tableData.set("ypop_city_activities", [{
      id: "activity-1", semester_key: "2026-second", name: "City Cleanup", date: null,
      start_date: "2026-10-10", end_date: "2026-10-10", venue: "Pasig", points: 4,
      created_at: "2026-10-01T00:00:00Z",
    }]);

    const data = await loadOrganizationYpopSemesterData("org-1", "2026-second");

    const activityQuery = queryFor("ypop_city_activities")[0];
    expect(lastCallArgs(activityQuery, "select")[0]).toBe("id,semester_key,name,date,start_date,end_date,venue,points,created_at");
    expect(data.cityActivities[0]).toMatchObject({ name: "City Cleanup", category: "mandatory", points: 4 });
  });
});
