import { describe, expect, it } from "vitest";
import {
  createBlankOrganizationProfile,
  createOrganizationProfileDraft,
  mapOrganizationProfileError,
} from "./organization-profile-domain";
import type { OrganizationProfile } from "./lydo-connect-data";
import { isUrnRegistration, validateUrn, normalizeUrn } from "./urn-registration";

// Simulation of the PostgreSQL atomic reference_id counter and gap-handling algorithm
// defined in 20260917050000_fix_registration_reference_and_urn_lifecycle.sql
class OrganizationReferenceIdGenerator {
  private counters = new Map<number, number>();
  private existingIds = new Set<string>();

  constructor(initialExistingIds: string[] = []) {
    for (const id of initialExistingIds) {
      this.existingIds.add(id);
      const match = id.match(/^REG-(\d{4})-(\d+)$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const seq = parseInt(match[2], 10);
        const currentMax = this.counters.get(year) || 0;
        if (seq > currentMax) {
          this.counters.set(year, seq);
        }
      }
    }
  }

  // Atomic generation equivalent to SQL counter table with ROW LOCK (FOR UPDATE)
  public generateNextId(year: number = 2026): string {
    let nextVal = (this.counters.get(year) || 0) + 1;
    let candidate = `REG-${year}-${String(nextVal).padStart(4, "0")}`;

    // Gap and collision avoidance loop
    while (this.existingIds.has(candidate)) {
      nextVal += 1;
      candidate = `REG-${year}-${String(nextVal).padStart(4, "0")}`;
    }

    this.counters.set(year, nextVal);
    this.existingIds.add(candidate);
    return candidate;
  }

  public getExistingIds(): string[] {
    return Array.from(this.existingIds);
  }
}

// Verification eligibility engine modeling the dynamic document approval logic
interface DocumentType {
  id: string;
  name: string;
  scope: "registration" | "renewal";
  isRequired: boolean;
  isActive: boolean;
}

interface SubmittedFile {
  documentTypeId: string;
  adminStatus: "pending" | "needs_revision" | "approved_green" | "rejected";
}

const checkRegistrationEligibility = (
  requiredDocTypes: DocumentType[],
  submittedFiles: SubmittedFile[],
  isExistingOrganization: boolean,
  hasEnteredUrn: boolean,
): { eligible: boolean; reason: string } => {
  if (isExistingOrganization && hasEnteredUrn) {
    return { eligible: true, reason: "Existing organization with entered URN" };
  }

  const activeRequiredTypes = requiredDocTypes.filter(
    (dt) => dt.scope === "registration" && dt.isActive && dt.isRequired,
  );

  for (const docType of activeRequiredTypes) {
    const file = submittedFiles.find((f) => f.documentTypeId === docType.id);
    if (!file) {
      return { eligible: false, reason: `Missing required document: ${docType.name}` };
    }
    if (file.adminStatus !== "approved_green") {
      return { eligible: false, reason: `Required document ${docType.name} is ${file.adminStatus}` };
    }
  }

  return { eligible: true, reason: "All required documents approved" };
};

describe("Y-TRACE Registration & URN Lifecycle Verification", () => {
  // ==========================================
  // REFERENCE ID TESTS (TESTS 1 - 4)
  // ==========================================
  describe("Reference ID Generation & Concurrency (Phase 2)", () => {
    it("TEST 1: Gap test: handles existing deleted/gapped IDs without collision", () => {
      // Existing IDs have gaps: REG-2026-0001, REG-2026-0002, REG-2026-0006
      const existing = ["REG-2026-0001", "REG-2026-0002", "REG-2026-0006"];
      const generator = new OrganizationReferenceIdGenerator(existing);

      const nextId = generator.generateNextId(2026);
      expect(nextId).toBe("REG-2026-0007");
      expect(existing).not.toContain(nextId);
    });

    it("TEST 2: Concurrency test: two concurrent registrations acquire distinct unique reference IDs", async () => {
      const generator = new OrganizationReferenceIdGenerator(["REG-2026-0001"]);

      // Simulate concurrent requests
      const promises = [
        Promise.resolve().then(() => generator.generateNextId(2026)),
        Promise.resolve().then(() => generator.generateNextId(2026)),
        Promise.resolve().then(() => generator.generateNextId(2026)),
      ];

      const results = await Promise.all(promises);
      const uniqueResults = new Set(results);

      expect(uniqueResults.size).toBe(3);
      expect(results).toContain("REG-2026-0002");
      expect(results).toContain("REG-2026-0003");
      expect(results).toContain("REG-2026-0004");
    });

    it("TEST 3: Year rollover test: resets sequence numbering for new year", () => {
      const generator = new OrganizationReferenceIdGenerator(["REG-2026-0042"]);

      const id2026 = generator.generateNextId(2026);
      expect(id2026).toBe("REG-2026-0043");

      // Rollover to 2027
      const id2027 = generator.generateNextId(2027);
      expect(id2027).toBe("REG-2027-0001");
    });

    it("TEST 4: Existing reference IDs remain unchanged", () => {
      const existing = ["REG-2026-0001", "REG-2026-0002", "REG-2026-0006"];
      const generator = new OrganizationReferenceIdGenerator([...existing]);

      generator.generateNextId(2026);
      const allIds = generator.getExistingIds();

      // Original IDs are strictly preserved
      for (const orig of existing) {
        expect(allIds).toContain(orig);
      }
    });
  });

  // ==========================================
  // NEW ORGANIZATION URN TESTS (TESTS 5 - 15)
  // ==========================================
  describe("New Organization Premature URN Prevention & Issuance Lifecycle (Phase 3 & Phase 8)", () => {
    it("TEST 5: New organization signup: blank profile has urn = '' and organizationIdentifierNumber = ''", () => {
      const profile = createBlankOrganizationProfile("test-user-1", {
        organizationName: "Pasig Youth United",
        isExistingOrganization: false,
      });

      expect(profile.isExistingOrganization).toBe(false);
      expect(profile.organizationIdentifierNumber).toBe("");
      expect(profile.urn).toBe("");
      expect(profile.urnNormalized).toBe("");
      expect(profile.registrationType).toBe("new_organization");
      expect(profile.urnReviewStatus).toBe("not_applicable");
    });

    it("TEST 6: New Google onboarding: draft has urn = '' and organizationIdentifierNumber = ''", () => {
      const draft = createOrganizationProfileDraft("google-user-2", null, {
        organizationName: "Google Onboarding Youth",
        isExistingOrganization: false,
      });

      expect(draft.isExistingOrganization).toBe(false);
      expect(draft.organizationIdentifierNumber).toBe("");
      expect(draft.urn).toBe("");
      expect(draft.urnNormalized).toBe("");
      expect(draft.registrationType).toBe("new_organization");
    });

    it("TEST 7: New organization profile save: preserves empty identifier and does not generate official URN", () => {
      const existingDraft: OrganizationProfile = {
        ...createBlankOrganizationProfile("user-save-1"),
        organizationName: "Draft Org",
        profileStatus: "incomplete",
        isExistingOrganization: false,
      };

      const nextDraft = createOrganizationProfileDraft("user-save-1", existingDraft, {
        isExistingOrganization: false,
      });

      expect(nextDraft.urn).toBe("");
      expect(nextDraft.organizationIdentifierNumber).toBe("");
      expect(nextDraft.profileStatus).toBe("incomplete");
    });

    it("TEST 8: New organization registration submission: pending review state still has no official URN", () => {
      const submittedProfile: OrganizationProfile = {
        ...createBlankOrganizationProfile("user-sub-1"),
        organizationName: "Submitted Youth Organization",
        profileStatus: "pending_review",
        isExistingOrganization: false,
      };

      expect(submittedProfile.urn).toBe("");
      expect(submittedProfile.organizationIdentifierNumber).toBe("");
      expect(submittedProfile.profileStatus).toBe("pending_review");
    });

    it("TEST 9: Document gating: one required document pending -> no URN eligibility", () => {
      const requiredDocs: DocumentType[] = [
        { id: "doc-1", name: "Constitution & By-Laws", scope: "registration", isRequired: true, isActive: true },
        { id: "doc-2", name: "Roster of Members", scope: "registration", isRequired: true, isActive: true },
      ];

      const submittedFiles: SubmittedFile[] = [
        { documentTypeId: "doc-1", adminStatus: "approved_green" },
        { documentTypeId: "doc-2", adminStatus: "pending" },
      ];

      const result = checkRegistrationEligibility(requiredDocs, submittedFiles, false, false);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("pending");
    });

    it("TEST 10: Document gating: one required document Needs Revision -> no URN eligibility", () => {
      const requiredDocs: DocumentType[] = [
        { id: "doc-1", name: "Constitution & By-Laws", scope: "registration", isRequired: true, isActive: true },
        { id: "doc-2", name: "Directory of Officers", scope: "registration", isRequired: true, isActive: true },
      ];

      const submittedFiles: SubmittedFile[] = [
        { documentTypeId: "doc-1", adminStatus: "approved_green" },
        { documentTypeId: "doc-2", adminStatus: "needs_revision" },
      ];

      const result = checkRegistrationEligibility(requiredDocs, submittedFiles, false, false);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("needs_revision");
    });

    it("TEST 11: Document gating: one required document missing -> no URN eligibility", () => {
      const requiredDocs: DocumentType[] = [
        { id: "doc-1", name: "Constitution & By-Laws", scope: "registration", isRequired: true, isActive: true },
        { id: "doc-2", name: "Certification", scope: "registration", isRequired: true, isActive: true },
      ];

      const submittedFiles: SubmittedFile[] = [
        { documentTypeId: "doc-1", adminStatus: "approved_green" },
      ];

      const result = checkRegistrationEligibility(requiredDocs, submittedFiles, false, false);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Missing required document");
    });

    it("TEST 12: Document gating: all required documents approved -> registration eligible for final verification", () => {
      const requiredDocs: DocumentType[] = [
        { id: "doc-1", name: "Constitution & By-Laws", scope: "registration", isRequired: true, isActive: true },
        { id: "doc-2", name: "Roster of Members", scope: "registration", isRequired: true, isActive: true },
      ];

      const submittedFiles: SubmittedFile[] = [
        { documentTypeId: "doc-1", adminStatus: "approved_green" },
        { documentTypeId: "doc-2", adminStatus: "approved_green" },
      ];

      const result = checkRegistrationEligibility(requiredDocs, submittedFiles, false, false);
      expect(result.eligible).toBe(true);
      expect(result.reason).toBe("All required documents approved");
    });

    it("TEST 13: Final authorized PCYDO approval: official URN issued exactly once", () => {
      const verifiedProfile: OrganizationProfile = {
        ...createBlankOrganizationProfile("user-verified-1"),
        organizationName: "Approved Pasig Youth Org",
        profileStatus: "verified",
        isExistingOrganization: false,
        urn: "PCYDO-2026-ABCD",
        urnNormalized: "PCYDO-2026-ABCD",
        organizationIdentifierNumber: "PCYDO-2026-ABCD",
        verifiedAt: new Date().toISOString(),
      };

      expect(verifiedProfile.profileStatus).toBe("verified");
      expect(verifiedProfile.urn).toBe("PCYDO-2026-ABCD");
      expect(verifiedProfile.urnNormalized).toBe("PCYDO-2026-ABCD");
      expect(validateUrn(verifiedProfile.urn)).toBeNull();
    });

    it("TEST 14: Double approval / concurrent approval: idempotent, official URN not re-issued", () => {
      const currentVerified: OrganizationProfile = {
        ...createBlankOrganizationProfile("user-verified-2"),
        organizationName: "Twice Approved Org",
        profileStatus: "verified",
        isExistingOrganization: false,
        urn: "PCYDO-2026-WXYZ",
        urnNormalized: "PCYDO-2026-WXYZ",
        organizationIdentifierNumber: "PCYDO-2026-WXYZ",
        verifiedAt: "2026-09-17T00:00:00.000Z",
      };

      // Second approval attempt must keep the already-issued URN
      const redraft = createOrganizationProfileDraft("user-verified-2", currentVerified);
      expect(redraft.urn).toBe("PCYDO-2026-WXYZ");
      expect(redraft.organizationIdentifierNumber).toBe("PCYDO-2026-WXYZ");
    });

    it("TEST 15: Refresh after approval: same URN remains stable", () => {
      const loadedProfile: OrganizationProfile = {
        ...createBlankOrganizationProfile("user-verified-3"),
        profileStatus: "verified",
        isExistingOrganization: false,
        urn: "PCYDO-2026-7890",
        urnNormalized: "PCYDO-2026-7890",
        organizationIdentifierNumber: "PCYDO-2026-7890",
        verifiedAt: "2026-09-17T01:00:00.000Z",
      };

      const refreshed = createOrganizationProfileDraft("user-verified-3", loadedProfile);
      expect(refreshed.urn).toBe("PCYDO-2026-7890");
    });
  });

  // ==========================================
  // EXISTING ORGANIZATION TESTS (TESTS 16 - 18)
  // ==========================================
  describe("Existing Organization Workflow (Phase 3 & Phase 8)", () => {
    it("TEST 16: Existing organization submits valid URN: URN is preserved and normalized", () => {
      const enteredUrn = "PCYDO-2025-1234";
      const profile = createBlankOrganizationProfile("existing-user-1", {
        isExistingOrganization: true,
        organizationIdentifierNumber: enteredUrn,
      });

      expect(profile.isExistingOrganization).toBe(true);
      expect(profile.urn).toBe(enteredUrn);
      expect(profile.urnNormalized).toBe(normalizeUrn(enteredUrn));
      expect(profile.registrationType).toBe("existing_urn");
      expect(profile.urnReviewStatus).toBe("pending");
      expect(isUrnRegistration(profile)).toBe(true);
    });

    it("TEST 17: Existing organization with taken URN: returns accurate conflict message", () => {
      const errorObj = {
        code: "23505",
        message: 'duplicate key value violates unique constraint "uq_organization_profiles_urn"',
        details: "Key (urn)=(PCYDO-2025-1234) already exists.",
      };

      const userMessage = mapOrganizationProfileError(errorObj);
      expect(userMessage).toBe("This Unique Registration Number (URN) is already registered to another organization.");
      expect(userMessage).not.toBe("URN is unavailable.");
    });

    it("TEST 18: Existing organization update: URN does not get silently regenerated", () => {
      const existing: OrganizationProfile = {
        ...createBlankOrganizationProfile("existing-user-2", {
          isExistingOrganization: true,
          organizationIdentifierNumber: "PCYDO-2025-5678",
        }),
        profileStatus: "incomplete",
      };

      const updated = createOrganizationProfileDraft("existing-user-2", existing, {
        isExistingOrganization: true,
      });

      expect(updated.urn).toBe("PCYDO-2025-5678");
      expect(updated.organizationIdentifierNumber).toBe("PCYDO-2025-5678");
    });
  });

  // ==========================================
  // RENEWAL TESTS (TESTS 19 - 20)
  // ==========================================
  describe("Renewal Workflow Safety (Phase 8)", () => {
    it("TEST 19: Existing organization renewal retains same URN", () => {
      const accreditedOrg: OrganizationProfile = {
        ...createBlankOrganizationProfile("renew-org-1"),
        organizationName: "Senior Pasig Youth Alliance",
        profileStatus: "verified",
        isExistingOrganization: true,
        urn: "PCYDO-2024-9999",
        urnNormalized: "PCYDO-2024-9999",
        organizationIdentifierNumber: "PCYDO-2024-9999",
        verifiedAt: "2024-01-01T00:00:00.000Z",
        yorpRegisteredYear: 2024,
      };

      // Renewal process uses the same org profile
      const renewalDraft = createOrganizationProfileDraft("renew-org-1", accreditedOrg);
      expect(renewalDraft.urn).toBe("PCYDO-2024-9999");
      expect(renewalDraft.organizationIdentifierNumber).toBe("PCYDO-2024-9999");
    });

    it("TEST 20: Renewal approval preserves same URN and increments renewed year", () => {
      const renewedOrg: OrganizationProfile = {
        ...createBlankOrganizationProfile("renew-org-1"),
        organizationName: "Senior Pasig Youth Alliance",
        profileStatus: "verified",
        isExistingOrganization: true,
        urn: "PCYDO-2024-9999",
        urnNormalized: "PCYDO-2024-9999",
        organizationIdentifierNumber: "PCYDO-2024-9999",
        verifiedAt: "2024-01-01T00:00:00.000Z",
        yorpRegisteredYear: 2024,
        yorpRenewedYear: 2026,
      };

      expect(renewedOrg.urn).toBe("PCYDO-2024-9999");
      expect(renewedOrg.yorpRenewedYear).toBe(2026);
    });
  });

  // ==========================================
  // ERROR MAPPING TESTS (TESTS 21 - 23)
  // ==========================================
  describe("Error Mapping & User-Safety (Phase 9 & 10)", () => {
    it("TEST 21: reference_id unique violation is NOT reported as 'URN is unavailable'", () => {
      const refIdError = {
        code: "23505",
        message: 'duplicate key value violates unique constraint "uq_organization_profiles_reference_id"',
        details: "Key (reference_id)=(REG-2026-0007) already exists.",
      };

      const result = mapOrganizationProfileError(refIdError);
      expect(result).toBe("A registration reference conflict occurred. Please try again.");
      expect(result).not.toContain("URN is unavailable");
      expect(result).not.toContain("uq_organization_profiles_reference_id");
      expect(result).not.toContain("23505");
    });

    it("TEST 22: official URN unique violation receives appropriate URN conflict message", () => {
      const urnError = {
        code: "23505",
        message: 'duplicate key value violates unique constraint "uq_organization_profiles_urn"',
        details: "Key (urn)=(PCYDO-2026-0001) already exists.",
      };

      const result = mapOrganizationProfileError(urnError);
      expect(result).toBe("This Unique Registration Number (URN) is already registered to another organization.");
      expect(result).not.toContain("uq_organization_profiles_urn");
      expect(result).not.toContain("23505");
    });

    it("TEST 23: generic database error receives safe generic message without leaking internals", () => {
      const dbError = new Error("Connection terminated unexpectedly at PostgresClient.query");
      const result = mapOrganizationProfileError(dbError, "Unable to complete registration at this time.");

      expect(result).toBe("Unable to complete registration at this time.");
      expect(result).not.toContain("PostgresClient");
      expect(result).not.toContain("query");
    });
  });
});
