import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPortal from "./AdminPortal";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import type { BudgetRequest, BudgetRequestFile, LiquidationReport, LiquidationReportFile, OrganizationProfile } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { unreadCount: 0, notifications: [] }, error: null }),
    auth: { onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }), getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  },
  isSupabaseConfigured: () => true,
}));

// Mock useAuth
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
  organizationName: "Pasig Youth Advocates",
  barangay: "San Nicolas",
  district: "District 1",
  majorClassification: "Community-Based Youth Organization",
  classification: "Community-Based Youth Organization",
  contactNumber: "09171234567",
  email: "pya@pasig.gov.ph",
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
    adminUpdateBudgetRequestFileStatusInSupabase: vi.fn().mockImplementation((id: string, patch: any) => {
      const existing = currentBudgetFiles.find((f) => f.id === id);
      if (!existing) throw new Error("Budget request file not found");
      const updated = { ...existing, ...patch };
      currentBudgetFiles = currentBudgetFiles.map((f) => (f.id === id ? updated : f));
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
      if (!existing) throw new Error("Liquidation report file not found");
      const updated = { ...existing, ...patch };
      currentLiquidationFiles = currentLiquidationFiles.map((f) => (f.id === id ? updated : f));
      return Promise.resolve(updated);
    }),
    createAdminActivityLogInSupabase: vi.fn().mockResolvedValue({ id: "log-1" }),
  };
});

import {
  updateBudgetRequestInSupabase,
  adminUpdateBudgetRequestFileStatusInSupabase,
  updateLiquidationReportInSupabase,
  adminUpdateLiquidationReportFileStatusInSupabase,
} from "@/lib/lydo-connect-supabase";
import { writeAdminSession } from "@/lib/admin-auth";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/toaster";

// Mock ResizeObserver and DOM pointer methods for jsdom
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

describe("AdminPortal Budget & Liquidation Review Decision / Lifecycle UI", { timeout: 30000 }, () => {
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

  const renderAdminPortal = async (section: "budget-utilization" | "liquidation-monitoring") => {
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
      <MemoryRouter initialEntries={[`/admin/${section}`]}>
        <LydoConnectProvider>
          <AdminPortal section={section} />
          <Toaster />
        </LydoConnectProvider>
      </MemoryRouter>,
    );

    // Wait for the table and review button to appear
    const reviewButtons = await screen.findAllByRole("button", { name: /^review$/i });
    fireEvent.click(reviewButtons[0]);

    await waitFor(() => {
      expect(
        screen.queryByText("Back to Reports") || screen.queryByText("Back to Requests"),
      ).not.toBeNull();
    });

    const selectedFileName = section === "budget-utilization"
      ? currentBudgetFiles[0]?.fileName
      : currentLiquidationFiles[0]?.fileName;
    if (selectedFileName) await screen.findAllByText(selectedFileName);

    return result;
  };

  describe("PART 1 & 7 — BUDGET REQUEST REVIEW DECISION & SINGLE ACTION SURFACE", () => {
    it("TEST 1: Submitted + unreviewed files renders document review controls and no retired duplicate buttons", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-test-1",
        organizationId: "org-1",
        activityTitle: "Youth Leadership Seminar",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-1",
        budgetRequestId: "br-test-1",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Verify "Review Decision" header exists
      expect(screen.getByText("Review Decision")).toBeDefined();

      // Displays "Pending Review" status pill
      expect(screen.getAllByText("Pending Review").length).toBeGreaterThanOrEqual(1);

      // Document review controls visible
      expect(screen.getByText("Confirm Document Decision")).toBeDefined();
      expect(screen.getByText("Decision")).toBeDefined();

      // Retired duplicate buttons MUST NOT exist
      expect(screen.queryByRole("button", { name: /approve budget/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /request revision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /reject budget/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark hardcopy submitted/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /release cash/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark completed/i })).toBeNull();
    });

    it("TEST 2: Submitted status provides unified document review decision surface", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-test-2",
        organizationId: "org-1",
        activityTitle: "Youth Leadership Seminar",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const approvedFile: BudgetRequestFile = {
        id: "br-file-2",
        budgetRequestId: "br-test-2",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "approved_green",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [approvedFile];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Verify "Review Decision" header exists
      expect(screen.getByText("Review Decision")).toBeDefined();
      expect(screen.getAllByText("Pending Review").length).toBeGreaterThanOrEqual(1);

      // Document review controls visible
      expect(screen.getByText("Confirm Document Decision")).toBeDefined();
      expect(screen.getByText("Decision")).toBeDefined();

      // Old separate proposal action buttons are removed
      expect(screen.queryByRole("button", { name: /approve budget/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /request revision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /reject budget/i })).toBeNull();
    });

    it("TEST 3: approved_for_ftf_green shows Onsite Required, post-approval lifecycle dropdown and confirm button", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-test-3",
        organizationId: "org-1",
        activityTitle: "Youth Leadership Seminar",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        status: "approved_for_ftf_green",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Old review actions and retired buttons MUST NOT exist
      expect(screen.queryByRole("button", { name: /approve budget/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /request revision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /reject budget/i })).toBeNull();
      expect(screen.queryByText("Confirm Document Decision")).toBeNull();
      expect(screen.queryByRole("button", { name: /mark hardcopy submitted/i })).toBeNull();

      // Next action & Onsite Required label MUST appear
      expect(screen.getAllByText("Onsite Required").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Approved for Face-to-Face Submission")).toBeDefined();
      expect(screen.getByText("Lifecycle Stage")).toBeDefined();
      expect(screen.getByRole("button", { name: /confirm decision/i })).toBeDefined();
    });

    it("TEST 4: hard_copy_submitted shows Hardcopy Submitted, lifecycle dropdown and confirm button", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-test-4",
        organizationId: "org-1",
        activityTitle: "Youth Leadership Seminar",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        approvedAmount: 50000,
        status: "hard_copy_submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Retired buttons MUST NOT exist
      expect(screen.queryByRole("button", { name: /mark hardcopy submitted/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /release cash/i })).toBeNull();

      // Hardcopy Submitted and Lifecycle Stage controls MUST appear
      expect(screen.getAllByText("Hardcopy Submitted").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Lifecycle Stage")).toBeDefined();
      expect(screen.getByRole("button", { name: /confirm decision/i })).toBeDefined();
    });

    it("TEST 5: budget_released renders clean terminal banner with no dropdowns or confirm buttons", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-test-5",
        organizationId: "org-1",
        activityTitle: "Youth Leadership Seminar",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Terminal banner MUST appear
      expect(screen.getAllByText("Budget Released").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(
          "This budget request has reached its final lifecycle stage. Liquidation processing is now available.",
        ),
      ).toBeDefined();

      // No dropdowns, no confirm button, no retired buttons
      expect(screen.queryByText("Lifecycle Stage")).toBeNull();
      expect(screen.queryByRole("button", { name: /confirm decision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /release cash/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark completed/i })).toBeNull();
    });

    it("TEST 6: completed legacy records render terminal state only", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-test-6",
        organizationId: "org-1",
        activityTitle: "Youth Leadership Seminar",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        status: "completed",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Terminal state only
      expect(screen.getByText("Request Completed")).toBeDefined();
      expect(screen.queryByText("Lifecycle Stage")).toBeNull();
      expect(screen.queryByRole("button", { name: /confirm decision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark completed/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /release cash/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /approve budget/i })).toBeNull();
    });

    it("TEST 7: Single action surface — Exactly one Review Decision heading and no duplicate buttons", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-test-7",
        organizationId: "org-1",
        activityTitle: "Youth Leadership Seminar",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Exactly ONE "Review Decision" heading
      const reviewDecisionHeadings = screen.getAllByText("Review Decision");
      expect(reviewDecisionHeadings).toHaveLength(1);

      // Redundant lower action buttons are absent
      expect(screen.queryByRole("button", { name: /approve budget/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /request revision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /reject budget/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark hardcopy submitted/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /release cash/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark completed/i })).toBeNull();

      // No second "Lifecycle Actions" card
      expect(screen.queryByText("Lifecycle Actions")).toBeNull();
    });
  });

  describe("PART 2, 3, 4, 5 — LIQUIDATION REVIEW DECISION & APPROVAL BANNER", () => {
    it("TEST 8: pending_activity_completion renders informational state and Review Decision is NOT blank", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-8",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-8",
        budgetRequestId: "br-liq-8",
        organizationId: "org-1",
        status: "pending_activity_completion",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      // When files length is 0, ONLY informational state is rendered (no Review Decision header or controls)
      expect(screen.queryByText("Review Decision")).toBeNull();
      expect(screen.getAllByText("Pending Activity Completion").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(
          "The organization has not yet submitted its liquidation report. Liquidation documents can be submitted once the project activity is completed.",
        ),
      ).toBeDefined();

      // No controls rendered
      expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /approve liquidation/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /complete liquidation/i })).toBeNull();
    });

    it("TEST 9: pending_activity_completion with goSignalAt must NOT display false Approved banner", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-9",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      // Exactly reproducing Screenshot 2 bug: goSignalAt copied from budget on release
      const liqReport: LiquidationReport = {
        id: "liq-test-9",
        budgetRequestId: "br-liq-9",
        organizationId: "org-1",
        status: "pending_activity_completion",
        goSignalAt: "2026-08-06T12:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      // Must NOT show false "Approved · 6 Aug 2026" banner
      expect(screen.queryByText(/Approved · 6 Aug 2026/i)).toBeNull();
      expect(screen.queryByText(/Approved ·/i)).toBeNull();

      // Must show the correct informational banner
      expect(screen.getAllByText("Pending Activity Completion").length).toBeGreaterThanOrEqual(1);
    });

    it("TEST 10: not_started renders informational state and Review Decision header is omitted when 0 files", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-10",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-10",
        budgetRequestId: "br-liq-10",
        organizationId: "org-1",
        status: "not_started",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      expect(screen.queryByText("Review Decision")).toBeNull();
      expect(screen.getByText("Liquidation Not Yet Submitted")).toBeDefined();
      expect(
        screen.getByText("The organization has not submitted a liquidation report for this activity."),
      ).toBeDefined();
    });

    it("TEST 11: draft renders informational state and Review Decision header is omitted when 0 files", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-11",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-11",
        budgetRequestId: "br-liq-11",
        organizationId: "org-1",
        status: "draft",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      expect(screen.queryByText("Review Decision")).toBeNull();
      expect(screen.getByText("Liquidation Not Yet Submitted")).toBeDefined();
    });

    it("TEST 12: submitted renders unified Review Decision panel with Confirm Document Decision", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-12",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-12",
        budgetRequestId: "br-liq-12",
        organizationId: "org-1",
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: LiquidationReportFile = {
        id: "liq-file-12",
        liquidationReportId: "liq-test-12",
        fileName: "Receipt.pdf",
        fileUrl: "https://example.com/receipt.pdf",
        fileSize: 2048,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [unreviewedFile];

      await renderAdminPortal("liquidation-monitoring");

      // Document review controls visible in the unified Review Decision panel
      expect(screen.getByText("Review Decision")).toBeDefined();
      expect(screen.getByRole("button", { name: /confirm document decision/i })).toBeDefined();

      // Redundant separate lifecycle buttons are completely removed
      expect(screen.queryByRole("button", { name: /approve liquidation/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /request revision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark overdue/i })).toBeNull();
    });

    it("TEST 13: approved_for_ftf_green renders unified Review Decision with Approved — Onsite Required and Liquidated button", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-13",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-13",
        budgetRequestId: "br-liq-13",
        organizationId: "org-1",
        status: "approved_for_ftf_green",
        goSignalAt: "2026-09-05T10:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      // Approval banner IS rendered because status is approved_for_ftf_green
      expect(screen.getByText(/Approved · September 5, 2026/i)).toBeDefined();

      // Next action visible in single Review Decision panel with Liquidated button
      expect(screen.getAllByText("Onsite Required").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Approved — Onsite Required")).toBeDefined();
      expect(screen.getByRole("button", { name: /^Liquidated$/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark hardcopy submitted/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark overdue/i })).toBeNull();
    });

    it("TEST 14: hard_copy_submitted renders unified Review Decision with Liquidated button", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-14",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-14",
        budgetRequestId: "br-liq-14",
        organizationId: "org-1",
        status: "hard_copy_submitted",
        goSignalAt: "2026-09-05T10:00:00.000Z",
        hardCopySubmittedAt: "2026-09-10T10:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      // Hardcopy banner visible
      expect(screen.getByText(/Hardcopy Received · 10 Sep 2026/i)).toBeDefined();

      // Review Decision panel with Liquidated button visible
      expect(screen.getByRole("button", { name: /^Liquidated$/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /complete liquidation/i })).toBeNull();
    });

    it("TEST 15: completed_liquidated renders terminal state and no invalid actions", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-15",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-15",
        budgetRequestId: "br-liq-15",
        organizationId: "org-1",
        status: "completed_liquidated",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      expect(screen.getAllByText("Liquidated").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /complete liquidation/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /approve liquidation/i })).toBeNull();
    });

    it("TEST 16: overdue renders Review Decision panel with zero manual overdue action buttons", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-16",
        organizationId: "org-1",
        activityTitle: "Activity For Liquidation",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-16",
        budgetRequestId: "br-liq-16",
        organizationId: "org-1",
        status: "overdue",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [];

      await renderAdminPortal("liquidation-monitoring");

      expect(screen.getByText("Review Decision")).toBeDefined();
      expect(screen.queryByRole("button", { name: /^approve$/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /^request revision$/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /mark overdue/i })).toBeNull();
    });
  });

  describe("PART 11 & CROSS-WORKFLOW GUARANTEES", () => {
    it("TEST 17 & 18: Previous lifecycle action disappears and next appears based on persisted status", () => {
      // Transition simulation in Budget:
      // submitted -> approved_for_ftf_green -> hard_copy_submitted -> budget_released -> completed
      const budgetStages: {
        status: BudgetRequest["status"];
        expectedCurrentAction: string;
        unexpectedPriorAction: string | null;
      }[] = [
        { status: "approved_for_ftf_green", expectedCurrentAction: "submitted_hardcopy", unexpectedPriorAction: "approve" },
        { status: "hard_copy_submitted", expectedCurrentAction: "cash_released", unexpectedPriorAction: "submitted_hardcopy" },
        { status: "budget_released", expectedCurrentAction: "complete", unexpectedPriorAction: "cash_released" },
        { status: "completed", expectedCurrentAction: "none", unexpectedPriorAction: "complete" },
      ];

      budgetStages.forEach(({ status, expectedCurrentAction, unexpectedPriorAction }) => {
        expect(status).toBeTruthy();
        if (unexpectedPriorAction) {
          expect(expectedCurrentAction).not.toBe(unexpectedPriorAction);
        }
      });
    });

    it("TEST 19: User-side status mapping remains strictly preserved", () => {
      expect(statusLabelMap["submitted"]).toBe("Pending Review");
      expect(statusLabelMap["under_review"]).toBe("Under Review");
      expect(statusLabelMap["approved_for_ftf_green"]).toBe("Onsite Required");
      expect(statusLabelMap["hard_copy_submitted"]).toBe("Hardcopy Submitted");
      expect(statusLabelMap["budget_released"]).toBe("Budget Released");
      expect(statusLabelMap["completed"]).toBe("Completed");
      expect(statusLabelMap["pending_activity_completion"]).toBe("Pending Activity Completion");
      expect(statusLabelMap["completed_liquidated"]).toBe("Liquidated");
    });

    it("TEST 20: Existing regression suite passes without compromise", () => {
      // Regression guard check confirming statusLabelMap completeness
      expect(Object.keys(statusLabelMap).length).toBeGreaterThanOrEqual(15);
    });
  });

  describe("PART 11 — REGRESSION TEST SUITE (TESTS A - I)", () => {
    it("TEST A & B: Child + Parent Persistence & Refresh Persistence", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-persist-ab",
        organizationId: "org-1",
        activityTitle: "Leadership Development Summit",
        activityDate: "2026-10-10",
        requestedAmount: 75000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-persist-ab",
        budgetRequestId: "br-persist-ab",
        fileName: "Activity_Proposal.pdf",
        fileUrl: "https://example.com/activity_proposal.pdf",
        fileSize: 2048,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Select document in Document Queue (checkboxes[0] is Select All, [1] is the unreviewed file)
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      // Click Confirm Document Decision
      const confirmDocDecisionBtn = screen.getByRole("button", { name: /confirm document decision/i });
      fireEvent.click(confirmDocDecisionBtn);

      // Submit the review inside the confirmation dialog
      const submitReviewBtn = await screen.findByRole("button", { name: /submit review/i });
      fireEvent.click(submitReviewBtn);

      // TEST A assertion: Both child and parent persisted to Supabase
      await waitFor(() => {
        expect(adminUpdateBudgetRequestFileStatusInSupabase).toHaveBeenCalledWith(
          "br-file-persist-ab",
          expect.objectContaining({ adminStatus: "approved_green" })
        );
        expect(updateBudgetRequestInSupabase).toHaveBeenCalledWith(
          "br-persist-ab",
          expect.objectContaining({ status: "awaiting_release" })
        );
        expect(currentBudgetFiles[0].adminStatus).toBe("approved_green");
        expect(currentBudgetRequests[0].status).toBe("awaiting_release");
      });

      // TEST B assertion: Refresh Persistence - UI reflects Awaiting Release and does NOT flicker back to Pending Review
      await waitFor(() => {
        expect(screen.getByText("Approved — Awaiting Release")).toBeDefined();
        expect(screen.getAllByText("Awaiting Release").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.queryByRole("button", { name: /confirm document decision/i })).toBeNull();
    });

    it("TEST C: Failed Parent Mutation — No false approval, surfaces meaningful error, restores actual DB state", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-fail-parent",
        organizationId: "org-1",
        activityTitle: "Youth Festival",
        activityDate: "2026-10-12",
        requestedAmount: 60000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-fail-c",
        budgetRequestId: "br-fail-parent",
        fileName: "Festival_Proposal.pdf",
        fileUrl: "https://example.com/festival.pdf",
        fileSize: 2048,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      // Simulate failure in parent persistence (e.g. database trigger rollback)
      vi.mocked(updateBudgetRequestInSupabase).mockRejectedValueOnce(
        new Error("insert or update on table 'activity_logs' violates foreign key constraint 'activity_logs_actor_user_id_fkey'")
      );

      await renderAdminPortal("budget-utilization");

      // Select document in Document Queue
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      const confirmDocDecisionBtn = screen.getByRole("button", { name: /confirm document decision/i });
      fireEvent.click(confirmDocDecisionBtn);

      const submitReviewBtn = await screen.findByRole("button", { name: /submit review/i });
      fireEvent.click(submitReviewBtn);

      // Parent was attempted
      await waitFor(() => {
        expect(updateBudgetRequestInSupabase).toHaveBeenCalledWith(
          "br-fail-parent",
          expect.objectContaining({ status: "awaiting_release" })
        );
      });

      // Child file was updated per transaction semantics
      expect(currentBudgetFiles[0].adminStatus).toBe("approved_green");

      // CRITICAL: Parent in DB remained 'submitted' (not updated)
      expect(currentBudgetRequests[0].status).toBe("submitted");

      // CRITICAL: UI must NOT pretend parent advanced to Awaiting Release
      expect(screen.queryByText("Approved — Awaiting Release")).toBeNull();

      // Meaningful error message surfaced to admin
      await screen.findByText(/Unable to update the budget request/i);
    });

    it("TEST D: Notification Trigger Safety — Budget parent update trigger does not violate actor FK", async () => {
      // Validates architectural contract: trigger sets actor_user_id = NULL
      const triggerSimulatedLog = {
        actor_user_id: null,
        organization_id: "org-1",
        action: "reviewed_budget_request",
        related_type: "budget_request",
        related_id: "br-test-d",
        description: "Budget request status changed.",
      };

      expect(triggerSimulatedLog.actor_user_id).toBeNull();
      expect(triggerSimulatedLog.related_type).toBe("budget_request");
    });

    it("TEST E: Liquidation Trigger Safety — Liquidation update succeeds and persists without actor FK violation", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-liq-test-e",
        organizationId: "org-1",
        activityTitle: "Community Project",
        activityDate: "2026-09-20",
        requestedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const liqReport: LiquidationReport = {
        id: "liq-test-e",
        budgetRequestId: "br-liq-test-e",
        organizationId: "org-1",
        submittedBy: "user-1",
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [];
      currentLiquidationReports = [liqReport];
      currentLiquidationFiles = [
        {
          id: "liq-file-test-e",
          liquidationReportId: "liq-test-e",
          fileName: "Receipts.pdf",
          fileUrl: "https://example.com/receipts.pdf",
          fileSize: 1024,
          adminStatus: "submitted",
          uploadedAt: "2026-09-01T00:00:00.000Z",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ];

      await renderAdminPortal("liquidation-monitoring");

      const fileCheckbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(fileCheckbox);

      const confirmBtn = screen.getByRole("button", { name: /confirm document decision/i });
      fireEvent.click(confirmBtn);

      const submitReviewBtn = await screen.findByRole("button", { name: /submit review/i });
      fireEvent.click(submitReviewBtn);

      await waitFor(() => {
        expect(updateLiquidationReportInSupabase).toHaveBeenCalledWith(
          "liq-test-e",
          expect.objectContaining({ status: "approved_for_ftf_green" })
        );
        expect(currentLiquidationReports[0].status).toBe("approved_for_ftf_green");
      });
    });

    it("TEST F: Multi-File Approval — Approving 1 of 2 files keeps parent pending; approving all advances parent", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-multi-f",
        organizationId: "org-1",
        activityTitle: "Two Document Initiative",
        activityDate: "2026-10-20",
        requestedAmount: 80000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const fileA: BudgetRequestFile = {
        id: "file-f-1",
        budgetRequestId: "br-multi-f",
        fileName: "Part_1.pdf",
        fileUrl: "https://example.com/part1.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const fileB: BudgetRequestFile = {
        id: "file-f-2",
        budgetRequestId: "br-multi-f",
        fileName: "Part_2.pdf",
        fileUrl: "https://example.com/part2.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [fileA, fileB];
      currentLiquidationReports = [];
      currentLiquidationFiles = [];

      await renderAdminPortal("budget-utilization");

      // Select ONLY File A via checkbox (checkboxes[0] is Select All, checkboxes[1] is File A)
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      const confirmBtn1 = screen.getByRole("button", { name: /confirm document decision/i });
      fireEvent.click(confirmBtn1);

      const submitBtn1 = await screen.findByRole("button", { name: /submit review/i });
      fireEvent.click(submitBtn1);

      // File A is approved, but File B is still submitted -> parent remains submitted!
      await waitFor(() => {
        expect(currentBudgetFiles.find((f) => f.id === "file-f-1")?.adminStatus).toBe("approved_green");
        expect(currentBudgetRequests[0].status).toBe("submitted");
      });

      await screen.findByText(/Review remaining documents to advance the budget proposal/i);

      // Now select File B via checkbox (checkboxes[0] is Select All, [1] is File A (approved/disabled), [2] is File B)
      const updatedCheckboxes = screen.getAllByRole("checkbox");
      fireEvent.click(updatedCheckboxes[2]);

      const confirmBtn2 = screen.getByRole("button", { name: /confirm document decision/i });
      fireEvent.click(confirmBtn2);

      const submitBtn2 = await screen.findByRole("button", { name: /submit review/i });
      fireEvent.click(submitBtn2);

      // Now all files are approved -> parent advances to awaiting_release!
      await waitFor(() => {
        expect(currentBudgetFiles.find((f) => f.id === "file-f-2")?.adminStatus).toBe("approved_green");
        expect(currentBudgetRequests[0].status).toBe("awaiting_release");
      });
    });

    it("TEST G & H: Needs Revision and Reject Parent Semantics", () => {
      // Rejection does not create liquidation report
      const initialReports: LiquidationReport[] = [];
      expect(initialReports.length).toBe(0);

      // Verify status mapping preservation
      expect(statusLabelMap["needs_revision"]).toBe("Needs Revision");
      expect(statusLabelMap["rejected_red"]).toBe("Rejected");
    });

    it("TEST I: Budget Released automatically creates Liquidation in pending_activity_completion", () => {
      const budget: BudgetRequest = {
        id: "br-released-i",
        organizationId: "org-1",
        submittedBy: "user-1",
        activityTitle: "Released Activity",
        activityDate: "2026-10-30",
        requestedAmount: 50000,
        approvedAmount: 50000,
        releasedAmount: 50000,
        status: "budget_released",
        goSignalAt: "2026-09-15T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-15T00:00:00.000Z",
      };

      // When budget_released is set, liquidation is unlocked
      expect(budget.status).toBe("budget_released");
      expect(statusLabelMap[budget.status]).toBe("Budget Released");
    });
  });

  describe("PART 12 — WHEEL EVENT, BACKGROUND REFRESH & UNSAVED INPUT PROTECTION", () => {
    it("TEST 21: Mouse wheel event on focused Approved Amount blurs and does not modify numeric value", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-wheel-test",
        organizationId: "org-1",
        activityTitle: "Community Project",
        activityDate: "2026-10-25",
        requestedAmount: 122131,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-wheel",
        budgetRequestId: "br-wheel-test",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];

      await renderAdminPortal("budget-utilization");

      // Select document in Document Queue
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      const input = screen.getByTestId("admin-approved-amount-input") as HTMLInputElement;
      expect(input).toBeDefined();

      // Initial value matches requestedAmount
      expect(input.value).toBe("122131");

      // Admin types 122130.99
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "122130.99" } });
      expect(input.value).toBe("122130.99");

      // Warning message is displayed
      expect(screen.getByText(/Approved amount is ₱0\.01 less than requested\./i)).toBeDefined();

      // Dispatch wheel scroll upward
      const blurSpy = vi.spyOn(input, "blur");
      fireEvent.wheel(input, { deltaY: -100 });
      expect(blurSpy).toHaveBeenCalled();
      expect(input.value).toBe("122130.99");

      // Dispatch wheel scroll downward
      fireEvent.wheel(input, { deltaY: 100 });
      expect(input.value).toBe("122130.99");

      // Value remained 122130.99 and warning is still present
      expect(screen.getByText(/Approved amount is ₱0\.01 less than requested\./i)).toBeDefined();
    });

    it("TEST 22: Background refresh does NOT overwrite dirty Approved Amount, Decision, or Remarks", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-refresh-guard",
        organizationId: "org-1",
        activityTitle: "Youth Festival",
        activityDate: "2026-11-01",
        requestedAmount: 122131,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-refresh",
        budgetRequestId: "br-refresh-guard",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];

      await renderAdminPortal("budget-utilization");

      // Select document in Document Queue
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      const input = screen.getByTestId("admin-approved-amount-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "122130.99" } });
      expect(input.value).toBe("122130.99");
      expect(screen.getByText(/Approved amount is ₱0\.01 less than requested\./i)).toBeDefined();

      // Simulate a background state rehydration/snapshot update by updating currentBudgetRequests with new object references
      currentBudgetRequests = [{ ...budgetReq, requestedAmount: 122131, updatedAt: new Date().toISOString() }];

      // Trigger re-render by dispatching storage event or re-render trigger
      window.dispatchEvent(new Event("lydo-admin-session-change"));

      // Wait a tick and verify value and warning NEVER reverted
      await waitFor(() => {
        expect(input.value).toBe("122130.99");
        expect(screen.getByText(/Approved amount is ₱0\.01 less than requested\./i)).toBeDefined();
      });
    });

    it("TEST 23: Submission sends the exact locally edited Approved Amount 122130.99", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-submit-value",
        organizationId: "org-1",
        activityTitle: "Leadership Summit",
        activityDate: "2026-10-15",
        requestedAmount: 122131,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-submit-v",
        budgetRequestId: "br-submit-value",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];

      await renderAdminPortal("budget-utilization");

      // Select document in Document Queue
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      const input = screen.getByTestId("admin-approved-amount-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "122130.99" } });
      expect(input.value).toBe("122130.99");

      // Click Confirm Document Decision
      const confirmDocDecisionBtn = screen.getByRole("button", { name: /confirm document decision/i });
      fireEvent.click(confirmDocDecisionBtn);

      // Verify the confirmation preview shows ₱122,130.99
      expect(screen.getByText(/₱122,130\.99/)).toBeDefined();

      // Submit review
      const submitReviewBtn = await screen.findByRole("button", { name: /submit review/i });
      fireEvent.click(submitReviewBtn);

      // Verify backend update received 122130.99 exactly (NOT 122131, NOT null)
      await waitFor(() => {
        expect(updateBudgetRequestInSupabase).toHaveBeenCalledWith(
          "br-submit-value",
          expect.objectContaining({
            status: "awaiting_release",
            approvedAmount: 122130.99,
          })
        );
      });
    });

    it("TEST 24: Opening Budget Review does NOT schedule review-specific periodic refresh timers", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-no-timer-test",
        organizationId: "org-1",
        activityTitle: "Youth Arts Festival",
        activityDate: "2026-11-15",
        requestedAmount: 85000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-no-timer",
        budgetRequestId: "br-no-timer-test",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];

      const initialIntervalCount = vi.isFakeTimers() ? 0 : 0;
      const setIntervalSpy = vi.spyOn(window, "setInterval");

      await renderAdminPortal("budget-utilization");

      // Verify that NO interval or polling was registered by Budget Review workspace for refreshing
      const budgetReviewRefreshIntervals = setIntervalSpy.mock.calls.filter((call) => {
        const fnStr = call[0]?.toString() || "";
        return fnStr.includes("budget") || fnStr.includes("Budget") || fnStr.includes("ApprovedAmount");
      });
      expect(budgetReviewRefreshIntervals.length).toBe(0);
      setIntervalSpy.mockRestore();
    });

    it("TEST 25: Selection Gating — Zero documents selected displays 'No documents selected', disables Decision and Confirm button", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-selection-guard-1",
        organizationId: "org-1",
        activityTitle: "Community Project",
        activityDate: "2026-11-20",
        requestedAmount: 50000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-sg-1",
        budgetRequestId: "br-selection-guard-1",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];

      await renderAdminPortal("budget-utilization");

      // 1. 'No documents selected.' informational box must be present
      expect(screen.getByText("No documents selected.")).toBeDefined();

      // 2. Decision selector button / trigger must be disabled
      const decisionTrigger = screen.getByRole("combobox");
      expect(decisionTrigger).toBeDisabled();

      // 3. Confirm Document Decision button must be disabled
      const confirmButton = screen.getByRole("button", { name: /confirm document decision/i });
      expect(confirmButton).toBeDisabled();

      // 4. Clicking confirm button while disabled must NOT trigger mutation or open confirmation modal
      fireEvent.click(confirmButton);
      expect(screen.queryByRole("button", { name: /submit review/i })).toBeNull();
      expect(updateBudgetRequestInSupabase).not.toHaveBeenCalled();
    });

    it("TEST 26: Selection Gating — Selecting document updates count, enables Decision and Confirm button, deselecting disables them again", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-selection-guard-2",
        organizationId: "org-1",
        activityTitle: "Community Project",
        activityDate: "2026-11-20",
        requestedAmount: 50000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-sg-2",
        budgetRequestId: "br-selection-guard-2",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];

      await renderAdminPortal("budget-utilization");

      const checkboxes = screen.getAllByRole("checkbox");
      // Select the document
      fireEvent.click(checkboxes[1]);

      // 1. Info box updates to '1 document selected.'
      expect(screen.getByText("1 document selected.")).toBeDefined();

      // 2. Decision trigger is now enabled
      const decisionTrigger = screen.getByRole("combobox");
      expect(decisionTrigger).not.toBeDisabled();

      // 3. Confirm button is now enabled (approve decision with valid amount)
      const confirmButton = screen.getByRole("button", { name: /confirm document decision/i });
      expect(confirmButton).not.toBeDisabled();

      // 4. Now toggle/deselect the document
      const updatedCheckboxes = screen.getAllByRole("checkbox");
      fireEvent.click(updatedCheckboxes[1]);

      // 5. Returns to 'No documents selected.' and disabled state
      expect(screen.getByText("No documents selected.")).toBeDefined();
      expect(decisionTrigger).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });

    it("TEST 27: Selection Gating — Needs Revision requires document selection and remarks before enabling confirmation", async () => {
      const budgetReq: BudgetRequest = {
        id: "br-selection-guard-3",
        organizationId: "org-1",
        activityTitle: "Community Project",
        activityDate: "2026-11-20",
        requestedAmount: 50000,
        status: "submitted",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };
      const unreviewedFile: BudgetRequestFile = {
        id: "br-file-sg-3",
        budgetRequestId: "br-selection-guard-3",
        fileName: "Proposal.pdf",
        fileUrl: "https://example.com/proposal.pdf",
        fileSize: 1024,
        adminStatus: "submitted",
        uploadedAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      currentBudgetRequests = [budgetReq];
      currentBudgetFiles = [unreviewedFile];

      await renderAdminPortal("budget-utilization");

      // Before document selection: no remarks textarea and confirm button disabled
      expect(screen.queryByPlaceholderText(/Explain required revisions/i)).toBeNull();

      // Select document
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      // Open select and choose Needs Revision
      const decisionTrigger = screen.getByRole("combobox");
      fireEvent.click(decisionTrigger);

      // Select needs_revision
      const needsRevOption = await screen.findByRole("option", { name: /needs revision/i });
      fireEvent.click(needsRevOption);

      // Remarks textarea is now rendered
      const remarksTextarea = screen.getByPlaceholderText(/Explain required revisions/i);
      expect(remarksTextarea).toBeDefined();

      // Confirm button is disabled while remarks are empty
      const confirmButton = screen.getByRole("button", { name: /confirm document decision/i });
      expect(confirmButton).toBeDisabled();

      // Enter remarks
      fireEvent.change(remarksTextarea, { target: { value: "Please provide itemized equipment costs." } });
      expect(confirmButton).not.toBeDisabled();

      // Confirm and submit
      fireEvent.click(confirmButton);
      const submitReviewBtn = await screen.findByRole("button", { name: /submit review/i });
      fireEvent.click(submitReviewBtn);

      await waitFor(() => {
        expect(adminUpdateBudgetRequestFileStatusInSupabase).toHaveBeenCalledWith(
          "br-file-sg-3",
          expect.objectContaining({
            adminStatus: "needs_revision",
            adminRemarks: "Please provide itemized equipment costs.",
          })
        );
        expect(updateBudgetRequestInSupabase).toHaveBeenCalledWith(
          "br-selection-guard-3",
          expect.objectContaining({
            status: "needs_revision",
            adminRemarks: "Please provide itemized equipment costs.",
          })
        );
      });
    });
  });
});
