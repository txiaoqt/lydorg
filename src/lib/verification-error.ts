export type SupabaseAuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

export const OTP_ISSUED_AT_KEY = "ytrace_otp_issued_at";

export const EXPIRED_OTP_MESSAGE = "That verification code has expired or invalid. Please request a new code.";
export const INCORRECT_OTP_MESSAGE = "Incorrect verification code. Please check the code and try again.";

export type VerificationAttemptContext = {
  isOtpExpired?: boolean;
};

/**
 * Checks if a Supabase authentication error specifically indicates that the OTP/verification code has expired.
 * Note: Supabase GoTrue returns "Token has expired or is invalid" or "Email link is invalid or has expired"
 * for general incorrect/wrong OTP inputs. Those composite messages represent an incorrect code attempt
 * rather than an exclusively expired code.
 */
export const isSupabaseOtpExpiredError = (error?: SupabaseAuthErrorLike | Error | string | null): boolean => {
  if (!error) return false;

  const errorObj: SupabaseAuthErrorLike =
    typeof error === "string"
      ? { message: error }
      : error instanceof Error
      ? { message: error.message, code: (error as { code?: string }).code }
      : error;

  const message = (errorObj.message ?? "").toLowerCase();
  const code = (errorObj.code ?? "").toLowerCase();

  // If the error mentions invalid, wrong, or not found (e.g. "Token has expired or is invalid"),
  // it is Supabase's default response for an incorrect OTP attempt.
  if (
    message.includes("invalid") ||
    message.includes("not found") ||
    message.includes("incorrect") ||
    message.includes("wrong") ||
    code.includes("invalid")
  ) {
    return false;
  }

  if (code === "otp_expired" || code === "token_expired") {
    return true;
  }

  if (
    message.includes("verification code has expired") ||
    message.includes("otp has expired") ||
    message.includes("token has expired") ||
    message.includes("code has expired")
  ) {
    return true;
  }

  return false;
};

/**
 * Maps Supabase verification errors into clear, user-facing error messages:
 * - Expired code: "That verification code has expired or invalid. Please request a new code."
 * - Invalid / wrong code: "Incorrect verification code. Please check the code and try again."
 * - Rate limit: Rate limit message or cooldown notice.
 */
export const getVerificationErrorMessage = (
  error?: SupabaseAuthErrorLike | Error | string | null,
  context?: VerificationAttemptContext,
): string => {
  if (!error) return "";

  const errorObj: SupabaseAuthErrorLike =
    typeof error === "string"
      ? { message: error }
      : error instanceof Error
      ? { message: error.message, code: (error as { code?: string }).code, status: (error as { status?: number }).status }
      : error;

  if (context?.isOtpExpired || isSupabaseOtpExpiredError(errorObj)) {
    return EXPIRED_OTP_MESSAGE;
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

  return INCORRECT_OTP_MESSAGE;
};
