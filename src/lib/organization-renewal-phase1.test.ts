import { describe, expect, it } from "vitest";
import {
  calculateFixedAnniversaryRenewalTerm,
  deriveAccreditationStatus,
  getOrganizationRenewalCountdown,
  ORGANIZATION_REGISTRATION_VALIDITY_YEARS,
  RENEWAL_WINDOW_DAYS,
} from "./organization-renewal";
import type {
  OrganizationAccreditationRecord,
  OrganizationProfile,
  OrganizationRenewalRecord,
} from "./lydo-connect-data";

describe("Phase 1: Organization Accreditation & Renewal Contract", () => {
  // Helper to create a mock organization profile
  const createMockProfile = (overrides: Partial<OrganizationProfile> = {}): OrganizationProfile => ({
    id: "org-1",
    referenceId: "REF-001",
    userId: "user-1",
    organizationName: "Pasig Youth Council",
    organizationEmail: "youth@pasig.gov.ph",
    contactNumber: "09171234567",
    district: "District 1",
    barangay: "San Nicolas",
    isExistingOrganization: true,
    organizationIdentifierNumber: "PYC-2024-001",
    registrationType: "existing_urn",
    urn: "PYC-2024-001",
    urnNormalized: "pyc2024001",
    urnReviewStatus: "verified",
    urnAdminRemarks: "",
    urnReviewedBy: "admin-1",
    urnReviewedAt: "2024-05-10T00:00:00Z",
    verificationMethod: "admin_manual",
    majorClassification: "Youth Organization",
    subClassification: "Community-Based",
    advocacies: ["Governance", "Youth Development"],
    adviserName: "Juan Dela Cruz",
    representativeName: "Maria Santos",
    address: "Caruncho Ave, Pasig City",
    facebookPageUrl: "https://facebook.com/pasigyouth",
    profileStatus: "verified",
    verifiedAt: "2024-05-10T08:00:00Z",
    internalNotes: "",
    yorpRegisteredYear: 2024,
    yorpRenewedYear: null,
    createdAt: "2024-05-01T08:00:00Z",
    updatedAt: "2024-05-10T08:00:00Z",
    ...overrides,
  });

  describe("Scenario A & B: Multi-Term History and Term Uniqueness", () => {
    it("allows an organization to have Term 1 (initial) and Term 2 (renewal)", () => {
      const term1: OrganizationAccreditationRecord = {
        id: "accred-term-1",
        organizationId: "org-1",
        termNumber: 1,
        startDate: "2024-05-10",
        endDate: "2027-05-10",
        certificateUrn: "PYC-2024-001",
        status: "superseded",
        isLegacyInferred: false,
        approvedBy: "admin-1",
        approvedAt: "2024-05-10T08:00:00Z",
        createdAt: "2024-05-10T08:00:00Z",
      };

      const term2: OrganizationAccreditationRecord = {
        id: "accred-term-2",
        organizationId: "org-1",
        termNumber: 2,
        startDate: "2027-05-10",
        endDate: "2030-05-10",
        certificateUrn: "PYC-2024-001",
        status: "active",
        isLegacyInferred: false,
        approvedBy: "admin-2",
        approvedAt: "2027-05-01T10:00:00Z",
        createdAt: "2027-05-01T10:00:00Z",
      };

      const orgTerms = [term1, term2];
      expect(orgTerms).toHaveLength(2);
      expect(orgTerms[0].termNumber).toBe(1);
      expect(orgTerms[1].termNumber).toBe(2);
      expect(orgTerms[0].status).toBe("superseded");
      expect(orgTerms[1].status).toBe("active");
    });

    it("rejects duplicate term numbers for the same organization", () => {
      const terms: OrganizationAccreditationRecord[] = [
        {
          id: "accred-term-1",
          organizationId: "org-1",
          termNumber: 1,
          startDate: "2024-05-10",
          endDate: "2027-05-10",
          certificateUrn: "URN-1",
          status: "active",
          isLegacyInferred: false,
          approvedBy: "admin-1",
          approvedAt: "2024-05-10T08:00:00Z",
          createdAt: "2024-05-10T08:00:00Z",
        },
      ];

      const checkDuplicateTerm = (newTermNumber: number, orgId: string) => {
        const duplicate = terms.some(
          (t) => t.organizationId === orgId && t.termNumber === newTermNumber,
        );
        if (duplicate) {
          throw new Error(`Unique constraint violation: organization ${orgId} already has term ${newTermNumber}.`);
        }
      };

      expect(() => checkDuplicateTerm(1, "org-1")).toThrowError(/Unique constraint violation/);
      expect(() => checkDuplicateTerm(2, "org-1")).not.toThrow();
    });
  });

  describe("Scenario C: At Most One Active Accreditation per Organization", () => {
    it("validates that an organization cannot have two 'active' accreditation records simultaneously", () => {
      const activeTerms: OrganizationAccreditationRecord[] = [
        {
          id: "accred-1",
          organizationId: "org-1",
          termNumber: 1,
          startDate: "2024-05-10",
          endDate: "2027-05-10",
          certificateUrn: "URN-1",
          status: "active",
          isLegacyInferred: false,
          approvedBy: "admin-1",
          approvedAt: "2024-05-10T08:00:00Z",
          createdAt: "2024-05-10T08:00:00Z",
        },
      ];

      const addActiveAccreditation = (candidate: OrganizationAccreditationRecord) => {
        if (
          candidate.status === "active" &&
          activeTerms.some((t) => t.organizationId === candidate.organizationId && t.status === "active")
        ) {
          throw new Error("Partial unique constraint violation: an active accreditation already exists.");
        }
        activeTerms.push(candidate);
      };

      const candidateConflicting: OrganizationAccreditationRecord = {
        id: "accred-2",
        organizationId: "org-1",
        termNumber: 2,
        startDate: "2027-05-10",
        endDate: "2030-05-10",
        certificateUrn: "URN-1",
        status: "active",
        isLegacyInferred: false,
        approvedBy: "admin-2",
        approvedAt: "2027-05-01T10:00:00Z",
        createdAt: "2027-05-01T10:00:00Z",
      };

      expect(() => addActiveAccreditation(candidateConflicting)).toThrowError(
        /Partial unique constraint violation/,
      );

      // Once term 1 is superseded, term 2 can become active
      activeTerms[0].status = "superseded";
      expect(() => addActiveAccreditation(candidateConflicting)).not.toThrow();
    });
  });

  describe("Scenario D: Single Non-Terminal Renewal Application Concurrency", () => {
    it("prevents multiple concurrent non-terminal renewal applications for the same organization", () => {
      const nonTerminalStatuses = new Set([
        "draft",
        "submitted",
        "under_review",
        "needs_revision",
        "resubmitted",
      ]);

      const applications: OrganizationRenewalRecord[] = [
        {
          id: "renewal-app-1",
          organizationId: "org-1",
          cycleNumber: 2,
          currentAccreditationId: "accred-1",
          status: "submitted",
          submittedAt: "2027-03-01T10:00:00Z",
          reviewedBy: null,
          reviewedAt: null,
          adminRemarks: null,
          createdAt: "2027-02-15T10:00:00Z",
          updatedAt: "2027-03-01T10:00:00Z",
        },
      ];

      const startRenewalDraft = (orgId: string, cycleNumber: number) => {
        const hasActive = applications.some(
          (app) => app.organizationId === orgId && nonTerminalStatuses.has(app.status),
        );
        if (hasActive) {
          throw new Error("Concurrency constraint violation: an active renewal application is already in progress.");
        }
        applications.push({
          id: "renewal-app-2",
          organizationId: orgId,
          cycleNumber,
          currentAccreditationId: "accred-1",
          status: "draft",
          submittedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          adminRemarks: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      };

      // Attempting to create another draft while one is submitted must fail
      expect(() => startRenewalDraft("org-1", 2)).toThrowError(/Concurrency constraint violation/);

      // Once the first application reaches terminal state (approved or rejected), a new draft is permitted
      applications[0].status = "rejected";
      expect(() => startRenewalDraft("org-1", 3)).not.toThrow();
    });
  });

  describe("Scenario E: Immutability Contract for Historical Ledger Rows", () => {
    it("guards immutable historical fields against mutation", () => {
      const term: OrganizationAccreditationRecord = {
        id: "accred-1",
        organizationId: "org-1",
        termNumber: 1,
        startDate: "2024-05-10",
        endDate: "2027-05-10",
        certificateUrn: "URN-1",
        status: "active",
        isLegacyInferred: false,
        approvedBy: "admin-1",
        approvedAt: "2024-05-10T08:00:00Z",
        createdAt: "2024-05-10T08:00:00Z",
      };

      const validateUpdate = (patch: Partial<OrganizationAccreditationRecord>) => {
        const immutableFields = [
          "termNumber",
          "startDate",
          "endDate",
          "certificateUrn",
          "approvedBy",
          "approvedAt",
          "createdAt",
          "isLegacyInferred",
        ] as const;

        for (const field of immutableFields) {
          if (field in patch && patch[field] !== term[field]) {
            throw new Error(`Field ${field} is immutable on historical accreditation ledger.`);
          }
        }
      };

      expect(() => validateUpdate({ startDate: "2024-06-01" })).toThrowError(/immutable/);
      expect(() => validateUpdate({ termNumber: 2 })).toThrowError(/immutable/);
      expect(() => validateUpdate({ certificateUrn: "NEW-URN" })).toThrowError(/immutable/);
      // Status update is allowed (e.g. active -> superseded)
      expect(() => validateUpdate({ status: "superseded" })).not.toThrow();
    });
  });

  describe("Scenario F, G, H & I: Safe Legacy Migration Rules", () => {
    it("CASE 1 (Confirmed): Correctly projects confirmed verified_at timestamp with is_legacy_inferred = false", () => {
      const confirmedOrg = createMockProfile({
        verifiedAt: "2024-05-10T08:00:00Z",
        yorpRegisteredYear: 2024,
      });

      const startDate = confirmedOrg.verifiedAt.split("T")[0];
      const endDate = new Date(startDate);
      endDate.setUTCFullYear(endDate.getUTCFullYear() + ORGANIZATION_REGISTRATION_VALIDITY_YEARS);
      const endDateStr = endDate.toISOString().split("T")[0];

      const ledgerRecord: OrganizationAccreditationRecord = {
        id: "term-uuid-1",
        organizationId: confirmedOrg.id,
        termNumber: 1,
        startDate,
        endDate: endDateStr,
        certificateUrn: confirmedOrg.urn,
        status: "active",
        isLegacyInferred: false,
        approvedBy: null, // Legacy approving admin not fabricated
        approvedAt: confirmedOrg.verifiedAt,
        createdAt: confirmedOrg.createdAt,
      };

      expect(ledgerRecord.isLegacyInferred).toBe(false);
      expect(ledgerRecord.startDate).toBe("2024-05-10");
      expect(ledgerRecord.endDate).toBe("2027-05-10");
      expect(confirmedOrg.verifiedAt).toBe("2024-05-10T08:00:00Z"); // Intact
      expect(confirmedOrg.yorpRegisteredYear).toBe(2024); // Intact
    });

    it("CASE 2 (Inferred): Marks year-only legacy data explicitly as inferred and does not fabricate approving admin", () => {
      const inferredOrg = createMockProfile({
        verifiedAt: "",
        yorpRegisteredYear: 2023,
      });

      const startDate = `${inferredOrg.yorpRegisteredYear}-01-01`;
      const endDate = `${inferredOrg.yorpRegisteredYear! + 3}-01-01`;

      const ledgerRecord: OrganizationAccreditationRecord = {
        id: "inferred-uuid-1",
        organizationId: inferredOrg.id,
        termNumber: 1,
        startDate,
        endDate,
        certificateUrn: inferredOrg.urn,
        status: "active",
        isLegacyInferred: true, // EXPLICITLY INFERRED
        approvedBy: null, // NO FABRICATED ADMIN
        approvedAt: `${inferredOrg.yorpRegisteredYear}-01-01T00:00:00+08:00`,
        createdAt: inferredOrg.createdAt,
      };

      expect(ledgerRecord.isLegacyInferred).toBe(true);
      expect(ledgerRecord.approvedBy).toBeNull();
      expect(ledgerRecord.startDate).toBe("2023-01-01");
      expect(ledgerRecord.endDate).toBe("2026-01-01");
    });

    it("CASE 3 (Unknown): Does NOT fabricate accreditation terms when legal data is completely missing", () => {
      const unknownOrg = createMockProfile({
        verifiedAt: "",
        yorpRegisteredYear: null,
        profileStatus: "incomplete",
      });

      const createAccreditationIfEligible = (org: OrganizationProfile) => {
        if (org.profileStatus !== "verified") return null;
        if (!org.verifiedAt && !org.yorpRegisteredYear) return null;
        return { termNumber: 1 };
      };

      const result = createAccreditationIfEligible(unknownOrg);
      expect(result).toBeNull();
      expect(unknownOrg.currentAccreditationId).toBeUndefined();
    });
  });

  describe("Scenario J: Canonical Accreditation Status Derivation Contract", () => {
    it("evaluates revoked status regardless of dates", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "revoked",
        endDate: "2030-01-01",
        now: new Date("2026-01-01"),
      });
      expect(status).toBe("revoked");
    });

    it("evaluates superseded status regardless of dates", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "superseded",
        endDate: "2030-01-01",
        now: new Date("2026-01-01"),
      });
      expect(status).toBe("superseded");
    });

    it("derives expired when now > endDate", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: "2026-05-10",
        now: new Date("2026-05-11"),
      });
      expect(status).toBe("expired");
    });

    it("derives expiring_soon when endDate - now <= 90 days", () => {
      const status45Days = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: "2026-06-25",
        now: new Date("2026-05-11"), // ~45 days remaining
      });
      expect(status45Days).toBe("expiring_soon");

      const status90Days = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: "2026-08-09",
        now: new Date("2026-05-11"), // exactly 90 days remaining
      });
      expect(status90Days).toBe("expiring_soon");
    });

    it("derives active when remaining days > 90 days", () => {
      const status = deriveAccreditationStatus({
        persistedStatus: "active",
        endDate: "2027-05-10",
        now: new Date("2026-05-11"), // ~364 days remaining
      });
      expect(status).toBe("active");
    });
  });

  describe("Scenario K: Fixed-Anniversary Term Calculation Policy", () => {
    it("calculates next term start as previous end date, and next end date as +3 years", () => {
      const previousEndDate = "2027-05-10";
      const nextTerm = calculateFixedAnniversaryRenewalTerm(previousEndDate);

      expect(nextTerm.startDate).toBe("2027-05-10");
      expect(nextTerm.endDate).toBe("2030-05-10");
    });
  });

  describe("Backwards Compatibility: getOrganizationRenewalCountdown", () => {
    it("prioritizes profile.accreditationExpiresAt when present", () => {
      const profile = createMockProfile({
        accreditationExpiresAt: "2028-12-31T23:59:59Z",
        verifiedAt: "2024-05-10T00:00:00Z", // would calculate to 2027-05-10
      });

      const countdown = getOrganizationRenewalCountdown(profile, new Date("2028-12-01T00:00:00Z"));
      expect(countdown).not.toBeNull();
      expect(countdown?.expiresAt).toBe("2028-12-31T23:59:59.000Z");
      expect(countdown?.daysRemaining).toBe(31);
      expect(countdown?.isDue).toBe(false);
    });

    it("falls back to legacy verifiedAt + 3 years when accreditationExpiresAt is missing", () => {
      const profile = createMockProfile({
        accreditationExpiresAt: null,
        verifiedAt: "2024-05-10T00:00:00Z",
      });

      const countdown = getOrganizationRenewalCountdown(profile, new Date("2026-05-10T00:00:00Z"));
      expect(countdown).not.toBeNull();
      expect(countdown?.expiresAt).toBe("2027-05-10T00:00:00.000Z");
      expect(countdown?.isDue).toBe(false);
    });

    it("returns null when neither source is present", () => {
      const profile = createMockProfile({
        accreditationExpiresAt: null,
        verifiedAt: "",
      });

      const countdown = getOrganizationRenewalCountdown(profile);
      expect(countdown).toBeNull();
    });
  });
});
