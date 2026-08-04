import { describe, expect, it } from "vitest";
import { isValidFacebookUrl, isValidPersonName } from "./organization-profile-domain";

describe("organization-profile-domain validations", () => {
  describe("isValidFacebookUrl", () => {
    it("accepts empty or whitespace string (optional field)", () => {
      expect(isValidFacebookUrl("")).toBe(true);
      expect(isValidFacebookUrl("   ")).toBe(true);
    });

    it("accepts valid Facebook profile/page URLs", () => {
      expect(isValidFacebookUrl("https://facebook.com/pasigyouth")).toBe(true);
      expect(isValidFacebookUrl("https://www.facebook.com/groups/123456")).toBe(true);
      expect(isValidFacebookUrl("https://fb.com/page")).toBe(true);
      expect(isValidFacebookUrl("https://m.facebook.com/profile.php?id=1000123")).toBe(true);
      expect(isValidFacebookUrl("http://facebook.com/page")).toBe(true);
    });

    it("rejects non-Facebook URLs, plain text, and invalid strings", () => {
      expect(isValidFacebookUrl("pasigyouth")).toBe(false);
      expect(isValidFacebookUrl("my facebook page")).toBe(false);
      expect(isValidFacebookUrl("https://google.com")).toBe(false);
      expect(isValidFacebookUrl("https://twitter.com/pasig")).toBe(false);
      expect(isValidFacebookUrl("ftp://facebook.com/page")).toBe(false);
      expect(isValidFacebookUrl("javascript:alert(1)")).toBe(false);
    });
  });

  describe("isValidPersonName", () => {
    it("accepts empty or whitespace string (optional field)", () => {
      expect(isValidPersonName("")).toBe(true);
      expect(isValidPersonName("   ")).toBe(true);
    });

    it("accepts valid person names with letters, spaces, hyphens, apostrophes, and periods", () => {
      expect(isValidPersonName("Juan Dela Cruz")).toBe(true);
      expect(isValidPersonName("Maria Anne")).toBe(true);
      expect(isValidPersonName("John P. Santos")).toBe(true);
      expect(isValidPersonName("Anne-Marie Reyes")).toBe(true);
      expect(isValidPersonName("O'Connor")).toBe(true);
    });

    it("rejects names containing numbers or special symbols", () => {
      expect(isValidPersonName("Juan123")).toBe(false);
      expect(isValidPersonName("12345")).toBe(false);
      expect(isValidPersonName("Juan Dela Cruz #1")).toBe(false);
      expect(isValidPersonName("John@Doe")).toBe(false);
      expect(isValidPersonName("Maria & Anne")).toBe(false);
    });
  });
});
