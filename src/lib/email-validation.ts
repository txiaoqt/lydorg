export const PENDING_SIGNUP_EMAIL_KEY = "ytrace-pending-signup-email";
export const VERIFY_FRESH_NAV_KEY = "ytrace_verify_fresh_nav";
export const SIGNUP_DRAFT_KEY = "ytrace_signup_draft";

export const GENERIC_VERIFY_MESSAGE = "If this email can be used for registration, we'll send a verification code.";
export const GENERIC_RESET_MESSAGE = "If an account exists for this email, you'll receive a password reset link.";

export interface SignupDraft {
  organizationName: string;
  isExistingOrganization: boolean;
  organizationIdentifierNumber: string;
  email: string;
  contactNumber: string;
  district: string;
  barangayId: string;
  agreedToPolicies: boolean;
}

/**
 * Saves non-sensitive registration form fields to sessionStorage.
 * Passwords and confirmation passwords are NEVER persisted.
 */
export const saveSignupDraft = (draft: SignupDraft): void => {
  if (typeof window === "undefined") return;
  try {
    const payload: SignupDraft = {
      organizationName: draft.organizationName ?? "",
      isExistingOrganization: Boolean(draft.isExistingOrganization),
      organizationIdentifierNumber: draft.organizationIdentifierNumber ?? "",
      email: (draft.email ?? "").trim().toLowerCase(),
      contactNumber: draft.contactNumber ?? "",
      district: draft.district ?? "",
      barangayId: draft.barangayId ?? "",
      agreedToPolicies: Boolean(draft.agreedToPolicies),
    };
    window.sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage exceptions
  }
};

/**
 * Loads the non-sensitive registration draft from sessionStorage.
 */
export const loadSignupDraft = (): SignupDraft | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        organizationName: String(parsed.organizationName ?? ""),
        isExistingOrganization: Boolean(parsed.isExistingOrganization),
        organizationIdentifierNumber: String(parsed.organizationIdentifierNumber ?? ""),
        email: String(parsed.email ?? "").trim().toLowerCase(),
        contactNumber: String(parsed.contactNumber ?? ""),
        district: String(parsed.district ?? ""),
        barangayId: String(parsed.barangayId ?? ""),
        agreedToPolicies: Boolean(parsed.agreedToPolicies),
      };
    }
  } catch {
    // Ignore storage exceptions
  }
  return null;
};

/**
 * Clears the registration draft from sessionStorage.
 */
export const clearSignupDraft = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
  } catch {
    // Ignore storage exceptions
  }
};

/**
 * Synchronous client-side format checks (zero network calls, zero enumeration).
 */
export const isGmailFormat = (email: string): boolean =>
  /^[a-z0-9._%+-]+@gmail\.com$/i.test(email.trim());

export const isValidEmailFormat = (email: string): boolean =>
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email.trim());
