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
      "Select at least one Center of Youth Participation",
      "Add Official Head of Organization Name",
      "Add Official Adviser Name",
      "Add Complete Address",
    ];
  }
  const missing: string[] = [];

  if (!profile.majorClassification?.trim() || !profile.subClassification?.trim()) {
    missing.push("Select Major and Sub Classification");
  }
  if (!profile.advocacies?.length) {
    missing.push("Select at least one Center of Youth Participation");
  }
  if (!profile.representativeName?.trim()) {
    missing.push("Add Official Head of Organization Name");
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
): OrganizationProfile => {
  const isExisting = Boolean(defaults?.isExistingOrganization);
  const existingIdentifier = isExisting ? (defaults?.organizationIdentifierNumber ?? "") : "";

  return {
    id: `draft-${userId || "organization"}`,
    userId,
    organizationName: defaults?.organizationName ?? "",
    organizationEmail: defaults?.organizationEmail ?? "",
    contactNumber: defaults?.contactNumber ?? "",
    district: defaults?.district ?? "",
    barangay: defaults?.barangay ?? "",
    isExistingOrganization: isExisting,
    organizationIdentifierNumber: existingIdentifier,
    registrationType: isExisting ? "existing_urn" : "new_organization",
    urn: existingIdentifier,
    urnNormalized: existingIdentifier ? existingIdentifier.trim().toUpperCase() : "",
    urnReviewStatus: isExisting ? "pending" : "not_applicable",
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
  };
};

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

  const isExisting = Boolean(profile.isExistingOrganization);
  const identifier = isExisting
    ? normalizeText(profile.organizationIdentifierNumber) || blank.organizationIdentifierNumber
    : profile.profileStatus === "verified"
      ? normalizeText(profile.organizationIdentifierNumber)
      : "";

  return {
    ...blank,
    ...profile,
    organizationName: normalizeText(profile.organizationName) || blank.organizationName,
    organizationEmail: normalizeText(profile.organizationEmail) || blank.organizationEmail,
    contactNumber: normalizeText(profile.contactNumber) || blank.contactNumber,
    district: normalizeText(profile.district) || blank.district,
    barangay: normalizeText(profile.barangay) || blank.barangay,
    isExistingOrganization: isExisting,
    organizationIdentifierNumber: identifier,
    registrationType: isExisting ? "existing_urn" : "new_organization",
    urn: isExisting ? identifier : profile.profileStatus === "verified" ? profile.urn : "",
    urnNormalized: isExisting && identifier ? identifier.trim().toUpperCase() : profile.profileStatus === "verified" ? (profile.urnNormalized || "") : "",
    urnReviewStatus: isExisting ? profile.urnReviewStatus || "pending" : "not_applicable",
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

export const mapOrganizationProfileError = (
  error: unknown,
  fallbackMessage = "Unable to save organization profile.",
): string => {
  const errObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const errMessage =
    error instanceof Error
      ? error.message
      : typeof errObj.message === "string"
        ? errObj.message
        : String(error ?? "");
  const code = String(errObj.code || "");
  const details = String(errObj.details || "");
  const hint = String(errObj.hint || "");
  const combined = `${code} ${errMessage} ${details} ${hint}`;

  if (
    combined.includes("uq_organization_profiles_reference_id") ||
    combined.includes("organization_profiles_reference_id_key") ||
    /reference_id/i.test(combined)
  ) {
    return "A registration reference conflict occurred. Please try again.";
  }

  if (
    combined.includes("uq_organization_profiles_urn") ||
    combined.includes("organization_profiles_urn_key") ||
    combined.includes("urn_normalized") ||
    /duplicate key.*(?:urn|organization_identifier)/i.test(combined) ||
    /\bkey.*\(urn\)/i.test(combined)
  ) {
    return "This Unique Registration Number (URN) is already registered to another organization.";
  }

  return fallbackMessage;
};
