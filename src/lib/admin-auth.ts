export const ADMIN_SESSION_STORAGE_KEY = "lydo_admin_session_v1";
export const ADMIN_SESSION_CHANGE_EVENT = "lydo-admin-session-change";
export const ADMIN_LAST_ACTIVITY_STORAGE_KEY = "lydo_admin_last_activity_v1";
export const ADMIN_ACTIVITY_EVENT = "lydo-admin-activity";
export const ADMIN_SESSION_EXPIRED_EVENT = "lydo-admin-session-expired";
export const ADMIN_SETTINGS_STORAGE_KEY = "lydo_admin_system_settings_cache_v1";

export const DEFAULT_ADMIN_INACTIVITY_TIMEOUT_MINUTES = 30;

export type SeededAdminUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  sessionToken: string;
  expiresAt: string;
  roleCode?: string;
  permissionCodes?: string[];
  lastActivityAt?: number;
  isEmailVerified?: boolean;
};

/**
 * Read the configured inactivity timeout from cached system settings (in minutes).
 * Enforces safe boundaries [5, 480] with a default of 30 minutes.
 */
export const getAdminInactivityTimeoutMinutes = (): number => {
  if (typeof window === "undefined") return DEFAULT_ADMIN_INACTIVITY_TIMEOUT_MINUTES;
  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const val = Number(parsed["security.admin_session_timeout_minutes"]);
      if (!Number.isNaN(val) && val >= 5 && val <= 480) {
        return val;
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return DEFAULT_ADMIN_INACTIVITY_TIMEOUT_MINUTES;
};

/**
 * Get configured inactivity timeout in milliseconds.
 */
export const getAdminInactivityTimeoutMs = (): number => {
  return getAdminInactivityTimeoutMinutes() * 60 * 1000;
};

/**
 * Read last recorded administrator activity epoch timestamp.
 */
export const readAdminLastActivity = (): number => {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = window.localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
    if (!raw) return Date.now();
    const num = Number(raw);
    return Number.isNaN(num) || num <= 0 ? Date.now() : num;
  } catch {
    return Date.now();
  }
};

let lastRecordedMemoryTimestamp = 0;

/**
 * Record administrator user activity (clicks, keys, touch, scroll, navigation).
 * Throttled to avoid storage thrashing unless forced.
 */
export const recordAdminActivity = (options?: { force?: boolean; timestamp?: number }): number => {
  if (typeof window === "undefined") return Date.now();
  const now = options?.timestamp ?? Date.now();

  // Throttle writes to localStorage to at most once every 2 seconds unless forced
  if (!options?.force && now - lastRecordedMemoryTimestamp < 2000) {
    return lastRecordedMemoryTimestamp;
  }

  lastRecordedMemoryTimestamp = now;

  try {
    window.localStorage.setItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY, now.toString());

    // Extend active session expiresAt in storage so passive checks reflect active inactivity window
    const rawSession = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as Partial<SeededAdminUser>;
      if (parsed.sessionToken) {
        const timeoutMs = getAdminInactivityTimeoutMs();
        parsed.expiresAt = new Date(now + timeoutMs).toISOString();
        parsed.lastActivityAt = now;
        window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(parsed));
      }
    }

    window.dispatchEvent(new CustomEvent(ADMIN_ACTIVITY_EVENT, { detail: { timestamp: now } }));
  } catch {
    // Ignore quota errors
  }

  return now;
};

/**
 * Check whether continuous inactivity period has exceeded configured timeout threshold.
 */
export const isSessionExpiredDueToInactivity = (now = Date.now()): boolean => {
  if (typeof window === "undefined") return false;
  const lastActivity = readAdminLastActivity();
  const timeoutMs = getAdminInactivityTimeoutMs();
  return now - lastActivity >= timeoutMs;
};

/**
 * Clear administrator session and last activity record from storage.
 */
export const clearAdminSessionStorage = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
    lastRecordedMemoryTimestamp = 0;
  } catch {
    // Ignore storage errors
  }
};

export const readAdminSession = (): SeededAdminUser | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SeededAdminUser>;
    if (
      !parsed.id ||
      !parsed.username ||
      !parsed.email ||
      !parsed.displayName ||
      !parsed.sessionToken ||
      !parsed.expiresAt
    ) {
      return null;
    }

    // Authoritative check: verify against sliding inactivity timeout
    if (isSessionExpiredDueToInactivity()) {
      clearAdminSessionStorage();
      window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
      return null;
    }

    const expiresAtTime = new Date(parsed.expiresAt).getTime();
    if (!Number.isNaN(expiresAtTime) && expiresAtTime <= Date.now()) {
      clearAdminSessionStorage();
      window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
      return null;
    }

    return {
      id: parsed.id,
      username: parsed.username,
      email: parsed.email,
      displayName: parsed.displayName,
      sessionToken: parsed.sessionToken,
      expiresAt: parsed.expiresAt,
      roleCode: parsed.roleCode,
      permissionCodes: parsed.permissionCodes,
      lastActivityAt: parsed.lastActivityAt ?? readAdminLastActivity(),
    };
  } catch {
    return null;
  }
};

export const writeAdminSession = (user: SeededAdminUser | null) => {
  if (typeof window === "undefined") return;
  if (!user) {
    clearAdminSessionStorage();
    window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
    return;
  }

  const now = Date.now();
  const timeoutMs = getAdminInactivityTimeoutMs();
  const sessionUser: SeededAdminUser = {
    ...user,
    expiresAt: user.expiresAt || new Date(now + timeoutMs).toISOString(),
    lastActivityAt: now,
  };

  try {
    window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    window.localStorage.setItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY, now.toString());
    lastRecordedMemoryTimestamp = now;
  } catch {
    // Ignore storage quota errors
  }

  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
};
