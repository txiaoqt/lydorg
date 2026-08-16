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

describe("checkRecoveryEmail", () => {
  it("returns 'registered' ONLY for verified accounts", async () => {
    const { checkRecoveryEmail } = await import("./email-validation");
    const { supabase } = await import("./supabase");

    const rpcSpy = vi.spyOn(supabase!, "rpc").mockImplementation((fn: string) => {
      if (fn === "check_signup_email_status") {
        return Promise.resolve({ data: "registered", error: null } as any);
      }
      return Promise.resolve({ data: null, error: null } as any);
    });

    const status = await checkRecoveryEmail("registered_user@gmail.com");
    expect(status).toBe("registered");
    rpcSpy.mockRestore();
  });

  it("returns 'not_found' for unconfirmed / pending-verification accounts", async () => {
    const { checkRecoveryEmail } = await import("./email-validation");
    const { supabase } = await import("./supabase");

    const rpcSpy = vi.spyOn(supabase!, "rpc").mockImplementation((fn: string) => {
      if (fn === "check_signup_email_status") {
        return Promise.resolve({ data: "unconfirmed", error: null } as any);
      }
      return Promise.resolve({ data: null, error: null } as any);
    });

    const status = await checkRecoveryEmail("pending_user@gmail.com");
    expect(status).toBe("not_found");
    rpcSpy.mockRestore();
  });

  it("returns 'not_found' for accounts with no record in Supabase", async () => {
    const { checkRecoveryEmail } = await import("./email-validation");
    const { supabase } = await import("./supabase");

    const rpcSpy = vi.spyOn(supabase!, "rpc").mockImplementation((fn: string) => {
      if (fn === "check_signup_email_status") {
        return Promise.resolve({ data: "available", error: null } as any);
      }
      return Promise.resolve({ data: null, error: null } as any);
    });

    const status = await checkRecoveryEmail("nonexistent_user@gmail.com");
    expect(status).toBe("not_found");
    rpcSpy.mockRestore();
  });

  it("returns 'error' when Supabase RPC returns an error", async () => {
    const { checkRecoveryEmail } = await import("./email-validation");
    const { supabase } = await import("./supabase");

    const rpcSpy = vi.spyOn(supabase!, "rpc").mockImplementation((fn: string) => {
      if (fn === "check_signup_email_status") {
        return Promise.resolve({ data: null, error: { message: "Network Error" } } as any);
      }
      if (fn === "is_signup_email_registered") {
        return Promise.resolve({ data: null, error: { message: "Network Error" } } as any);
      }
      return Promise.resolve({ data: null, error: null } as any);
    });

    const status = await checkRecoveryEmail("error_user@gmail.com");
    expect(status).toBe("error");
    rpcSpy.mockRestore();
  });
});

