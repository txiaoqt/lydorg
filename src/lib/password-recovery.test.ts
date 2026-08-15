import { describe, expect, it } from "vitest";
import { parsePasswordRecoveryUrl } from "./password-recovery";

describe("password recovery URL parsing", () => {
  it("recognizes Supabase implicit recovery tokens", () => {
    const result = parsePasswordRecoveryUrl(
      "https://example.com/reset-password#access_token=access&refresh_token=refresh&type=recovery",
    );
    expect(result.hasRecoveryCredentials).toBe(true);
    expect(result.hasRecoveryError).toBe(false);
    expect(result.accessToken).toBe("access");
    expect(result.refreshToken).toBe("refresh");
  });

  it("recognizes PKCE and token-hash recovery links", () => {
    expect(parsePasswordRecoveryUrl("https://example.com/reset-password?code=abc").code).toBe("abc");
    const tokenLink = parsePasswordRecoveryUrl(
      "https://example.com/reset-password?token_hash=hash&type=recovery",
    );
    expect(tokenLink.hasRecoveryCredentials).toBe(true);
    expect(tokenLink.hasRecoveryError).toBe(false);
    expect(tokenLink.tokenHash).toBe("hash");
  });

  it("does not treat the normal request page as a recovery session", () => {
    const result = parsePasswordRecoveryUrl("https://example.com/reset-password");
    expect(result.hasRecoveryCredentials).toBe(false);
    expect(result.hasRecoveryError).toBe(false);
  });

  it("recognizes Supabase expired/invalid OTP error URLs (TC048)", () => {
    const expiredHashLink = parsePasswordRecoveryUrl(
      "https://example.com/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    expect(expiredHashLink.hasRecoveryError).toBe(true);
    expect(expiredHashLink.hasRecoveryCredentials).toBe(false);
    expect(expiredHashLink.errorCode).toBe("otp_expired");
    expect(expiredHashLink.errorMessage).toBe("Email link is invalid or has expired");

    const expiredQueryLink = parsePasswordRecoveryUrl(
      "https://example.com/reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    expect(expiredQueryLink.hasRecoveryError).toBe(true);
    expect(expiredQueryLink.hasRecoveryCredentials).toBe(false);
    expect(expiredQueryLink.errorCode).toBe("otp_expired");
  });
});
