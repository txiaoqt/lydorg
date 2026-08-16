import { supabase } from "@/lib/supabase";

export const PENDING_SIGNUP_EMAIL_KEY = "ytrace-pending-signup-email";
export const VERIFY_FRESH_NAV_KEY = "ytrace_verify_fresh_nav";

export type EmailAvailability = "idle" | "checking" | "available" | "unconfirmed" | "registered" | "error";


export type CheckSignupEmailOptions = {
  /**
   * Explicitly indicates caller is within an active registration-resume workflow.
   * Only used when the caller can definitively prove registration is being resumed.
   */
  isResumingRegistration?: boolean;
  /**
   * Explicit pending email passed from registration context if different from sessionStorage.
   */
  pendingSignupEmail?: string;
};

/**
 * Checks the availability and confirmation state of an email address for registration:
 * - "available": No account exists in Supabase for this email.
 * - "unconfirmed": An account exists in Supabase Auth, AND the user is in an active registration-resume
 *                  context matching this email (primary source: sessionStorage PENDING_SIGNUP_EMAIL_KEY).
 * - "registered": An account exists in Supabase Auth, but NO matching registration-resume context exists.
 * - "error": Supabase service was unreachable.
 */
export const checkSignupEmail = async (
  email: string,
  options?: CheckSignupEmailOptions,
): Promise<Exclude<EmailAvailability, "idle" | "checking">> => {
  if (!supabase) return "error";

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return "available";

  // Primary source of truth is the registration session / context:
  const sessionEmail =
    options?.pendingSignupEmail?.trim().toLowerCase() ??
    (typeof window !== "undefined"
      ? window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)?.trim().toLowerCase()
      : null);

  const matchesRegistrationSession = Boolean(sessionEmail && sessionEmail === normalizedEmail);
  const isExplicitlyResuming = Boolean(options?.isResumingRegistration);

  try {
    // 1. Preferred: Check server-side Auth state including confirmed_at
    const { data: statusData, error: statusError } = await supabase.rpc(
      "check_signup_email_status",
      { _email: normalizedEmail },
    );

    if (!statusError && typeof statusData === "string") {
      if (statusData === "available") {
        return "available";
      }
      if (statusData === "registered") {
        return "registered";
      }
      if (statusData === "unconfirmed") {
        return matchesRegistrationSession || isExplicitlyResuming ? "unconfirmed" : "registered";
      }
    }

    // 2. Fallback: is_signup_email_registered boolean check
    const { data: rpcRegistered, error: rpcError } = await supabase.rpc(
      "is_signup_email_registered",
      { _email: normalizedEmail },
    );

    if (rpcError) {
      console.warn("Error checking signup email availability:", rpcError);
      return "error";
    }

    if (!rpcRegistered) {
      return "available";
    }

    // Account exists in auth.users; classify based on registration-resume context
    if (matchesRegistrationSession || isExplicitlyResuming) {
      return "unconfirmed";
    }

    return "registered";
  } catch (err) {
    console.warn("Error checking signup email availability:", err);
    return "available";
  }
};

export type RecoveryEmailStatus = "idle" | "checking" | "registered" | "not_found" | "error";

/**
 * Checks whether a verified account exists in Supabase for password recovery.
 * Returns 'registered' ONLY if the account is confirmed/verified.
 * Returns 'not_found' for unconfirmed/pending accounts and non-existent accounts.
 */
export const checkRecoveryEmail = async (
  email: string,
): Promise<Exclude<RecoveryEmailStatus, "idle" | "checking">> => {
  if (!supabase) return "error";

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return "not_found";

  try {
    const { data: statusData, error: statusError } = await supabase.rpc(
      "check_signup_email_status",
      { _email: normalizedEmail },
    );

    if (!statusError && typeof statusData === "string") {
      if (statusData === "registered") {
        return "registered";
      }
      return "not_found";
    }

    const { data: rpcRegistered, error: rpcError } = await supabase.rpc(
      "is_signup_email_registered",
      { _email: normalizedEmail },
    );

    if (rpcError) {
      return "error";
    }

    return rpcRegistered ? "registered" : "not_found";
  } catch {
    return "error";
  }
};




