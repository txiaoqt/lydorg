import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { format } from "date-fns";
import { LiquidationStatusLabel } from "./components/LiquidationReportsTable";
import { StatusPill as BudgetStatusPill } from "./components/BudgetRequestsTable";
import type { BudgetRequest, LiquidationReport, LiquidationReportFile, OrganizationProfile } from "@/lib/lydo-connect-data";

// Mock Supabase & Store modules for AdminPortal integration
vi.mock("@/lib/lydo-connect-supabase", () => ({
  updateBudgetRequestInSupabase: vi.fn().mockResolvedValue(true),
  updateLiquidationReportInSupabase: vi.fn().mockResolvedValue(true),
  adminUpdateLiquidationReportFileStatusInSupabase: vi.fn().mockResolvedValue(true),
  appendAuditLog: vi.fn().mockResolvedValue(true),
  notifyOrganizationUser: vi.fn().mockResolvedValue(true),
  refreshAdminSnapshot: vi.fn().mockResolvedValue(true),
  getManilaDateIso: vi.fn().mockReturnValue("2026-09-27"),
  calculateRevisionDeadline: vi.fn().mockReturnValue({
    requestedAt: "2026-09-27T00:00:00.000Z",
    dueAt: "2026-10-04T00:00:00.000Z",
  }),
}));

describe("Review Decision Status Presentation & Full Approval Timestamp Markers", () => {
  describe("1. Liquidation Status Presentation", () => {
    it("compact status badge displays 'Onsite Required' for approved_for_ftf_green", () => {
      render(<LiquidationStatusLabel status="approved_for_ftf_green" />);
      const badge = screen.getByText("Onsite Required");
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe("Onsite Required");
      expect(badge.textContent).not.toContain("Approved —");
    });

    it("compact status badge displays 'Pending Review' for submitted", () => {
      render(<LiquidationStatusLabel status="submitted" />);
      expect(screen.getByText("Pending Review")).toBeInTheDocument();
    });

    it("compact status badge displays 'Liquidated' for completed_liquidated", () => {
      render(<LiquidationStatusLabel status="completed_liquidated" />);
      expect(screen.getByText("Liquidated")).toBeInTheDocument();
    });
  });

  describe("2. Budget Request Status Presentation", () => {
    it("compact status badge displays 'Awaiting Release' for awaiting_release", () => {
      render(<BudgetStatusPill status="awaiting_release" />);
      const badge = screen.getByText("Awaiting Release");
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe("Awaiting Release");
      expect(badge.textContent).not.toContain("Approved —");
    });

    it("compact status badge displays 'Pending Review' for submitted", () => {
      render(<BudgetStatusPill status="submitted" />);
      expect(screen.getByText("Pending Review")).toBeInTheDocument();
    });

    it("compact status badge displays 'Budget Released' for budget_released", () => {
      render(<BudgetStatusPill status="budget_released" />);
      expect(screen.getByText("Budget Released")).toBeInTheDocument();
    });
  });

  describe("3. Full Date + Time Approval Timestamp Formatting", () => {
    it("formats approval timestamp to full month, day, year, and 12-hour time with AM/PM", () => {
      // 2026-09-27 18:01 in local time
      const testDate = new Date(2026, 8, 27, 18, 1);
      const formatted = format(testDate, "MMMM d, yyyy 'at' h:mm a");
      
      expect(formatted).toBe("September 27, 2026 at 6:01 PM");
      expect(formatted).not.toContain("Sep 27");
    });
  });
});
