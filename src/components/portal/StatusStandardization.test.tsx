import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  StatusBadge,
  statusBadgeToneClasses,
  statusBadgeToneMap,
} from "./StatusBadge";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { StatusPill as AdminRegistrationStatusPill } from "@/admin/components/RegistrationsTable";
import { RenewalStatusPill as AdminRenewalStatusPill } from "@/admin/components/RenewalsTable";
import { StatusPill as AdminBudgetStatusPill } from "@/admin/components/BudgetRequestsTable";
import { STATUS_LABEL_CONFIG as ADMIN_LIQUIDATION_CONFIG } from "@/admin/components/LiquidationReportsTable";
import { StatusLabel as AdminYpopStatusLabel } from "@/admin/components/YpopSubmissionsTable";
import { urnReviewLabels } from "@/lib/urn-registration";

describe("Y-TRACE Complete Status & Status-Color System Standardization Suite", () => {
  describe("1. Audited Status Resolution & Defined Semantic Tone Verification", () => {
    const successStatuses = [
      "verified",
      "approved",
      "approved_green",
      "qualified",
      "completed_liquidated",
      "active",
      "published",
      "budget_released",
      "completed",
    ];

    const infoStatuses = [
      "pending_review",
      "under_review",
      "under_admin_review",
      "ready_for_review",
      "submitted",
      "pending_evaluation",
      "pending_verification",
      "uploaded",
      "ocr_processing",
      "open",
      "reviewed",
    ];

    const progressStatuses = [
      "approved_for_ftf_green",
      "hard_copy_submitted",
    ];

    const actionStatuses = [
      "needs_revision",
      "needs_update",
      "needs_correction",
      "needs_reupload",
      "incomplete",
    ];

    const warningStatuses = [
      "expiring_soon",
      "due_soon",
      "pending_activity_completion",
      "invitation_pending",
      "postponed",
    ];

    const dangerStatuses = [
      "rejected",
      "rejected_red",
      "not_qualified",
      "expired",
      "overdue",
      "suspended_inactive",
      "suspended",
      "cancelled",
      "failed",
      "validation_failed",
    ];

    const neutralStatuses = [
      "draft",
      "not_started",
      "hidden",
      "archived",
      "closed",
      "not_applicable",
    ];

    it("resolves all Success statuses to 'success' (Green)", () => {
      successStatuses.forEach((status) => {
        expect(statusBadgeToneMap[status], `status ${status} should be success`).toBe("success");
      });
    });

    it("resolves all Info/Review/Waiting statuses to 'info' (Blue)", () => {
      infoStatuses.forEach((status) => {
        expect(statusBadgeToneMap[status], `status ${status} should be info`).toBe("info");
      });
    });

    it("resolves all Intermediate Milestone/Progress statuses to 'progress' (Teal)", () => {
      progressStatuses.forEach((status) => {
        expect(statusBadgeToneMap[status], `status ${status} should be progress`).toBe("progress");
      });
    });

    it("resolves all Action Required statuses to 'action' (Orange)", () => {
      actionStatuses.forEach((status) => {
        expect(statusBadgeToneMap[status], `status ${status} should be action`).toBe("action");
      });
    });

    it("resolves all Warning/Attention statuses to 'warning' (Amber)", () => {
      warningStatuses.forEach((status) => {
        expect(statusBadgeToneMap[status], `status ${status} should be warning`).toBe("warning");
      });
    });

    it("resolves all Negative/Terminal statuses to 'danger' (Red/Rose)", () => {
      dangerStatuses.forEach((status) => {
        expect(statusBadgeToneMap[status], `status ${status} should be danger`).toBe("danger");
      });
    });

    it("resolves all Neutral/Closed/Inactive statuses to 'neutral' (Gray)", () => {
      neutralStatuses.forEach((status) => {
        expect(statusBadgeToneMap[status], `status ${status} should be neutral`).toBe("neutral");
      });
    });
  });

  describe("2. Minimum Required Specific Invariant Verifications", () => {
    it("4. needs_revision is Orange/Action", () => {
      expect(statusBadgeToneMap["needs_revision"]).toBe("action");
    });

    it("5. needs_update is Orange/Action", () => {
      expect(statusBadgeToneMap["needs_update"]).toBe("action");
    });

    it("6. needs_correction is Orange/Action", () => {
      expect(statusBadgeToneMap["needs_correction"]).toBe("action");
    });

    it("7. pending_review is Blue/Info", () => {
      expect(statusBadgeToneMap["pending_review"]).toBe("info");
    });

    it("8. under_review is Blue/Info", () => {
      expect(statusBadgeToneMap["under_review"]).toBe("info");
    });

    it("9. pending_evaluation is Blue/Info", () => {
      expect(statusBadgeToneMap["pending_evaluation"]).toBe("info");
    });

    it("10. pending_verification is Blue/Info", () => {
      expect(statusBadgeToneMap["pending_verification"]).toBe("info");
    });

    it("11. approved_for_ftf_green is Teal/Progress", () => {
      expect(statusBadgeToneMap["approved_for_ftf_green"]).toBe("progress");
    });

    it("12. hard_copy_submitted is Teal/Progress", () => {
      expect(statusBadgeToneMap["hard_copy_submitted"]).toBe("progress");
    });

    it("13. budget_released is Green/Success", () => {
      expect(statusBadgeToneMap["budget_released"]).toBe("success");
    });

    it("14. completed is Green/Success", () => {
      expect(statusBadgeToneMap["completed"]).toBe("success");
    });

    it("15. rejected is Red/Danger", () => {
      expect(statusBadgeToneMap["rejected"]).toBe("danger");
      expect(statusBadgeToneMap["rejected_red"]).toBe("danger");
    });

    it("16. overdue is Red/Danger", () => {
      expect(statusBadgeToneMap["overdue"]).toBe("danger");
    });

    it("17. expired is Red/Danger", () => {
      expect(statusBadgeToneMap["expired"]).toBe("danger");
    });

    it("18. suspended is Red/Danger", () => {
      expect(statusBadgeToneMap["suspended"]).toBe("danger");
      expect(statusBadgeToneMap["suspended_inactive"]).toBe("danger");
    });

    it("19. draft is Neutral", () => {
      expect(statusBadgeToneMap["draft"]).toBe("neutral");
    });

    it("20. not_started is Neutral", () => {
      expect(statusBadgeToneMap["not_started"]).toBe("neutral");
    });

    it("21. closed is Neutral", () => {
      expect(statusBadgeToneMap["closed"]).toBe("neutral");
    });

    it("22. open is Blue/Info", () => {
      expect(statusBadgeToneMap["open"]).toBe("info");
    });

    it("23. reviewed is Blue/Info", () => {
      expect(statusBadgeToneMap["reviewed"]).toBe("info");
    });
  });

  describe("3. Label Standardization Requirements", () => {
    it("standardizes needs_update to 'Needs Update' consistently", () => {
      expect(statusLabelMap["needs_update"]).toBe("Needs Update");
      const { container } = render(<AdminRegistrationStatusPill status="needs_update" />);
      expect(container.textContent?.trim()).toBe("Needs Update");
    });

    it("standardizes pending_review to 'Pending Review' (not 'Open')", () => {
      expect(statusLabelMap["pending_review"]).toBe("Pending Review");
    });

    it("standardizes reviewed to 'Reviewed' (not 'Responded')", () => {
      expect(statusLabelMap["reviewed"]).toBe("Reviewed");
    });

    it("standardizes approved to 'Approved' (not 'Verified')", () => {
      expect(statusLabelMap["approved"]).toBe("Approved");
    });

    it("standardizes under_review to 'Under Review'", () => {
      expect(statusLabelMap["under_review"]).toBe("Under Review");
    });

    it("standardizes under_admin_review to 'Under Admin Review'", () => {
      expect(statusLabelMap["under_admin_review"]).toBe("Under Admin Review");
    });
  });

  describe("4. Cross-Portal Semantic Consistency (User vs Admin)", () => {
    it("Admin Budget and Liquidation use Progress Teal for hard_copy_submitted and approved_for_ftf_green", () => {
      expect(ADMIN_LIQUIDATION_CONFIG["hard_copy_submitted"].className).toContain("text-text-progress");
      expect(ADMIN_LIQUIDATION_CONFIG["approved_for_ftf_green"].className).toContain("text-text-progress");

      const { container: budgetFtf } = render(<AdminBudgetStatusPill status="approved_for_ftf_green" />);
      expect(budgetFtf.firstChild).toHaveClass("text-text-progress");

      const { container: budgetHardcopy } = render(<AdminBudgetStatusPill status="hard_copy_submitted" />);
      expect(budgetHardcopy.firstChild).toHaveClass("text-text-progress");
    });

    it("Admin YPOP Submissions use Blue Info for pending_evaluation and under_review, and Orange Action for needs_revision", () => {
      const { container: pendingEval } = render(<AdminYpopStatusLabel status="pending_evaluation" />);
      expect(pendingEval.firstChild).toHaveClass("text-icon-info-secondary");

      const { container: underReview } = render(<AdminYpopStatusLabel status="under_review" />);
      expect(underReview.firstChild).toHaveClass("text-icon-info-secondary");

      const { container: needsRev } = render(<AdminYpopStatusLabel status="needs_revision" />);
      expect(needsRev.firstChild).toHaveClass("text-text-action");
    });
  });
});
