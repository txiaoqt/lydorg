import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  ADMIN_SESSION_STORAGE_KEY,
  ADMIN_LAST_ACTIVITY_STORAGE_KEY,
  ADMIN_SETTINGS_STORAGE_KEY,
  ADMIN_SESSION_CHANGE_EVENT,
  ADMIN_ACTIVITY_EVENT,
  DEFAULT_ADMIN_INACTIVITY_TIMEOUT_MINUTES,
  getAdminInactivityTimeoutMinutes,
  getAdminInactivityTimeoutMs,
  readAdminLastActivity,
  recordAdminActivity,
  isSessionExpiredDueToInactivity,
  clearAdminSessionStorage,
  readAdminSession,
  writeAdminSession,
  type SeededAdminUser,
} from "./admin-auth";

describe("Admin Session Inactivity Timeout Mechanics", () => {
  const mockAdminUser: SeededAdminUser = {
    id: "admin-uuid-1",
    username: "pasig_admin",
    email: "admin@pasigcity.gov.ph",
    displayName: "Pasig Administrator",
    sessionToken: "session-token-xyz-123",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    roleCode: "super_admin",
    permissionCodes: ["system_settings_view", "system_settings_manage"],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns default 30 minutes when no settings are cached", () => {
    expect(getAdminInactivityTimeoutMinutes()).toBe(DEFAULT_ADMIN_INACTIVITY_TIMEOUT_MINUTES);
    expect(getAdminInactivityTimeoutMs()).toBe(30 * 60 * 1000);
  });

  it("reads dynamic timeout configuration from cached system settings within [5, 480]", () => {
    localStorage.setItem(
      ADMIN_SETTINGS_STORAGE_KEY,
      JSON.stringify({ "security.admin_session_timeout_minutes": 120 }),
    );
    expect(getAdminInactivityTimeoutMinutes()).toBe(120);
    expect(getAdminInactivityTimeoutMs()).toBe(120 * 60 * 1000);

    // Test minimum boundary clamping
    localStorage.setItem(
      ADMIN_SETTINGS_STORAGE_KEY,
      JSON.stringify({ "security.admin_session_timeout_minutes": 4 }),
    );
    expect(getAdminInactivityTimeoutMinutes()).toBe(30);

    // Test maximum boundary clamping
    localStorage.setItem(
      ADMIN_SETTINGS_STORAGE_KEY,
      JSON.stringify({ "security.admin_session_timeout_minutes": 500 }),
    );
    expect(getAdminInactivityTimeoutMinutes()).toBe(30);

    // Test valid 15-minute setting
    localStorage.setItem(
      ADMIN_SETTINGS_STORAGE_KEY,
      JSON.stringify({ "security.admin_session_timeout_minutes": 15 }),
    );
    expect(getAdminInactivityTimeoutMinutes()).toBe(15);
    expect(getAdminInactivityTimeoutMs()).toBe(15 * 60 * 1000);
  });

  it("writes admin session and initializes last activity timestamp", () => {
    const baseTime = 1700000000000;
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);

    writeAdminSession(mockAdminUser);

    expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)).toBe(baseTime.toString());
    expect(readAdminLastActivity()).toBe(baseTime);

    const session = readAdminSession();
    expect(session).not.toBeNull();
    expect(session?.username).toBe("pasig_admin");
  });

  it("records user activity, throttles rapid writes, and extends session expiration", () => {
    const baseTime = 1700000000000;
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);

    writeAdminSession(mockAdminUser);

    // Initial activity
    recordAdminActivity({ force: true });
    expect(readAdminLastActivity()).toBe(baseTime);

    // Rapid activity 500ms later should be throttled (not updating timestamp in storage)
    vi.setSystemTime(baseTime + 500);
    recordAdminActivity();
    expect(readAdminLastActivity()).toBe(baseTime);

    // Meaningful activity 3 seconds later should update timestamp and extend expiresAt
    const laterTime = baseTime + 3000;
    vi.setSystemTime(laterTime);
    recordAdminActivity();
    expect(readAdminLastActivity()).toBe(laterTime);

    const session = readAdminSession();
    expect(session).not.toBeNull();
    const expectedExpiry = new Date(laterTime + 30 * 60 * 1000).toISOString();
    expect(session?.expiresAt).toBe(expectedExpiry);
  });

  it("detects continuous inactivity and expires session when timeout threshold is exceeded", () => {
    const baseTime = 1700000000000;
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);

    // Set 30 minute timeout
    localStorage.setItem(
      ADMIN_SETTINGS_STORAGE_KEY,
      JSON.stringify({ "security.admin_session_timeout_minutes": 30 }),
    );

    writeAdminSession(mockAdminUser);
    expect(isSessionExpiredDueToInactivity(baseTime)).toBe(false);

    // Advance 29 minutes: session remains active
    const activeTime = baseTime + 29 * 60 * 1000;
    vi.setSystemTime(activeTime);
    expect(isSessionExpiredDueToInactivity(activeTime)).toBe(false);
    expect(readAdminSession()).not.toBeNull();

    // User performs activity at 29 minutes, resetting the 30-minute inactivity window
    recordAdminActivity({ force: true });
    expect(readAdminLastActivity()).toBe(activeTime);

    // Advance another 20 minutes (total 49 mins from login, but only 20 mins from last activity): session remains valid!
    const validExtendedTime = activeTime + 20 * 60 * 1000;
    vi.setSystemTime(validExtendedTime);
    expect(isSessionExpiredDueToInactivity(validExtendedTime)).toBe(false);
    expect(readAdminSession()).not.toBeNull();

    // Now administrator becomes completely idle for 31 continuous minutes
    const expiredTime = validExtendedTime + 31 * 60 * 1000;
    vi.setSystemTime(expiredTime);
    expect(isSessionExpiredDueToInactivity(expiredTime)).toBe(true);

    // readAdminSession should now drop the session and clear storage
    const expiredSession = readAdminSession();
    expect(expiredSession).toBeNull();
    expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)).toBeNull();
  });

  it("clears all administrator session keys on clearAdminSessionStorage", () => {
    writeAdminSession(mockAdminUser);
    expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)).not.toBeNull();

    clearAdminSessionStorage();
    expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)).toBeNull();
    expect(readAdminSession()).toBeNull();
  });

  it("responds dynamically to setting changes from 30 to 15 minutes", () => {
    const baseTime = 1700000000000;
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);

    writeAdminSession(mockAdminUser);

    // Initially with 30m timeout, 20m idle is not expired
    const after20m = baseTime + 20 * 60 * 1000;
    vi.setSystemTime(after20m);
    expect(isSessionExpiredDueToInactivity(after20m)).toBe(false);

    // Change setting to 15m timeout
    localStorage.setItem(
      ADMIN_SETTINGS_STORAGE_KEY,
      JSON.stringify({ "security.admin_session_timeout_minutes": 15 }),
    );

    // Now at 20m idle, it immediately detects expiration according to new policy
    expect(isSessionExpiredDueToInactivity(after20m)).toBe(true);
    expect(readAdminSession()).toBeNull();
  });
});
