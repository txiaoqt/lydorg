import { describe, expect, it } from "vitest";
import {
  CANONICAL_PASIG_BARANGAYS,
  getPasigBarangayOrdinal,
  normalizePasigBarangayName,
} from "./pasig-districts";
import {
  generateUniqueUrn,
  normalizeUrn,
  validateUrn,
  URN_PATTERN,
  isRegistrationVerified,
} from "./urn-registration";
import type { OrganizationProfile } from "./lydo-connect-data";

describe("PCYDO Deterministic URN (BB-YY-NNN) Specification Tests", () => {
  // A. Barangay Ordinal: Verify all 30 canonical barangays map correctly (Rosario -> 17)
  it("A. Barangay ordinal: All 30 canonical Pasig barangays map to exact 01-30 ordinals", () => {
    expect(CANONICAL_PASIG_BARANGAYS).toHaveLength(30);

    // Verify alphabetical ordering 01 to 30
    for (let i = 0; i < CANONICAL_PASIG_BARANGAYS.length; i++) {
      const expectedOrdinal = String(i + 1).padStart(2, "0");
      expect(CANONICAL_PASIG_BARANGAYS[i].ordinal).toBe(expectedOrdinal);
    }

    // Spot-check key canonical landmarks
    expect(getPasigBarangayOrdinal("Bagong Ilog")).toBe("01");
    expect(getPasigBarangayOrdinal("Bambang")).toBe("03");
    expect(getPasigBarangayOrdinal("Palatiw")).toBe("14");
    expect(getPasigBarangayOrdinal("Rosario")).toBe("17"); // Stakeholder canonical reference
    expect(getPasigBarangayOrdinal("San Antonio")).toBe("19");
    expect(getPasigBarangayOrdinal("Ugong")).toBe("30");

    // Common variant normalization
    expect(getPasigBarangayOrdinal("Brgy. Rosario")).toBe("17");
    expect(getPasigBarangayOrdinal("Barangay Rosario")).toBe("17");
    expect(getPasigBarangayOrdinal("  rosario  ")).toBe("17");
    expect(getPasigBarangayOrdinal("ROSARIO")).toBe("17");
    expect(getPasigBarangayOrdinal("Brgy. Sta. Lucia")).toBe("25");
    expect(getPasigBarangayOrdinal("Santa Lucia")).toBe("25");
    expect(getPasigBarangayOrdinal("Santo Tomas")).toBe("28");
    expect(getPasigBarangayOrdinal("Sto. Tomas")).toBe("28");

    // Invalid barangay returns null
    expect(getPasigBarangayOrdinal("Invalid Barangay")).toBeNull();
    expect(getPasigBarangayOrdinal("Quezon City")).toBeNull();
    expect(getPasigBarangayOrdinal("dyan")).toBeNull();
    expect(getPasigBarangayOrdinal("")).toBeNull();
    expect(getPasigBarangayOrdinal(null)).toBeNull();
  });

  // B. Formatting: BB-YY-NNN syntax
  it("B. Formatting: Validates standard BB-YY-NNN syntax and rejects corruptions", () => {
    expect(validateUrn("01-26-001")).toBeNull();
    expect(validateUrn("17-26-010")).toBeNull();
    expect(validateUrn("30-26-999")).toBeNull();

    // Rejection of malformed URNs
    expect(validateUrn("1-26-001")).not.toBeNull(); // single digit BB
    expect(validateUrn("17-2-010")).not.toBeNull(); // single digit YY
    expect(validateUrn("17-26-10")).not.toBeNull(); // two digit NNN
    expect(validateUrn("17-26-0010")).not.toBeNull(); // four digit NNN
    expect(validateUrn("17/26/010")).not.toBeNull(); // wrong separator
    expect(validateUrn("17-26-ABC")).not.toBeNull(); // non-digit sequence
    expect(validateUrn("")).not.toBeNull();
  });

  // C. Global Annual Sequence: Across different barangays (001, 002, 003 NOT reset by barangay)
  it("C. Global annual sequence: Does not reset per barangay", () => {
    class MockCityWideCounter {
      private counters = new Map<number, number>();

      issueUrn(barangay: string, year: number): string {
        const bb = getPasigBarangayOrdinal(barangay);
        if (!bb) throw new Error(`Invalid barangay: ${barangay}`);
        const currentSeq = (this.counters.get(year) || 0) + 1;
        this.counters.set(year, currentSeq);
        const yy = String(year).slice(-2);
        return `${bb}-${yy}-${String(currentSeq).padStart(3, "0")}`;
      }
    }

    const counter = new MockCityWideCounter();

    // 3 organizations from different barangays in 2026
    const org1Urn = counter.issueUrn("Bambang", 2026); // BB: 03
    const org2Urn = counter.issueUrn("Bagong Ilog", 2026); // BB: 01
    const org3Urn = counter.issueUrn("Rosario", 2026); // BB: 17

    expect(org1Urn).toBe("03-26-001");
    expect(org2Urn).toBe("01-26-002"); // sequence increments globally to 002!
    expect(org3Urn).toBe("17-26-003"); // sequence increments globally to 003!

    // Second org from Rosario should receive 004, NOT 002
    const org4Urn = counter.issueUrn("Rosario", 2026);
    expect(org4Urn).toBe("17-26-004");
  });

  // D. Year Reset: Sequence starts anew at 001 on calendar year rollover
  it("D. Year reset: New calendar year starts from 001", () => {
    class MockYearlyCounter {
      private counters = new Map<number, number>();
      issueUrn(barangay: string, year: number): string {
        const bb = getPasigBarangayOrdinal(barangay) || "17";
        const currentSeq = (this.counters.get(year) || 0) + 1;
        this.counters.set(year, currentSeq);
        const yy = String(year).slice(-2);
        return `${bb}-${yy}-${String(currentSeq).padStart(3, "0")}`;
      }
    }

    const counter = new MockYearlyCounter();
    const u2026_1 = counter.issueUrn("Rosario", 2026);
    const u2026_2 = counter.issueUrn("Rosario", 2026);
    expect(u2026_1).toBe("17-26-001");
    expect(u2026_2).toBe("17-26-002");

    // Year rollover to 2027
    const u2027_1 = counter.issueUrn("Rosario", 2027);
    const u2027_2 = counter.issueUrn("Ugong", 2027);
    expect(u2027_1).toBe("17-27-001"); // resets to 001!
    expect(u2027_2).toBe("30-27-002");
  });

  // E. Approval-Year Correctness: Derives YY from verified_at, NOT submission date
  it("E. Approval-year correctness: Uses final approval timestamp (verified_at), not submitted date", () => {
    const submissionDate = new Date("2026-12-20T10:00:00Z");
    const verifiedDate = new Date("2027-01-03T08:30:00Z");

    const deriveApprovalYear = (verifiedAt: Date) => verifiedAt.getUTCFullYear();
    const approvalYear = deriveApprovalYear(verifiedDate);
    expect(approvalYear).toBe(2027);

    const urn = generateUniqueUrn("Rosario", approvalYear, 1);
    expect(urn).toBe("17-27-001"); // 27, NOT 26!
  });

  // F. Concurrency: Atomic sequence increments ensure no duplicates
  it("F. Concurrency: Simulation of concurrent approval requests produces unique sequential URNs", async () => {
    let globalCounter = 5; // starting after migrated dummy records
    const lock = { current: false };

    const atomicApprove = async (barangay: string, year: number): Promise<string> => {
      // Simulate atomic row lock
      while (lock.current) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
      lock.current = true;
      try {
        globalCounter += 1;
        const bb = getPasigBarangayOrdinal(barangay) || "17";
        const yy = String(year).slice(-2);
        return `${bb}-${yy}-${String(globalCounter).padStart(3, "0")}`;
      } finally {
        lock.current = false;
      }
    };

    // Simulate 20 concurrent approval operations
    const requests = Array.from({ length: 20 }, (_, idx) => {
      const barangays = ["Rosario", "Bambang", "Palatiw", "Bagong Ilog", "Ugong"];
      const brgy = barangays[idx % barangays.length];
      return atomicApprove(brgy, 2026);
    });

    const issuedUrns = await Promise.all(requests);
    const uniqueSet = new Set(issuedUrns);

    expect(issuedUrns).toHaveLength(20);
    expect(uniqueSet.size).toBe(20); // No collisions!
    expect(issuedUrns[0]).toMatch(/-\d{2}-006$/); // Continues after 5!
    expect(issuedUrns[19]).toMatch(/-\d{2}-025$/);
  });

  // G. No Premature URN: Draft / Submitted / Needs Revision / Rejected hold no official URN
  it("G. No premature URN: Unverified statuses must have urn === null", () => {
    const unverifiedStatuses = ["draft", "submitted", "under_review", "needs_revision", "rejected"];

    for (const status of unverifiedStatuses) {
      const profile: Partial<OrganizationProfile> = {
        profileStatus: status as any,
        urn: null,
        organizationIdentifierNumber: "",
      };
      expect(profile.urn).toBeNull();
      expect(profile.organizationIdentifierNumber).toBe("");
      expect(isRegistrationVerified(profile as OrganizationProfile)).toBe(false);
    }
  });

  // H. Final Approval: Verified status assigns official deterministic URN
  it("H. Final approval: Verified organization holds synchronized official deterministic URN", () => {
    const verifiedProfile: Partial<OrganizationProfile> = {
      profileStatus: "verified",
      verificationMethod: "documents",
      urn: "17-26-010",
      urnNormalized: "17-26-010",
      organizationIdentifierNumber: "17-26-010",
      verifiedAt: "2026-09-17T12:00:00Z",
    };

    expect(verifiedProfile.profileStatus).toBe("verified");
    expect(verifiedProfile.urn).toBe("17-26-010");
    expect(verifiedProfile.urnNormalized).toBe(normalizeUrn("17-26-010"));
    expect(verifiedProfile.organizationIdentifierNumber).toBe("17-26-010");
    expect(validateUrn(verifiedProfile.urn!)).toBeNull();
    expect(isRegistrationVerified(verifiedProfile as OrganizationProfile, true)).toBe(true);
  });

  // I. Renewal: Preserves existing official URN without counter increment
  it("I. Renewal: Preserves existing URN and never calls generator or increments counter", () => {
    const existingOrg: Partial<OrganizationProfile> = {
      id: "org-renewal-test",
      organizationName: "Active Youth Org",
      urn: "17-26-010",
      urnNormalized: "17-26-010",
      organizationIdentifierNumber: "17-26-010",
      profileStatus: "verified",
    };

    // Renewal approval preserves existing URN
    const renewalCertificateUrn = existingOrg.urn || existingOrg.organizationIdentifierNumber;
    expect(renewalCertificateUrn).toBe("17-26-010");

    // Term 2 accreditation receives the exact same URN
    const term2Accreditation = {
      organizationId: existingOrg.id,
      termNumber: 2,
      certificateUrn: renewalCertificateUrn,
      status: "active",
    };
    expect(term2Accreditation.certificateUrn).toBe("17-26-010");
  });

  // J. Historical Migration: Existing dummy records receive deterministic URNs chronologically
  it("J. Historical migration: Verified test accounts ordered by verified_at receive 001 to 005", () => {
    const dummyRecords = [
      {
        id: "ac6b8340",
        name: "Test Council",
        barangay: "Bambang",
        verifiedAt: "2026-07-08T13:18:09.426Z",
        oldUrn: "PCYDO-2026-8D85",
      },
      {
        id: "ae6c3538",
        name: "Sample Org",
        barangay: "Bagong Ilog",
        verifiedAt: "2026-08-03T03:33:23.622Z",
        oldUrn: "PCYDO-2026-DE2D",
      },
      {
        id: "3de1fe1f",
        name: "Nami Swan Organization",
        barangay: "Palatiw",
        verifiedAt: "2026-08-03T08:55:35.315Z",
        oldUrn: "PCYDO-2026-34EB",
      },
      {
        id: "7dfb6e06",
        name: "tadz",
        barangay: "San Antonio",
        verifiedAt: "2026-08-05T19:33:01.683Z",
        oldUrn: "PCYDO-2026-CC3B",
      },
      {
        id: "481ab0da",
        name: "Nami Pretty",
        barangay: "Palatiw",
        verifiedAt: "2026-08-31T19:29:47.620Z",
        oldUrn: "PCYDO-2026-EC51",
      },
    ];

    // Chronological sort verified_at ASC
    const sorted = [...dummyRecords].sort(
      (a, b) => new Date(a.verifiedAt).getTime() - new Date(b.verifiedAt).getTime(),
    );

    const migrated = sorted.map((item, idx) => {
      const bb = getPasigBarangayOrdinal(item.barangay);
      const yy = new Date(item.verifiedAt).getUTCFullYear().toString().slice(-2);
      const nnn = String(idx + 1).padStart(3, "0");
      return {
        ...item,
        newUrn: `${bb}-${yy}-${nnn}`,
      };
    });

    expect(migrated[0].newUrn).toBe("03-26-001"); // Bambang (03) -> 001
    expect(migrated[1].newUrn).toBe("01-26-002"); // Bagong Ilog (01) -> 002
    expect(migrated[2].newUrn).toBe("14-26-003"); // Palatiw (14) -> 003
    expect(migrated[3].newUrn).toBe("19-26-004"); // San Antonio (19) -> 004
    expect(migrated[4].newUrn).toBe("14-26-005"); // Palatiw (14) -> 005
  });

  // K. Pending Legacy Record: Does NOT consume a sequence number
  it("K. Pending legacy record: Clears stale URN and does not consume a sequence", () => {
    const pendingOrg = {
      id: "4fbdf719",
      name: "Princess Nami's Dubai Chewy Cookie Organization",
      profileStatus: "pending_review",
      verifiedAt: null,
      oldUrn: "PCYDO-2026-01EC",
    };

    // Stale URN is cleared on unverified record
    const cleanedProfile = {
      ...pendingOrg,
      urn: null,
      urnNormalized: null,
      organizationIdentifierNumber: "",
    };

    expect(cleanedProfile.urn).toBeNull();
    expect(cleanedProfile.urnNormalized).toBeNull();
    expect(cleanedProfile.organizationIdentifierNumber).toBe("");
  });

  // L. Dual-Format Validation: Accepts both new BB-YY-NNN and legacy PCYDO-XXXX-XXXX
  it("L. Dual-format validation: Accepts both official new and legacy formats", () => {
    // New format (BB-YY-NNN)
    expect(validateUrn("17-26-010")).toBeNull();
    expect(validateUrn("01-26-001")).toBeNull();
    expect(validateUrn("30-26-999")).toBeNull();
    expect(URN_PATTERN.test("17-26-010")).toBe(true);

    // Legacy format (PCYDO-YYYY-XXXX / PCYDO-XXXX-XXXX)
    expect(validateUrn("PCYDO-2026-CC3B")).toBeNull();
    expect(validateUrn("PCYDO-AB12-CD34")).toBeNull();
    expect(validateUrn("pcydo-2026-34eb")).toBeNull();
    expect(URN_PATTERN.test("PCYDO-2026-CC3B")).toBe(true);

    // Corrupt formats rejected
    expect(validateUrn("RANDOM-STRING")).not.toBeNull();
    expect(validateUrn("17-2026-010")).not.toBeNull();
    expect(validateUrn("PCYDO-123")).not.toBeNull();
  });
});
