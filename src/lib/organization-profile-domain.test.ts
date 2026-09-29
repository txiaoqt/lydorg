import { describe, expect, it } from "vitest";
import {
  isValidFacebookUrl,
  isValidPersonName,
  isValidPersonNamePart,
  isValidSuffix,
  isHeadOfOrganizationComplete,
  isAdviserComplete,
  isAddressComplete,
  getOrganizationProfileCompletionCount,
  createBlankOrganizationProfile,
  validateAdditionalEmails,
  validateAdditionalContactNumbers,
} from "./organization-profile-domain";
import { formatAddress, formatPersonName, getAllOrganizationEmails, getAllOrganizationContactNumbers } from "./lydo-connect-data";

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
      expect(isValidPersonName("Niño Peña")).toBe(true);
    });

    it("rejects names containing numbers or special symbols", () => {
      expect(isValidPersonName("Juan123")).toBe(false);
      expect(isValidPersonName("12345")).toBe(false);
      expect(isValidPersonName("Juan Dela Cruz #1")).toBe(false);
      expect(isValidPersonName("John@Doe")).toBe(false);
      expect(isValidPersonName("Maria & Anne")).toBe(false);
    });
  });

  describe("isValidPersonNamePart", () => {
    it("validates required name parts", () => {
      expect(isValidPersonNamePart("Juan", true)).toBe(true);
      expect(isValidPersonNamePart("Dela Cruz", true)).toBe(true);
      expect(isValidPersonNamePart("Niño", true)).toBe(true);
      expect(isValidPersonNamePart("", true)).toBe(false);
      expect(isValidPersonNamePart("   ", true)).toBe(false);
      expect(isValidPersonNamePart("Juan123", true)).toBe(false);
    });

    it("validates optional name parts", () => {
      expect(isValidPersonNamePart("", false)).toBe(true);
      expect(isValidPersonNamePart("   ", false)).toBe(true);
      expect(isValidPersonNamePart("Miguel", false)).toBe(true);
      expect(isValidPersonNamePart("Miguel123", false)).toBe(false);
    });
  });

  describe("isValidSuffix", () => {
    it("accepts valid suffixes and empty suffix", () => {
      expect(isValidSuffix("")).toBe(true);
      expect(isValidSuffix("Jr.")).toBe(true);
      expect(isValidSuffix("Jr")).toBe(true);
      expect(isValidSuffix("Sr.")).toBe(true);
      expect(isValidSuffix("II")).toBe(true);
      expect(isValidSuffix("III")).toBe(true);
      expect(isValidSuffix("IV")).toBe(true);
    });

    it("rejects invalid suffixes", () => {
      expect(isValidSuffix("123")).toBe(false);
      expect(isValidSuffix("SuperVeryLongSuffixNameThatIsNotValid")).toBe(false);
    });
  });

  describe("formatPersonName", () => {
    it("formats structured names with optional parts correctly", () => {
      expect(formatPersonName({ firstName: "Christopher", lastName: "Natada" })).toBe("Christopher Natada");
      expect(formatPersonName({ firstName: "Christopher", middleName: "Miguel", lastName: "Natada" })).toBe("Christopher Miguel Natada");
      expect(formatPersonName({ firstName: "Christopher", lastName: "Natada", suffix: "Jr." })).toBe("Christopher Natada Jr.");
      expect(formatPersonName({ firstName: "Christopher", middleName: "Miguel", lastName: "Natada", suffix: "Jr." })).toBe("Christopher Miguel Natada Jr.");
    });

    it("handles string and fallback", () => {
      expect(formatPersonName("Christopher Natada")).toBe("Christopher Natada");
      expect(formatPersonName(null, "Unassigned")).toBe("Unassigned");
    });
  });

  describe("formatAddress", () => {
    it("formats structured address correctly in single-line and multi-line modes", () => {
      const addr = {
        unitBuilding: "Room 201, ABC Building",
        street: "101 Test Center Way",
        barangay: "Kapitolyo",
        city: "Pasig City",
        province: "Metro Manila",
        zipCode: "1603",
      };
      expect(formatAddress(addr)).toBe("Room 201, ABC Building, 101 Test Center Way, Kapitolyo, Pasig City, Metro Manila, 1603");
      expect(formatAddress(addr, "", "multi-line")).toBe("Room 201, ABC Building\n101 Test Center Way\nKapitolyo\nPasig City\nMetro Manila\n1603");
    });

    it("omits empty optional components and ignores 'N/A'", () => {
      const addr = {
        unitBuilding: "",
        street: "101 Test Center Way",
        subdivision: "N/A",
        barangay: "Kapitolyo",
        city: "Pasig City",
        province: "Metro Manila",
        zipCode: "1603",
      };
      expect(formatAddress(addr)).toBe("101 Test Center Way, Kapitolyo, Pasig City, Metro Manila, 1603");
    });
  });

  describe("Profile Completeness Evaluation", () => {
    it("evaluates head of organization with structured or legacy fields", () => {
      expect(isHeadOfOrganizationComplete({ representativeFirstName: "Juan", representativeLastName: "Ibarra" })).toBe(true);
      expect(isHeadOfOrganizationComplete({ representativeFirstName: "Juan" })).toBe(false);
      expect(isHeadOfOrganizationComplete({ representativeName: "Juan Ibarra" })).toBe(true);
      expect(isHeadOfOrganizationComplete({})).toBe(false);
    });

    it("evaluates adviser with structured or legacy fields", () => {
      expect(isAdviserComplete({ adviserFirstName: "Maria", adviserLastName: "Clara" })).toBe(true);
      expect(isAdviserComplete({ adviserFirstName: "Maria" })).toBe(false);
      expect(isAdviserComplete({ adviserName: "Maria Clara" })).toBe(true);
      expect(isAdviserComplete({})).toBe(false);
    });

    it("evaluates address with structured or legacy fields", () => {
      expect(isAddressComplete({ addressStreet: "101 Test Center Way", addressBarangay: "Kapitolyo" })).toBe(true);
      expect(isAddressComplete({ addressStreet: "101 Test Center Way", barangay: "Kapitolyo" })).toBe(true);
      expect(isAddressComplete({ addressStreet: "" })).toBe(false);
      expect(isAddressComplete({ address: "101 Test Center Way, Kapitolyo, Pasig City" })).toBe(true);
      expect(isAddressComplete({})).toBe(false);
    });

    it("computes full completion count using structured fields", () => {
      const blank = createBlankOrganizationProfile("user-1");
      expect(getOrganizationProfileCompletionCount(blank)).toBe(0);

      const complete = {
        ...blank,
        organizationName: "Test Org",
        organizationEmail: "test@pasigcity.gov.ph",
        contactNumber: "09170000000",
        district: "District 1",
        barangay: "Kapitolyo",
        majorClassification: "Youth Organization" as const,
        subClassification: "community-based" as const,
        advocacies: ["education" as const],
        representativeFirstName: "Juan",
        representativeLastName: "Ibarra",
        adviserFirstName: "Maria",
        adviserLastName: "Clara",
        addressStreet: "101 Test Center Way",
      };

      expect(getOrganizationProfileCompletionCount(complete)).toBe(11);
    });
  });

  describe("validateAdditionalEmails", () => {
    const primary = "official@pasigyouth.org.ph";

    it("passes with empty additional emails array", () => {
      expect(validateAdditionalEmails(primary, []).isValid).toBe(true);
    });

    it("passes with valid distinct additional emails", () => {
      const result = validateAdditionalEmails(primary, [
        "secretariat@pasigyouth.org.ph",
        "finance@pasigyouth.org.ph",
      ]);
      expect(result.isValid).toBe(true);
    });

    it("rejects empty or whitespace-only additional email", () => {
      const result = validateAdditionalEmails(primary, [""]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("cannot be blank");

      const whitespaceResult = validateAdditionalEmails(primary, ["   "]);
      expect(whitespaceResult.isValid).toBe(false);
      expect(whitespaceResult.error).toContain("cannot be blank");
    });

    it("rejects malformed email format", () => {
      const result = validateAdditionalEmails(primary, ["not-an-email"]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("is not a valid email address");
    });

    it("rejects duplicate of primary email (case-insensitive)", () => {
      const result = validateAdditionalEmails(primary, ["OFFICIAL@pasigyouth.org.ph"]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("duplicate email address");
    });

    it("rejects duplicate among additional emails (case-insensitive)", () => {
      const result = validateAdditionalEmails(primary, [
        "info@pasigyouth.org.ph",
        "INFO@pasigyouth.org.ph",
      ]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("duplicate email address");
    });
  });

  describe("validateAdditionalContactNumbers", () => {
    const primary = "09171234567";

    it("passes with empty additional contacts array", () => {
      expect(validateAdditionalContactNumbers(primary, []).isValid).toBe(true);
    });

    it("passes with valid distinct additional 11-digit 09 contact numbers", () => {
      const result = validateAdditionalContactNumbers(primary, [
        "09181234567",
        "09281234567",
      ]);
      expect(result.isValid).toBe(true);
    });

    it("rejects empty or whitespace-only additional contact number", () => {
      const result = validateAdditionalContactNumbers(primary, [""]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("cannot be blank");
    });

    it("rejects invalid contact number format", () => {
      const tooShort = validateAdditionalContactNumbers(primary, ["091712345"]);
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.error).toContain("not a valid 11-digit Philippine mobile number");

      const notStarting09 = validateAdditionalContactNumbers(primary, ["02812345678"]);
      expect(notStarting09.isValid).toBe(false);
      expect(notStarting09.error).toContain("not a valid 11-digit Philippine mobile number");
    });

    it("rejects duplicate of primary contact number", () => {
      const result = validateAdditionalContactNumbers(primary, ["09171234567"]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("duplicate contact number");
    });

    it("rejects duplicate among additional contact numbers", () => {
      const result = validateAdditionalContactNumbers(primary, [
        "09281234567",
        "09281234567",
      ]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("duplicate contact number");
    });
  });

  describe("getAllOrganizationEmails and getAllOrganizationContactNumbers", () => {
    it("returns primary and distinct additional emails preserving order", () => {
      const profile = {
        organizationEmail: "primary@pasig.ph",
        additionalEmails: ["secondary@pasig.ph", "PRIMARY@pasig.ph", "tertiary@pasig.ph"],
      };
      const emails = getAllOrganizationEmails(profile);
      expect(emails).toEqual(["primary@pasig.ph", "secondary@pasig.ph", "tertiary@pasig.ph"]);
    });

    it("returns primary and distinct additional contact numbers preserving order", () => {
      const profile = {
        contactNumber: "09171111111",
        additionalContactNumbers: ["09182222222", "09171111111", "09193333333"],
      };
      const contacts = getAllOrganizationContactNumbers(profile);
      expect(contacts).toEqual(["09171111111", "09182222222", "09193333333"]);
    });
  });
});

