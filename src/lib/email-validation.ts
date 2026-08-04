import { supabase } from "@/lib/supabase";

export type EmailAvailability = "idle" | "checking" | "available" | "registered" | "error";

export const checkSignupEmail = async (email: string): Promise<Exclude<EmailAvailability, "idle" | "checking">> => {
  if (!supabase) return "error";
  const { data, error } = await supabase.rpc("is_signup_email_registered", {
    _email: email.trim().toLowerCase(),
  });
  if (error) return "error";
  return data === true ? "registered" : "available";
};
