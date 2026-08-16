import { describe, expect, it } from "vitest";
import {
  getVerificationErrorMessage,
  isSupabaseOtpExpiredError,
} from "./verification-error";

describe("Verification Error Handling", () => {
  describe("isSupabaseOtpExpiredError", () => {
    it("identifies standard Supabase incorrect/invalid OTP error messages as NOT expired", () => {
      expect(isSupabaseOtpExpiredError({ message: "Token has expired or is invalid" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ message: "Email link is invalid or has expired" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ message: "Token is invalid" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ message: "Invalid token" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ message: "Token not found" })).toBe(false);
      expect(isSupabaseOtpExpiredError({ code: "bad_code", message: "Invalid OTP" })).toBe(false);
    });

    it("identifies explicit expired error codes and messages", () => {
      expect(isSupabaseOtpExpiredError({ code: "token_expired" })).toBe(true);
      expect(isSupabaseOtpExpiredError({ message: "OTP has expired" })).toBe(true);
      expect(isSupabaseOtpExpiredError({ message: "Verification code has expired" })).toBe(true);
      expect(isSupabaseOtpExpiredError({ message: "Token has expired" })).toBe(true);
    });

    it("handles empty or null errors safely", () => {
      expect(isSupabaseOtpExpiredError(null)).toBe(false);
      expect(isSupabaseOtpExpiredError(undefined)).toBe(false);
      expect(isSupabaseOtpExpiredError({})).toBe(false);
    });
  });

  describe("getVerificationErrorMessage", () => {
    it("returns incorrect code message for Supabase standard 'Token has expired or is invalid' response (000000 / wrong OTP)", () => {
      const error = { message: "Token has expired or is invalid" };
      expect(getVerificationErrorMessage(error)).toBe(
        "Incorrect verification code. Please check the code and try again.",
      );
    });

    it("returns expired message when code or message is explicitly expired", () => {
      expect(getVerificationErrorMessage({ message: "Verification code has expired" })).toBe(
        "That verification code has expired or invalid. Please request a new code.",
      );
      expect(getVerificationErrorMessage({ code: "token_expired" })).toBe(
        "That verification code has expired or invalid. Please request a new code.",
      );
    });

    it("returns incorrect code message when code is wrong or invalid", () => {
      expect(getVerificationErrorMessage({ message: "Token is invalid" })).toBe(
        "Incorrect verification code. Please check the code and try again.",
      );
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
        "Incorrect verification code. Please check the code and try again.",
      );

      const expiredError = new Error("Verification code has expired");
      expect(getVerificationErrorMessage(expiredError)).toBe(
        "That verification code has expired or invalid. Please request a new code.",
      );
    });

    it("respects VerificationAttemptContext isOtpExpired flag", () => {
      const genericError = { message: "Token has expired or is invalid" };
      expect(getVerificationErrorMessage(genericError, { isOtpExpired: true })).toBe(
        "That verification code has expired or invalid. Please request a new code.",
      );
      expect(getVerificationErrorMessage(genericError, { isOtpExpired: false })).toBe(
        "Incorrect verification code. Please check the code and try again.",
      );
    });
  });
});
