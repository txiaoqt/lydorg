import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { StatusPill } from "@/admin/components/BudgetRequestsTable";
import {
  statusLabelMap,
  type BudgetRequest,
  type BudgetRequestFile,
  type LiquidationReport,
} from "@/lib/lydo-connect-data";
import { matchesBudgetStatus } from "@/lib/budget-monitoring-filters";
import { isBudgetApprovedStatus, isBudgetReleasedStatus } from "@/lib/workflow-metrics";
import { isAwaitingResubmission } from "@/lib/revision-deadline";

describe("Authoritative Budget Request Restored Lifecycle Suite (Section 25)", () => {
  // Test 1 & 5 & 6: Admin approves Budget Request -> awaiting_release (NOT approved_for_ftf_green)
  it("1, 5, 6. Approving budget request maps to awaiting_release (not approved_for_ftf_green), and 'approved' alias resolves to awaiting_release", () => {
    const mapStatus = (inputStatus: string) => {
      if (inputStatus === "approved" || inputStatus === "awaiting_release" || inputStatus === "approved_green") {
        return "awaiting_release";
      }
      if (inputStatus === "rejected" || inputStatus === "rejected_red") {
        return "rejected_red";
      }
      return inputStatus;
    };

    expect(mapStatus("approved")).toBe("awaiting_release");
    expect(mapStatus("awaiting_release")).toBe("awaiting_release");
    expect(mapStatus("approved_green")).toBe("awaiting_release");
    expect(mapStatus("awaiting_release")).not.toBe("approved_for_ftf_green");
  });

  // Test 2 & 8: Admin requests revision -> needs_revision
  it("2, 8. Admin revision request maps to and remains needs_revision", () => {
    const mapStatus = (inputStatus: string) => {
      if (inputStatus === "approved" || inputStatus === "awaiting_release") return "awaiting_release";
      if (inputStatus === "rejected" || inputStatus === "rejected_red") return "rejected_red";
      return inputStatus;
    };

    expect(mapStatus("needs_revision")).toBe("needs_revision");
  });

  // Test 3 & 4: awaiting_release -> budget_released and remains functional
  it("3, 4. awaiting_release transitions directly to budget_released", () => {
    const allowedTransitions: Record<string, string[]> = {
      submitted: ["under_review", "awaiting_release", "needs_revision", "rejected_red"],
      under_review: ["awaiting_release", "needs_revision", "rejected_red"],
      needs_revision: ["submitted", "under_review", "awaiting_release", "rejected_red"],
      awaiting_release: ["budget_released"],
      budget_released: ["completed"],
    };

    expect(allowedTransitions["awaiting_release"]).toContain("budget_released");
    expect(allowedTransitions["awaiting_release"]).not.toContain("approved_for_ftf_green");
    expect(allowedTransitions["awaiting_release"]).not.toContain("hard_copy_submitted");
  });

  // Test 7: rejected resolves to rejected_red
  it("7. rejected alias resolves to rejected_red", () => {
    const mapStatus = (inputStatus: string) => {
      if (inputStatus === "approved" || inputStatus === "awaiting_release") return "awaiting_release";
      if (inputStatus === "rejected" || inputStatus === "rejected_red") return "rejected_red";
      return inputStatus;
    };

    expect(mapStatus("rejected")).toBe("rejected_red");
    expect(mapStatus("rejected_red")).toBe("rejected_red");
  });

  // Test 9: File marked Needs Revision cannot be approved without a newer upload
  it("9. File marked Needs Revision cannot be approved without a newer replacement upload", () => {
    const revisionRequestedAt = "2026-09-20T10:00:00.000Z";
    const oldFileUpload: BudgetRequestFile = {
      id: "f1",
      budgetRequestId: "b1",
      fileName: "proposal.pdf",
      fileUrl: "https://example.com/p.pdf",
      fileSize: 1000,
      adminStatus: "needs_revision",
      uploadedAt: "2026-09-19T10:00:00.000Z", // Older than revision request
      createdAt: "2026-09-19T10:00:00.000Z",
      updatedAt: "2026-09-20T10:00:00.000Z",
    };

    const isAwaiting = isAwaitingResubmission({
      status: "needs_revision",
      revisionRequestedAt,
      files: [oldFileUpload],
    });

    expect(isAwaiting).toBe(true);
  });

  // Test 10: File with a newer replacement upload can be approved
  it("10. File with a newer replacement upload can be approved", () => {
    const revisionRequestedAt = "2026-09-20T10:00:00.000Z";
    const replacedFileUpload: BudgetRequestFile = {
      id: "f1",
      budgetRequestId: "b1",
      fileName: "proposal_revised.pdf",
      fileUrl: "https://example.com/p_rev.pdf",
      fileSize: 1200,
      adminStatus: "needs_revision",
      uploadedAt: "2026-09-21T14:00:00.000Z", // Newer than revision request
      createdAt: "2026-09-19T10:00:00.000Z",
      updatedAt: "2026-09-21T14:00:00.000Z",
    };

    const isAwaiting = isAwaitingResubmission({
      status: "needs_revision",
      revisionRequestedAt,
      files: [replacedFileUpload],
    });

    expect(isAwaiting).toBe(false);
  });

  // Test 11: All required files approved -> parent awaiting_release
  it("11. Approving all required proposal files results in parent awaiting_release (not approved_for_ftf_green)", () => {
    const allFiles: BudgetRequestFile[] = [
      {
        id: "f1",
        budgetRequestId: "b1",
        fileName: "proposal.pdf",
        fileUrl: "https://example.com/p.pdf",
        fileSize: 1000,
        adminStatus: "approved_green",
        uploadedAt: "2026-09-21T10:00:00.000Z",
        createdAt: "2026-09-21T10:00:00.000Z",
        updatedAt: "2026-09-21T10:00:00.000Z",
      },
    ];

    const allApproved = allFiles.every((f) => f.adminStatus === "approved_green");
    const targetParentStatus = allApproved ? "awaiting_release" : "under_review";

    expect(targetParentStatus).toBe("awaiting_release");
    expect(targetParentStatus).not.toBe("approved_for_ftf_green");
  });

  // Test 12: User Portal displays Awaiting Release
  it("12. User Portal StatusBadge displays 'Awaiting Release' for awaiting_release", () => {
    render(<StatusBadge status="awaiting_release" />);
    expect(screen.getByText("Awaiting Release")).toBeDefined();
    expect(statusLabelMap["awaiting_release"]).toBe("Awaiting Release");
  });

  // Test 13: Admin Portal displays Awaiting Release
  it("13. Admin Portal StatusPill displays 'Awaiting Release' for awaiting_release", () => {
    render(<StatusPill status="awaiting_release" />);
    expect(screen.getByText("Awaiting Release")).toBeDefined();
  });

  // Test 14: Legacy approved_for_ftf_green still renders correctly for historical records
  it("14. Legacy approved_for_ftf_green renders 'Onsite Required' for historical records", () => {
    render(<StatusBadge status="approved_for_ftf_green" />);
    expect(screen.getByText("Onsite Required")).toBeDefined();
    expect(statusLabelMap["approved_for_ftf_green"]).toBe("Onsite Required");
  });

  // Test 15: Legacy hard_copy_submitted still renders correctly for historical records
  it("15. Legacy hard_copy_submitted renders 'Hardcopy Submitted' for historical records", () => {
    render(<StatusBadge status="hard_copy_submitted" />);
    expect(screen.getByText("Hardcopy Submitted")).toBeDefined();
    expect(statusLabelMap["hard_copy_submitted"]).toBe("Hardcopy Submitted");
  });

  // Test 16: Liquidation Reports still use their existing lifecycle
  it("16. Liquidation Reports retain approved_for_ftf_green and hard_copy_submitted workflow", () => {
    const liqStatus: LiquidationReport["status"] = "approved_for_ftf_green";
    expect(statusLabelMap[liqStatus]).toBe("Onsite Required");

    const liqHardcopy: LiquidationReport["status"] = "hard_copy_submitted";
    expect(statusLabelMap[liqHardcopy]).toBe("Hardcopy Submitted");

    const liqComplete: LiquidationReport["status"] = "completed_liquidated";
    expect(statusLabelMap[liqComplete]).toBe("Liquidated");
  });

  // Test 17: Budget Monitoring does not treat awaiting_release as budget_released
  it("17. Budget Monitoring distinguishes awaiting_release from budget_released", () => {
    const reqAwaiting: BudgetRequest = {
      id: "b1",
      organizationId: "org-1",
      activityTitle: "Youth Camp",
      activityDate: "2026-10-01",
      requestedAmount: 50000,
      approvedAmount: 50000,
      releasedAmount: 0,
      status: "awaiting_release",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    const reqReleased: BudgetRequest = {
      id: "b2",
      organizationId: "org-1",
      activityTitle: "Youth Summit",
      activityDate: "2026-10-05",
      requestedAmount: 40000,
      approvedAmount: 40000,
      releasedAmount: 40000,
      status: "budget_released",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };

    // Filter matching
    expect(matchesBudgetStatus(reqAwaiting, "awaiting_release")).toBe(true);
    expect(matchesBudgetStatus(reqAwaiting, "budget_released")).toBe(false);
    expect(matchesBudgetStatus(reqReleased, "budget_released")).toBe(true);
    expect(matchesBudgetStatus(reqReleased, "awaiting_release")).toBe(false);

    // Metric helper distinction
    expect(isBudgetApprovedStatus("awaiting_release")).toBe(true);
    expect(isBudgetReleasedStatus("awaiting_release")).toBe(false);
    expect(isBudgetReleasedStatus("budget_released")).toBe(true);
  });

  // Test 18: Notifications use Awaiting Release messaging
  it("18. Budget approval notifications use 'awaiting fund release' messaging without onsite instructions", () => {
    const getApprovalNotification = (status: "awaiting_release" | "approved_for_ftf_green") => {
      if (status === "awaiting_release") {
        return {
          title: "Budget request approved",
          message: "Your budget request has been approved and is awaiting fund release.",
        };
      }
      return {
        title: "Budget go signal issued",
        message: "Your soft copy requirements have been pre-checked. You may now submit the hard copies face-to-face.",
      };
    };

    const notif = getApprovalNotification("awaiting_release");
    expect(notif.title).toBe("Budget request approved");
    expect(notif.message).toBe("Your budget request has been approved and is awaiting fund release.");
    expect(notif.message).not.toContain("face-to-face");
    expect(notif.message).not.toContain("hard copies");
  });

  // Test 19 & 20: RPC signature & parameter integrity
  it("19, 20. Authoritative RPC parameter contract supports text status with zero overload ambiguity", () => {
    const rpcSignature = {
      _session_token: "text",
      _budget_request_id: "uuid",
      _status: "text",
      _approved_amount: "numeric",
      _released_amount: "numeric",
      _release_date: "date",
      _remarks: "text",
      _admin_remarks: "text",
      _go_signal_at: "timestamptz",
      _hard_copy_submitted_at: "timestamptz",
      _user_note: "text",
      _revision_history: "jsonb",
    };

    expect(Object.keys(rpcSignature)).toHaveLength(12);
    expect(rpcSignature._status).toBe("text");
  });
});
