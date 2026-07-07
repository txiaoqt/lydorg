import type { AuthUser } from "@/hooks/use-auth";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import {
  getOrganizationProfileCompletionCount,
  getOrganizationProfileCompletionPercent,
  getOrganizationProfileCompletionTarget,
} from "@/lib/organization-profile-domain";
import { createBlankPwaOrganizationProfile } from "../profile/pwaProfileDraft";

export {
  getOrganizationProfileCompletionCount as getProfileCompletionCount,
  getOrganizationProfileCompletionTarget as getProfileCompletionTarget,
};

export const getProfileCompletionPercent = (
  profile: OrganizationProfile | null,
  user?: AuthUser | null,
) => {
  const completionSource =
    profile ??
    (user
      ? createBlankPwaOrganizationProfile({
          user,
          organizationName: user.displayName,
        })
      : null);

  return getOrganizationProfileCompletionPercent(completionSource);
};
