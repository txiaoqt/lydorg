import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPortal from "./AdminPortal";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import { queryClient } from "@/lib/query-client";
import { statusLabelMap, isLiquidationOverdue } from "@/lib/lydo-connect-data";
import {
  STATUS_LABEL_CONFIG,
  matchesLiquidationStatusFilter,
  LiquidationStatusLabel,
} from "./components/LiquidationReportsTable";
import type {
  BudgetRequest,
  BudgetRequestFile,
  LiquidationReport,
  LiquidationReportFile,
  OrganizationProfile,
} from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { unreadCount: 0, notifications: [] }, error: null }),
    auth: { onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }), getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  },
  isSupabaseConfigured: () => true,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isInitialized: true,
    isPasswordRecoverySession: false,
    role: "admin",
    user: {
      id: "admin-1",
      email: "admin@pasig.gov.ph",
      displayName: "Pasig Admin",
      roleCode: "super_admin",
      permissionCodes: [
        "budget_requests_review",
        "liquidation_reports_review",
        "budget_monitoring_view",
      ],
    },
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockOrg: OrganizationProfile = {
  id: "org-1",
  userId: "user-1",
  organizationName: "Pasig Youth Council",
  barangay: "San Nicolas",
  district: "District 1",
  majorClassification: "Community-Based Youth Organization",
  classification: "Community-Based Youth Organization",
  contactNumber: "09171234567",
  email: "pyc@pasig.gov.ph",
  status: "verified",
  registrationStatus: "verified",
  accreditationStatus: "accredited",
  complianceStatus: "compliant",
  points: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let currentBudgetRequests: BudgetRequest[] = [];
let currentBudgetFiles: BudgetRequestFile[] = [];
let currentLiquidationReports: LiquidationReport[] = [];
let currentLiquidationFiles: LiquidationReportFile[] = [];

vi.mock("@/lib/lydo-connect-supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lydo-connect-supabase")>();
  return {
    ...actual,
    getAdminAccountsInSupabase: vi.fn().mockResolvedValue([]),
    getAdministratorsInSupabase: vi.fn().mockResolvedValue([]),
    getAdminRolesInSupabase: vi.fn().mockResolvedValue([]),
    getAdminUnitsInSupabase: vi.fn().mockResolvedValue([]),
    fetchAllOrganizationRenewalsInSupabase: vi.fn().mockResolvedValue([]),
    fetchAllOrganizationAccreditationsInSupabase: vi.fn().mockResolvedValue([]),
    fetchAdminPortalChangeVersions: vi.fn().mockResolvedValue({
      registration: 0, renewals: 0, budgets: 0, liquidations: 0, ypop_city_led: 0, ypop_org_led: 0,
    }),
    fetchAdminReviewResourcePage: vi.fn().mockImplementation(({ resource }: { resource: "budgets" | "liquidations" }) => Promise.resolve({
      rows: resource === "budgets"
        ? currentBudgetRequests.map((request) => ({ request, organization: mockOrg }))
        : currentLiquidationReports.map((report) => ({
          report,
          budgetRequest: currentBudgetRequests.find((request) => request.id === report.budgetRequestId)
            ?? { id: report.budgetRequestId, organizationId: report.organizationId, activityTitle: "Activity" },
          organization: mockOrg,
        })),
      totalCount: resource === "budgets" ? currentBudgetRequests.length : currentLiquidationReports.length,
      page: 0, pageSize: 10, summary: {},
    })),
    fetchAdminBudgetRequestDetail: vi.fn().mockImplementation((id: string) => Promise.resolve({
      budgetRequests: currentBudgetRequests.filter((request) => request.id === id),
      budgetRequestFiles: currentBudgetFiles.filter((file) => file.budgetRequestId === id),
    })),
    fetchAdminLiquidationReportDetail: vi.fn().mockImplementation((id: string) => Promise.resolve({
      liquidationReports: currentLiquidationReports.filter((report) => report.id === id),
      liquidationReportFiles: currentLiquidationFiles.filter((file) => file.liquidationReportId === id),
      budgetRequests: currentBudgetRequests.filter((request) => currentLiquidationReports.some((report) => report.id === id && report.budgetRequestId === request.id)),
    })),
    loadAdminPortalSectionState: vi.fn().mockImplementation(() =>
      Promise.resolve({
        budgetRequests: currentBudgetRequests,
        budgetRequestFiles: currentBudgetFiles,
        liquidationReports: currentLiquidationReports,
        liquidationReportFiles: currentLiquidationFiles,
        organizationProfiles: [mockOrg],
        activityLogs: [],
        administrators: [],
        adminRoles: [],
        adminUnits: [],
        adminAccounts: [],
      }),
    ),
    loadLydoConnectSupabaseState: vi.fn().mockImplementation(() =>
      Promise.resolve({
        budgetRequests: currentBudgetRequests,
        budgetRequestFiles: currentBudgetFiles,
        liquidationReports: currentLiquidationReports,
        liquidationReportFiles: currentLiquidationFiles,
        organizationProfiles: [mockOrg],
        activityLogs: [],
      }),
    ),
    updateBudgetRequestInSupabase: vi.fn().mockImplementation((id: string, patch: any) => {
      const existing = currentBudgetRequests.find((r) => r.id === id);
      if (!existing) throw new Error("Budget request not found");
      const updated = { ...existing, ...patch };
      currentBudgetRequests = currentBudgetRequests.map((r) => (r.id === id ? updated : r));
      return Promise.resolve(updated);
    }),
    updateLiquidationReportInSupabase: vi.fn().mockImplementation((id: string, patch: any) => {
      const existing = currentLiquidationReports.find((r) => r.id === id);
      if (!existing) throw new Error("Liquidation report not found");
      const updated = { ...existing, ...patch };
      currentLiquidationReports = currentLiquidationReports.map((r) => (r.id === id ? updated : r));
      return Promise.resolve(updated);
    }),
    adminUpdateLiquidationReportFileStatusInSupabase: vi.fn().mockImplementation((id: string, patch: any) => {
      const existing = currentLiquidationFiles.find((f) => f.id === id);
      if (!existing) throw new Error("Liquidation file not found");
      const updated = { ...existing, ...patch };
      currentLiquidationFiles = currentLiquidationFiles.map((f) => (f.id === id ? updated : f));
      return Promise.resolve(updated);
    }),
    createAdminActivityLogInSupabase: vi.fn().mockResolvedValue({ id: "log-1" }),
  };
});

import {
  updateLiquidationReportInSupabase,
  adminUpdateLiquidationReportFileStatusInSupabase,
} from "@/lib/lydo-connect-supabase";
import { writeAdminSession } from "@/lib/admin-auth";
import { Toaster } from "@/components/ui/toaster";

// Mock ResizeObserver
window.ResizeObserver =
  window.ResizeObserver ||
  vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

window.HTMLElement.prototype.hasPointerCapture =
  window.HTMLElement.prototype.hasPointerCapture || vi.fn().mockReturnValue(false);
window.HTMLElement.prototype.setPointerCapture =
  window.HTMLElement.prototype.setPointerCapture || vi.fn();
window.HTMLElement.prototype.releasePointerCapture =
  window.HTMLElement.prototype.releasePointerCapture || vi.fn();
window.HTMLElement.prototype.scrollIntoView =
  window.HTMLElement.prototype.scrollIntoView || vi.fn();

describe("Liquidation Report Unified Lifecycle & Automatic Overdue", { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    writeAdminSession({
      id: "admin-1",
      username: "admin_test",
      email: "admin@pasig.gov.ph",
      displayName: "Pasig Admin",
      sessionToken: "demo-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderLiquidationMonitoring = async () => {
    const statePayload = JSON.stringify({
      budgetRequests: currentBudgetRequests,
      budgetRequestFiles: currentBudgetFiles,
      liquidationReports: currentLiquidationReports,
      liquidationReportFiles: currentLiquidationFiles,
      organizationProfiles: [mockOrg],
    });
    window.localStorage.setItem("lydo-connect-state-v1:admin:admin-1", statePayload);
    window.localStorage.setItem("lydo-connect-state-v1:admin:admin-1:demo-token", statePayload);

    const result = render(
      <MemoryRouter initialEntries={["/admin/liquidation-monitoring"]}>
        <LydoConnectProvider>
          <AdminPortal section="liquidation-monitoring" />
          <Toaster />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    const reviewButtons = await screen.findAllByRole("button", { name: /^review$/i });
    fireEvent.click(reviewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Back to Reports")).toBeDefined();
    });
    const selectedFileName = currentLiquidationFiles[0]?.fileName;
    if (selectedFileName) await screen.findAllByText(selectedFileName);

    return result;
  };

  it("1. pending_activity_completion with 0 files renders ONLY informational state (NO Review Decision header, NO dropdown, NO buttons)", async () => {
    const budgetReq: BudgetRequest = {
      id: "br-liq-1",
      organizationId: "org-1",
      activityTitle: "Youth Sports Fest",
      activityDate: "2026-10-01",
      requestedAmount: 50000,
      releasedAmount: 50000,
      status: "budget_released",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const liqReport: LiquidationReport = {
      id: "liq-rep-1",
      budgetRequestId: "br-liq-1",
      organizationId: "org-1",
      status: "pending_activity_completion",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    currentBudgetRequests = [budgetReq];
    currentBudgetFiles = [];
    currentLiquidationReports = [liqReport];
    currentLiquidationFiles = [];

    const { container } = await renderLiquidationMonitoring();

    // Purely informational card
    expect(screen.getAllByText("Pending Activity Completion").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        "The organization has not yet submitted its liquidation report. Liquidation documents can be submitted once the project activity is completed.",
      ),
    ).toBeDefined();

    // NO Review Decision heading, NO dropdown, NO buttons
    expect(screen.queryByText("Review Decision")).toBeNull();
    expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /approve liquidation/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mark overdue/i })).toBeNull();

    // Layout stability check: right column exists with 376px layout definition
    const rightCol = container.querySelector(".lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_376px\\]");
    expect(rightCol).not.toBeNull();
  });

  it("2. Organization file submission renders single Review Decision panel with Confirm Document Decision and NO legacy buttons", async () => {
    const budgetReq: BudgetRequest = {
      id: "br-liq-2",
      organizationId: "org-1",
      activityTitle: "Youth Leadership Summit",
      activityDate: "2026-10-01",
      requestedAmount: 50000,
      releasedAmount: 50000,
      status: "budget_released",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const liqReport: LiquidationReport = {
      id: "liq-rep-2",
      budgetRequestId: "br-liq-2",
      organizationId: "org-1",
      status: "submitted",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const liqFile: LiquidationReportFile = {
      id: "liq-file-2",
      liquidationReportId: "liq-rep-2",
      fileName: "Receipts_Liquidation.pdf",
      fileUrl: "https://example.com/receipts.pdf",
      fileSize: 1024,
      adminStatus: "submitted",
      uploadedAt: "2026-09-01T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    currentBudgetRequests = [budgetReq];
    currentBudgetFiles = [];
    currentLiquidationReports = [liqReport];
    currentLiquidationFiles = [liqFile];

    await renderLiquidationMonitoring();

    // Single Review Decision panel is present
    expect(screen.getByText("Review Decision")).toBeDefined();
    expect(screen.getByRole("button", { name: /confirm document decision/i })).toBeDefined();

    // NO redundant separate lifecycle buttons
    expect(screen.queryByRole("button", { name: /approve liquidation/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /request revision/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mark overdue/i })).toBeNull();
  });

  it("3. Multi-file safety: Approving 1 of 2 files keeps parent pending; approving both advances parent to approved_for_ftf_green (Onsite Required)", async () => {
    const budgetReq: BudgetRequest = {
      id: "br-liq-3",
      organizationId: "org-1",
      activityTitle: "Multi File Activity",
      activityDate: "2026-10-01",
      requestedAmount: 50000,
      releasedAmount: 50000,
      status: "budget_released",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const liqReport: LiquidationReport = {
      id: "liq-rep-3",
      budgetRequestId: "br-liq-3",
      organizationId: "org-1",
      status: "submitted",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const fileA: LiquidationReportFile = {
      id: "file-3-a",
      liquidationReportId: "liq-rep-3",
      fileName: "Receipts_Part1.pdf",
      fileUrl: "https://example.com/receipts1.pdf",
      fileSize: 1024,
      adminStatus: "submitted",
      uploadedAt: "2026-09-01T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const fileB: LiquidationReportFile = {
      id: "file-3-b",
      liquidationReportId: "liq-rep-3",
      fileName: "Receipts_Part2.pdf",
      fileUrl: "https://example.com/receipts2.pdf",
      fileSize: 1024,
      adminStatus: "submitted",
      uploadedAt: "2026-09-01T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    currentBudgetRequests = [budgetReq];
    currentBudgetFiles = [];
    currentLiquidationReports = [liqReport];
    currentLiquidationFiles = [fileA, fileB];

    await renderLiquidationMonitoring();

    // Select File A (checkboxes[0] is Select All, checkboxes[1] is File A)
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    const confirmBtn1 = screen.getByRole("button", { name: /confirm document decision/i });
    fireEvent.click(confirmBtn1);

    const submitBtn1 = await screen.findByRole("button", { name: /submit review/i });
    fireEvent.click(submitBtn1);

    // File A is approved in Supabase, but parent remains submitted
    await waitFor(() => {
      expect(adminUpdateLiquidationReportFileStatusInSupabase).toHaveBeenCalledWith(
        "file-3-a",
        expect.objectContaining({ adminStatus: "approved_green" }),
      );
      expect(currentLiquidationFiles.find((f) => f.id === "file-3-a")?.adminStatus).toBe("approved_green");
      expect(currentLiquidationReports[0].status).toBe("submitted");
    });

    await screen.findByText(/Review remaining documents to advance the liquidation report/i);

    // Now select File B (checkboxes[0] is Select All, [1] is File A, [2] is File B)
    const updatedCheckboxes = screen.getAllByRole("checkbox");
    fireEvent.click(updatedCheckboxes[2]);

    const confirmBtn2 = screen.getByRole("button", { name: /confirm document decision/i });
    fireEvent.click(confirmBtn2);

    const submitBtn2 = await screen.findByRole("button", { name: /submit review/i });
    fireEvent.click(submitBtn2);

    // Both files now approved -> parent advances to approved_for_ftf_green
    await waitFor(() => {
      expect(adminUpdateLiquidationReportFileStatusInSupabase).toHaveBeenCalledWith(
        "file-3-b",
        expect.objectContaining({ adminStatus: "approved_green" }),
      );
      expect(updateLiquidationReportInSupabase).toHaveBeenCalledWith(
        "liq-rep-3",
        expect.objectContaining({ status: "approved_for_ftf_green" }),
      );
      expect(currentLiquidationReports[0].status).toBe("approved_for_ftf_green");
    });
  });

  it("4. approved_for_ftf_green renders dedicated Approved — Onsite Required panel and button Liquidated", async () => {
    const budgetReq: BudgetRequest = {
      id: "br-liq-4",
      organizationId: "org-1",
      activityTitle: "Onsite Activity",
      activityDate: "2026-10-01",
      requestedAmount: 50000,
      releasedAmount: 50000,
      status: "budget_released",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const liqReport: LiquidationReport = {
      id: "liq-rep-4",
      budgetRequestId: "br-liq-4",
      organizationId: "org-1",
      status: "approved_for_ftf_green",
      goSignalAt: "2026-09-05T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    currentBudgetRequests = [budgetReq];
    currentBudgetFiles = [];
    currentLiquidationReports = [liqReport];
    currentLiquidationFiles = [];

    await renderLiquidationMonitoring();

    // Shows Approved banner with full date + time
    expect(screen.getByText(/Approved · September 5, 2026/i)).toBeDefined();

    // Shows dedicated Approved — Onsite Required panel and Liquidated action button
    expect(screen.getByText("Review Decision")).toBeDefined();
    expect(screen.getAllByText("Onsite Required").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Approved — Onsite Required")).toBeDefined();
    expect(screen.getByText(/The liquidation report has been approved. The organization must complete the required onsite process before the liquidation can be finalized./i)).toBeDefined();
    expect(screen.getByRole("button", { name: /^Liquidated$/i })).toBeDefined();

    // NO dropdown or Confirm Document Decision
    expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mark hardcopy submitted/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mark overdue/i })).toBeNull();

    // Clicking Liquidated advances the lifecycle
    fireEvent.click(screen.getByRole("button", { name: /^Liquidated$/i }));
    await waitFor(() => {
      expect(updateLiquidationReportInSupabase).toHaveBeenCalledWith(
        "liq-rep-4",
        expect.objectContaining({ status: "completed_liquidated" }),
      );
    });
  });

  it("5. completed_liquidated renders clean terminal state with zero buttons or dropdowns", async () => {
    const budgetReq: BudgetRequest = {
      id: "br-liq-5",
      organizationId: "org-1",
      activityTitle: "Completed Activity",
      activityDate: "2026-10-01",
      requestedAmount: 50000,
      releasedAmount: 50000,
      status: "budget_released",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const liqReport: LiquidationReport = {
      id: "liq-rep-5",
      budgetRequestId: "br-liq-5",
      organizationId: "org-1",
      status: "completed_liquidated",
      completedAt: "2026-09-10T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-10T00:00:00.000Z",
    };

    currentBudgetRequests = [budgetReq];
    currentBudgetFiles = [];
    currentLiquidationReports = [liqReport];
    currentLiquidationFiles = [];

    await renderLiquidationMonitoring();

    expect(screen.getAllByText("Liquidated").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This liquidation report has been finalized and recorded as liquidated.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /complete liquidation/i })).toBeNull();
  });

  it("6. Automatic overdue is derived, includes report in Overdue filter, and never marks completed_liquidated as overdue", () => {
    const pastDeadline = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const futureDeadline = new Date(Date.now() + 86400000).toISOString(); // 1 day in future

    // Active status with past deadline is overdue
    expect(isLiquidationOverdue(pastDeadline, "submitted")).toBe(true);
    expect(isLiquidationOverdue(pastDeadline, "approved_for_ftf_green")).toBe(true);
    expect(isLiquidationOverdue(pastDeadline, "pending_activity_completion")).toBe(true);

    // Active status with future deadline is NOT overdue
    expect(isLiquidationOverdue(futureDeadline, "submitted")).toBe(false);

    // completed_liquidated is NEVER overdue even with past deadline
    expect(isLiquidationOverdue(pastDeadline, "completed_liquidated")).toBe(false);

    // Filter matching includes derived overdue reports
    expect(matchesLiquidationStatusFilter("submitted", "overdue", pastDeadline)).toBe(true);
    expect(matchesLiquidationStatusFilter("submitted", "overdue", futureDeadline)).toBe(false);
    expect(matchesLiquidationStatusFilter("completed_liquidated", "overdue", pastDeadline)).toBe(false);
  });

  it("7. STATUS_LABEL_CONFIG has compact label 'Onsite Required' for admin and 'Onsite Required' for user", () => {
    expect(STATUS_LABEL_CONFIG.approved_for_ftf_green.label).toBe("Onsite Required");
    expect(statusLabelMap["approved_for_ftf_green"]).toBe("Onsite Required");
    expect(statusLabelMap["completed_liquidated"]).toBe("Liquidated");
  });

  it("8. LiquidationStatusLabel displays Overdue badge when deadline has passed", () => {
    const pastDeadline = new Date(Date.now() - 86400000).toISOString();
    const { rerender } = render(<LiquidationStatusLabel status="submitted" deadlineAt={pastDeadline} />);
    expect(screen.getByText("Overdue")).toBeDefined();

    // If completed_liquidated, it renders Liquidated badge even if deadline was in past
    rerender(<LiquidationStatusLabel status="completed_liquidated" deadlineAt={pastDeadline} />);
    expect(screen.getByText("Liquidated")).toBeDefined();
    expect(screen.queryByText("Overdue")).toBeNull();
  });
});
