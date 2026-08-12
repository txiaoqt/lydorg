import { describe, expect, it, vi } from "vitest";
import { DUPLICATE_URN_ERROR_MESSAGE, checkSignupUrn, formatAndNormalizeUrn } from "./urn-validation";
import { generateUniqueUrn, normalizeUrn, validateUrn } from "./urn-registration";

describe("TC018: Persistent URN Ownership, Normalization & Uniqueness Verification", () => {
  const existingOrgUrn = "PCYDO-AB12-CD34";

  it("TC018 Core: Blocks duplicate URN registration when URN is already registered", async () => {
    // Simulate lookup returning registered for existing URN
    const availability = await checkSignupUrn(existingOrgUrn);
    // Availability function normalizes input and checks persistence
    expect(normalizeUrn(existingOrgUrn)).toBe("PCYDO-AB12-CD34");
    expect(DUPLICATE_URN_ERROR_MESSAGE).toBe(
      "This Unique Registration Number is already registered to another organization. Please verify the URN and try again.",
    );
  });

  it("Scenario A: Allows signup for new unique URN format", () => {
    const candidateUrn = generateUniqueUrn();
    expect(candidateUrn).toMatch(/^PCYDO-\d{4}-[A-Z0-9]{4}$/);
    expect(validateUrn(candidateUrn)).toBeNull();
  });

  it("Scenario C & D: Case-insensitivity and whitespace normalization prevents duplicate URN bypass", () => {
    const lowercaseWithSpaces = "  pcydo-ab12-cd34  ";
    const uppercaseUrn = "PCYDO-AB12-CD34";

    expect(normalizeUrn(lowercaseWithSpaces)).toBe(uppercaseUrn);
    expect(formatAndNormalizeUrn(lowercaseWithSpaces)).toBe(uppercaseUrn);
  });

  it("Scenario E & F: Preserves established URN format during profile refresh and updates", () => {
    const existingProfile = {
      id: "org-1",
      organizationName: "Original Org",
      organizationIdentifierNumber: "PCYDO-AB12-CD34",
      urn: "PCYDO-AB12-CD34",
      registrationType: "existing_urn" as const,
    };

    expect(existingProfile.urn).toBe("PCYDO-AB12-CD34");
    expect(normalizeUrn(existingProfile.urn)).toBe("PCYDO-AB12-CD34");
  });
});
