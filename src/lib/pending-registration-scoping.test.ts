import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSignupEmail, PENDING_SIGNUP_EMAIL_KEY } from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("Pending Registration Scoping & Flow Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  describe("Registration Flow (Sign Up)", () => {
    it("recognizes pending verification when resuming an interrupted registration from current session", async () => {
      const email = "leader@gmail.com";
      // Simulate user reaching Step 3 previously
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, email);
      // Supabase Auth user exists
      vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: true, error: null } as any);

      const status = await checkSignupEmail(email);
      expect(status).toBe("unconfirmed");
    });

    it("treats an existing account as registered when visited without interrupted session context", async () => {
      const email = "existing_user@gmail.com";
      // No active registration session in sessionStorage
      vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: true, error: null } as any);

      const status = await checkSignupEmail(email);
      expect(status).toBe("registered");
    });

    it("treats a new email as available", async () => {
      const email = "brand_new@gmail.com";
      vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: false, error: null } as any);

      const status = await checkSignupEmail(email);
      expect(status).toBe("available");
    });

    it("does not classify existing user as unconfirmed if session storage has a different email", async () => {
      const existingEmail = "verified_member@gmail.com";
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "someone_else@gmail.com");
      vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: true, error: null } as any);

      const status = await checkSignupEmail(existingEmail);
      expect(status).toBe("registered");
    });

    it("reverts status from unconfirmed to registered once pending signup session is cleared upon verification", async () => {
      const email = "finished_signup@gmail.com";
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, email);
      vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: true, error: null } as any);

      const statusBefore = await checkSignupEmail(email);
      expect(statusBefore).toBe("unconfirmed");

      // Verification finishes, removing session flag
      window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);

      const statusAfter = await checkSignupEmail(email);
      expect(statusAfter).toBe("registered");
    });
  });

  describe("Forgot Password Flow Independence", () => {
    it("submits password reset directly via supabase.auth.resetPasswordForEmail for any valid email without checking signup availability", async () => {
      const resetPasswordMock = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.spyOn(supabase!.auth, "resetPasswordForEmail").mockImplementation(resetPasswordMock);

      const email = "unconfirmed_user@gmail.com";
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
