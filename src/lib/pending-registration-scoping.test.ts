import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSignupDraft,
  loadSignupDraft,
  PENDING_SIGNUP_EMAIL_KEY,
  saveSignupDraft,
  type SignupDraft,
} from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("Pending Registration Scoping & Flow Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  describe("Registration Flow (Sign Up)", () => {
    it("persists non-sensitive registration draft when advancing to verification", () => {
      const draft: SignupDraft = {
        organizationName: "Youth Alliance",
        isExistingOrganization: false,
        organizationIdentifierNumber: "",
        email: "leader@gmail.com",
        contactNumber: "09123456789",
        district: "District I",
        barangayId: "barangay-kapasigan",
        agreedToPolicies: true,
      };

      saveSignupDraft(draft);
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, draft.email);

      expect(loadSignupDraft()).toEqual(draft);
      expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe("leader@gmail.com");
    });

    it("scopes verification to the newly entered email when returning from Step 3 and modifying email", () => {
      // Step 1 & 2 submitted with old email
      const initialDraft: SignupDraft = {
        organizationName: "Youth Alliance",
        isExistingOrganization: false,
        organizationIdentifierNumber: "",
        email: "old@gmail.com",
        contactNumber: "09123456789",
        district: "District I",
        barangayId: "barangay-kapasigan",
        agreedToPolicies: true,
      };
      saveSignupDraft(initialDraft);
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "old@gmail.com");

      // User clicks "Use a different email" -> Step 2 loads draft -> user changes email
      const loadedDraft = loadSignupDraft();
      expect(loadedDraft?.organizationName).toBe("Youth Alliance");
      expect(loadedDraft?.email).toBe("old@gmail.com");

      // User updates email and resubmits
      const updatedDraft: SignupDraft = {
        ...loadedDraft!,
        email: "new@gmail.com",
      };
      saveSignupDraft(updatedDraft);
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "new@gmail.com");

      expect(loadSignupDraft()?.email).toBe("new@gmail.com");
      expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBe("new@gmail.com");
    });

    it("clears registration draft and pending session upon successful verification", () => {
      saveSignupDraft({
        organizationName: "Youth Alliance",
        isExistingOrganization: false,
        organizationIdentifierNumber: "",
        email: "verified@gmail.com",
        contactNumber: "09123456789",
        district: "District I",
        barangayId: "barangay-kapasigan",
        agreedToPolicies: true,
      });
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "verified@gmail.com");

      // Successful OTP verification
      clearSignupDraft();
      window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);

      expect(loadSignupDraft()).toBeNull();
      expect(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)).toBeNull();
    });
  });

  describe("Forgot Password Flow Independence", () => {
    it("submits password reset directly via supabase.auth.resetPasswordForEmail for any valid email without account existence lookup", async () => {
      const resetPasswordMock = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockImplementation(resetPasswordMock);

      const email = "user@gmail.com";
      const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:5173/reset-password",
      });

      expect(error).toBeNull();
      expect(resetPasswordMock).toHaveBeenCalledWith(email, {
        redirectTo: "http://localhost:5173/reset-password",
      });
    });
  });
});
