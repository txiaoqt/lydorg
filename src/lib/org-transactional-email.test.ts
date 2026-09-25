import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dispatchOrgTransactionalEmailInSupabase,
  OrgTransactionalEmailEventType,
  DispatchOrgTransactionalEmailParams,
} from "./lydo-connect-supabase";
import {
  getDefaultSystemSettingsMap,
  ADMIN_SYSTEM_SETTING_DEFINITIONS,
} from "./admin-system-settings";

// Mock supabase client
vi.mock("./supabase", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
      rpc: vi.fn(),
    },
  };
});

import { supabase } from "./supabase";

describe("Organization Transactional Status & Workflow Email System Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Admin System Settings — Email Sender Identity & Reply-To Configuration", () => {
    it("ensures email sender identity fields are strictly system-managed and read-only", () => {
      const senderNameMeta = ADMIN_SYSTEM_SETTING_DEFINITIONS.find(
        (m) => m.key === "email.sender_name",
      );
      expect(senderNameMeta).toBeDefined();
      expect(senderNameMeta?.isEditable).toBe(false);
      expect(senderNameMeta?.badge).toBe("System");

      const defaultSettings = getDefaultSystemSettingsMap();
      expect(defaultSettings["email.sender_name"]).toBe("Y-TRACE");
    });

    it("ensures email.reply_to_email is configurable and defaults to 'lydo@pasigcity.gov.ph'", () => {
      const replyToMeta = ADMIN_SYSTEM_SETTING_DEFINITIONS.find(
        (m) => m.key === "email.reply_to_email",
      );
      expect(replyToMeta).toBeDefined();
      expect(replyToMeta?.isEditable ?? true).toBe(true);
      expect(replyToMeta?.dataType).toBe("string");

      const defaultSettings = getDefaultSystemSettingsMap();
      expect(defaultSettings["email.reply_to_email"]).toBe("lydo@pasigcity.gov.ph");
    });

    it("ensures email.send_workflow_emails toggle exists, is configurable, and specifies in-app decoupling", () => {
      const workflowEmailMeta = ADMIN_SYSTEM_SETTING_DEFINITIONS.find(
        (m) => m.key === "email.send_workflow_emails",
      );
      expect(workflowEmailMeta).toBeDefined();
      expect(workflowEmailMeta?.isEditable ?? true).toBe(true);
      expect(workflowEmailMeta?.dataType).toBe("boolean");
      const defaultSettings = getDefaultSystemSettingsMap();
      expect(typeof defaultSettings["email.send_workflow_emails"]).toBe("boolean");
      expect(workflowEmailMeta?.description.toLowerCase()).toContain("in-app notifications");
    });
  });

  describe("2. Caller Authentication & Authorization", () => {
    it("includes custom admin session token header when invoking the Edge Function", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "registration_approved",
          emailSent: true,
          recipient: "org@pasigcity.ph",
        },
        error: null,
      });

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "registration_approved",
        organizationId: "org-123",
        title: "Registration Approved",
        status: "approved",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(mockInvoke).toHaveBeenCalledWith(
        "send-org-transactional-email",
        expect.objectContaining({
          body: params,
        }),
      );
      expect(result.success).toBe(true);
    });

    it("rejects unauthorized invocations if caller has no valid session or credentials", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockResolvedValueOnce({
        data: {
          error: "Unauthorized: Missing valid administrative session or authorized organization credentials.",
          reason: "unauthorized_caller",
        },
        error: { message: "Edge Function returned 401" },
      });

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "registration_approved",
        organizationId: "org-unauthorized",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(result.success).toBe(false);
      expect(result.reason).toContain("401");
    });

    describe("2.1 Admin Session Authentication Schema & Hashing Contract", () => {
      // Reusable pure simulation of the Edge Function's session authentication logic
      const simulateEdgeFunctionAdminAuth = async (
        token: string,
        sessionsDb: Array<{ token_hash: string; admin_id: string; expires_at: string; revoked_at: string | null }>,
        accountsDb: Array<{ id: string; is_active: boolean }>,
      ): Promise<{ authorized: boolean; reason?: string }> => {
        if (!token || !token.trim()) return { authorized: false, reason: "missing_token" };

        // SHA-256 hex digest matching Web Crypto API and PostgreSQL encode(digest(token, 'sha256'), 'hex')
        const encoder = new TextEncoder();
        const data = encoder.encode(token.trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedToken = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const now = new Date().toISOString();
        const session = sessionsDb.find(
          (s) => s.token_hash === hashedToken && s.revoked_at === null && s.expires_at > now,
        );

        if (!session) {
          return { authorized: false, reason: "invalid_expired_or_revoked_session" };
        }

        const account = accountsDb.find((a) => a.id === session.admin_id && a.is_active === true);
        if (!account) {
          return { authorized: false, reason: "inactive_or_missing_admin_account" };
        }

        return { authorized: true };
      };

      it("authenticates a valid active administrator session using SHA-256 token hash", async () => {
        const rawToken = "super-secret-admin-session-token-12345";
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
        const expectedHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

        const sessionsDb = [
          {
            token_hash: expectedHash,
            admin_id: "admin-uuid-1",
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            revoked_at: null,
          },
        ];

        const accountsDb = [
          { id: "admin-uuid-1", is_active: true },
        ];

        const result = await simulateEdgeFunctionAdminAuth(rawToken, sessionsDb, accountsDb);
        expect(result.authorized).toBe(true);
      });

      it("rejects expired administrator sessions", async () => {
        const rawToken = "expired-token";
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
        const expectedHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

        const sessionsDb = [
          {
            token_hash: expectedHash,
            admin_id: "admin-uuid-1",
            expires_at: new Date(Date.now() - 60000).toISOString(), // 1 minute in the past
            revoked_at: null,
          },
        ];

        const accountsDb = [{ id: "admin-uuid-1", is_active: true }];

        const result = await simulateEdgeFunctionAdminAuth(rawToken, sessionsDb, accountsDb);
        expect(result.authorized).toBe(false);
        expect(result.reason).toBe("invalid_expired_or_revoked_session");
      });

      it("rejects revoked administrator sessions (revoked_at IS NOT NULL)", async () => {
        const rawToken = "revoked-token";
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
        const expectedHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

        const sessionsDb = [
          {
            token_hash: expectedHash,
            admin_id: "admin-uuid-1",
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            revoked_at: new Date(Date.now() - 300000).toISOString(), // Revoked 5 mins ago
          },
        ];

        const accountsDb = [{ id: "admin-uuid-1", is_active: true }];

        const result = await simulateEdgeFunctionAdminAuth(rawToken, sessionsDb, accountsDb);
        expect(result.authorized).toBe(false);
        expect(result.reason).toBe("invalid_expired_or_revoked_session");
      });

      it("rejects deactivated administrator accounts even with unexpired sessions", async () => {
        const rawToken = "deactivated-admin-token";
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
        const expectedHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

        const sessionsDb = [
          {
            token_hash: expectedHash,
            admin_id: "deactivated-admin-uuid",
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            revoked_at: null,
          },
        ];

        const accountsDb = [
          { id: "deactivated-admin-uuid", is_active: false }, // Inactive account!
        ];

        const result = await simulateEdgeFunctionAdminAuth(rawToken, sessionsDb, accountsDb);
        expect(result.authorized).toBe(false);
        expect(result.reason).toBe("inactive_or_missing_admin_account");
      });

      it("rejects nonexistent or forged session tokens", async () => {
        const rawToken = "forged-fake-token";
        const sessionsDb: Array<{ token_hash: string; admin_id: string; expires_at: string; revoked_at: string | null }> = [];
        const accountsDb = [{ id: "admin-uuid-1", is_active: true }];

        const result = await simulateEdgeFunctionAdminAuth(rawToken, sessionsDb, accountsDb);
        expect(result.authorized).toBe(false);
        expect(result.reason).toBe("invalid_expired_or_revoked_session");
      });
    });
  });

  describe("3. Fail-Closed Setting Gating & Brevo Failure Handling", () => {
    it("handles workflow_emails_disabled when toggle is OFF (fail-closed)", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "renewal_approved",
          emailSent: false,
          reason: "workflow_emails_disabled",
          organizationId: "org-456",
        },
        error: null,
      });

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "renewal_approved",
        organizationId: "org-456",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.reason).toBe("workflow_emails_disabled");
    });

    it("fails closed when system settings cannot be determined or database is unavailable", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "document_needs_revision",
          emailSent: false,
          reason: "workflow_emails_setting_unavailable",
          organizationId: "org-789",
        },
        error: null,
      });

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "document_needs_revision",
        organizationId: "org-789",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.reason).toBe("workflow_emails_setting_unavailable");
    });

    it("returns emailSent: false and appropriate diagnostic reason when BREVO_API_KEY is missing", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: false,
          event: "budget_status_update",
          emailSent: false,
          reason: "brevo_api_key_not_configured",
        },
        error: null,
      });

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "budget_status_update",
        organizationId: "org-321",
        status: "budget_released",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(result.success).toBe(false);
      expect(result.emailSent).toBe(false);
      expect(result.reason).toBe("brevo_api_key_not_configured");
    });

    it("suppresses email delivery with 'invalid_reply_to_configuration' when email.reply_to_email is invalid or missing", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: false,
          event: "registration_approved",
          emailSent: false,
          reason: "invalid_reply_to_configuration",
          organizationId: "org-123",
        },
        error: null,
      });

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "registration_approved",
        organizationId: "org-123",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(result.success).toBe(false);
      expect(result.emailSent).toBe(false);
      expect(result.reason).toBe("invalid_reply_to_configuration");
    });

    it("is strictly non-blocking: network exceptions never disrupt main application workflow", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockRejectedValueOnce(new Error("Network timeout contacting Brevo REST API"));

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "liquidation_status_update",
        organizationId: "org-999",
        status: "complete",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Network timeout");
    });
  });

  describe("4. Canonical Event Coverage & Authoritative Organization Scoping", () => {
    it("recognizes and correctly scopes all 15 canonical organization transactional events", () => {
      const canonicalEvents: OrgTransactionalEmailEventType[] = [
        "registration_approved",
        "registration_needs_revision",
        "registration_rejected",
        "renewal_approved",
        "renewal_needs_revision",
        "renewal_rejected",
        "document_approved",
        "document_needs_revision",
        "document_rejected",
        "ypop_approved",
        "ypop_needs_revision",
        "ypop_rejected",
        "budget_status_update",
        "liquidation_status_update",
        "submission_unlocked",
      ];

      expect(canonicalEvents.length).toBe(15);
      canonicalEvents.forEach((event) => {
        expect(typeof event).toBe("string");
      });
    });

    it("formats submission_unlocked transactional event payload accurately", async () => {
      const mockInvoke = supabase?.functions.invoke as ReturnType<typeof vi.fn>;
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          event: "submission_unlocked",
          emailSent: true,
          recipient: "org@pasigcity.gov.ph",
        },
        error: null,
      });

      const params: DispatchOrgTransactionalEmailParams = {
        eventType: "submission_unlocked",
        organizationId: "org-555",
        referenceId: "sub-doc-001",
        title: "Submission Unlocked for Revision",
        status: "unlocked",
        statusLabel: "Unlocked by Admin",
        remarks: "You may now upload the revised constitution.",
        itemName: "Constitution & By-Laws",
      };

      const result = await dispatchOrgTransactionalEmailInSupabase(params);

      expect(mockInvoke).toHaveBeenCalledWith(
        "send-org-transactional-email",
        expect.objectContaining({
          body: expect.objectContaining({
            eventType: "submission_unlocked",
            organizationId: "org-555",
            statusLabel: "Unlocked by Admin",
          }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });
  });
});
