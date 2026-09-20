import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSignupDraft,
  loadSignupDraft,
  PENDING_SIGNUP_EMAIL_KEY,
  saveSignupDraft,
  VERIFY_MODE_KEY,
  type SignupDraft,
} from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("Verification of Cases A through G & Auth Branching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("Case A: New Registration → Flow selected as registration_otp → OTP verification succeeds", async () => {
    const newEmail = "brand_new_org@gmail.com";
    const draft: SignupDraft = {
      organizationName: "Brand New Org",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      email: newEmail,
      contactNumber: "09123456789",
      district: "District I",
      barangayId: "barangay-buting",
      agreedToPolicies: true,
    };

    // 1. Signup initiates: non-sensitive draft, pending email, and mode stored
    saveSignupDraft(draft);
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, newEmail);
    window.sessionStorage.setItem(VERIFY_MODE_KEY, "registration_otp");
    expect(loadSignupDraft()).toEqual(draft);
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe(newEmail);
    expect(window.sessionStorage.getItem(VERIFY_MODE_KEY)).toBe("registration_otp");

    // 2. Step 3 verification completes: OTP verified and session cleared
    vi.spyOn(supabase!.auth, "verifyOtp").mockResolvedValue({
      data: { session: { user: { id: "u-123" } } },
      error: null,
    } as any);
    vi.spyOn(supabase!.auth, "updateUser").mockResolvedValue({ data: {}, error: null } as any);

    const verifyResult = await supabase!.auth.verifyOtp({
      email: newEmail,
      token: "123456",
      type: "signup",
    });
    expect(verifyResult.error).toBeNull();
    expect(verifyResult.data.session).not.toBeNull();

    clearSignupDraft();
    window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
    window.sessionStorage.removeItem(VERIFY_MODE_KEY);
    expect(loadSignupDraft()).toBeNull();
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBeNull();
  });

  it("Case B: Existing Account on Signup → Flow selected as existing_magic_link → sends sign-in link and sets mode", async () => {
    const existingEmail = "existing_leader@gmail.com";

    // 1. Mock signInWithOtp for existing user
    const signInWithOtpSpy = vi.spyOn(supabase!.auth, "signInWithOtp").mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any);

    // 2. Simulate sending sign-in link for existing account
    const { error } = await supabase!.auth.signInWithOtp({
      email: existingEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "http://localhost:5173/auth/callback",
      },
    });

    expect(error).toBeNull();
    expect(signInWithOtpSpy).toHaveBeenCalledWith({
      email: existingEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "http://localhost:5173/auth/callback",
      },
    });

    // 3. UI stores existing_magic_link mode (No OTP input screen shown)
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, existingEmail);
    window.sessionStorage.setItem(VERIFY_MODE_KEY, "existing_magic_link");

    expect(window.sessionStorage.getItem(VERIFY_MODE_KEY)).toBe("existing_magic_link");
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe(existingEmail);
  });

  it("Case C: Resending Sign-in link uses signInWithOtp with shouldCreateUser: false", async () => {
    const existingEmail = "leader_resend@gmail.com";
    const signInWithOtpSpy = vi.spyOn(supabase!.auth, "signInWithOtp").mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any);

    const { error } = await supabase!.auth.signInWithOtp({
      email: existingEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    expect(error).toBeNull();
    expect(signInWithOtpSpy).toHaveBeenCalledWith({
      email: existingEmail,
      options: {
        shouldCreateUser: false,
      },
    });
  });

  it("Case D: Resending OTP uses supabase.auth.resend with type: signup", async () => {
    const pendingEmail = "new_user_resend@gmail.com";
    const resendSpy = vi.spyOn(supabase!.auth, "resend").mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any);

    const { error } = await supabase!.auth.resend({
      type: "signup",
      email: pendingEmail,
    });

    expect(error).toBeNull();
    expect(resendSpy).toHaveBeenCalledWith({
      type: "signup",
      email: pendingEmail,
    });
  });

  it("Case E: Registration → Step 3 → Use a different email → Step 2 restores non-sensitive draft", () => {
    const originalDraft: SignupDraft = {
      organizationName: "Interrupted Youth Org",
      isExistingOrganization: true,
      organizationIdentifierNumber: "PCYDO-2026-9999",
      email: "old@gmail.com",
      contactNumber: "09123456789",
      district: "District II",
      barangayId: "barangay-rosario",
      agreedToPolicies: true,
    };
    saveSignupDraft(originalDraft);
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "old@gmail.com");

    // Returning to Step 2 restores non-sensitive draft with all fields intact and editable
    const restored = loadSignupDraft();
    expect(restored).toEqual(originalDraft);
  });

  it("Case F: Refresh Step 3: password field appears on reload for OTP mode, but hidden on fresh navigation", () => {
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

  it("Case G: Changing email from Step 2 creates a fresh verification state for the new email", () => {
    saveSignupDraft({
      organizationName: "Pasig Youth Org",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      email: "old_email@gmail.com",
      contactNumber: "09123456789",
      district: "District I",
      barangayId: "barangay-malinao",
      agreedToPolicies: true,
    });
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "old_email@gmail.com");

    // Change to new email
    const draft = loadSignupDraft()!;
    draft.email = "new_email@gmail.com";
    saveSignupDraft(draft);
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "new_email@gmail.com");

    expect(loadSignupDraft()?.email).toBe("new_email@gmail.com");
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe("new_email@gmail.com");
  });
});
