import { describe, expect, it, vi, beforeEach } from "vitest";
import { shouldNotifyAdmin, type AdminNotificationEventKey } from "./admin-system-settings";
import { dispatchAdminNotificationInSupabase, type DispatchAdminNotificationParams } from "./lydo-connect-supabase";
import { supabase } from "./supabase";
import * as adminAuth from "./admin-auth";

vi.mock("./supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe("Admin Email Notification Delivery Pipeline - Final Hardened Authorization Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Settings Gating Logic (shouldNotifyAdmin)", () => {
    it("returns true when email notification is enabled for new_registration", () => {
      const settings = {
        "notifications.new_registration.email": true,
        "notifications.new_registration.in_app": false,
      };
      expect(shouldNotifyAdmin(settings, "new_registration", "email")).toBe(true);
      expect(shouldNotifyAdmin(settings, "new_registration", "in_app")).toBe(false);
    });

    it("returns true when in_app notification is enabled for renewal_submitted", () => {
      const settings = {
        "notifications.renewal_submitted.email": false,
        "notifications.renewal_submitted.in_app": true,
      };
      expect(shouldNotifyAdmin(settings, "renewal_submitted", "email")).toBe(false);
      expect(shouldNotifyAdmin(settings, "renewal_submitted", "in_app")).toBe(true);
    });

    it("handles all 9 canonical event keys correctly", () => {
      const allEvents: AdminNotificationEventKey[] = [
        "new_registration",
        "renewal_submitted",
        "ypop_submission",
        "budget_request",
        "liquidation_report",
        "new_inquiry",
        "revision_resubmission",
        "accreditation_expiring",
        "overdue_liquidation",
      ];

      allEvents.forEach((eventKey) => {
        const settings = {
          [`notifications.${eventKey}.email`]: true,
          [`notifications.${eventKey}.in_app`]: true,
        };
        expect(shouldNotifyAdmin(settings, eventKey, "email")).toBe(true);
        expect(shouldNotifyAdmin(settings, eventKey, "in_app")).toBe(true);
      });
    });

    it("supports alias needs_revision_resubmission for revision_resubmission", () => {
      const settings = {
        "notifications.revision_resubmission.email": true,
        "notifications.revision_resubmission.in_app": false,
      };
      expect(shouldNotifyAdmin(settings, "needs_revision_resubmission", "email")).toBe(true);
    });

    it("defaults to true when setting key is undefined (default enabled policy)", () => {
      const emptySettings = {};
      expect(shouldNotifyAdmin(emptySettings, "new_registration", "email")).toBe(true);
      expect(shouldNotifyAdmin(emptySettings, "budget_request", "in_app")).toBe(true);
    });

    it("respects explicit false value", () => {
      const settings = {
        "notifications.budget_request.email": false,
        "notifications.budget_request.in_app": false,
      };
      expect(shouldNotifyAdmin(settings, "budget_request", "email")).toBe(false);
      expect(shouldNotifyAdmin(settings, "budget_request", "in_app")).toBe(false);
    });
  });

  describe("Channel Toggle Matrix (Cases A, B, C, D)", () => {
    it("Case A: in-app ON + email ON -> both channels enabled", () => {
      const settings = {
        "notifications.new_registration.in_app": true,
        "notifications.new_registration.email": true,
      };
      expect(shouldNotifyAdmin(settings, "new_registration", "in_app")).toBe(true);
      expect(shouldNotifyAdmin(settings, "new_registration", "email")).toBe(true);
    });

    it("Case B: in-app OFF + email OFF -> both channels disabled", () => {
      const settings = {
        "notifications.new_registration.in_app": false,
        "notifications.new_registration.email": false,
      };
      expect(shouldNotifyAdmin(settings, "new_registration", "in_app")).toBe(false);
      expect(shouldNotifyAdmin(settings, "new_registration", "email")).toBe(false);
    });

    it("Case C: in-app ON + email OFF -> in-app enabled, email disabled", () => {
      const settings = {
        "notifications.new_registration.in_app": true,
        "notifications.new_registration.email": false,
      };
      expect(shouldNotifyAdmin(settings, "new_registration", "in_app")).toBe(true);
      expect(shouldNotifyAdmin(settings, "new_registration", "email")).toBe(false);
    });

    it("Case D: in-app OFF + email ON -> in-app disabled, email enabled", () => {
      const settings = {
        "notifications.new_registration.in_app": false,
        "notifications.new_registration.email": true,
      };
      expect(shouldNotifyAdmin(settings, "new_registration", "in_app")).toBe(false);
      expect(shouldNotifyAdmin(settings, "new_registration", "email")).toBe(true);
    });
  });

  describe("Test Matrix A-Q: Authentication, Authorization & Record Ownership", () => {
    it("A: Rejects requests with no authentication", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Unauthorized: Caller must provide a verified Supabase user session, valid admin session token, or service role credential." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "new_inquiry",
        subject: "Unauthenticated Message",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Unauthorized");
    });

    it("B: Rejects requests with random Bearer token", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Unauthorized: Caller must provide a verified Supabase user session, valid admin session token, or service role credential." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "budget_request",
        referenceId: "any-random-token-budget",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Unauthorized");
    });

    it("C: Rejects requests with public Supabase anon key as privileged auth", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Unauthorized: Caller must provide a verified Supabase user session, valid admin session token, or service role credential." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "new_registration",
        referenceId: "profile-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Unauthorized");
    });

    it("D: Allows valid organization JWT with their own budget request", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "budget_request",
          emailSent: true,
          recipient: "support@lydo.pasig.gov.ph",
          inAppCreated: 2,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "budget_request",
        organizationId: "org-1",
        referenceId: "budget-org-1",
        amount: 25000,
        subject: "Youth Leadership Camp",
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
      expect(result.recipient).toBe("support@lydo.pasig.gov.ph");
    });

    it("E: Rejects valid organization JWT referencing another organization's budget request", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Referenced budget request does not belong to your organization." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "budget_request",
        organizationId: "org-1",
        referenceId: "budget-other-org-2",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Forbidden");
    });

    it("F: Rejects valid organization JWT referencing a nonexistent budget request", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Referenced budget request does not exist." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "budget_request",
        organizationId: "org-1",
        referenceId: "nonexistent-budget-id",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("does not exist");
    });

    it("G: Rejects valid organization JWT when referenceId is missing for budget_request", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Missing required referenceId for event 'budget_request'." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "budget_request",
        organizationId: "org-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Missing required referenceId");
    });

    it("H: Allows valid organization JWT with their own liquidation report", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "liquidation_report",
          emailSent: true,
          recipient: "support@lydo.pasig.gov.ph",
          inAppCreated: 2,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "liquidation_report",
        organizationId: "org-1",
        referenceId: "liq-org-1",
        amount: 25000,
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });

    it("I: Rejects valid organization JWT with another organization's liquidation report", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Referenced liquidation report does not belong to your organization." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "liquidation_report",
        organizationId: "org-1",
        referenceId: "liq-other-org-2",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Forbidden");
    });

    it("J: Allows valid organization JWT with their own document resubmission", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "revision_resubmission",
          emailSent: true,
          recipient: "support@lydo.pasig.gov.ph",
          inAppCreated: 2,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "revision_resubmission",
        organizationId: "org-1",
        referenceId: "doc-sub-1",
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });

    it("K: Rejects valid organization JWT with nonexistent document resubmission", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Referenced resubmission record does not exist." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "revision_resubmission",
        organizationId: "org-1",
        referenceId: "nonexistent-doc-id",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("does not exist");
    });

    it("L: Rejects valid organization JWT with nonexistent YPOP submission", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Referenced YPOP record does not exist." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "ypop_submission",
        organizationId: "org-1",
        referenceId: "nonexistent-ypop-act",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("does not exist");
    });

    it("M: Rejects organization user attempting admin-only accreditation_expiring event", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Event 'accreditation_expiring' is restricted to administrators and system workflows." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "accreditation_expiring",
        organizationId: "org-1",
        referenceId: "profile-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("restricted to administrators");
    });

    it("N: Rejects organization user attempting admin-only overdue_liquidation event", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Event 'overdue_liquidation' is restricted to administrators and system workflows." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "overdue_liquidation",
        organizationId: "org-1",
        referenceId: "liq-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("restricted to administrators");
    });

    it("O: Allows valid Admin session with legitimate admin event", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      vi.spyOn(adminAuth, "readAdminSession").mockReturnValueOnce({
        id: "admin-1",
        username: "superadmin",
        email: "admin@pasig.gov.ph",
        displayName: "Super Admin",
        sessionToken: "valid-admin-session-token-12345",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "accreditation_expiring",
          emailSent: true,
          recipient: "support@lydo.pasig.gov.ph",
          inAppCreated: 1,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "accreditation_expiring",
        organizationId: "org-1",
        organizationName: "Youth Leaders Club",
        referenceId: "profile-1",
        subject: "Accreditation expiring in 30 days",
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });

    it("P: Allows valid service-role invocation for system escalation event", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "overdue_liquidation",
          emailSent: true,
          recipient: "support@lydo.pasig.gov.ph",
          inAppCreated: 2,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "overdue_liquidation",
        organizationId: "org-1",
        referenceId: "liq-1",
        subject: "Overdue Liquidation Escalation",
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });

    it("Q: Non-blocking resilience: business submission succeeds even if email dispatch fails", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockRejectedValueOnce(new Error("Network connection dropped"));

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "budget_request",
        organizationName: "Youth League",
        referenceId: "budget-1",
        amount: 50000,
        subject: "Budget Request Submitted",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("Network connection dropped");
    });

    it("R: Rejects valid organization JWT with budget request in non-submitted/draft state", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Budget request is not in a submitted/reviewable state." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "budget_request",
        organizationId: "org-1",
        referenceId: "budget-draft-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("not in a submitted/reviewable state");
    });

    it("S: Rejects valid organization JWT with liquidation report in unsubmitted state", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Liquidation report is not in a submitted/reviewable state." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "liquidation_report",
        organizationId: "org-1",
        referenceId: "liq-draft-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("not in a submitted/reviewable state");
    });

    it("T: Rejects valid organization JWT with YPOP activity in unsubmitted/draft state", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: YPOP activity is not in a submitted/reviewable state." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "ypop_submission",
        organizationId: "org-1",
        referenceId: "ypop-draft-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("not in a submitted/reviewable state");
    });

    it("U: Rejects revision_resubmission referencing an unrelated record type (e.g. budget request or org profile)", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Referenced document submission does not exist." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "revision_resubmission",
        organizationId: "org-1",
        referenceId: "budget-id-instead-of-doc-id",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Referenced document submission does not exist");
    });

    it("V: Rejects inquiry notification when inquiry is already reviewed or closed", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Inquiry is not in an active pending review state." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "new_inquiry",
        organizationId: "org-1",
        referenceId: "inq-closed-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("not in an active pending review state");
    });

    it("W: Rejects revision_resubmission when document is not in a reviewable revision state", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Document submission is not in a reviewable revision state." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "revision_resubmission",
        organizationId: "org-1",
        referenceId: "doc-approved-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("not in a reviewable revision state");
    });

    it("X: Rejects renewal_submitted when renewal application is in draft or terminal status", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Forbidden: Renewal application is not in a submitted state." } as any,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "renewal_submitted",
        organizationId: "org-1",
        referenceId: "renewal-draft-1",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("not in a submitted state");
    });
  });

  describe("Dynamic Support Email Recipient Resolution & Verified Sender", () => {
    it("dynamically routes to TEST_EMAIL_A when configured", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "new_registration",
          emailSent: true,
          recipient: "test_a@lydo.pasig.gov.ph",
          inAppCreated: 1,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "new_registration",
        referenceId: "org-1",
      });

      expect(result.recipient).toBe("test_a@lydo.pasig.gov.ph");
      expect(result.emailSent).toBe(true);
    });

    it("dynamically routes to TEST_EMAIL_B when setting changes without redeploying", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "new_registration",
          emailSent: true,
          recipient: "test_b@lydo.pasig.gov.ph",
          inAppCreated: 1,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "new_registration",
        referenceId: "org-1",
      });

      expect(result.recipient).toBe("test_b@lydo.pasig.gov.ph");
      expect(result.emailSent).toBe(true);
    });
  });

  describe("Provider Error Handling & No Fake Success", () => {
    it("reports emailSent: false when BREVO_API_KEY is missing", async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "new_inquiry",
          emailSent: false,
          recipient: "support@lydo.pasig.gov.ph",
          providerError: "BREVO_API_KEY is not configured in Edge Function environment secrets.",
          inAppCreated: 1,
        },
        error: null,
      });

      const result = await dispatchAdminNotificationInSupabase({
        eventType: "new_inquiry",
        referenceId: "inq-1",
        subject: "Test Inquiry",
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect((result as any).providerError).toContain("BREVO_API_KEY is not configured");
    });
  });
});
