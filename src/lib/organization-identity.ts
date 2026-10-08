export const ORGANIZATION_IDENTITY_OUTCOMES = ["NO_MATCH", "POSSIBLE_MATCH", "EXACT_URN_CONFLICT", "VERIFIED_SEPARATE", "CHECK_UNAVAILABLE"] as const;
export type OrganizationIdentityOutcome = typeof ORGANIZATION_IDENTITY_OUTCOMES[number];
const abbreviations: Record<string, string> = { org: "organization", assoc: "association", inc: "incorporated" };
export function normalizeOrganizationName(input: string): string {
  return input.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
    .split(/\s+/).map(word => Object.prototype.hasOwnProperty.call(abbreviations, word) ? abbreviations[word] : word).join(" ");
}
export const identityOutcomeMessage: Record<OrganizationIdentityOutcome, string> = {
  NO_MATCH: "No potential match was found. Organization verification is still required.",
  POSSIBLE_MATCH: "Your organization details may relate to an existing registration. PCYDO will review your identity before granting verified access. Similar names can belong to different organizations.",
  EXACT_URN_CONFLICT: "This URN cannot be claimed through a new registration. Contact PCYDO for existing-organization verification or account recovery.",
  VERIFIED_SEPARATE: "PCYDO has confirmed this is a separate organization. Normal registration verification still applies.",
  CHECK_UNAVAILABLE: "The identity check is unavailable. You may complete your application, but verification-dependent access remains pending until the server check and any required review succeed.",
};
