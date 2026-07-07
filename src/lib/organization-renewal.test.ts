import { describe, expect, it } from "vitest";
import type { OrganizationProfile } from "./lydo-connect-data";
import { getOrganizationRenewalCountdown } from "./organization-renewal";

const profile = {
  verifiedAt: "2026-07-06T00:00:00.000Z",
} as OrganizationProfile;

describe("organization renewal countdown", () => {
  it("starts a three-year countdown from verification", () => {
    expect(
      getOrganizationRenewalCountdown(profile, new Date("2026-07-06T00:00:00.000Z")),
    ).toEqual({
      expiresAt: "2029-07-06T00:00:00.000Z",
      daysRemaining: 1096,
      isDue: false,
    });
  });

  it("marks an expired registration as due", () => {
    expect(
      getOrganizationRenewalCountdown(profile, new Date("2029-07-07T00:00:00.000Z")),
    ).toMatchObject({ daysRemaining: 0, isDue: true });
  });

  it("does not start before verification", () => {
    expect(
      getOrganizationRenewalCountdown({ verifiedAt: "" } as OrganizationProfile),
    ).toBeNull();
  });
});
