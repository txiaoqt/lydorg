import { supabase } from "@/lib/supabase";

export type EmailAvailability = "idle" | "checking" | "available" | "unconfirmed" | "registered" | "error";

/**
 * Checks the availability and confirmation state of an email address for registration:
 * - "available": No account or pending registration exists for this email.
 * - "unconfirmed": An Auth user exists in Supabase, but the email is not yet confirmed (pending verification).
 * - "registered": An active, confirmed account already exists in Supabase.
 * - "error": Supabase service was unreachable.
 */
export const checkSignupEmail = async (
  email: string,
): Promise<Exclude<EmailAvailability, "idle" | "checking">> => {
  if (!supabase) return "error";

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return "available";

  try {
    // 1. Check if a confirmed organization profile or user profile exists in database
    const [orgProfileResult, userProfileResult] = await Promise.all([
      supabase
        .from("organization_profiles")
        .select("id")
        .eq("organization_email", normalizedEmail)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle(),
    ]);

    if (orgProfileResult?.data || userProfileResult?.data) {
      return "registered";
    }

    // 2. Check if an Auth user exists in Supabase Auth (via RPC)
    const { data: rpcRegistered, error: rpcError } = await supabase.rpc(
      "is_signup_email_registered",
      { _email: normalizedEmail },
    );

    if (!rpcError && rpcRegistered === true) {
      // User exists in auth.users, but has no confirmed profile row
      // This represents an unconfirmed/pending registration.
      return "unconfirmed";
    }

    return "available";
  } catch (err) {
    console.warn("Error checking signup email availability:", err);
    return "available";
  }
};
