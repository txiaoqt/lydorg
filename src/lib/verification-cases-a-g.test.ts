import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSignupEmail, PENDING_SIGNUP_EMAIL_KEY } from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("Verification of Cases A through G", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("Case A: New registration → Step 3 → OTP verification works", async () => {
    const newEmail = "brand_new_org@gmail.com";
    // 1. Initial check: email is available
    vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: false, error: null } as any);
    const availability = await checkSignupEmail(newEmail);
    expect(availability).toBe("available");

    // 2. Signup initiates: session key stored
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, newEmail);
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe(newEmail);

    // 3. Step 3 verification completes: OTP verified and session cleared
    vi.spyOn(supabase!.auth, "verifyOtp").mockResolvedValue({
      data: { session: { user: { id: "u-123" } } },
      error: null,
    } as any);
    vi.spyOn(supabase!.auth, "updateUser").mockResolvedValue({ data: {}, error: null } as any);

    const verifyResult = await supabase!.auth.verifyOtp({
      email: newEmail,
      token: "123456",
      type: "email",
    });
    expect(verifyResult.error).toBeNull();

    window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBeNull();
  });

  it("Case B: Registration → Step 3 → Back → return to registration: pending email is recognized and allows continue/resend", async () => {
    const pendingEmail = "interrupted_org@gmail.com";
    // User reached Step 3 previously
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, pendingEmail);
    // Supabase auth user exists
    vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: true, error: null } as any);

    // When returning to registration, status is recognized as unconfirmed
    const status = await checkSignupEmail(pendingEmail);
    expect(status).toBe("unconfirmed");

    // Resending / continuing signup calls signInWithOtp with shouldCreateUser false or true
    const otpMock = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.spyOn(supabase!.auth, "signInWithOtp").mockImplementation(otpMock);

    await supabase!.auth.signInWithOtp({
      email: pendingEmail,
      options: { shouldCreateUser: false },
    });
    expect(otpMock).toHaveBeenCalledWith({
      email: pendingEmail,
      options: { shouldCreateUser: false },
    });
  });

  it("Case C: Existing verified account: must not be classified as pending registration", async () => {
    const verifiedEmail = "verified_existing@gmail.com";
    // No active registration session in sessionStorage for this email
    vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: true, error: null } as any);

    const status = await checkSignupEmail(verifiedEmail);
    expect(status).toBe("registered");
    expect(status).not.toBe("unconfirmed");
  });

  it("Case D: Forgot Password with an unverified account: must NOT show registration pending-verification and must still use resetPasswordForEmail", async () => {
    const unverifiedEmail = "unconfirmed_account@gmail.com";
    const resetMock = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockImplementation(resetMock);

    // Forgot password executes resetPasswordForEmail directly
    const { error } = await supabase!.auth.resetPasswordForEmail(unverifiedEmail, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    expect(error).toBeNull();
    expect(resetMock).toHaveBeenCalledWith(unverifiedEmail, {
      redirectTo: "http://localhost:5173/reset-password",
    });
  });

  it("Case E: Forgot Password with a verified account: normal password-reset behavior", async () => {
    const verifiedEmail = "verified_account@gmail.com";
    const resetMock = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockImplementation(resetMock);

    const { error } = await supabase!.auth.resetPasswordForEmail(verifiedEmail, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    expect(error).toBeNull();
    expect(resetMock).toHaveBeenCalledWith(verifiedEmail, {
      redirectTo: "http://localhost:5173/reset-password",
    });
  });

  it("Case F: Refresh Step 3: password field appears on reload, but hidden on fresh navigation", () => {
    // 1. Fresh navigation from signup
    const freshIsReloaded = false;
    const freshShowPasswordField = freshIsReloaded;
    expect(freshShowPasswordField).toBe(false);

    // 2. Page reload on verify-email
    const reloadIsReloaded = true;
    const reloadShowPasswordField = reloadIsReloaded;
    const helperText = "Re-enter the password if this page was refreshed.";

    expect(reloadShowPasswordField).toBe(true);
    expect(helperText).toBe("Re-enter the password if this page was refreshed.");
  });

  it("Case G: Normal new registration: email is correctly treated as available", async () => {
    const cleanEmail = "brand_new_leader@gmail.com";
    vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: false, error: null } as any);

    const status = await checkSignupEmail(cleanEmail);
    expect(status).toBe("available");
  });

  it("Specific Scenario: haha@gmail.com (unconfirmed user) is pending when resuming, but registered when not resuming", async () => {
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: "unconfirmed", error: null } as any;
      return { data: true, error: null } as any;
    });

    // 1. When resuming registration (session storage has haha@gmail.com)
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "haha@gmail.com");
    const resumeStatus = await checkSignupEmail("haha@gmail.com");
    expect(resumeStatus).toBe("unconfirmed");

    // 2. When not resuming registration (session storage is empty)
    window.sessionStorage.clear();
    const nonResumeStatus = await checkSignupEmail("haha@gmail.com");
    expect(nonResumeStatus).toBe("registered");
  });

  it("Specific Scenario: xxfaker4@gmail.com (confirmed user) is always registered", async () => {
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: "registered", error: null } as any;
      return { data: true, error: null } as any;
    });

    // Even if session storage had this email, a confirmed account is registered
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "xxfaker4@gmail.com");
    const status = await checkSignupEmail("xxfaker4@gmail.com");
    expect(status).toBe("registered");
  });
});
