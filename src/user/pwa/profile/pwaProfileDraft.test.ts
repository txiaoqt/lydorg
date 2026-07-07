import { describe, expect, it } from "vitest";
import { createBlankPwaOrganizationProfile } from "./pwaProfileDraft";

describe("createBlankPwaOrganizationProfile", () => {
  it("hydrates the registered contact number into a new PWA profile", () => {
    const profile = createBlankPwaOrganizationProfile({
      organizationName: "Tadz Youth Council",
      user: {
        id: "user-1",
        email: "organization@example.com",
        displayName: "Tadz Youth Council",
        profileHints: {
          contactNumber: "09123456789",
          district: "District I",
          barangay: "Bagong Ilog",
        },
      },
    }, "2026-07-01T00:00:00.000Z");

    expect(profile.contactNumber).toBe("09123456789");
    expect(profile.district).toBe("District I");
    expect(profile.barangay).toBe("Bagong Ilog");
  });
});
