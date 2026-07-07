import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/hooks/use-auth";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import {
  getProfileCompletionCount,
  getProfileCompletionPercent,
  getProfileCompletionTarget,
} from "./pwaPortalMetrics";

const completeProfile = (isExistingOrganization: boolean): OrganizationProfile => ({
  id: "organization-id",
  userId: "user-id",
  organizationName: "Youth Organization",
  organizationEmail: "org@example.com",
  contactNumber: "09123456789",
  district: "District 1",
  barangay: "Barangay 1",
  isExistingOrganization,
  organizationIdentifierNumber: isExistingOrganization ? "YORP-001" : "",
  majorClassification: "Youth Organization",
  subClassification: "school-based",
  advocacies: ["education"],
  adviserName: "Adviser",
  representativeName: "Representative",
  address: "Pasig City",
  facebookPageUrl: "",
  profileStatus: "verified",
  verifiedAt: "",
  internalNotes: "",
  yorpRegisteredYear: null,
  yorpRenewedYear: null,
  createdAt: "",
  updatedAt: "",
});

describe("PWA profile completion", () => {
  it("does not count a synthetic identifier for a new organization", () => {
    const profile = completeProfile(false);
    expect(getProfileCompletionCount(profile)).toBe(11);
    expect(getProfileCompletionTarget(profile)).toBe(11);
    expect(getProfileCompletionPercent(profile)).toBe(100);
  });

  it("includes the identifier once for an existing organization", () => {
    const profile = completeProfile(true);
    expect(getProfileCompletionCount(profile)).toBe(12);
    expect(getProfileCompletionTarget(profile)).toBe(12);
    expect(getProfileCompletionPercent(profile)).toBe(100);
  });

  it("clamps the presentation value to the valid percentage range", () => {
    expect(getProfileCompletionPercent(null)).toBe(0);
    expect(getProfileCompletionPercent(completeProfile(false))).toBeLessThanOrEqual(100);
  });

  it("counts signup metadata before an organization profile record is saved", () => {
    const signupUser: AuthUser = {
      id: "user-id",
      email: "org@example.com",
      displayName: "Youth Organization",
      profileHints: {
        contactNumber: "09123456789",
        district: "District II",
        barangay: "Manggahan",
        isExistingOrganization: false,
      },
    };

    expect(getProfileCompletionPercent(null, signupUser)).toBe(45);
  });
});
