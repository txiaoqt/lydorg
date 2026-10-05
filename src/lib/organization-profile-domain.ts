import type { OrganizationProfile } from "./lydo-connect-data";

export const ORGANIZATION_NAME_MAX_LENGTH = 100;
export const ORGANIZATION_NAME_MAX_LENGTH_ERROR = "Organization name must not exceed 100 characters.";

export const organizationEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const philippineContactNumberPattern = /^09\d{9}$/;
export const personNamePattern = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s\-'.]*$/;

export const sanitizeContactNumber = (val: string): string => {
  return val.replace(/\D/g, "").slice(0, 11);
};

export const sanitizeZipCode = (value: string): string => value.replace(/\D/g, "").slice(0, 4);

export const validateZipCode = (value?: string | null): string | null => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "ZIP code is required.";
  return /^[0-9]{4}$/.test(trimmed) ? null : "ZIP code must contain exactly 4 digits.";
};

export const validateOrganizationName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return "Organization name is required.";
  if (trimmed.length > ORGANIZATION_NAME_MAX_LENGTH) return ORGANIZATION_NAME_MAX_LENGTH_ERROR;
  return null;
};

export const isValidPersonNamePart = (namePart?: string | null, required = true): boolean => {
  const trimmed = namePart?.trim() ?? "";
  if (!trimmed) return !required;
  return personNamePattern.test(trimmed) && !/\d/.test(trimmed);
};

export const isValidSuffix = (suffix?: string | null): boolean => {
  const trimmed = suffix?.trim() ?? "";
  if (!trimmed) return true;
  return /^[a-zA-Z\s.]{1,10}$/.test(trimmed) && !/\d/.test(trimmed);
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

export const isHeadOfOrganizationComplete = (profile?: Partial<OrganizationProfile> | null): boolean => {
  if (!profile) return false;
  const hasStructured = Boolean(
    profile.representativeFirstName?.trim() && profile.representativeLastName?.trim()
  );
  const hasLegacy = Boolean(profile.representativeName?.trim());
  return hasStructured || hasLegacy;
};

export const isAdviserComplete = (profile?: Partial<OrganizationProfile> | null): boolean => {
  if (!profile) return false;
  const hasStructured = Boolean(
    profile.adviserFirstName?.trim() && profile.adviserLastName?.trim()
  );
  const hasLegacy = Boolean(profile.adviserName?.trim());
  return hasStructured || hasLegacy;
};

export const isAddressComplete = (profile?: Partial<OrganizationProfile> | null): boolean => {
  if (!profile) return false;
  const hasStructured = Boolean(
    profile.addressStreet?.trim() &&
    (profile.addressBarangay?.trim() || profile.barangay?.trim())
  );
  const hasLegacy = Boolean(profile.address?.trim());
  return hasStructured || hasLegacy;
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
    isAdviserComplete(profile) ? "adviser" : "",
    isHeadOfOrganizationComplete(profile) ? "representative" : "",
    isAddressComplete(profile) ? "address" : "",
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
  if (!isHeadOfOrganizationComplete(profile)) {
    missing.push("Add Official Head of Organization Name");
  }
  if (!isAdviserComplete(profile)) {
    missing.push("Add Official Adviser Name");
  }
  if (!isAddressComplete(profile)) {
    missing.push("Add Complete Address");
  }

  return missing;
};

const normalizeText = (value?: string | null) => value?.trim() ?? "";

/**
 * Validates a list of additional organization emails against the primary email.
 * - Checks format of each additional email
 * - Enforces case-insensitive uniqueness against primary email and other additional emails
 * - Ensures no empty records
 */
export const validateAdditionalEmails = (
  primaryEmail: string,
  additionalEmails: string[] = [],
): { isValid: boolean; error?: string } => {
  const primaryClean = primaryEmail.trim().toLowerCase();
  const seen = new Set<string>();
  if (primaryClean) {
    seen.add(primaryClean);
  }

  for (let i = 0; i < additionalEmails.length; i++) {
    const raw = additionalEmails[i];
    const trimmed = raw.trim();
    if (!trimmed) {
      return {
        isValid: false,
        error: `Additional email #${i + 1} cannot be blank. Please enter a valid email address or remove the field.`,
      };
    }
    if (!organizationEmailPattern.test(trimmed)) {
      return {
        isValid: false,
        error: `"${trimmed}" is not a valid email address.`,
      };
    }
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) {
      return {
        isValid: false,
        error: `"${trimmed}" is a duplicate email address. Each organization email must be unique.`,
      };
    }
    seen.add(lower);
  }

  return { isValid: true };
};

/**
 * Validates a list of additional contact numbers against the primary contact number.
 * - Checks format (11-digit Philippine mobile starting with 09)
 * - Enforces uniqueness against primary contact number and other additional contact numbers
 * - Ensures no empty records
 */
export const validateAdditionalContactNumbers = (
  primaryContact: string,
  additionalContacts: string[] = [],
): { isValid: boolean; error?: string } => {
  const primaryDigits = primaryContact.replace(/\D/g, "");
  const seen = new Set<string>();
  if (primaryDigits) {
    seen.add(primaryDigits);
  }

  for (let i = 0; i < additionalContacts.length; i++) {
    const raw = additionalContacts[i];
    const trimmed = raw.trim();
    if (!trimmed) {
      return {
        isValid: false,
        error: `Additional contact number #${i + 1} cannot be blank. Please enter a valid number or remove the field.`,
      };
    }
    if (!philippineContactNumberPattern.test(trimmed)) {
      return {
        isValid: false,
        error: `"${trimmed}" is not a valid 11-digit Philippine mobile number starting with 09.`,
      };
    }
    const digits = trimmed.replace(/\D/g, "");
    if (seen.has(digits)) {
      return {
        isValid: false,
        error: `"${trimmed}" is a duplicate contact number. Each organization contact number must be unique.`,
      };
    }
    seen.add(digits);
  }

  return { isValid: true };
};

export const createBlankOrganizationProfile = (
  userId: string,
  defaults?: Partial<
    Pick<
      OrganizationProfile,
      | "organizationName"
      | "organizationEmail"
      | "additionalEmails"
      | "contactNumber"
      | "additionalContactNumbers"
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
    additionalEmails: defaults?.additionalEmails ?? [],
    contactNumber: defaults?.contactNumber ?? "",
    additionalContactNumbers: defaults?.additionalContactNumbers ?? [],
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
    representativeFirstName: "",
    representativeMiddleName: "",
    representativeLastName: "",
    representativeSuffix: "",
    adviserFirstName: "",
    adviserMiddleName: "",
    adviserLastName: "",
    adviserSuffix: "",
    adviserName: "",
    representativeName: "",
    addressUnitBuilding: "",
    addressStreet: "",
    addressSubdivision: "",
    addressBarangay: defaults?.barangay ?? "",
    addressCity: "Pasig City",
    addressProvince: "Metro Manila",
    addressZipCode: "",
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
      | "additionalEmails"
      | "contactNumber"
      | "additionalContactNumbers"
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
    additionalEmails: Array.isArray(profile.additionalEmails)
      ? profile.additionalEmails.map((e) => e.trim()).filter(Boolean)
      : (defaults?.additionalEmails ?? []),
    contactNumber: normalizeText(profile.contactNumber) || blank.contactNumber,
    additionalContactNumbers: Array.isArray(profile.additionalContactNumbers)
      ? profile.additionalContactNumbers.map((c) => c.trim()).filter(Boolean)
      : (defaults?.additionalContactNumbers ?? []),
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
    representativeFirstName: normalizeText(profile.representativeFirstName),
    representativeMiddleName: normalizeText(profile.representativeMiddleName),
    representativeLastName: normalizeText(profile.representativeLastName),
    representativeSuffix: normalizeText(profile.representativeSuffix),
    adviserFirstName: normalizeText(profile.adviserFirstName),
    adviserMiddleName: normalizeText(profile.adviserMiddleName),
    adviserLastName: normalizeText(profile.adviserLastName),
    adviserSuffix: normalizeText(profile.adviserSuffix),
    adviserName: normalizeText(profile.adviserName),
    representativeName: normalizeText(profile.representativeName),
    addressUnitBuilding: normalizeText(profile.addressUnitBuilding),
    addressStreet: normalizeText(profile.addressStreet),
    addressSubdivision: normalizeText(profile.addressSubdivision),
    addressBarangay: normalizeText(profile.addressBarangay) || normalizeText(profile.barangay) || blank.barangay,
    addressCity: normalizeText(profile.addressCity) || "Pasig City",
    addressProvince: normalizeText(profile.addressProvince) || "Metro Manila",
    addressZipCode: normalizeText(profile.addressZipCode),
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

  if (/Headquarters Barangay changes must be made through the administrative location update process/i.test(combined)) {
    return "The database is still blocking Barangay changes. Apply the latest organization profile location migration, then try again.";
  }

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
