import { beforeEach, describe, expect, it, vi } from "vitest";

const realtimeMock = vi.hoisted(() => {
  const handlers: Array<{ event: string; filter: Record<string, string>; callback: (payload: unknown) => void }> = [];
  let channel: any;
  channel = {
    on: vi.fn((event: string, filter: Record<string, string>, callback: (payload: unknown) => void) => {
      handlers.push({ event, filter, callback });
      return channel;
    }),
    subscribe: vi.fn((callback?: (status: string, error?: Error | null) => void) => {
      callback?.("SUBSCRIBED");
      return channel;
    }),
  };
  return {
    handlers,
    channel,
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn((removedChannel: unknown) => removedChannel),
    },
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: realtimeMock.supabase, supabaseUrl: "https://example.supabase.co" }));

import {
  getChangedAdminPortalResources,
  subscribeToOrganizationRenewalChangesInSupabase,
  subscribeToOrganizationStatusChangesInSupabase,
  subscribeToOrganizationYpopFileChangesInSupabase,
  subscribeToRenewalPacketChangesInSupabase,
} from "./lydo-connect-supabase";
import { queryClient } from "./query-client";

describe("scoped renewal Realtime subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeMock.handlers.length = 0;
  });

  it("refreshes only active Admin resources whose change version advanced", () => {
    const previous = {
      registration: 3,
      renewals: 8,
      budgets: 2,
      liquidations: 4,
      ypop_city_led: 6,
      ypop_org_led: 1,
    };
    const next = { ...previous, budgets: 3, ypop_city_led: 7 };

    expect(getChangedAdminPortalResources(previous, next, ["registration", "budgets"])).toEqual(["budgets"]);
    expect(getChangedAdminPortalResources(previous, previous, ["registration", "budgets"])).toEqual([]);
    expect(getChangedAdminPortalResources(null, next, ["budgets"])).toEqual([]);
  });

  it("subscribes to the signed-in organization's renewal rows and reports channel status", () => {
    const onChange = vi.fn();
    const onStatus = vi.fn();
    const cleanup = subscribeToOrganizationRenewalChangesInSupabase("org-1", onChange, onStatus);

    expect(realtimeMock.supabase.channel).toHaveBeenCalledWith("organization-renewals-org-1");
    expect(realtimeMock.handlers).toHaveLength(1);
    expect(realtimeMock.handlers[0]).toMatchObject({
      event: "postgres_changes",
      filter: { schema: "public", table: "organization_renewals", filter: "organization_id=eq.org-1" },
    });
    realtimeMock.handlers[0].callback({ new: { id: "renewal-1" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith("SUBSCRIBED", undefined);

    cleanup();
    expect(realtimeMock.supabase.removeChannel).toHaveBeenCalledWith(realtimeMock.channel);
  });

  it("listens only to the open renewal and its linked submission/files", () => {
    const onChange = vi.fn();
    const cleanup = subscribeToRenewalPacketChangesInSupabase("renewal-1", "submission-1", onChange);

    expect(realtimeMock.handlers).toHaveLength(2);
    expect(realtimeMock.handlers.map(({ filter }) => filter)).toEqual([
      { event: "*", schema: "public", table: "document_submission_files", filter: "submission_id=eq.submission-1" },
      { event: "*", schema: "public", table: "document_submissions", filter: "renewal_id=eq.renewal-1" },
    ]);
    realtimeMock.handlers[0].callback({ new: { submission_id: "submission-1" } });
    realtimeMock.handlers[1].callback({ new: { renewal_id: "renewal-1" } });
    expect(onChange).toHaveBeenCalledTimes(2);

    cleanup();
    expect(realtimeMock.supabase.removeChannel).toHaveBeenCalledWith(realtimeMock.channel);
  });

  it("routes registration and renewal submission events by scope", async () => {
    const registrationChange = vi.fn();
    const registrationCleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "registration", submissionId: "registration-packet", onChange: registrationChange,
    });
    expect(realtimeMock.handlers.map(({ filter }) => filter)).toEqual([
      { event: "INSERT", schema: "public", table: "organization_profiles", filter: "id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "organization_profiles", filter: "id=eq.org-1" },
      { event: "INSERT", schema: "public", table: "document_submissions", filter: "organization_id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "document_submissions", filter: "organization_id=eq.org-1" },
      { event: "INSERT", schema: "public", table: "document_submission_files", filter: "submission_id=eq.registration-packet" },
      { event: "UPDATE", schema: "public", table: "document_submission_files", filter: "submission_id=eq.registration-packet" },
    ]);
    realtimeMock.handlers[2].callback({ new: { submission_scope: "renewal", renewal_id: "renewal-1" } });
    realtimeMock.handlers[3].callback({ new: { submission_scope: "registration", renewal_id: null } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(registrationChange).toHaveBeenCalledTimes(1);
    registrationCleanup();

    realtimeMock.handlers.length = 0;
    const renewalChange = vi.fn();
    const renewalCleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "renewals", onChange: renewalChange,
    });
    realtimeMock.handlers[4].callback({ new: { organization_id: "org-1", submission_scope: "registration" } });
    realtimeMock.handlers[5].callback({ new: { organization_id: "org-1", submission_scope: "renewal", renewal_id: "renewal-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(renewalChange).toHaveBeenCalledTimes(1);
    renewalCleanup();
  });

  it("filters budget status to the organization and refreshes only the open file detail for file events", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onChange = vi.fn();
    const cleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "budgets", detailId: "request-1", onChange,
    });

    expect(realtimeMock.handlers.map(({ filter }) => filter)).toEqual([
      { event: "INSERT", schema: "public", table: "budget_requests", filter: "organization_id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "budget_requests", filter: "organization_id=eq.org-1" },
      { event: "INSERT", schema: "public", table: "budget_request_files", filter: "budget_request_id=eq.request-1" },
      { event: "UPDATE", schema: "public", table: "budget_request_files", filter: "budget_request_id=eq.request-1" },
    ]);

    realtimeMock.handlers[0].callback({ new: { organization_id: "org-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(onChange).toHaveBeenCalledTimes(1);
    invalidateSpy.mockClear();

    realtimeMock.handlers[2].callback({ new: { budget_request_id: "request-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(invalidateSpy.mock.calls.map(([arg]) => arg.queryKey)).toEqual([
      ["user", "org-1", "budget-detail-view", "request-1"],
      ["user", "org-1", "budget-files-view", "request-1"],
      ["user", "org-1", "budget-detail-pwa", "request-1"],
      ["user", "org-1", "budget-files-pwa", "request-1"],
    ]);

    cleanup();
    expect(realtimeMock.supabase.removeChannel).toHaveBeenCalledWith(realtimeMock.channel);
    invalidateSpy.mockRestore();
  });

  it("coalesces a parent and child-file event into one scoped refresh", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const cleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "budgets", detailId: "request-1", onChange: vi.fn(),
    });

    realtimeMock.handlers[0].callback({ new: { organization_id: "org-1", id: "request-1" } });
    realtimeMock.handlers[2].callback({ new: { budget_request_id: "request-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    const refreshedKeys = invalidateSpy.mock.calls.map(([arg]) => arg.queryKey);
    expect(refreshedKeys).toEqual([
      ["user", "org-1", "budget-page-view"],
      ["user", "org-1", "budget-page-pwa"],
      ["user", "org-1", "dashboard-summary-view"],
      ["user", "org-1", "dashboard-summary-liquidation-view"],
      ["user", "org-1", "budget-detail-view", "request-1"],
      ["user", "org-1", "budget-files-view", "request-1"],
      ["user", "org-1", "budget-detail-pwa", "request-1"],
      ["user", "org-1", "budget-files-pwa", "request-1"],
    ]);

    cleanup();
    invalidateSpy.mockRestore();
  });

  it("refreshes only liquidation detail metadata for an open file event", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onChange = vi.fn();
    const cleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "liquidations", detailId: "report-1", onChange,
    });
    expect(realtimeMock.handlers.map(({ filter }) => filter)).toEqual([
      { event: "INSERT", schema: "public", table: "liquidation_reports", filter: "organization_id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "liquidation_reports", filter: "organization_id=eq.org-1" },
      { event: "INSERT", schema: "public", table: "liquidation_report_files", filter: "liquidation_report_id=eq.report-1" },
      { event: "UPDATE", schema: "public", table: "liquidation_report_files", filter: "liquidation_report_id=eq.report-1" },
    ]);
    realtimeMock.handlers[2].callback({ new: { liquidation_report_id: "report-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(onChange).not.toHaveBeenCalled();
    expect(invalidateSpy.mock.calls.map(([arg]) => arg.queryKey)).toEqual([
      ["user", "org-1", "liquidation-detail-view", "report-1"],
      ["user", "org-1", "liquidation-files-view", "report-1"],
      ["user", "org-1", "liquidation-detail-pwa", "report-1"],
      ["user", "org-1", "liquidation-files-pwa", "report-1"],
    ]);
    cleanup();
    invalidateSpy.mockRestore();
  });

  it("refreshes only the selected YPOP semester when a city-led status changes", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onChange = vi.fn();
    const cleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "ypop_city_led", semesterKey: "2026-2", activityIds: ["activity-1"], onChange,
    });
    expect(realtimeMock.handlers.map(({ filter }) => filter)).toEqual([
      { event: "INSERT", schema: "public", table: "ypop_periods", filter: "semester_key=eq.2026-2" },
      { event: "UPDATE", schema: "public", table: "ypop_periods", filter: "semester_key=eq.2026-2" },
      { event: "INSERT", schema: "public", table: "ypop_city_activities", filter: "semester_key=eq.2026-2" },
      { event: "UPDATE", schema: "public", table: "ypop_city_activities", filter: "semester_key=eq.2026-2" },
      { event: "INSERT", schema: "public", table: "ypop_event_participations", filter: "organization_id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "ypop_event_participations", filter: "organization_id=eq.org-1" },
      { event: "INSERT", schema: "public", table: "ypop_entries", filter: "organization_id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "ypop_entries", filter: "organization_id=eq.org-1" },
    ]);
    realtimeMock.handlers[4].callback({ new: { organization_id: "org-1", activity_id: "activity-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(invalidateSpy.mock.calls.map(([arg]) => arg.queryKey)).toEqual([
      ["user", "org-1", "ypop", "semester", "2026-2"],
    ]);
    cleanup();
    invalidateSpy.mockRestore();
  });

  it("refreshes only the selected Org-led semester for its organization", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onChange = vi.fn();
    const cleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "ypop_org_led", semesterKey: "2026-2", entryId: "entry-1", onChange,
    });

    expect(realtimeMock.handlers.map(({ filter }) => filter)).toEqual([
      { event: "INSERT", schema: "public", table: "ypop_org_activities", filter: "organization_id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "ypop_org_activities", filter: "organization_id=eq.org-1" },
      { event: "INSERT", schema: "public", table: "ypop_entries", filter: "organization_id=eq.org-1" },
      { event: "UPDATE", schema: "public", table: "ypop_entries", filter: "organization_id=eq.org-1" },
    ]);

    realtimeMock.handlers[0].callback({ new: { organization_id: "org-1", ypop_entry_id: "another-entry" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(onChange).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();

    realtimeMock.handlers[1].callback({ new: { organization_id: "org-1", ypop_entry_id: "entry-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(invalidateSpy.mock.calls.map(([arg]) => arg.queryKey)).toEqual([
      ["user", "org-1", "ypop", "semester", "2026-2"],
    ]);

    cleanup();
    invalidateSpy.mockRestore();
  });

  it("keeps YPOP file-only events scoped to the open file detail", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onChange = vi.fn();
    const cleanup = subscribeToOrganizationStatusChangesInSupabase({
      organizationId: "org-1", feature: "ypop_org_led", semesterKey: "2026-2", entryId: "entry-1", detailId: "activity-1", onChange,
    });

    realtimeMock.handlers[4].callback({ new: { org_activity_id: "activity-1" } });
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    expect(onChange).not.toHaveBeenCalled();
    expect(invalidateSpy.mock.calls.map(([arg]) => arg.queryKey)).toEqual([
      ["user", "org-1", "ypop", "org-activity-files", "activity-1"],
    ]);

    cleanup();
    invalidateSpy.mockRestore();
  });

  it("subscribes only to the open YPOP file parent for City-led and Org-led details", () => {
    const cityCleanup = subscribeToOrganizationYpopFileChangesInSupabase("org-1", "city_led", "participation-1", vi.fn());
    const cityFilters = realtimeMock.handlers.slice(-2).map(({ filter }) => filter);
    expect(cityFilters).toEqual([
      { event: "INSERT", schema: "public", table: "ypop_event_files", filter: "participation_id=eq.participation-1" },
      { event: "UPDATE", schema: "public", table: "ypop_event_files", filter: "participation_id=eq.participation-1" },
    ]);
    cityCleanup();

    const orgCleanup = subscribeToOrganizationYpopFileChangesInSupabase("org-1", "org_led", "activity-1", vi.fn());
    expect(realtimeMock.handlers.slice(-2).map(({ filter }) => filter)).toEqual([
      { event: "INSERT", schema: "public", table: "ypop_org_activity_files", filter: "org_activity_id=eq.activity-1" },
      { event: "UPDATE", schema: "public", table: "ypop_org_activity_files", filter: "org_activity_id=eq.activity-1" },
    ]);
    orgCleanup();
    expect(realtimeMock.supabase.removeChannel).toHaveBeenCalledTimes(2);
  });
});
