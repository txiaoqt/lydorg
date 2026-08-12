import { describe, expect, it } from "vitest";
import {
  ORGANIZATION_NAME_MAX_LENGTH,
  ORGANIZATION_NAME_MAX_LENGTH_ERROR,
  validateOrganizationName,
} from "./organization-profile-domain";

describe("TC104: Organization Name Maximum Length Validation Boundary Tests", () => {
  it("A. Accepts 1 character (minimum requirement)", () => {
    expect(validateOrganizationName("A")).toBeNull();
  });

  it("B. Accepts valid normal organization name", () => {
    expect(validateOrganizationName("Kapitolyo Youth Council")).toBeNull();
  });

  it("C. Accepts exactly 99 characters", () => {
    const name99 = "A".repeat(99);
    expect(name99.length).toBe(99);
    expect(validateOrganizationName(name99)).toBeNull();
  });

  it("D. Accepts exactly 100 characters", () => {
    const name100 = "A".repeat(100);
    expect(name100.length).toBe(100);
    expect(validateOrganizationName(name100)).toBeNull();
  });

  it("E. Rejects 101 characters with clear validation message", () => {
    const name101 = "A".repeat(101);
    expect(name101.length).toBe(101);
    expect(validateOrganizationName(name101)).toBe(ORGANIZATION_NAME_MAX_LENGTH_ERROR);
  });

  it("F. Rejects 300 characters gracefully", () => {
    const name300 = "Sample Org Name ".repeat(20); // 320 chars
    expect(name300.length).toBeGreaterThan(100);
    expect(validateOrganizationName(name300)).toBe(ORGANIZATION_NAME_MAX_LENGTH_ERROR);
  });

  it("G. Rejects 1,000+ characters gracefully without crash or freeze", () => {
    const name1000 = "Very Long Organization Name ".repeat(40); // 1120 chars
    expect(name1000.length).toBeGreaterThan(1000);
    expect(validateOrganizationName(name1000)).toBe(ORGANIZATION_NAME_MAX_LENGTH_ERROR);
  });

  it("H. Rejects empty organization name", () => {
    expect(validateOrganizationName("")).toBe("Organization name is required.");
    expect(validateOrganizationName("   ")).toBe("Organization name is required.");
  });

  it("I. Allows normal spaces and punctuation up to 100 characters", () => {
    const nameWithPunctuation = "Youth & Student Organization - Barangay San Jose, Pasig City (Youth Chapter)";
    expect(nameWithPunctuation.length).toBeLessThanOrEqual(100);
    expect(validateOrganizationName(nameWithPunctuation)).toBeNull();
  });
});
