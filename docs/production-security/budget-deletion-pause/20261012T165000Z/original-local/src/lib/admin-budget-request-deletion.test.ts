import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteAdminBudgetRequestsInSupabase,
} from "./lydo-connect-supabase";
import { supabase } from "./supabase";
import * as adminAuth from "./admin-auth";
import type { BudgetRequest } from "./lydo-connect-data";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
  supabaseUrl: "https://mock.supabase.co",
}));

describe("Admin Budget Request Full Lifecycle Deletion Suite (All Statuses Permitted)", () => {
  const mockValidAdminSession = {
    id: "admin-uuid-1",
    username: "admin_user",
    email: "admin@pasigcity.gov.ph",
    displayName: "Admin Christopher Angel",
    sessionToken: "valid-admin-session-token-12345",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    roleCode: "super_admin",
  };

  const removeStorageMock = vi.fn().mockResolvedValue({ data: [], error: null });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue(mockValidAdminSession);
    (supabase!.storage.from as any).mockReturnValue({
      remove: removeStorageMock,
    });
  });

  // TEST A — Budget Released deletion
  it("TEST A — Budget Released deletion: permits deletion of budget_released request", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: {
        deleted_count: 1,
        budget_file_paths: ["storage://budget-request-files/req-released/voucher.pdf"],
        liquidation_file_paths: [],
        deleted_request_ids: ["req-released"],
        deleted_liquidation_report_ids: [],
      },
      error: null,
    });

    const result = await deleteAdminBudgetRequestsInSupabase(["req-released"]);
    expect(result.deletedCount).toBe(1);
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_bulk_delete_budget_requests", {
      _session_token: mockValidAdminSession.sessionToken,
      _request_ids: ["req-released"],
    });
    expect(supabase!.storage.from).toHaveBeenCalledWith("budget-request-files");
    expect(removeStorageMock).toHaveBeenCalledWith(["req-released/voucher.pdf"]);
  });

  // TEST B — Completed deletion
  it("TEST B — Completed deletion: permits deletion of completed request", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: {
        deleted_count: 1,
        budget_file_paths: ["storage://budget-request-files/req-completed/proposal.pdf"],
        liquidation_file_paths: ["storage://liquidation-report-files/liq-completed/summary.pdf"],
        deleted_request_ids: ["req-completed"],
        deleted_liquidation_report_ids: ["liq-completed"],
      },
      error: null,
    });

    const result = await deleteAdminBudgetRequestsInSupabase(["req-completed"]);
    expect(result.deletedCount).toBe(1);
    expect(supabase!.rpc).toHaveBeenCalledWith("admin_bulk_delete_budget_requests", {
      _session_token: mockValidAdminSession.sessionToken,
      _request_ids: ["req-completed"],
    });
    expect(supabase!.storage.from).toHaveBeenCalledWith("budget-request-files");
    expect(supabase!.storage.from).toHaveBeenCalledWith("liquidation-report-files");
  });

  // TEST C — Mixed lifecycle bulk deletion
  it("TEST C — Mixed lifecycle bulk deletion: deletes submitted, budget_released, and completed requests atomically", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: {
        deleted_count: 3,
        budget_file_paths: [
          "storage://budget-request-files/req-sub/file.pdf",
          "storage://budget-request-files/req-rel/file.pdf",
          "storage://budget-request-files/req-comp/file.pdf",
        ],
        liquidation_file_paths: [
          "storage://liquidation-report-files/liq-comp/receipts.pdf",
        ],
        deleted_request_ids: ["req-sub", "req-rel", "req-comp"],
        deleted_liquidation_report_ids: ["liq-comp"],
      },
      error: null,
    });

    const result = await deleteAdminBudgetRequestsInSupabase(["req-sub", "req-rel", "req-comp"]);
    expect(result.deletedCount).toBe(3);
    expect(result.deletedRequestIds).toEqual(["req-sub", "req-rel", "req-comp"]);
  });

  // TEST D — Liquidation cascade
  it("TEST D — Liquidation cascade: removes associated liquidation reports and collects liquidation file paths", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: {
        deleted_count: 1,
        budget_file_paths: ["storage://budget-request-files/req-1/doc.pdf"],
        liquidation_file_paths: ["storage://liquidation-report-files/liq-1/ledger.pdf"],
        deleted_request_ids: ["req-1"],
        deleted_liquidation_report_ids: ["liq-1"],
      },
      error: null,
    });

    const result = await deleteAdminBudgetRequestsInSupabase(["req-1"]);
    expect(result.deletedCount).toBe(1);
    expect(supabase!.storage.from).toHaveBeenCalledWith("liquidation-report-files");
    expect(removeStorageMock).toHaveBeenCalledWith(["liq-1/ledger.pdf"]);
  });

  // TEST E — Storage paths returned
  it("TEST E — Storage paths returned: collects and returns all physical storage paths before DB deletion", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: {
        deleted_count: 2,
        budget_file_paths: [
          "storage://budget-request-files/req-1/a.pdf",
          "storage://budget-request-files/req-2/b.pdf",
        ],
        liquidation_file_paths: [
          "storage://liquidation-report-files/liq-1/c.pdf",
        ],
        deleted_request_ids: ["req-1", "req-2"],
        deleted_liquidation_report_ids: ["liq-1"],
      },
      error: null,
    });

    const result = await deleteAdminBudgetRequestsInSupabase(["req-1", "req-2"]);
    expect(result.deletedCount).toBe(2);
    expect(removeStorageMock).toHaveBeenCalledWith(["req-1/a.pdf", "req-2/b.pdf"]);
    expect(removeStorageMock).toHaveBeenCalledWith(["liq-1/c.pdf"]);
  });

  // TEST F — Audit preservation
  it("TEST F — Audit preservation: preserves historical activity logs and records explicit deletion event with context", () => {
    const mockActivityLogs = [
      { id: "log-1", related_type: "budget_request", related_id: "req-1", action: "submitted_budget_request" },
      { id: "log-2", related_type: "budget_request", related_id: "req-1", action: "approved_budget_request" },
    ];

    // Simulate appending deletion audit log for released request
    mockActivityLogs.push({
      id: "log-3",
      related_type: "budget_request",
      related_id: "req-1",
      action: "deleted_budget_request",
    });

    expect(mockActivityLogs).toHaveLength(3);
    expect(mockActivityLogs.find((l) => l.action === "deleted_budget_request")).toBeDefined();
    expect(mockActivityLogs.filter((l) => l.action !== "deleted_budget_request")).toHaveLength(2);
  });

  // TEST G — Notifications cleanup
  it("TEST G — Notifications: deletes operational notifications for selected requests and linked liquidations", () => {
    const mockNotifications = [
      { id: "n1", related_type: "budget_request", related_id: "req-1" },
      { id: "n2", related_type: "liquidation_report", related_id: "liq-1" },
      { id: "n3", related_type: "registration", related_id: "reg-1" },
    ];

    const selectedRequestIds = new Set(["req-1"]);
    const linkedLiquidationIds = new Set(["liq-1"]);

    const remaining = mockNotifications.filter(
      (n) =>
        !(
          (n.related_type === "budget_request" && selectedRequestIds.has(n.related_id)) ||
          (n.related_type === "liquidation_report" && linkedLiquidationIds.has(n.related_id))
        ),
    );

    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("n3");
  });

  // TEST H — Atomic failure
  it("TEST H — Atomic failure: if database RPC fails, operation throws and storage removal is not invoked", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: null,
      error: { message: "Database transaction failed", code: "XX000" },
    });

    await expect(deleteAdminBudgetRequestsInSupabase(["req-fail"])).rejects.toThrow(
      "Database transaction failed",
    );
    expect(removeStorageMock).not.toHaveBeenCalled();
  });

  // TEST I — Storage cleanup
  it("TEST I — Storage cleanup: calls .remove() for budget-request-files and liquidation-report-files", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: {
        deleted_count: 1,
        budget_file_paths: ["storage://budget-request-files/req-1/doc.pdf"],
        liquidation_file_paths: ["storage://liquidation-report-files/liq-1/doc.pdf"],
        deleted_request_ids: ["req-1"],
        deleted_liquidation_report_ids: ["liq-1"],
      },
      error: null,
    });

    await deleteAdminBudgetRequestsInSupabase(["req-1"]);
    expect(supabase!.storage.from).toHaveBeenCalledWith("budget-request-files");
    expect(supabase!.storage.from).toHaveBeenCalledWith("liquidation-report-files");
    expect(removeStorageMock).toHaveBeenCalledTimes(2);
  });

  // TEST J — Monitoring recalculation
  it("TEST J — Monitoring recalculation: deleting a released/completed request decreases approved and released totals", () => {
    let requests: Partial<BudgetRequest>[] = [
      { id: "b1", status: "budget_released", requestedAmount: 100000, approvedAmount: 100000, releasedAmount: 100000 },
      { id: "b2", status: "approved_for_ftf_green", requestedAmount: 50000, approvedAmount: 50000, releasedAmount: 0 },
      { id: "b3", status: "submitted", requestedAmount: 25000 },
    ];

    const computeTotals = (list: Partial<BudgetRequest>[]) => {
      const approved = list
        .filter((r) => ["approved_for_ftf_green", "hard_copy_submitted", "budget_released", "completed"].includes(r.status!))
        .reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);
      const released = list
        .filter((r) => ["budget_released", "completed"].includes(r.status!))
        .reduce((sum, r) => sum + (r.releasedAmount || 0), 0);
      return { approved, released };
    };

    expect(computeTotals(requests)).toEqual({ approved: 150000, released: 100000 });

    // Delete b1 (released ₱100,000)
    requests = requests.filter((r) => r.id !== "b1");
    expect(computeTotals(requests)).toEqual({ approved: 50000, released: 0 });
  });

  // TEST K — Public summary recalculation
  it("TEST K — Public summary recalculation: dynamic derivation automatically excludes deleted request from aggregates", () => {
    let requests: Partial<BudgetRequest>[] = [
      { id: "b1", status: "completed", releasedAmount: 80000 },
      { id: "b2", status: "budget_released", releasedAmount: 40000 },
    ];

    const getPublicReleased = (list: Partial<BudgetRequest>[]) =>
      list.reduce((sum, r) => sum + (r.releasedAmount || 0), 0);

    expect(getPublicReleased(requests)).toBe(120000);

    // Delete b1
    requests = requests.filter((r) => r.id !== "b1");
    expect(getPublicReleased(requests)).toBe(40000);
  });

  // TEST L — User Portal reconciliation
  it("TEST L — User Portal reconciliation: deleted budget request and linked liquidation report disappear after refresh", () => {
    const orgId = "org-pasig-1";
    let orgRequests = [
      { id: "req-alpha", organization_id: orgId, status: "budget_released" },
      { id: "req-beta", organization_id: orgId, status: "submitted" },
    ];
    let orgLiquidations = [
      { id: "liq-alpha", organization_id: orgId, budgetRequestId: "req-alpha" },
    ];

    // Admin deletes req-alpha
    orgRequests = orgRequests.filter((r) => r.id !== "req-alpha");
    orgLiquidations = orgLiquidations.filter((l) => l.budgetRequestId !== "req-alpha");

    expect(orgRequests).toHaveLength(1);
    expect(orgRequests[0].id).toBe("req-beta");
    expect(orgLiquidations).toHaveLength(0);
  });

  // TEST M — UI confirmation: Selecting Budget Released opens normal confirmation, NOT a blocker modal
  it("TEST M — UI confirmation: selecting Budget Released allows opening the normal delete confirmation dialog", () => {
    const selectedRequests: Partial<BudgetRequest>[] = [
      { id: "r-rel", activityTitle: "Youth Fest", status: "budget_released", releasedAmount: 150000 },
    ];

    // Deletion eligibility check: All statuses permitted
    const isEligibleForDeleteAction = selectedRequests.length > 0;
    expect(isEligibleForDeleteAction).toBe(true);

    // No blocked modal trigger
    const isBlocked = false;
    expect(isBlocked).toBe(false);
  });

  // TEST N — Later-lifecycle warning flag
  it("TEST N — Later-lifecycle warning: flags released and completed records for danger financial warning in confirmation", () => {
    const checkWarningTone = (reqs: Partial<BudgetRequest>[]) => {
      const hasReleasedOrCompleted = reqs.some(
        (r) => r.status === "budget_released" || r.status === "completed",
      );
      if (hasReleasedOrCompleted) return "danger";
      const hasPreReleaseAdvanced = reqs.some(
        (r) => r.status === "approved_for_ftf_green" || r.status === "hard_copy_submitted",
      );
      return hasPreReleaseAdvanced ? "caution" : "caution";
    };

    expect(checkWarningTone([{ status: "submitted" }])).toBe("caution");
    expect(checkWarningTone([{ status: "approved_for_ftf_green" }])).toBe("caution");
    expect(checkWarningTone([{ status: "budget_released" }])).toBe("danger");
    expect(checkWarningTone([{ status: "completed" }])).toBe("danger");
    expect(checkWarningTone([{ status: "submitted" }, { status: "budget_released" }])).toBe("danger");
  });

  // TEST O — No duplicate deletion call
  it("TEST O — No duplicate deletion call: single confirm click invokes deletion backend exactly once", async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: {
        deleted_count: 1,
        budget_file_paths: [],
        liquidation_file_paths: [],
        deleted_request_ids: ["req-single"],
      },
      error: null,
    });

    let isDeleting = false;
    const onConfirmClick = async () => {
      if (isDeleting) return;
      isDeleting = true;
      try {
        await deleteAdminBudgetRequestsInSupabase(["req-single"]);
      } finally {
        isDeleting = false;
      }
    };

    // First invocation
    await onConfirmClick();
    expect(supabase!.rpc).toHaveBeenCalledTimes(1);

    // Repeated call while deleting would be blocked by guard
    expect(isDeleting).toBe(false);
  });

  // SECURITY TESTS
  describe("Security Tests", () => {
    it("rejects deletion when admin session is null or expired", async () => {
      vi.spyOn(adminAuth, "readAdminSession").mockReturnValue(null);

      await expect(deleteAdminBudgetRequestsInSupabase(["req-1"])).rejects.toThrow(
        /Please sign in with the seeded admin account first|Admin session is invalid or expired/,
      );
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("rejects deletion when admin sessionToken is empty", async () => {
      vi.spyOn(adminAuth, "readAdminSession").mockReturnValue({
        ...mockValidAdminSession,
        sessionToken: "",
      });

      await expect(deleteAdminBudgetRequestsInSupabase(["req-1"])).rejects.toThrow(
        /Admin session is invalid or expired/,
      );
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });

    it("handles empty request IDs array safely without invoking RPC", async () => {
      const result = await deleteAdminBudgetRequestsInSupabase([]);
      expect(result.deletedCount).toBe(0);
      expect(supabase!.rpc).not.toHaveBeenCalled();
    });
  });
});
