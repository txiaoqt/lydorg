export type PasswordRecoveryParams = {
  hasRecoveryCredentials: boolean;
  hasRecoveryError: boolean;
  code: string;
  tokenHash: string;
  accessToken: string;
  refreshToken: string;
  errorCode: string;
  errorMessage: string;
};

export const RECOVERY_STORAGE_KEY = "ytrace-recovery-session";
export const RECOVERY_ACTIVE_LOCAL_STORAGE_KEY = "ytrace-active-password-recovery";

export const parsePasswordRecoveryUrl = (href: string): PasswordRecoveryParams => {
  const url = new URL(href, "https://y-trace.local");
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const type = query.get("type") || hash.get("type") || "";
  const code = query.get("code") || "";
  const tokenHash = query.get("token_hash") || "";
  const accessToken = hash.get("access_token") || query.get("access_token") || "";
  const refreshToken = hash.get("refresh_token") || query.get("refresh_token") || "";
  const errorCode = query.get("error_code") || hash.get("error_code") || "";
  const errorMessage =
    query.get("error_description") ||
    hash.get("error_description") ||
    query.get("error") ||
    hash.get("error") ||
    "";

  const hasRecoveryError = Boolean(errorCode || errorMessage);
  const hasRecoveryCredentials =
    !hasRecoveryError && (type === "recovery" || Boolean(code || tokenHash || (accessToken && refreshToken)));

  return {
    hasRecoveryCredentials,
    hasRecoveryError,
    code,
    tokenHash,
    accessToken,
    refreshToken,
    errorCode,
    errorMessage: errorMessage.replace(/\+/g, " "),
  };
};

export const RECOVERY_TIMESTAMP_LOCAL_STORAGE_KEY = "ytrace-recovery-timestamp";
export const RECOVERY_MAX_AGE_MS = 1000 * 60 * 30; // 30 minutes TTL

/**
 * Inspects a Supabase JWT access token to check if it was issued via password recovery.
 * Supabase GoTrue includes an `amr` (Authentication Methods Reference) claim in the JWT payload,
 * e.g., [{"method": "recovery", "timestamp": ...}].
 * Also verifies that the token has not expired.
 */
export const isRecoveryJwt = (accessToken?: string | null): boolean => {
  if (!accessToken || typeof accessToken !== "string") return false;
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    // Verify token expiration
    if (typeof payload?.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return false;
      }
    }

    if (Array.isArray(payload?.amr)) {
      return payload.amr.some(
        (entry: { method?: string } | string) =>
          (typeof entry === "object" && entry?.method === "recovery") || entry === "recovery"
      );
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Reads any Supabase access token stored in localStorage synchronously.
 */
export const getStoredSupabaseToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token) return parsed.access_token;
          if (Array.isArray(parsed) && parsed[0]?.access_token) return parsed[0].access_token;
        }
      }
    }
  } catch {
    // Ignore storage exceptions
  }
  return null;
};

/**
 * Determines if an active password recovery flow is present.
 * Inspects URL credentials, explicit auth events, cryptographic JWT AMR claims,
 * and shared storage (both localStorage across tabs and sessionStorage).
 */
export const isPasswordRecoveryActive = (params?: {
  url?: string;
  eventName?: string;
  session?: { access_token?: string; user?: { id?: string } } | null;
}): boolean => {
  if (typeof window === "undefined") return false;

  // 1. Explicit auth event from Supabase onAuthStateChange
  if (params?.eventName === "PASSWORD_RECOVERY") return true;

  // 2. URL contains recovery credentials/hash/query or recovery error
  const href = params?.url ?? window.location.href;
  const urlRecovery = parsePasswordRecoveryUrl(href);
  if (urlRecovery.hasRecoveryError) return false;
  if (urlRecovery.hasRecoveryCredentials) return true;

  // 3. Cryptographic JWT payload AMR inspection from current session parameter
  if (isRecoveryJwt(params?.session?.access_token)) return true;

  // 4. If session is explicitly null and URL has no recovery credentials,
  // there is NO active recovery session anywhere in the browser.
  // Purge any stale storage flags left over from previously closed/abandoned tabs.
  if (params?.session === null) {
    clearPasswordRecoveryState();
    return false;
  }

  // 5. If no explicit session was passed (e.g. initial synchronous check before async getSession()),
  // inspect any Supabase recovery session stored in localStorage.
  if (params?.session === undefined) {
    const storedToken = getStoredSupabaseToken();
    if (storedToken && isRecoveryJwt(storedToken)) {
      return true;
    }
  }

  // 6. Shared cross-tab localStorage check (corroborated by timestamp validity)
  try {
    const localFlag =
      window.localStorage.getItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY) === "1" ||
      window.localStorage.getItem(RECOVERY_STORAGE_KEY) === "1";

    if (localFlag) {
      const timestampRaw = window.localStorage.getItem(RECOVERY_TIMESTAMP_LOCAL_STORAGE_KEY);
      if (timestampRaw) {
        const timestamp = Number(timestampRaw);
        if (!Number.isNaN(timestamp) && Date.now() - timestamp > RECOVERY_MAX_AGE_MS) {
          // Marker is older than max age TTL; purge stale marker
          clearPasswordRecoveryState();
          return false;
        }
      }

      return true;
    }
  } catch {
    // Ignore storage exceptions
  }

  // 7. Per-tab sessionStorage check
  try {
    const sessionFlag =
      window.sessionStorage.getItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY) === "1" ||
      window.sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "1";
    if (sessionFlag) return true;
  } catch {
    // Ignore storage exceptions
  }

  return false;
};

/**
 * Marks the active password recovery flow in both localStorage and sessionStorage.
 */
export const markPasswordRecoveryActive = (userId?: string | null) => {
  if (typeof window === "undefined") return;
  try {
    const now = String(Date.now());
    window.localStorage.setItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY, "1");
    window.localStorage.setItem(RECOVERY_STORAGE_KEY, "1");
    window.localStorage.setItem(RECOVERY_TIMESTAMP_LOCAL_STORAGE_KEY, now);
    window.sessionStorage.setItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY, "1");
    window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, "1");
    if (userId) {
      window.localStorage.setItem(`${RECOVERY_STORAGE_KEY}-user`, userId);
    }
  } catch {
    // Ignore storage exceptions
  }
};

/**
 * Clears the active password recovery state across both localStorage and sessionStorage.
 */
export const clearPasswordRecoveryState = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY);
    window.localStorage.removeItem(RECOVERY_STORAGE_KEY);
    window.localStorage.removeItem(RECOVERY_TIMESTAMP_LOCAL_STORAGE_KEY);
    window.localStorage.removeItem(`${RECOVERY_STORAGE_KEY}-user`);
    window.sessionStorage.removeItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY);
    window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage exceptions
  }
};


