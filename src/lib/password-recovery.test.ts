import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("TEST 1: Google OAuth callback code is not treated as password recovery", () => {
    const result = parsePasswordRecoveryUrl("https://example.com/auth/callback?code=test-oauth-code");
    expect(result.hasRecoveryCredentials).toBe(false);
    expect(result.hasRecoveryError).toBe(false);
    expect(result.code).toBe("test-oauth-code");
  });

  it("TEST 2: OAuth callback code without type=recovery is never treated as recovery", () => {
    const result = parsePasswordRecoveryUrl(
      "https://example.com/auth/callback?code=79d490c2-5116-4ec4-9b2f-34cb2f57a62b",
    );
    expect(result.hasRecoveryCredentials).toBe(false);
    expect(result.hasRecoveryError).toBe(false);
  });

  it("TEST 3: Actual password recovery token_hash with type=recovery remains recovery", () => {
    const result = parsePasswordRecoveryUrl(
      "https://example.com/reset-password?token_hash=valid-token-hash&type=recovery",
    );
    expect(result.hasRecoveryCredentials).toBe(true);
    expect(result.hasRecoveryError).toBe(false);
    expect(result.tokenHash).toBe("valid-token-hash");
  });

  it("TEST 4: Actual implicit password recovery access_token/refresh_token with type=recovery remains recovery", () => {
    const result = parsePasswordRecoveryUrl(
      "https://example.com/reset-password#access_token=valid-access&refresh_token=valid-refresh&type=recovery",
    );
    expect(result.hasRecoveryCredentials).toBe(true);
    expect(result.hasRecoveryError).toBe(false);
    expect(result.accessToken).toBe("valid-access");
    expect(result.refreshToken).toBe("valid-refresh");
  });
});

describe("isRecoveryJwt", () => {
  const createMockJwt = (amr: Array<{ method: string } | string>) => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ sub: "user-123", amr }));
    return `${header}.${payload}.signature`;
  };

  it("returns true for tokens with recovery AMR method", async () => {
    const { isRecoveryJwt } = await import("./password-recovery");
    const recoveryJwt = createMockJwt([{ method: "recovery" }]);
    expect(isRecoveryJwt(recoveryJwt)).toBe(true);

    const stringAmrJwt = createMockJwt(["recovery"]);
    expect(isRecoveryJwt(stringAmrJwt)).toBe(true);
  });

  it("returns false for normal password or OTP authenticated tokens", async () => {
    const { isRecoveryJwt } = await import("./password-recovery");
    const passwordJwt = createMockJwt([{ method: "password" }]);
    expect(isRecoveryJwt(passwordJwt)).toBe(false);

    const otpJwt = createMockJwt([{ method: "otp" }]);
    expect(isRecoveryJwt(otpJwt)).toBe(false);
  });

  it("returns false for invalid, empty, or malformed tokens", async () => {
    const { isRecoveryJwt } = await import("./password-recovery");
    expect(isRecoveryJwt("")).toBe(false);
    expect(isRecoveryJwt(null as any)).toBe(false);
    expect(isRecoveryJwt("invalid-token-format")).toBe(false);
  });
});

describe("isPasswordRecoveryActive across tabs and lifecycle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("returns true when eventName is PASSWORD_RECOVERY", async () => {
    const { isPasswordRecoveryActive } = await import("./password-recovery");
    expect(isPasswordRecoveryActive({ eventName: "PASSWORD_RECOVERY" })).toBe(true);
  });

  it("returns true when URL contains recovery credentials", async () => {
    const { isPasswordRecoveryActive } = await import("./password-recovery");
    expect(
      isPasswordRecoveryActive({
        url: "https://example.com/reset-password#access_token=token&refresh_token=refresh&type=recovery",
      }),
    ).toBe(true);
  });

  it("returns true in a new tab (no URL credentials, no sessionStorage) when localStorage has active recovery marker", async () => {
    const { isPasswordRecoveryActive, markPasswordRecoveryActive } = await import("./password-recovery");
    // Tab A marks recovery active
    markPasswordRecoveryActive("user-123");

    // Clear sessionStorage to simulate new tab B
    window.sessionStorage.clear();

    // Tab B visits /dashboard (clean URL, empty sessionStorage)
    expect(
      isPasswordRecoveryActive({
        url: "https://example.com/dashboard",
      }),
    ).toBe(true);
  });

  it("clears recovery state cleanly and allows normal authenticated state", async () => {
    const { isPasswordRecoveryActive, markPasswordRecoveryActive, clearPasswordRecoveryState } = await import(
      "./password-recovery"
    );
    markPasswordRecoveryActive("user-123");
    expect(isPasswordRecoveryActive({ url: "https://example.com/dashboard" })).toBe(true);

    clearPasswordRecoveryState();
    expect(isPasswordRecoveryActive({ url: "https://example.com/dashboard" })).toBe(false);
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBeNull();
    expect(window.localStorage.getItem("ytrace-recovery-session")).toBeNull();
    expect(window.sessionStorage.getItem("ytrace-active-password-recovery")).toBeNull();
    expect(window.sessionStorage.getItem("ytrace-recovery-session")).toBeNull();
  });

  it("returns false for expired/invalid error recovery URLs", async () => {
    const { isPasswordRecoveryActive } = await import("./password-recovery");
    expect(
      isPasswordRecoveryActive({
        url: "https://example.com/reset-password#error=access_denied&error_code=otp_expired",
      }),
    ).toBe(false);
  });

  it("TEST 5: Normal OAuth session clears stale recovery flags", async () => {
    const { isPasswordRecoveryActive, markPasswordRecoveryActive } = await import("./password-recovery");
    // Set stale recovery flags in both storages
    markPasswordRecoveryActive("user-stale");
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBe("1");
    expect(window.sessionStorage.getItem("ytrace-active-password-recovery")).toBe("1");

    // Provide a valid non-recovery OAuth session (amr: oauth)
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const oauthPayload = btoa(JSON.stringify({ sub: "google-user-1", amr: [{ method: "oauth" }], exp: futureExp }));
    const oauthJwt = `header.${oauthPayload}.signature`;

    const isRecovery = isPasswordRecoveryActive({
      url: "https://example.com/dashboard",
      eventName: "SIGNED_IN",
      session: {
        access_token: oauthJwt,
        user: { id: "google-user-1" },
      },
    });

    expect(isRecovery).toBe(false);
    expect(window.localStorage.getItem("ytrace-active-password-recovery")).toBeNull();
    expect(window.localStorage.getItem("ytrace-recovery-session")).toBeNull();
    expect(window.sessionStorage.getItem("ytrace-active-password-recovery")).toBeNull();
    expect(window.sessionStorage.getItem("ytrace-recovery-session")).toBeNull();
  });

  it("TEST 6: Genuine recovery session preserves recovery state even when recovery flags exist", async () => {
    const { isPasswordRecoveryActive, markPasswordRecoveryActive } = await import("./password-recovery");
    markPasswordRecoveryActive("user-recovery");

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const recoveryPayload = btoa(JSON.stringify({ sub: "user-recovery", amr: [{ method: "recovery" }], exp: futureExp }));
    const recoveryJwt = `header.${recoveryPayload}.signature`;

    const isRecovery = isPasswordRecoveryActive({
      url: "https://example.com/reset-password",
      session: {
        access_token: recoveryJwt,
        user: { id: "user-recovery" },
      },
    });

    expect(isRecovery).toBe(true);
  });
});
