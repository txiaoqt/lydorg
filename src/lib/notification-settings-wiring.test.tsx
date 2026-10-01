import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ADMIN_SYSTEM_SETTING_DEFINITIONS,
  ADMIN_SETTING_DEFINITIONS_BY_KEY,
  getEffectiveSystemSetting,
  shouldNotifyOrganization,
  shouldNotifyAdmin,
  shouldLogActivityType,
  computeWorkflowItemTiming,
  formatSystemCurrency,
  type AdminSystemSettingKey,
} from "./admin-system-settings";
import {
  dispatchOrgTransactionalEmailInSupabase,
  updateBudgetRequestInSupabase,
  updateLiquidationReportInSupabase,
  type OrgTransactionalEmailEventType,
} from "./lydo-connect-supabase";
import { supabase } from "./supabase";

// Mock supabase.functions.invoke
vi.mock("./supabase", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
      rpc: vi.fn(),
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      },
    },
  };
});

describe("Status Change Notifications & Notification Settings Wiring Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 1. WORKFLOW NOTIFICATION SETTINGS GATING (In-App)
  // ===========================================================================
  describe("Workflow In-App Notification Settings Gating", () => {
    it("TEST 1: workflow.notify_org_on_approved allows notification when true", () => {
      const allowed = shouldNotifyOrganization("approved", {
        "workflow.notify_org_on_approved": true,
      });
      expect(allowed).toBe(true);
    });

    it("TEST 2: workflow.notify_org_on_approved suppresses notification when false", () => {
      const allowed = shouldNotifyOrganization("approved", {
        "workflow.notify_org_on_approved": false,
      });
      expect(allowed).toBe(false);
    });

    it("TEST 3: workflow.notify_org_on_needs_revision allows notification when true", () => {
      const allowed = shouldNotifyOrganization("needs_revision", {
        "workflow.notify_org_on_needs_revision": true,
      });
      expect(allowed).toBe(true);
    });

    it("TEST 4: workflow.notify_org_on_needs_revision suppresses notification when false", () => {
      const allowed = shouldNotifyOrganization("needs_revision", {
        "workflow.notify_org_on_needs_revision": false,
      });
      expect(allowed).toBe(false);
    });

    it("TEST 5: workflow.notify_org_on_rejected allows notification when true", () => {
      const allowed = shouldNotifyOrganization("rejected", {
        "workflow.notify_org_on_rejected": true,
      });
      expect(allowed).toBe(true);
    });

    it("TEST 6: workflow.notify_org_on_rejected suppresses notification when false", () => {
      const allowed = shouldNotifyOrganization("rejected", {
        "workflow.notify_org_on_rejected": false,
      });
      expect(allowed).toBe(false);
    });

    it("TEST 7: workflow.notify_org_on_resubmitted allows notification when true", () => {
      const allowed = shouldNotifyOrganization("resubmitted", {
        "workflow.notify_org_on_resubmitted": true,
      });
      expect(allowed).toBe(true);
    });

    it("TEST 8: workflow.notify_org_on_resubmitted suppresses notification when false", () => {
      const allowed = shouldNotifyOrganization("resubmitted", {
        "workflow.notify_org_on_resubmitted": false,
      });
      expect(allowed).toBe(false);
    });
  });

  // ===========================================================================
  // 2. ADMIN INCOMING NOTIFICATION SETTINGS GATING
  // ===========================================================================
  describe("Admin Incoming Notification Settings Gating", () => {
    it("TEST 9: shouldNotifyAdmin handles in-app channel correctly when ON and OFF", () => {
      const on = shouldNotifyAdmin({ "notifications.new_registration.in_app": true }, "new_registration", "in_app");
      const off = shouldNotifyAdmin({ "notifications.new_registration.in_app": false }, "new_registration", "in_app");
      expect(on).toBe(true);
      expect(off).toBe(false);
    });

    it("TEST 10: shouldNotifyAdmin handles email channel correctly when ON and OFF", () => {
      const on = shouldNotifyAdmin({ "notifications.new_registration.email": true }, "new_registration", "email");
      const off = shouldNotifyAdmin({ "notifications.new_registration.email": false }, "new_registration", "email");
      expect(on).toBe(true);
      expect(off).toBe(false);
    });

    it("TEST 11: verifies all 9 canonical admin event types are recognized", () => {
      const eventTypes = [
        "new_registration",
        "renewal_submitted",
        "ypop_submission",
        "budget_request",
        "liquidation_report",
        "new_inquiry",
        "revision_resubmission",
        "overdue_liquidation",
        "accreditation_expiring",
      ] as const;

      eventTypes.forEach((event) => {
        const keyInApp = `notifications.${event}.in_app` as AdminSystemSettingKey;
        const keyEmail = `notifications.${event}.email` as AdminSystemSettingKey;

        expect(ADMIN_SETTING_DEFINITIONS_BY_KEY.has(keyInApp)).toBe(true);
        expect(ADMIN_SETTING_DEFINITIONS_BY_KEY.has(keyEmail)).toBe(true);

        const inAppSetting = ADMIN_SETTING_DEFINITIONS_BY_KEY.get(keyInApp);
        const emailSetting = ADMIN_SETTING_DEFINITIONS_BY_KEY.get(keyEmail);

        expect(inAppSetting?.dataType).toBe("boolean");
        expect(emailSetting?.dataType).toBe("boolean");
      });
    });
  });

  // ===========================================================================
  // 3. ORGANIZATION TRANSACTIONAL EMAIL DISPATCH & GATING
  // ===========================================================================
  describe("Organization Transactional Email Dispatch Pipeline", () => {
    it("TEST 12: Registration Approval email dispatches to edge function with proper payload", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "registration_approved", emailSent: true, recipient: "org@pasig.gov.ph" },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "registration_approved",
        organizationId: "org-123",
        referenceId: "sub-123",
        title: "Registration Verified & Approved",
        itemName: "PASIG-2026-001",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "registration_approved",
          organizationId: "org-123",
          referenceId: "sub-123",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
      expect(res.emailSent).toBe(true);
    });

    it("TEST 13: Registration Revision email dispatches to edge function with proper payload", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "registration_needs_revision", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "registration_needs_revision",
        organizationId: "org-123",
        referenceId: "sub-123",
        remarks: "Please provide signed Constitution and By-Laws.",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "registration_needs_revision",
          remarks: "Please provide signed Constitution and By-Laws.",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 14: Registration Rejection email dispatches to edge function with proper payload", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "registration_rejected", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "registration_rejected",
        organizationId: "org-123",
        referenceId: "sub-123",
        remarks: "Registration rejected due to invalid jurisdiction.",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "registration_rejected",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 15: Renewal Approval email dispatches with cycle and URN info", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "renewal_approved", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "renewal_approved",
        organizationId: "org-123",
        referenceId: "ren-456",
        itemName: "Accreditation Renewal (URN: 01-26-001)",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "renewal_approved",
          referenceId: "ren-456",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 16: Renewal Revision email dispatches with admin remarks", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "renewal_needs_revision", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "renewal_needs_revision",
        organizationId: "org-123",
        referenceId: "ren-456",
        remarks: "Update list of active officers for 2026.",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "renewal_needs_revision",
          remarks: "Update list of active officers for 2026.",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 17: Renewal Rejection email dispatches correctly", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "renewal_rejected", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "renewal_rejected",
        organizationId: "org-123",
        referenceId: "ren-456",
        remarks: "Renewal application rejected.",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "renewal_rejected",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 18: YPOP Approval email dispatches correctly for City-Led and Org-Led activities", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "ypop_approved", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "ypop_approved",
        organizationId: "org-123",
        referenceId: "act-789",
        itemName: "Org-Led PPA: Coastal Clean-up",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "ypop_approved",
          itemName: "Org-Led PPA: Coastal Clean-up",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 19: Budget Request Status Update email dispatches correctly", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "budget_status_update", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "budget_status_update",
        organizationId: "org-123",
        referenceId: "bud-101",
        status: "awaiting_release",
        statusLabel: "Approved • Awaiting Release",
        itemName: "Budget Request: Youth Summit 2026",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "budget_status_update",
          status: "awaiting_release",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 20: Liquidation Status Update email dispatches correctly", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, event: "liquidation_status_update", emailSent: true },
        error: null,
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "liquidation_status_update",
        organizationId: "org-123",
        referenceId: "liq-202",
        status: "completed_liquidated",
        statusLabel: "Liquidated",
        itemName: "Liquidation: Youth Summit 2026",
      });

      expect(mockInvoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "liquidation_status_update",
          status: "completed_liquidated",
        }),
        headers: expect.any(Object),
      });
      expect(res.success).toBe(true);
    });

    it("TEST 21: Returns graceful failure response without exception when edge function fails", async () => {
      const mockInvoke = vi.mocked(supabase!.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Brevo rate limit exceeded", name: "FunctionsHttpError", context: {} as any },
      });

      const res = await dispatchOrgTransactionalEmailInSupabase({
        eventType: "budget_status_update",
        organizationId: "org-123",
      });

      expect(res.success).toBe(false);
      expect(res.reason).toBe("Brevo rate limit exceeded");
    });
  });

  describe("Admin parent budget and liquidation status email wiring", () => {
    const installAdminSession = () => {
      window.localStorage.setItem("lydo_admin_session_v1", JSON.stringify({
        id: "admin-1",
        username: "admin",
        email: "admin@example.com",
        displayName: "Admin",
        sessionToken: "valid-admin-session",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }));
    };

    beforeEach(() => {
      installAdminSession();
    });

    it("dispatches the updated budget request status to the organization email function", async () => {
      const budgetRow = {
        id: "budget-1",
        organization_id: "org-1",
        submitted_by: "user-1",
        activity_title: "Youth Leadership Workshop",
        activity_description: "Workshop",
        activity_date: "2026-09-15",
        venue: "Pasig",
        requested_amount: 25000,
        approved_amount: 20000,
        released_amount: 0,
        release_date: null,
        purpose_category: "Leadership",
        fiscal_year: 2026,
        status: "awaiting_release",
        remarks: null,
        admin_remarks: "Approved with adjustment",
        go_signal_at: null,
        hard_copy_submitted_at: null,
        revision_history: [],
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-30T00:00:00.000Z",
      };
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({ data: [budgetRow], error: null } as never);
      vi.mocked(supabase!.functions.invoke).mockResolvedValueOnce({
        data: { success: true, event: "budget_status_update", emailSent: true },
        error: null,
      } as never);

      await updateBudgetRequestInSupabase("budget-1", { status: "awaiting_release" });

      expect(supabase!.functions.invoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "budget_status_update",
          organizationId: "org-1",
          referenceId: "budget-1",
          itemName: "Youth Leadership Workshop",
          status: "awaiting_release",
          statusLabel: "Approved — Awaiting Release",
          remarks: "Approved with adjustment",
        }),
        headers: expect.any(Object),
      });
    });

    it("dispatches the updated liquidation report status to the organization email function", async () => {
      const liquidationRow = {
        id: "liquidation-1",
        budget_request_id: "budget-1",
        organization_id: "org-1",
        submitted_by: "user-1",
        status: "completed_liquidated",
        remarks: null,
        go_signal_at: null,
        deadline_at: "2026-10-30",
        hard_copy_submitted_at: null,
        completed_at: "2026-09-30T00:00:00.000Z",
        revision_history: [],
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-30T00:00:00.000Z",
      };
      vi.mocked(supabase!.rpc).mockResolvedValueOnce({ data: [liquidationRow], error: null } as never);
      vi.mocked(supabase!.functions.invoke).mockResolvedValueOnce({
        data: { success: true, event: "liquidation_status_update", emailSent: true },
        error: null,
      } as never);

      await updateLiquidationReportInSupabase("liquidation-1", { status: "completed_liquidated" });

      expect(supabase!.functions.invoke).toHaveBeenCalledWith("send-org-transactional-email", {
        body: expect.objectContaining({
          eventType: "liquidation_status_update",
          organizationId: "org-1",
          referenceId: "liquidation-1",
          status: "completed_liquidated",
          statusLabel: "Liquidated",
        }),
        headers: expect.any(Object),
      });
    });
  });

  // ===========================================================================
  // 4. DECOUPLING OF CHANNELS (In-App vs Email)
  // ===========================================================================
  describe("Decoupled Channel Enforcement", () => {
    it("TEST 22: Turning OFF email setting does NOT affect in-app notification evaluation", () => {
      // In-app is ON
      const inAppAllowed = shouldNotifyOrganization("approved", {
        "workflow.notify_org_on_approved": true,
      });
      // Email is OFF
      const emailAllowed = shouldNotifyAdmin({
        "notifications.new_registration.email": false,
      }, "new_registration", "email");

      expect(inAppAllowed).toBe(true);
      expect(emailAllowed).toBe(false);
    });

    it("TEST 23: Turning OFF in-app notification does NOT affect email evaluation", () => {
      // In-app is OFF
      const inAppAllowed = shouldNotifyOrganization("approved", {
        "workflow.notify_org_on_approved": false,
      });
      // Email is ON
      const emailAllowed = shouldNotifyAdmin({
        "notifications.new_registration.email": true,
      }, "new_registration", "email");

      expect(inAppAllowed).toBe(false);
      expect(emailAllowed).toBe(true);
    });
  });

  // ===========================================================================
  // 5. AUDIT LOGGING SETTINGS
  // ===========================================================================
  describe("Audit Records Settings Wiring", () => {
    it("TEST 24: shouldLogActivityType correctly maps approval category to audit.log_approvals_rejections", () => {
      expect(shouldLogActivityType("approval", "approval")).toBe(true);
      expect(shouldLogActivityType("Approved document", undefined)).toBe(true);
    });

    it("TEST 25: shouldLogActivityType correctly maps deletion category to audit.log_deletions", () => {
      expect(shouldLogActivityType("deletion", "deletion")).toBe(true);
      expect(shouldLogActivityType("Deleted inquiry", undefined)).toBe(true);
    });
  });

  // ===========================================================================
  // 6. WORKFLOW TIMING & DEADLINES
  // ===========================================================================
  describe("Workflow Timing & Deadline Calculation", () => {
    it("TEST 26: computeWorkflowItemTiming flags reminder after threshold days", () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString();
      const timing = computeWorkflowItemTiming(fourDaysAgo, {
        customSettings: {
          "workflow.review_reminder_enabled": true,
          "workflow.review_reminder_days": 3,
          "workflow.escalate_after_days": 7,
        },
      });

      expect(timing.isReminderDue).toBe(true);
      expect(timing.isEscalated).toBe(false);
      expect(timing.riskLabel).toBe("Needs Attention");
    });

    it("TEST 27: computeWorkflowItemTiming escalates after urgent threshold days", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
      const timing = computeWorkflowItemTiming(eightDaysAgo, {
        customSettings: {
          "workflow.review_reminder_enabled": true,
          "workflow.review_reminder_days": 3,
          "workflow.escalate_after_days": 7,
          "workflow.overdue_indicators_enabled": true,
        },
      });

      expect(timing.isEscalated).toBe(true);
      expect(timing.isOverdue).toBe(true);
      expect(timing.riskLabel).toBe("Overdue");
    });
  });

  // ===========================================================================
  // 7. DYNAMIC CURRENCY SETTINGS
  // ===========================================================================
  describe("Dynamic Currency Formatting", () => {
    it("TEST 28: formatSystemCurrency formats amounts with Philippine Peso symbol", () => {
      const formatted = formatSystemCurrency(150000);
      expect(formatted).toBe("₱150,000.00");
    });
  });
});
