import type { OrganizationProfile } from "./lydo-connect-data";

export const organizationEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const philippineContactNumberPattern = /^09\d{9}$/;

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
