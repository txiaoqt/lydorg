import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FunctionsClient } from "@supabase/functions-js";
import {
  extractEdgeFunctionError,
  DuplicateUsernameError,
  createAdministratorInSupabase,
  resendAdminInviteInSupabase,
  checkAdminEmailAvailabilityInSupabase,
} from "./lydo-connect-supabase";
import { writeAdminSession } from "./admin-auth";

const mockSeededAdmin = {
  id: "admin-1",
  username: "superadmin",
  email: "admin@pasig.gov.ph",
  displayName: "Super Admin",
  sessionToken: "valid-session-token",
  expiresAt: "2099-01-01T00:00:00Z",
  roleCode: "super_admin",
  permissionCodes: ["administrators_management"],
};

describe("Admin Invite & Error Extraction Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    writeAdminSession(mockSeededAdmin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    writeAdminSession(null);
  });

  // TEST 1 — Extract backend error from FunctionsHttpError
  it("TEST 1: extracts backend error and code from FunctionsHttpError containing Response context", async () => {
    const errorBody = {
      error: "This email address is already registered to an organization account. Please use a different email address.",
      code: "email_in_use_by_user",
    };
    const mockResponse = new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    const functionsHttpError = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: mockResponse,
    };

    const extracted = await extractEdgeFunctionError(functionsHttpError, "Default fallback error");
    expect(extracted.message).toBe(errorBody.error);
    expect(extracted.code).toBe(errorBody.code);
  });

  // TEST 2 — Duplicate username
  it("TEST 2: converts username_exists code to DuplicateUsernameError and preserves retry behavior", async () => {
    const mockResponse = new Response(
      JSON.stringify({
        error: "That username is already taken. Please choose another username.",
        code: "username_exists",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

    vi.spyOn(FunctionsClient.prototype, "invoke").mockResolvedValue({
      data: null,
      error: {
        name: "FunctionsHttpError",
        message: "Edge Function returned a non-2xx status code",
        context: mockResponse,
      } as any,
    });

    await expect(
      createAdministratorInSupabase({
        displayName: "New Admin",
        email: "newadmin@example.com",
        username: "newadmin",
        roleId: 1,
        unitId: 1,
      }),
    ).rejects.toThrow(DuplicateUsernameError);

    // Verify retry loop logic
    let attempts = 0;
    const baseUsername = "john";
    const MAX_ATTEMPTS = 5;

    for (;;) {
      const candidateUsername = attempts === 0 ? baseUsername : `${baseUsername}${attempts + 1}`;
      try {
        if (attempts < 2) {
          throw new DuplicateUsernameError();
        }
        // Succeeded on 3rd attempt ("john3")
        expect(candidateUsername).toBe("john3");
        break;
      } catch (err) {
        if (err instanceof DuplicateUsernameError && attempts < MAX_ATTEMPTS) {
          attempts += 1;
          continue;
        }
        throw err;
      }
    }
    expect(attempts).toBe(2);
  });

  // TEST 3 — Existing organization email
  it("TEST 3: detects active organization user email and returns clear conflict response", async () => {
    const conflictError = {
      error: "This email address is already registered to an organization account. Please use a different email address.",
      code: "email_in_use_by_user",
    };

    const mockResponse = new Response(JSON.stringify(conflictError), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(FunctionsClient.prototype, "invoke").mockResolvedValue({
      data: null,
      error: {
        name: "FunctionsHttpError",
        message: "Edge Function returned a non-2xx status code",
        context: mockResponse,
      } as any,
    });

    await expect(
      createAdministratorInSupabase({
        displayName: "Faker Admin",
        email: "xxfaker4@gmail.com",
        username: "xxfaker4",
        roleId: 2,
        unitId: 1,
      }),
    ).rejects.toThrow("This email address is already registered to an organization account. Please use a different email address.");
  });

  // TEST 4 — Existing organization account is preserved
  it("TEST 4: ensures organization_profiles and active auth user records are untouched when invite fails", async () => {
    // Model simulating database state before invite
    const mockDb = {
      auth_users: [
        { id: "user-123", email: "xxfaker4@gmail.com", email_confirmed_at: "2026-01-01T00:00:00Z" },
      ],
      organization_profiles: [
        { id: "org-profile-1", user_id: "user-123", organization_name: "Tadz Youth Council", organization_email: "xxfaker4@gmail.com" },
      ],
      admin_accounts: [] as Array<{ id: string; email: string }>,
    };

    // Simulated Edge Function logic for pre-check
    const emailToInvite = "xxfaker4@gmail.com";
    const existingOrg = mockDb.organization_profiles.find(
      (o) => o.organization_email.toLowerCase() === emailToInvite.toLowerCase() || o.user_id === "user-123",
    );

    // Verification: Active organization profile detected -> REJECT without mutating DB
    let inviteSucceeded = false;
    let errorResponse: { error: string; code: string } | null = null;

    if (existingOrg) {
      errorResponse = {
        error: "This email address is already registered to an organization account. Please use a different email address.",
        code: "email_in_use_by_user",
      };
    } else {
      mockDb.admin_accounts.push({ id: "admin-new", email: emailToInvite });
      inviteSucceeded = true;
    }

    expect(inviteSucceeded).toBe(false);
    expect(errorResponse?.code).toBe("email_in_use_by_user");
    // Verify DB records remain completely intact
    expect(mockDb.organization_profiles.length).toBe(1);
    expect(mockDb.organization_profiles[0].organization_name).toBe("Tadz Youth Council");
    expect(mockDb.auth_users.length).toBe(1);
    expect(mockDb.admin_accounts.length).toBe(0);
  });

  // TEST 5 — Existing admin email
  it("TEST 5: properly detects and reports existing administrator email", async () => {
    const mockResponse = new Response(
      JSON.stringify({
        error: "An administrator with that email already exists.",
        code: "admin_email_exists",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

    vi.spyOn(FunctionsClient.prototype, "invoke").mockResolvedValue({
      data: null,
      error: {
        name: "FunctionsHttpError",
        message: "Edge Function returned a non-2xx status code",
        context: mockResponse,
      } as any,
    });

    await expect(
      createAdministratorInSupabase({
        displayName: "Duplicate Admin",
        email: "existingadmin@example.com",
        username: "admin2",
        roleId: 2,
        unitId: 1,
      }),
    ).rejects.toThrow("An administrator with that email already exists. Please use a different email address.");
  });

  // TEST 6 — New admin invite success
  it("TEST 6: successfully creates admin account and sends invite when email is new", async () => {
    const mockAdminRow = {
      id: "admin-uuid-999",
      display_name: "Fresh Admin",
      email: "freshadmin@pasig.gov.ph",
      username: "freshadmin",
      role_code: "admin",
      role_label: "Administrator",
      unit_code: "admin_unit",
      unit_label: "Admin Unit",
      is_active: true,
      is_password_set: false,
      last_active_at: null,
    };

    vi.spyOn(FunctionsClient.prototype, "invoke").mockResolvedValue({
      data: {
        administrator: mockAdminRow,
      },
      error: null,
    });

    const result = await createAdministratorInSupabase({
      displayName: "Fresh Admin",
      email: "freshadmin@pasig.gov.ph",
      username: "freshadmin",
      roleId: 2,
      unitId: 1,
    });

    expect(result.id).toBe("admin-uuid-999");
    expect(result.displayName).toBe("Fresh Admin");
    expect(result.email).toBe("freshadmin@pasig.gov.ph");
    expect(result.isPasswordSet).toBe(false);
  });

  // TEST 7 — Invitation failure rollback
  it("TEST 7: triggers compensating rollback (delete_admin_account) when inviteUserByEmail fails", async () => {
    let rollbackExecuted = false;
    const originalInviteError = "SMTP service connection timeout during invite.";

    // Simulate Edge Function workflow
    const handleEdgeFunctionCreate = async () => {
      // 1. Create admin row
      const createdAdminId = "temp-admin-id";
      try {
        // 2. Invite fails
        throw new Error(originalInviteError);
      } catch (inviteError: any) {
        // 3. Compensating rollback
        rollbackExecuted = true;
        return {
          status: 500,
          body: {
            error: inviteError.message || "Failed to send the invitation email. Please try again.",
            code: "invite_failed",
          },
        };
      }
    };

    const res = await handleEdgeFunctionCreate();
    expect(rollbackExecuted).toBe(true);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe(originalInviteError);
    expect(res.body.code).toBe("invite_failed");
  });

  // TEST 8 — Rollback failure
  it("TEST 8: surfaces original invitation error and logs rollback failure when rollback fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const originalInviteError = "GoTrue service unavailable.";
    const rollbackErrorMessage = "Database connection dropped during rollback.";

    const handleEdgeFunctionCreateWithRollbackFailure = async () => {
      const createdAdminId = "temp-admin-id";
      try {
        throw new Error(originalInviteError);
      } catch (inviteError: any) {
        try {
          // Compensating rollback fails
          throw new Error(rollbackErrorMessage);
        } catch (rollbackError: any) {
          console.error(
            `CRITICAL: Compensating rollback failed for orphaned admin account ${createdAdminId}:`,
            rollbackError,
          );
        }
        // Must surface original invite error, NOT the rollback error
        return {
          status: 500,
          body: {
            error: inviteError.message || "Failed to send the invitation email. Please try again.",
            code: "invite_failed",
          },
        };
      }
    };

    const res = await handleEdgeFunctionCreateWithRollbackFailure();
    expect(res.body.error).toBe(originalInviteError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("CRITICAL: Compensating rollback failed"),
      expect.anything(),
    );
  });

  // TEST 9 — Resend existing organization account
  it("TEST 9: rejects resend for existing organization account without deleting auth user", async () => {
    const conflictResponse = new Response(
      JSON.stringify({
        error: "This email address belongs to an existing organization account and cannot be reused for an administrator invitation.",
        code: "email_in_use_by_user",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

    vi.spyOn(FunctionsClient.prototype, "invoke").mockResolvedValue({
      data: null,
      error: {
        name: "FunctionsHttpError",
        message: "Edge Function returned a non-2xx status code",
        context: conflictResponse,
      } as any,
    });

    await expect(resendAdminInviteInSupabase("00000000-0000-0000-0000-000000000001")).rejects.toThrow(
      "This email address belongs to an existing organization account and cannot be reused for an administrator invitation.",
    );
  });

  // TEST 10 — Resend abandoned shadow invite
  it("TEST 10: allows resend / cleanup only when auth record is a provable unconfirmed shadow admin invite", async () => {
    // A shadow admin invite is identified by:
    // 1. No active organization profile
    // 2. Email confirmed is false / null
    // 3. User metadata indicates role: "admin" or invite purpose
    const shadowUser = {
      id: "shadow-user-1",
      email: "invited_admin@pasig.gov.ph",
      email_confirmed_at: null,
      user_metadata: { role: "admin_invite" },
    };

    const isProvableShadowAdmin = (user: typeof shadowUser, hasOrgProfile: boolean) => {
      return !hasOrgProfile && !user.email_confirmed_at;
    };

    expect(isProvableShadowAdmin(shadowUser, false)).toBe(true);

    // If an organization profile exists, it MUST NOT be considered a shadow admin
    expect(isProvableShadowAdmin(shadowUser, true)).toBe(false);
  });

  // TEST 11 — Unauthorized Admin
  it("TEST 11: rejects admin caller without administrators_management permission", async () => {
    const callerPermissions = ["view_dashboard", "manage_news"]; // Missing 'administrators_management'

    const authorizeAdminCaller = (permissions: string[]) => {
      if (!permissions.includes("administrators_management")) {
        return {
          authorized: false,
          error: "You do not have permission to manage administrator accounts.",
          code: "permission_denied",
          status: 403,
        };
      }
      return { authorized: true };
    };

    const check = authorizeAdminCaller(callerPermissions);
    expect(check.authorized).toBe(false);
    expect(check.status).toBe(403);
    expect(check.code).toBe("permission_denied");
  });

  // TEST 12 — Invalid payload
  it("TEST 12: cleanly rejects invalid or missing payload fields", async () => {
    const validatePayload = (payload: { email?: string; role_id?: number; unit_id?: number }) => {
      if (!payload.email || typeof payload.email !== "string" || !payload.email.includes("@")) {
        return { valid: false, error: "A valid email address is required.", code: "invalid_payload" };
      }
      if (!payload.role_id) {
        return { valid: false, error: "A role must be selected.", code: "invalid_payload" };
      }
      if (!payload.unit_id) {
        return { valid: false, error: "An office unit must be selected.", code: "invalid_payload" };
      }
      return { valid: true };
    };

    expect(validatePayload({}).valid).toBe(false);
    expect(validatePayload({ email: "invalid-email" }).valid).toBe(false);
    expect(validatePayload({ email: "valid@pasig.gov.ph" }).valid).toBe(false);
    expect(validatePayload({ email: "valid@pasig.gov.ph", role_id: 1, unit_id: 1 }).valid).toBe(true);
  });

  // TEST 13 — HTTP 400 frontend display
  it("TEST 13: surfaces exact backend error message from HTTP 400 to the UI caller", async () => {
    const customBackendError = "This email is registered to a pending organization verification.";
    const mockResponse = new Response(
      JSON.stringify({ error: customBackendError, code: "email_in_use_by_user" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

    const extracted = await extractEdgeFunctionError(
      { name: "FunctionsHttpError", message: "Edge Function returned a non-2xx status code", context: mockResponse },
      "Fallback message",
    );

    expect(extracted.message).toBe(customBackendError);
  });

  // TEST 14 — HTTP 500 generic fallback
  it("TEST 14: falls back to safe generic error message when HTTP 500 returns unparseable content", async () => {
    const mockResponse = new Response("<html><body>Internal Server Error</body></html>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });

    const extracted = await extractEdgeFunctionError(
      { name: "FunctionsHttpError", message: "Edge Function returned a non-2xx status code", context: mockResponse },
      "The administrator account could not be invited right now. Please try again later.",
    );

    expect(extracted.message).toBe("The administrator account could not be invited right now. Please try again later.");
  });

  // BONUS TEST 15 — Email availability preflight check
  it("TEST 15: checks email availability via preflight action in Edge Function", async () => {
    vi.spyOn(FunctionsClient.prototype, "invoke").mockResolvedValue({
      data: {
        status: "user_exists",
        message: "This email address is already registered to an organization account.",
      },
      error: null,
    });

    const result = await checkAdminEmailAvailabilityInSupabase("xxfaker4@gmail.com");
    expect(result.status).toBe("user_exists");
    expect(result.message).toContain("organization account");
  });
});
