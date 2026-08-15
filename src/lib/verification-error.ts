export type SupabaseAuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

/**
 * Checks if a Supabase authentication error indicates that the OTP/verification code has expired.
 * Supabase GoTrue returns error messages such as "Token has expired or is invalid",
 * "Email link is invalid or has expired", or error code "otp_expired".
 */
export const isSupabaseOtpExpiredError = (error?: SupabaseAuthErrorLike | Error | string | null): boolean => {
  if (!error) return false;

  if (typeof error === "string") {
    return error.toLowerCase().includes("expired");
  }

  const errorObj = error as SupabaseAuthErrorLike;
  const code = (errorObj.code ?? "").toLowerCase();
  if (code === "otp_expired" || code === "token_expired" || code.includes("expired")) {
    return true;
  }

  const message = (errorObj.message ?? "").toLowerCase();
  if (message.includes("expired")) {
    return true;
  }

  return false;
};

/**
 * Maps Supabase verification errors into clear, user-facing error messages:
 * - Expired code: "That verification code has expired. Please request a new code."
 * - Invalid / wrong code: "Incorrect verification code. Please check the code and try again."
 * - Rate limit: Rate limit message or cooldown notice.
 */
export const getVerificationErrorMessage = (error?: SupabaseAuthErrorLike | Error | string | null): string => {
  if (!error) return "";

  const errorObj: SupabaseAuthErrorLike =
    typeof error === "string"
      ? { message: error }
      : error instanceof Error
      ? { message: error.message, code: (error as { code?: string }).code, status: (error as { status?: number }).status }
      : error;

  if (isSupabaseOtpExpiredError(errorObj)) {
    return "That verification code has expired. Please request a new code.";
  }

  const message = (errorObj.message ?? "").toLowerCase();
  const code = (errorObj.code ?? "").toLowerCase();

  if (
    code.includes("rate_limit") ||
    errorObj.status === 429 ||
    message.includes("rate limit") ||
    message.includes("too many")
  ) {
    return errorObj.message || "Too many attempts. Please wait a moment before trying again.";
  }

  return "Incorrect verification code. Please check the code and try again.";
};
