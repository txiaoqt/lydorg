import { describe, expect, it } from "vitest";
import { isPasswordValid, validatePasswordCriteria } from "./password-policy";

describe("password-policy", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const criteria = validatePasswordCriteria("Aa1!567");
    expect(criteria.length).toBe(false);
    expect(isPasswordValid("Aa1!567")).toBe(false);
  });

  it("rejects passwords longer than 16 characters", () => {
    const criteria = validatePasswordCriteria("Aa1!5678901234567");
    expect(criteria.length).toBe(false);
    expect(isPasswordValid("Aa1!5678901234567")).toBe(false);
  });

  it("rejects passwords missing an uppercase letter", () => {
    const criteria = validatePasswordCriteria("pas1!word");
    expect(criteria.uppercase).toBe(false);
    expect(isPasswordValid("pas1!word")).toBe(false);
  });

  it("rejects passwords missing a lowercase letter", () => {
    const criteria = validatePasswordCriteria("PAS1!WORD");
    expect(criteria.lowercase).toBe(false);
    expect(isPasswordValid("PAS1!WORD")).toBe(false);
  });

  it("rejects passwords missing a numeric digit", () => {
    const criteria = validatePasswordCriteria("Pass!word");
    expect(criteria.number).toBe(false);
    expect(isPasswordValid("Pass!word")).toBe(false);
  });

  it("rejects passwords missing a special character", () => {
    const criteria = validatePasswordCriteria("Pass1234");
    expect(criteria.special).toBe(false);
    expect(isPasswordValid("Pass1234")).toBe(false);
  });

  it("accepts valid passwords meeting all criteria", () => {
    const criteria = validatePasswordCriteria("PasigCity2026!");
    expect(Object.values(criteria).every(Boolean)).toBe(true);
    expect(isPasswordValid("PasigCity2026!")).toBe(true);
  });
});
