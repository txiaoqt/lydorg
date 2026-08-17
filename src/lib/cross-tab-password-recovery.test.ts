import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPasswordRecoveryState,
  isPasswordRecoveryActive,
  isRecoveryJwt,
  markPasswordRecoveryActive,
  parsePasswordRecoveryUrl,
  RECOVERY_ACTIVE_LOCAL_STORAGE_KEY,
  RECOVERY_STORAGE_KEY,
} from "./password-recovery";

describe("Cross-Tab Password Recovery Security & Route Protection", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("TEST 1: Normal Login — grants access to protected routes when not in recovery", () => {
    // Normal authenticated state: no recovery URL, no recovery token, no storage flags
    const isRecovery = isPasswordRecoveryActive({
      url: "https://y-trace.local/dashboard",
      eventName: "SIGNED_IN",
      session: {
        access_token: "header.eyJzdWIiOiIxMjMiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIn1dfQ.sig",
        user: { id: "123" },
      },
    });

    expect(isRecovery).toBe(false);
  });

  it("TEST 2: Active Reset Flow / Same Tab — blocks protected routes and identifies recovery session", () => {
    // User lands on recovery URL
    const recoveryUrl = "https://y-trace.local/reset-password#access_token=rec-token&refresh_token=rec-refresh&type=recovery";
    const urlParams = parsePasswordRecoveryUrl(recoveryUrl);
    expect(urlParams.hasRecoveryCredentials).toBe(true);

    // Initial check on reset page identifies recovery
    const isRecovery = isPasswordRecoveryActive({
      url: recoveryUrl,
      eventName: "PASSWORD_RECOVERY",
      session: {
        access_token: "header.eyJzdWIiOiIxMjMiLCJhbXIiOlt7Im1ldGhvZCI6InJlY292ZXJ5In1dfQ.sig",
        user: { id: "123" },
      },
    });
    expect(isRecovery).toBe(true);

    // Mark recovery active in storage
    markPasswordRecoveryActive("123");

    // Attempting to access /dashboard in the same tab is blocked
    const dashboardCheck = isPasswordRecoveryActive({
      url: "https://y-trace.local/dashboard",
      session: {
        access_token: "header.eyJzdWIiOiIxMjMiLCJhbXIiOlt7Im1ldGhvZCI6InJlY292ZXJ5In1dfQ.sig",
        user: { id: "123" },
      },
    });
    expect(dashboardCheck).toBe(true);
  });

  it("TEST 3: Browser Back Button — preserves recovery state and keeps protected routes blocked", () => {
    // Start recovery
    markPasswordRecoveryActive("user-456");

    // User presses back button -> URL becomes "/" or "/signin" with no URL params
    const backNavigationUrl = "https://y-trace.local/";
    const isStillRecovery = isPasswordRecoveryActive({
      url: backNavigationUrl,
      session: {
        access_token: "header.eyJzdWIiOiI0NTYiLCJhbXIiOlt7Im1ldGhvZCI6InJlY292ZXJ5In1dfQ.sig",
        user: { id: "user-456" },
      },
    });

    expect(isStillRecovery).toBe(true);
  });

  it("TEST 4: New Tab — detects recovery session from shared localStorage and blocks /dashboard", () => {
    // Tab A initiates recovery and marks shared storage
    markPasswordRecoveryActive("user-789");

    // Simulate opening a brand new browser Tab B:
    // 1. Session storage is empty (new tabs don't inherit sessionStorage)
    window.sessionStorage.clear();
    // 2. URL is a clean /dashboard URL with no hash or query credentials
    const tabBUrl = "https://y-trace.local/dashboard";
    // 3. Tab B reads the Supabase session from localStorage
    const tabBSession = {
      access_token: "header.eyJzdWIiOiI3ODkiLCJhbXIiOlt7Im1ldGhvZCI6InJlY292ZXJ5In1dfQ.sig",
      user: { id: "user-789" },
    };

    // Tab B evaluates whether password recovery is active
    const tabBIsRecovery = isPasswordRecoveryActive({
      url: tabBUrl,
      session: tabBSession,
    });

    expect(tabBIsRecovery).toBe(true);
    expect(window.localStorage.getItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY)).toBe("1");
    expect(window.localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe("1");
  });

  it("TEST 5: Multiple Protected Routes — all routes are recognized as recovery restricted", () => {
    markPasswordRecoveryActive("user-999");
    window.sessionStorage.clear(); // Simulate separate tab

    const protectedPaths = [
      "/dashboard",
      "/documents",
      "/liquidation",
      "/budget",
      "/ypop",
      "/templates",
      "/organization-profile",
      "/document-submission",
      "/budget-request",
      "/liquidation-reporting",
      "/portal-news-releases",
      "/compliance-status",
      "/notifications",
      "/admin",
    ];

    for (const path of protectedPaths) {
      const isRecovery = isPasswordRecoveryActive({
        url: `https://y-trace.local${path}`,
        session: {
          access_token: "header.eyJzdWIiOiI5OTkiLCJhbXIiOlt7Im1ldGhvZCI6InJlY292ZXJ5In1dfQ.sig",
          user: { id: "user-999" },
        },
      });
      expect(isRecovery).toBe(true);
    }
  });

  it("TEST 6: Successful Password Reset — clears recovery state and enables normal authenticated session", () => {
    // Start in recovery state
    markPasswordRecoveryActive("user-100");
    expect(isPasswordRecoveryActive({ url: "https://y-trace.local/dashboard" })).toBe(true);

    // Password reset completes successfully -> clear state
    clearPasswordRecoveryState();

    // Verify all shared storage keys are removed
    expect(window.localStorage.getItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();

    // Normal session can now access /dashboard across tabs
    const isRecoveryAfterReset = isPasswordRecoveryActive({
      url: "https://y-trace.local/dashboard",
      session: {
        access_token: "header.eyJzdWIiOiIxMDAiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIn1dfQ.sig",
        user: { id: "user-100" },
      },
    });
    expect(isRecoveryAfterReset).toBe(false);
  });

  it("TEST 7: Expired / Invalid Token — rejects recovery and keeps protected routes inaccessible", () => {
    const expiredUrl = "https://y-trace.local/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    const urlParams = parsePasswordRecoveryUrl(expiredUrl);

    expect(urlParams.hasRecoveryError).toBe(true);
    expect(urlParams.hasRecoveryCredentials).toBe(false);

    // With no valid session and expired error URL, recovery is not active and no auth session is created
    const isRecovery = isPasswordRecoveryActive({
      url: expiredUrl,
      session: null,
    });
    expect(isRecovery).toBe(false);
  });
});
