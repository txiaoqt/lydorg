import { describe, expect, it, vi } from "vitest";
import { DUPLICATE_URN_ERROR_MESSAGE, checkSignupUrn, formatAndNormalizeUrn } from "./urn-validation";
import { normalizeUrn, validateUrn } from "./urn-registration";

describe("URN Validation & Uniqueness Domain Logic", () => {
  it("normalizes URN values with leading/trailing spaces and mixed casing", () => {
    expect(formatAndNormalizeUrn("  pcydo-ab12-cd34  ")).toBe("PCYDO-AB12-CD34");
    expect(formatAndNormalizeUrn("Pcydo-2026-XyZ9")).toBe("PCYDO-2026-XYZ9");
  });

  it("validates URN format syntax strictly", () => {
    expect(validateUrn("PCYDO-AB12-CD34")).toBeNull();
    expect(validateUrn("pcydo-ab12-cd34")).toBeNull(); // normalized inside validateUrn
    expect(validateUrn("INVALID-URN")).toBe(
      "Please enter a valid Unique Registration Number (URN) in the format PCYDO-XXXX-XXXX.",
    );
  });

  it("provides user-friendly error message for duplicate URNs", () => {
    expect(DUPLICATE_URN_ERROR_MESSAGE).toBe(
      "This Unique Registration Number is already registered to another organization. Please verify the URN and try again.",
    );
  });

  it("returns available for empty or idle URNs", async () => {
    const result = await checkSignupUrn("");
    expect(result).toBe("available");
  });
});
