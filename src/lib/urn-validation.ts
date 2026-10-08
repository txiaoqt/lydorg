import { supabase } from "./supabase";
import { normalizeUrn } from "./urn-registration";

export type UrnAvailability = "idle" | "checking" | "available" | "registered" | "error";

export const DUPLICATE_URN_ERROR_MESSAGE = "URN is unavailable.";

/**
 * Checks whether a given URN is already registered to an organization in Supabase.
 * Returns 'registered' if the URN belongs to an existing organization, 'available' otherwise.
 */
export const checkSignupUrn = async (
  urn: string,
): Promise<Exclude<UrnAvailability, "idle" | "checking">> => {
  const normalized = normalizeUrn(urn);
  if (!normalized) return "available";
  if (!supabase) return "error";

  try {
    const { data, error } = await supabase.rpc("is_urn_registered", {
      _urn: normalized,
    });

    if (error) return "error";

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
