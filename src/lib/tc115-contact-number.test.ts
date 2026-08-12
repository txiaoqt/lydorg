import { describe, expect, it } from "vitest";
import { philippineContactNumberPattern, sanitizeContactNumber } from "./organization-profile-domain";

describe("TC115: Contact Number Numeric Input Filtering & Sanitization", () => {
  it("filters alphabetic characters during typing", () => {
    expect(sanitizeContactNumber("09abc")).toBe("09");
    expect(sanitizeContactNumber("dasdasdasd@")).toBe("");
  });

  it("filters special characters and symbols during typing", () => {
    expect(sanitizeContactNumber("09abc@#$")).toBe("09");
    expect(sanitizeContactNumber("09!@#$%^&*()")).toBe("09");
  });

  it("strips hyphens and dashes during typing or pasting", () => {
    expect(sanitizeContactNumber("09-1234-5678")).toBe("0912345678");
  });

  it("strips spaces during typing or pasting", () => {
    expect(sanitizeContactNumber("09 1234 5678")).toBe("0912345678");
  });

  it("sanitizes pasted values containing mixed letters, symbols, and numbers", () => {
    expect(sanitizeContactNumber("09abc12345678")).toBe("0912345678");
    expect(sanitizeContactNumber("09abc@12345678")).toBe("0912345678");
  });

  it("enforces maximum length of 11 digits", () => {
    expect(sanitizeContactNumber("091234567890123")).toBe("09123456789");
  });

  it("preserves exact 11-digit valid mobile numbers starting with 09 as string", () => {
    const validNumber = "09123456789";
    const result = sanitizeContactNumber(validNumber);
    expect(result).toBe("09123456789");
    expect(result.startsWith("09")).toBe(true);
    expect(philippineContactNumberPattern.test(result)).toBe(true);
  });

  it("rejects invalid numbers missing leading 09 or incorrect digit count", () => {
    expect(philippineContactNumberPattern.test(sanitizeContactNumber("08123456789"))).toBe(false);
    expect(philippineContactNumberPattern.test(sanitizeContactNumber("0912345678"))).toBe(false);
  });
});
