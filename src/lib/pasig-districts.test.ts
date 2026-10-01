import { describe, it, expect } from "vitest";
import {
  pasigDistrictBarangays,
  pasigDistrictOptions,
  getBarangayOptionsForDistrict,
  isBarangayInDistrict,
  getAllPasigBarangayOptions,
  getPasigDistrictForBarangay,
  normalizePasigDistrict,
} from "./pasig-districts";

describe("pasig-districts Canonical Location Helpers", () => {
  describe("getBarangayOptionsForDistrict", () => {
    it("returns all 30 barangays sorted alphabetically when district is 'all'", () => {
      const options = getBarangayOptionsForDistrict("all");
      expect(options).toHaveLength(30);

      // Verify alphabetical sorting
      for (let i = 0; i < options.length - 1; i++) {
        expect(options[i].name.localeCompare(options[i + 1].name)).toBeLessThanOrEqual(0);
      }

      // Check known barangays from both districts
      const names = options.map((b) => b.name);
      expect(names).toContain("Kapitolyo"); // District I
      expect(names).toContain("Santolan");  // District II
    });

    it("returns exactly 22 District I barangays sorted alphabetically and excludes District II barangays", () => {
      const options = getBarangayOptionsForDistrict("District I");
      expect(options).toHaveLength(22);

      // Verify alphabetical sorting
      for (let i = 0; i < options.length - 1; i++) {
        expect(options[i].name.localeCompare(options[i + 1].name)).toBeLessThanOrEqual(0);
      }

      const names = options.map((b) => b.name);
      expect(names).toContain("Bagong Ilog");
      expect(names).toContain("Kapitolyo");
      expect(names).toContain("San Antonio");
      expect(names).toContain("Ugong");

      // Verify NO District II barangays appear
      const districtIIBarangays = [
        "Santolan",
        "Dela Paz",
        "Manggahan",
        "Maybunga",
        "Pinagbuhatan",
        "Rosario",
        "San Miguel",
        "Sta. Lucia",
      ];
      districtIIBarangays.forEach((name) => {
        expect(names).not.toContain(name);
      });
    });

    it("returns exactly 8 District II barangays sorted alphabetically and excludes District I barangays", () => {
      const options = getBarangayOptionsForDistrict("District II");
      expect(options).toHaveLength(8);

      // Verify alphabetical sorting
      for (let i = 0; i < options.length - 1; i++) {
        expect(options[i].name.localeCompare(options[i + 1].name)).toBeLessThanOrEqual(0);
      }

      const names = options.map((b) => b.name);
      expect(names).toEqual([
        "Dela Paz",
        "Manggahan",
        "Maybunga",
        "Pinagbuhatan",
        "Rosario",
        "San Miguel",
        "Santolan",
        "Sta. Lucia",
      ]);

      // Verify NO District I barangays appear
      expect(names).not.toContain("Kapitolyo");
      expect(names).not.toContain("Bagong Ilog");
      expect(names).not.toContain("San Antonio");
    });
  });

  describe("isBarangayInDistrict", () => {
    it("validates District I barangays correctly", () => {
      expect(isBarangayInDistrict("Kapitolyo", "District I")).toBe(true);
      expect(isBarangayInDistrict("San Antonio", "District I")).toBe(true);
      expect(isBarangayInDistrict("Bagong Ilog", "District I")).toBe(true);
      expect(isBarangayInDistrict("Santolan", "District I")).toBe(false);
      expect(isBarangayInDistrict("Dela Paz", "District I")).toBe(false);
    });

    it("validates District II barangays correctly", () => {
      expect(isBarangayInDistrict("Santolan", "District II")).toBe(true);
      expect(isBarangayInDistrict("Pinagbuhatan", "District II")).toBe(true);
      expect(isBarangayInDistrict("Dela Paz", "District II")).toBe(true);
      expect(isBarangayInDistrict("Kapitolyo", "District II")).toBe(false);
      expect(isBarangayInDistrict("San Antonio", "District II")).toBe(false);
    });

    it("returns true for any barangay when district is 'all'", () => {
      expect(isBarangayInDistrict("Kapitolyo", "all")).toBe(true);
      expect(isBarangayInDistrict("Santolan", "all")).toBe(true);
      expect(isBarangayInDistrict("Any Other", "all")).toBe(true);
    });

    it("returns true when barangay is 'all' or empty for any district", () => {
      expect(isBarangayInDistrict("all", "District I")).toBe(true);
      expect(isBarangayInDistrict("all", "District II")).toBe(true);
      expect(isBarangayInDistrict("all", "all")).toBe(true);
      expect(isBarangayInDistrict("All barangays", "District I")).toBe(true);
      expect(isBarangayInDistrict("", "District I")).toBe(true);
    });

    it("handles barangay IDs and case-insensitive matching", () => {
      expect(isBarangayInDistrict("barangay-kapitolyo", "District I")).toBe(true);
      expect(isBarangayInDistrict("barangay-santolan", "District II")).toBe(true);
      expect(isBarangayInDistrict("KAPITOLYO", "District I")).toBe(true);
      expect(isBarangayInDistrict("santolan", "District II")).toBe(true);
    });
  });

  describe("headquarters district derivation", () => {
    it("derives all 30 barangays from their canonical district without requiring district-first selection", () => {
      for (const district of pasigDistrictOptions) {
        for (const barangay of pasigDistrictBarangays[district]) {
          expect(getPasigDistrictForBarangay(barangay.name)).toBe(district);
        }
      }
      expect(getAllPasigBarangayOptions()).toHaveLength(30);
      expect(getPasigDistrictForBarangay("Barangay Santolan")).toBe("District II");
    });

    it("returns no district for unrecognized locations", () => {
      expect(getPasigDistrictForBarangay("Malanday")).toBe("");
      expect(getPasigDistrictForBarangay("")).toBe("");
    });
  });

  describe("normalizePasigDistrict", () => {
    it("accepts the district labels already used by existing profile records", () => {
      expect(normalizePasigDistrict("District I")).toBe("District I");
      expect(normalizePasigDistrict("District 1")).toBe("District I");
      expect(normalizePasigDistrict("District II")).toBe("District II");
      expect(normalizePasigDistrict("District 2")).toBe("District II");
      expect(normalizePasigDistrict("unknown")).toBe("");
    });
  });
});
