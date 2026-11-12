import { describe, expect, it } from "vitest";
import {
  YORP_SAMPLE_DATASET_CATALOG,
  type YorpSampleDatasetRecord,
} from "./yorp-sample-dataset-catalog";
import {
  CANONICAL_PASIG_BARANGAYS,
  isBarangayInDistrict,
} from "./pasig-districts";

describe("YORP Sample Dataset Verification", () => {
  const canonicalNames = CANONICAL_PASIG_BARANGAYS.map((b) => b.name);

  it("contains exactly 84 authoritative records", () => {
    expect(YORP_SAMPLE_DATASET_CATALOG).toHaveLength(84);
  });

  it("matches the exact year breakdown from the authoritative PDF", () => {
    const records2024 = YORP_SAMPLE_DATASET_CATALOG.filter((r) => r.source_year === 2024);
    const records2025 = YORP_SAMPLE_DATASET_CATALOG.filter((r) => r.source_year === 2025);
    const records2026 = YORP_SAMPLE_DATASET_CATALOG.filter((r) => r.source_year === 2026);

    expect(records2024).toHaveLength(31);
    expect(records2025).toHaveLength(47);
    expect(records2026).toHaveLength(6);
  });

  it("enforces strict email privacy with unique synthetic test domains", () => {
    const emails = YORP_SAMPLE_DATASET_CATALOG.map((r) => r.organization_email.toLowerCase());
    const uniqueEmails = new Set(emails);

    // Every email is unique
    expect(uniqueEmails.size).toBe(84);

    // Every email is on the safe synthetic test domain
    emails.forEach((email) => {
      expect(email).toMatch(/^[a-z0-9._-]+@pasigyouth\.org\.ph$/);
      // Absolute rule: never use external personal providers
      expect(email).not.toContain("gmail.com");
      expect(email).not.toContain("yahoo.com");
      expect(email).not.toContain("hotmail.com");
      expect(email).not.toContain("deped.gov.ph");
    });
  });

  it("strictly maps all barangays to canonical Pasig barangays and authoritative districts", () => {
    YORP_SAMPLE_DATASET_CATALOG.forEach((record) => {
      expect(canonicalNames).toContain(record.barangay);
      expect(isBarangayInDistrict(record.barangay, record.district as any)).toBe(true);
    });
  });

  it("guarantees valid major classifications and non-empty Centers of Youth Participation", () => {
    const validMajorClasses = ["Youth Organization", "Youth-Serving Organization"];

    YORP_SAMPLE_DATASET_CATALOG.forEach((record) => {
      expect(validMajorClasses).toContain(record.major_classification);
      expect(record.advocacies.length).toBeGreaterThanOrEqual(1);

      // Verify each CYP is non-empty string
      record.advocacies.forEach((cyp) => {
        expect(typeof cyp).toBe("string");
        expect(cyp.trim().length).toBeGreaterThan(0);
      });
      expect(record.advocacies).toContain(record.budget_purpose_category);
    });
  });

  it("maintains realistic budget distribution without marking all liquidated", () => {
    let awaitingCount = 0;
    let releasedCount = 0;
    let liquidatedCount = 0;
    let totalBudgetAmount = 0;

    YORP_SAMPLE_DATASET_CATALOG.forEach((record) => {
      expect(record.budget_fiscal_year).toBe(record.source_year);
      // Seeded amounts vary per record (₱29,000–₱73,000) so reports have realistic spread.
      expect(record.budget_amount).toBeGreaterThanOrEqual(29000);
      expect(record.budget_amount).toBeLessThanOrEqual(73000);
      totalBudgetAmount += record.budget_amount;

      if (record.budget_status === "awaiting_release") {
        awaitingCount++;
        expect(record.is_liquidated).toBe(false);
      }
      if (record.budget_status === "budget_released") releasedCount++;
      if (record.is_liquidated) liquidatedCount++;
    });

    expect(awaitingCount).toBe(28);
    expect(releasedCount).toBe(56);
    // Only part of the released budgets are liquidated.
    expect(liquidatedCount).toBe(28);
    expect(awaitingCount + releasedCount).toBe(84);
    expect(new Set(YORP_SAMPLE_DATASET_CATALOG.map((record) => record.budget_amount)).size).toBeGreaterThan(1);
    expect(totalBudgetAmount).toBe(4254000);
  });

  it("populates structured names and addresses for all records", () => {
    YORP_SAMPLE_DATASET_CATALOG.forEach((record) => {
      // Representative structured name
      expect(record.representative_first_name.trim().length).toBeGreaterThan(0);
      expect(record.representative_last_name.trim().length).toBeGreaterThan(0);
      expect(record.representative_name).toContain(record.representative_first_name);

      // Adviser structured name
      expect(record.adviser_first_name.trim().length).toBeGreaterThan(0);
      expect(record.adviser_last_name.trim().length).toBeGreaterThan(0);
      expect(record.adviser_name).toContain(record.adviser_first_name);

      // Structured address
      expect(record.address_unit_building).toBeTruthy();
      expect(record.address_street).toBeTruthy();
      expect(record.address_barangay).toBe(record.barangay);
      expect(record.address_city).toBe("Pasig City");
      expect(record.address_province).toBe("Metro Manila");
      expect(record.address_zip_code).toBe("1600");
      expect(record.address).toContain(record.barangay);
    });
  });

  it("exercises multi-contact capability on selected organizations", () => {
    const multiContactRecords = YORP_SAMPLE_DATASET_CATALOG.filter(
      (r) => r.additional_emails.length > 0 || r.additional_contact_numbers.length > 0
    );

    expect(multiContactRecords.length).toBeGreaterThan(0);
    multiContactRecords.forEach((r) => {
      r.additional_emails.forEach((email) => {
        expect(email).toMatch(/^[a-z0-9._-]+@pasigyouth\.org\.ph$/);
      });
      r.additional_contact_numbers.forEach((phone) => {
        expect(phone).toMatch(/^09[0-9]{9}$/);
      });
    });
  });
});
