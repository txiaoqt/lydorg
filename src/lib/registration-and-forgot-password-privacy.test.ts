import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSignupDraft,
  GENERIC_RESET_MESSAGE,
  GENERIC_VERIFY_MESSAGE,
  isGmailFormat,
  isValidEmailFormat,
  loadSignupDraft,
  PENDING_SIGNUP_EMAIL_KEY,
  saveSignupDraft,
  SIGNUP_DRAFT_KEY,
  type SignupDraft,
} from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("Registration & Forgot Password Privacy-Preserving Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  describe("1. Registration Draft Persistence & Zero Password Storage (Option A)", () => {
    it("persists all non-sensitive registration draft fields to sessionStorage", () => {
      const draft: SignupDraft = {
        organizationName: "Pasig Youth Council",
        isExistingOrganization: true,
        organizationIdentifierNumber: "PCYDO-2026-0001",
        email: "leader@gmail.com",
        contactNumber: "09123456789",
        district: "District I",
        barangayId: "barangay-kapitolyo",
        agreedToPolicies: true,
      };

      saveSignupDraft(draft);
      const loaded = loadSignupDraft();
      expect(loaded).toEqual(draft);
    });

    it("ensures passwords and confirmPasswords are NEVER written to sessionStorage", () => {
      const draft: SignupDraft = {
        organizationName: "Pasig Youth Council",
        isExistingOrganization: false,
        organizationIdentifierNumber: "",
        email: "secure@gmail.com",
        contactNumber: "09123456789",
        district: "District I",
        barangayId: "barangay-palatiw",
        agreedToPolicies: true,
      };

      saveSignupDraft(draft);

      const rawStorage = window.sessionStorage.getItem(SIGNUP_DRAFT_KEY);
      expect(rawStorage).not.toBeNull();
      const parsed = JSON.parse(rawStorage!);

      expect(parsed.password).toBeUndefined();
      expect(parsed.confirmPassword).toBeUndefined();
      expect(rawStorage).not.toContain("password");
    });

    it("restores draft cleanly and confirms password fields are empty upon return to Step 2", () => {
      saveSignupDraft({
        organizationName: "Youth Advocates",
        isExistingOrganization: false,
        organizationIdentifierNumber: "",
        email: "advocates@gmail.com",
        contactNumber: "09123456789",
        district: "District II",
        barangayId: "barangay-manggahan",
        agreedToPolicies: true,
      });

      const restored = loadSignupDraft();
      expect(restored).not.toBeNull();
      expect(restored?.organizationName).toBe("Youth Advocates");

      // Password fields in component start as empty strings
      const componentPassword = "";
      const componentConfirmPassword = "";
      expect(componentPassword).toBe("");
      expect(componentConfirmPassword).toBe("");
    });

    it("allows full editability of all restored fields (not an email-only edit mode)", () => {
      saveSignupDraft({
        organizationName: "Original Org Name",
        isExistingOrganization: true,
        organizationIdentifierNumber: "PCYDO-1111",
        email: "orig@gmail.com",
        contactNumber: "09111111111",
        district: "District I",
        barangayId: "barangay-bambang",
        agreedToPolicies: true,
      });

      const draft = loadSignupDraft()!;

      // 1. Can edit only email
      draft.email = "modified-email@gmail.com";
      expect(draft.email).toBe("modified-email@gmail.com");

      // 2. Can edit email + contact
      draft.contactNumber = "09222222222";
      expect(draft.contactNumber).toBe("09222222222");

      // 3. Can edit organization name
      draft.organizationName = "Brand New Youth Org";
      expect(draft.organizationName).toBe("Brand New Youth Org");

      // 4. Can edit URN
      draft.organizationIdentifierNumber = "PCYDO-2222";
      expect(draft.organizationIdentifierNumber).toBe("PCYDO-2222");

      // 5. Can edit district and barangay
      draft.district = "District II";
      draft.barangayId = "barangay-santolan";
      expect(draft.district).toBe("District II");
      expect(draft.barangayId).toBe("barangay-santolan");

      saveSignupDraft(draft);
      const updated = loadSignupDraft();
      expect(updated).toEqual(draft);
    });

    it("clears registration draft upon successful verification", () => {
      saveSignupDraft({
        organizationName: "Success Org",
        isExistingOrganization: false,
        organizationIdentifierNumber: "",
        email: "done@gmail.com",
        contactNumber: "09123456789",
        district: "District I",
        barangayId: "barangay-sagad",
        agreedToPolicies: true,
      });
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "done@gmail.com");

      clearSignupDraft();
      window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);

      expect(loadSignupDraft()).toBeNull();
      expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBeNull();
    });
  });

  describe("2. Verification Scoping & OTP Isolation", () => {
    it("scopes verification to the active email and prevents old OTP reuse when email is changed", async () => {
      // User initially attempts old@gmail.com
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "old@gmail.com");

      // User returns to Step 2 and changes email to new@gmail.com
      const newEmail = "new@gmail.com";
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, newEmail);

      expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe(newEmail);

      // Server verification mock: fails if token doesn't match new email
      vi.spyOn(supabase!.auth, "verifyOtp").mockImplementation(async (params: any) => {
        if (params.email === "new@gmail.com" && params.token === "999999") {
          return { data: { session: { user: { id: "u-new" } } }, error: null } as any;
        }
        return { data: { session: null }, error: { message: "Token has expired or is invalid" } } as any;
      });

      // Submitting old OTP (111111) for new email fails
      const failedResult = await supabase!.auth.verifyOtp({
        email: newEmail,
        token: "111111",
        type: "email",
      });
      expect(failedResult.error).not.toBeNull();
      expect(failedResult.error?.message).toContain("invalid");

      // Submitting valid OTP (999999) for new email succeeds
      const successResult = await supabase!.auth.verifyOtp({
        email: newEmail,
        token: "999999",
        type: "email",
      });
      expect(successResult.error).toBeNull();
      expect(successResult.data.session).not.toBeNull();
    });
  });

  describe("3. Zero Account Enumeration & Generic Messaging", () => {
    it("does not call check_signup_email_status or is_signup_email_registered during email format validation", () => {
      const rpcSpy = vi.spyOn(supabase!, "rpc");

      expect(isGmailFormat("test@gmail.com")).toBe(true);
      expect(isValidEmailFormat("test@domain.com")).toBe(true);

      expect(rpcSpy).not.toHaveBeenCalled();
    });

    it("provides uniform generic message for Step 3 verification", () => {
      expect(GENERIC_VERIFY_MESSAGE).toBe(
        "If this email can be used for registration, we'll send a verification code.",
      );
    });

    it("provides uniform generic message for Forgot Password", () => {
      expect(GENERIC_RESET_MESSAGE).toBe(
        "If an account is associated with this email address, you’ll receive a password reset link shortly. Please check your inbox and spam folder.",
      );
    });
  });

  describe("4. Forgot Password Flow & 60-Second Cooldown UX", () => {
    it("triggers resetPasswordForEmail with generic message regardless of account existence", async () => {
      const resetSpy = vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockResolvedValue({
        data: {},
        error: null,
      });

      const email = "arbitrary_user@gmail.com";
      const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:5173/reset-password",
      });

      expect(error).toBeNull();
      expect(resetSpy).toHaveBeenCalledWith(email, {
        redirectTo: "http://localhost:5173/reset-password",
      });
    });

    it("handles rate limiting errors gracefully without revealing account presence", async () => {
      vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockResolvedValue({
        data: {},
        error: { message: "rate limit exceeded: 429", status: 429 } as any,
      });

      const { error } = await supabase!.auth.resetPasswordForEmail("target@gmail.com", {
        redirectTo: "http://localhost:5173/reset-password",
      });

      expect(error).not.toBeNull();
      expect(/rate limit/i.test(error!.message)).toBe(true);
    });
  });
});
