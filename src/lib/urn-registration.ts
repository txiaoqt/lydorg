import type { OrganizationProfile } from "./lydo-connect-data";

import { getPasigBarangayOrdinal } from "./pasig-districts";

export type RegistrationType = "new_organization" | "existing_urn";
export type UrnReviewStatus =
  | "not_applicable"
  | "pending"
  | "verified"
  | "needs_correction"
  | "rejected";
export type VerificationMethod = "documents" | "urn" | null;

export const URN_MAX_LENGTH = 80;
export const URN_PATTERN = /^(\d{2}-\d{2}-\d{3}|PCYDO-[A-Z0-9]{4}-[A-Z0-9]{4})$/;

export const generateUniqueUrn = (
  barangay?: string,
  year?: number,
  sequence: number = 10,
): string => {
  const bb = (barangay && getPasigBarangayOrdinal(barangay)) || "17";
  const yy = String(year || new Date().getFullYear()).slice(-2);
  const nnn = String(sequence).padStart(3, "0");
  return `${bb}-${yy}-${nnn}`;
};

export const normalizeUrn = (value: string) =>
  value.trim().replace(/[ \t]+/g, " ").toUpperCase();

export const validateUrn = (value: string): string | null => {
  const normalized = normalizeUrn(value);
  const hasControlCharacter = [...normalized].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (!normalized) return "Enter your Unique Registration Number (URN).";
  if (
    normalized.length > URN_MAX_LENGTH ||
    hasControlCharacter ||
    /[<>]/.test(normalized) ||
    !URN_PATTERN.test(normalized)
  ) {
    return "Please enter a valid Unique Registration Number (URN) in the format BB-YY-NNN (e.g., 17-26-010).";
  }
  return null;
};

export const isUrnRegistration = (profile?: OrganizationProfile | null) =>
  profile?.registrationType === "existing_urn";

export const isRegistrationVerified = (
  profile?: OrganizationProfile | null,
  allRequiredDocumentsApproved = false,
) =>
  Boolean(
    profile?.profileStatus === "verified" &&
      (profile.verificationMethod === "urn"
        ? profile.urnReviewStatus === "verified"
        : profile.verificationMethod === "documents"
          ? allRequiredDocumentsApproved
          : false),
  );

export const urnReviewLabels: Record<UrnReviewStatus, string> = {
  not_applicable: "Not Applicable",
  pending: "Pending URN Review",
  verified: "URN Verified",
  needs_correction: "URN Needs Correction",
  rejected: "URN Rejected",
};
