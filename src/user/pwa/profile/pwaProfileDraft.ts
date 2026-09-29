import type { AuthUser } from "@/hooks/use-auth";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";

type BlankProfileSource = {
  user: AuthUser | null;
  organizationName: string;
};

export const createBlankPwaOrganizationProfile = (
  data: BlankProfileSource,
  now = new Date().toISOString(),
): OrganizationProfile => {
  const isExisting = Boolean(data.user?.profileHints?.isExistingOrganization);
  const existingIdentifier = isExisting ? (data.user?.profileHints?.organizationIdentifierNumber || "") : "";

  return {
    id: `draft-${data.user?.id || "organization"}`,
    userId: data.user?.id || "",
    organizationName: data.organizationName === "Organization" ? "" : data.organizationName,
    organizationEmail: data.user?.email || "",
    additionalEmails: [],
    contactNumber: data.user?.profileHints?.contactNumber?.trim() || "",
    additionalContactNumbers: [],
    district: data.user?.profileHints?.district || "",
    barangay: data.user?.profileHints?.barangay || "",
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
  addressBarangay: data.user?.profileHints?.barangay || "",
  addressCity: "Pasig City",
  addressProvince: "Metro Manila",
  addressZipCode: "",
  address: "",
  facebookPageUrl: "",
  profileImageUrl: "",
  profileStatus: "incomplete",
  verifiedAt: "",
  internalNotes: "",
  yorpRegisteredYear: null,
  yorpRenewedYear: null,
  createdAt: now,
  updatedAt: now,
  };
};
