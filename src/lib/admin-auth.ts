export const ADMIN_SESSION_STORAGE_KEY = "lydo_admin_session_v1";
export const ADMIN_SESSION_CHANGE_EVENT = "lydo-admin-session-change";

export type SeededAdminUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  sessionToken: string;
  expiresAt: string;
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

    return {
      id: parsed.id,
      username: parsed.username,
      email: parsed.email,
      displayName: parsed.displayName,
      sessionToken: parsed.sessionToken,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
};

export const writeAdminSession = (user: SeededAdminUser | null) => {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
    return;
  }

  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
};
