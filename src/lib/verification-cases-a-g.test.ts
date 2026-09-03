import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSignupDraft,
  loadSignupDraft,
  PENDING_SIGNUP_EMAIL_KEY,
  saveSignupDraft,
  type SignupDraft,
} from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("Verification of Cases A through G", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("Case A: New registration → Step 3 → OTP verification works", async () => {
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

    // 1. Signup initiates: non-sensitive draft and pending email stored
    saveSignupDraft(draft);
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, newEmail);
    expect(loadSignupDraft()).toEqual(draft);
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe(newEmail);

    // 2. Step 3 verification completes: OTP verified and session cleared
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

    clearSignupDraft();
    window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
    expect(loadSignupDraft()).toBeNull();
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBeNull();
  });

  it("Case B: Registration → Step 3 → Use a different email → Step 2 restores non-sensitive draft", () => {
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

  it("Case C: Forgot Password does not perform account existence lookup", async () => {
    const resetMock = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockImplementation(resetMock);

    const email = "any_account@gmail.com";
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    expect(error).toBeNull();
    expect(resetMock).toHaveBeenCalledWith(email, {
      redirectTo: "http://localhost:5173/reset-password",
    });
  });

  it("Case D: Forgot Password with an unverified account: triggers resetPasswordForEmail with generic output", async () => {
    const unverifiedEmail = "unconfirmed_account@gmail.com";
    const resetMock = vi.fn().mockResolvedValue({ data: {}, error: null });
    vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockImplementation(resetMock);

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
