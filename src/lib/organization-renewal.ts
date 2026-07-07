import type { OrganizationProfile } from "./lydo-connect-data";

export const ORGANIZATION_REGISTRATION_VALIDITY_YEARS = 3;

export type OrganizationRenewalCountdown = {
  expiresAt: string;
  daysRemaining: number;
  isDue: boolean;
};

export const getOrganizationRenewalCountdown = (
  profile?: OrganizationProfile | null,
  now = new Date(),
): OrganizationRenewalCountdown | null => {
  if (!profile?.verifiedAt) return null;

  const verifiedAt = new Date(profile.verifiedAt);
  if (Number.isNaN(verifiedAt.getTime())) return null;

  const expiresAt = new Date(verifiedAt);
  expiresAt.setUTCFullYear(
    expiresAt.getUTCFullYear() + ORGANIZATION_REGISTRATION_VALIDITY_YEARS,
  );

  const millisecondsRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil(millisecondsRemaining / 86_400_000),
  );

  return {
    expiresAt: expiresAt.toISOString(),
    daysRemaining,
    isDue: millisecondsRemaining <= 0,
  };
};
