import { supabase } from "./supabase";
import { normalizeUrn } from "./urn-registration";

export type UrnAvailability = "idle" | "checking" | "available" | "registered" | "error";

export const DUPLICATE_URN_ERROR_MESSAGE =
  "This Unique Registration Number is already registered to another organization. Please verify the URN and try again.";

/**
 * Checks whether a given URN is already registered to an organization in Supabase.
 * Returns 'registered' if the URN belongs to an existing organization, 'available' otherwise.
 */
export const checkSignupUrn = async (
  urn: string,
): Promise<Exclude<UrnAvailability, "idle" | "checking">> => {
  const normalized = normalizeUrn(urn);
  if (!normalized) return "available";
  if (!supabase) return "available";

  try {
    const { data, error } = await supabase.rpc("is_urn_registered", {
      _urn: normalized,
    });

    if (error) {
      // Fallback query if RPC is not yet installed in Supabase
      const { data: profiles, error: selectError } = await supabase
        .from("organization_profiles")
        .select("id, organization_identifier_number")
        .or(`organization_identifier_number.ilike.${normalized},urn.ilike.${normalized}`)
        .limit(1);

      if (selectError) return "error";
      return profiles && profiles.length > 0 ? "registered" : "available";
    }

    return data === true ? "registered" : "available";
  } catch {
    return "error";
  }
};

/**
 * Normalizes user input for URN comparison and database storage.
 */
export const formatAndNormalizeUrn = (urn: string): string => {
  return normalizeUrn(urn);
};
