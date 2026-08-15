import { describe, expect, it } from "vitest";
import {
  getVerificationErrorMessage,
  isSupabaseOtpExpiredError,
} from "./verification-error";

describe("Verification Error Handling", () => {
  describe("isSupabaseOtpExpiredError", () => {
    it("identifies standard Supabase expired OTP error message", () => {
      expect(isSupabaseOtpExpiredError({ message: "Token has expired or is invalid" })).toBe(true);
    });

    it("identifies standard Supabase email link expired message", () => {
      expect(isSupabaseOtpExpiredError({ message: "Email link is invalid or has expired" })).toBe(true);
    });

    it("identifies expired error code", () => {
      expect(isSupabaseOtpExpiredError({ code: "otp_expired", message: "Token is invalid" })).toBe(true);
      expect(isSupabaseOtpExpiredError({ code: "token_expired" })).toBe(true);
    });

    it("identifies explicit expired message", () => {
      expect(isSupabaseOtpExpiredError({ message: "OTP has expired" })).toBe(true);
      expect(isSupabaseOtpExpiredError({ message: "Verification code has expired" })).toBe(true);
    });

    it("returns false for non-expired invalid OTP errors", () => {
      expect(isSupabaseOtpExpiredError({ message: "Token is invalid" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ message: "Invalid token" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ message: "Token not found" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ code: "bad_code", message: "Invalid OTP" })).toBe(false);
    });

    it("handles empty or null errors safely", () => {
      expect(isSupabaseOtpExpiredError(null)).toBe(false);
      expect(isSupabaseOtpExpiredError(undefined)).toBe(false);
      expect(isSupabaseOtpExpiredError({})).toBe(false);
    });
  });

  describe("getVerificationErrorMessage", () => {
    it("returns expired message when Supabase indicates the code has expired", () => {
      const error = { message: "Token has expired or is invalid" };
      expect(getVerificationErrorMessage(error)).toBe(
        "That verification code has expired. Please request a new code.",
      );
    });

    it("returns expired message when error code is otp_expired", () => {
      const error = { code: "otp_expired", message: "Token is invalid" };
      expect(getVerificationErrorMessage(error)).toBe(
        "That verification code has expired. Please request a new code.",
      );
    });

    it("returns incorrect code message when code is wrong but not expired", () => {
      const error = { message: "Token is invalid" };
      expect(getVerificationErrorMessage(error)).toBe(
        "Incorrect verification code. Please check the code and try again.",
      );
    });

    it("returns incorrect code message for invalid token / token not found", () => {
      expect(getVerificationErrorMessage({ message: "Invalid token" })).toBe(
        "Incorrect verification code. Please check the code and try again.",
      );
      expect(getVerificationErrorMessage({ message: "Token not found" })).toBe(
        "Incorrect verification code. Please check the code and try again.",
      );
    });

    it("preserves rate limit errors", () => {
      const rateLimitError = {
        status: 429,
        message: "For security purposes, you can only request this once every 60 seconds",
      };
      expect(getVerificationErrorMessage(rateLimitError)).toBe(
        "For security purposes, you can only request this once every 60 seconds",
      );
    });

    it("handles Error instances", () => {
      const error = new Error("Token has expired or is invalid");
      expect(getVerificationErrorMessage(error)).toBe(
        "That verification code has expired. Please request a new code.",
      );

      const invalidError = new Error("Token is invalid");
      expect(getVerificationErrorMessage(invalidError)).toBe(
        "Incorrect verification code. Please check the code and try again.",
      );
    });
  });
});
