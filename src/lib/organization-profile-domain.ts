import type { OrganizationProfile } from "./lydo-connect-data";

export const ORGANIZATION_NAME_MAX_LENGTH = 100;
export const ORGANIZATION_NAME_MAX_LENGTH_ERROR = "Organization name must not exceed 100 characters.";

export const organizationEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const philippineContactNumberPattern = /^09\d{9}$/;
export const personNamePattern = /^[a-zA-Z\s\-'.]*$/;

export const sanitizeContactNumber = (val: string): string => {
  return val.replace(/\D/g, "").slice(0, 11);
};

export const validateOrganizationName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return "Organization name is required.";
  if (trimmed.length > ORGANIZATION_NAME_MAX_LENGTH) return ORGANIZATION_NAME_MAX_LENGTH_ERROR;
  return null;
};

export const isValidPersonName = (name: string): boolean => {
  const trimmed = name.trim();
  if (!trimmed) return true;
  return personNamePattern.test(trimmed) && !/\d/.test(trimmed);
};

export const isValidFacebookUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "facebook.com" ||
      hostname === "www.facebook.com" ||
      hostname === "m.facebook.com" ||
      hostname === "web.facebook.com" ||
      hostname === "fb.com" ||
      hostname === "www.fb.com" ||
      hostname.endsWith(".facebook.com")
    );
  } catch {
    return false;
  }
};

export const getOrganizationProfileCompletionCount = (profile?: OrganizationProfile | null) =>
  [
    profile?.organizationName?.trim(),
    profile?.organizationEmail?.trim(),
    profile?.contactNumber?.trim(),
    profile?.district?.trim(),
    profile?.barangay?.trim(),
    profile?.isExistingOrganization ? profile?.organizationIdentifierNumber?.trim() : "",
    profile?.majorClassification?.trim(),
    profile?.subClassification?.trim(),
    profile?.advocacies?.length ? "advocacies" : "",
    profile?.adviserName?.trim(),
    profile?.representativeName?.trim(),
    profile?.address?.trim(),
  ].filter(Boolean).length;

export const getOrganizationProfileCompletionTarget = (profile?: OrganizationProfile | null) =>
  11 + (profile?.isExistingOrganization ? 1 : 0);

export const getOrganizationProfileCompletionPercent = (profile?: OrganizationProfile | null) => {
  if (!profile) return 0;
  const target = getOrganizationProfileCompletionTarget(profile);
  return target ? Math.min(100, Math.round((getOrganizationProfileCompletionCount(profile) / target) * 100)) : 0;
};

export const isOrganizationProfileComplete = (profile?: OrganizationProfile | null) =>
  getOrganizationProfileCompletionCount(profile) === getOrganizationProfileCompletionTarget(profile);

export const getMissingEditableProfileRequirements = (profile?: Partial<OrganizationProfile> | null): string[] => {
  if (!profile) {
    return [
      "Select Major and Sub Classification",
      "Select at least one Advocacy Focus Area",
      "Add Official Representative Name",
      "Add Official Adviser Name",
      "Add Complete Address",
    ];
  }
  const missing: string[] = [];

  if (!profile.majorClassification?.trim() || !profile.subClassification?.trim()) {
    missing.push("Select Major and Sub Classification");
  }
  if (!profile.advocacies?.length) {
    missing.push("Select at least one Advocacy Focus Area");
  }
  if (!profile.representativeName?.trim()) {
    missing.push("Add Official Representative Name");
  }
  if (!profile.adviserName?.trim()) {
    missing.push("Add Official Adviser Name");
  }
  if (!profile.address?.trim()) {
    missing.push("Add Complete Address");
  }

  return missing;
};

const normalizeText = (value?: string | null) => value?.trim() ?? "";

export const createBlankOrganizationProfile = (
  userId: string,
  defaults?: Partial<
    Pick<
      OrganizationProfile,
      | "organizationName"
      | "organizationEmail"
      | "contactNumber"
      | "district"
      | "barangay"
      | "isExistingOrganization"
      | "organizationIdentifierNumber"
    >
  >,
): OrganizationProfile => ({
  id: `draft-${userId || "organization"}`,
  userId,
  organizationName: defaults?.organizationName ?? "",
  organizationEmail: defaults?.organizationEmail ?? "",
  contactNumber: defaults?.contactNumber ?? "",
  district: defaults?.district ?? "",
  barangay: defaults?.barangay ?? "",
  isExistingOrganization: defaults?.isExistingOrganization ?? false,
  organizationIdentifierNumber: defaults?.organizationIdentifierNumber ?? "",
  registrationType: defaults?.isExistingOrganization ? "existing_urn" : "new_organization",
  urn: defaults?.organizationIdentifierNumber ?? "",
  urnNormalized: defaults?.organizationIdentifierNumber?.trim().toUpperCase() ?? "",
  urnReviewStatus: defaults?.isExistingOrganization ? "pending" : "not_applicable",
  urnAdminRemarks: "",
  urnReviewedBy: "",
  urnReviewedAt: "",
  verificationMethod: null,
  majorClassification: "",
  subClassification: "",
  advocacies: [],
  adviserName: "",
  representativeName: "",
  address: "",
  facebookPageUrl: "",
  profileStatus: "incomplete",
  verifiedAt: "",
  internalNotes: "",
  yorpRegisteredYear: null,
  yorpRenewedYear: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createOrganizationProfileDraft = (
  userId: string,
  profile: OrganizationProfile | null,
  defaults?: Partial<
    Pick<
      OrganizationProfile,
      | "organizationName"
      | "organizationEmail"
      | "contactNumber"
      | "district"
      | "barangay"
      | "isExistingOrganization"
      | "organizationIdentifierNumber"
    >
  >,
): OrganizationProfile => {
  const blank = createBlankOrganizationProfile(userId, defaults);
  if (!profile) return blank;

  return {
    ...blank,
    ...profile,
    organizationName: normalizeText(profile.organizationName) || blank.organizationName,
    organizationEmail: normalizeText(profile.organizationEmail) || blank.organizationEmail,
    contactNumber: normalizeText(profile.contactNumber) || blank.contactNumber,
    district: normalizeText(profile.district) || blank.district,
    barangay: normalizeText(profile.barangay) || blank.barangay,
    isExistingOrganization: Boolean(profile.isExistingOrganization),
    organizationIdentifierNumber: normalizeText(profile.organizationIdentifierNumber) || blank.organizationIdentifierNumber,
    majorClassification: normalizeText(profile.majorClassification) as OrganizationProfile["majorClassification"],
    subClassification: normalizeText(profile.subClassification) as OrganizationProfile["subClassification"],
    adviserName: normalizeText(profile.adviserName),
    representativeName: normalizeText(profile.representativeName),
    address: normalizeText(profile.address),
    facebookPageUrl: normalizeText(profile.facebookPageUrl),
    verifiedAt: normalizeText(profile.verifiedAt),
    internalNotes: normalizeText(profile.internalNotes),
    advocacies: Array.isArray(profile.advocacies) ? [...profile.advocacies] : [],
  };
};
