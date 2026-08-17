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

/**
 * Inspects a Supabase JWT access token to check if it was issued via password recovery.
 * Supabase GoTrue includes an `amr` (Authentication Methods Reference) claim in the JWT payload,
 * e.g., [{"method": "recovery", "timestamp": ...}].
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

  // 2. URL contains recovery credentials/hash/query
  const href = params?.url ?? window.location.href;
  const urlRecovery = parsePasswordRecoveryUrl(href);
  if (urlRecovery.hasRecoveryCredentials) return true;
  if (urlRecovery.hasRecoveryError) return false;

  // 3. Cryptographic JWT payload AMR inspection
  if (isRecoveryJwt(params?.session?.access_token)) return true;

  // 4. Shared cross-tab localStorage check
  try {
    const localFlag =
      window.localStorage.getItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY) === "1" ||
      window.localStorage.getItem(RECOVERY_STORAGE_KEY) === "1";
    if (localFlag) {
      return true;
    }
  } catch {
    // Ignore storage exceptions
  }

  // 5. Per-tab sessionStorage check (fast fallback)
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
    window.localStorage.setItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY, "1");
    window.localStorage.setItem(RECOVERY_STORAGE_KEY, "1");
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
    window.localStorage.removeItem(`${RECOVERY_STORAGE_KEY}-user`);
    window.sessionStorage.removeItem(RECOVERY_ACTIVE_LOCAL_STORAGE_KEY);
    window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage exceptions
  }
};


