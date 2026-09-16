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
    contactNumber: data.user?.profileHints?.contactNumber?.trim() || "",
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
  adviserName: "",
  representativeName: "",
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
