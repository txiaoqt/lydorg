import { describe, it, expect } from "vitest";
import {
  ALL_SEMESTERS_KEY,
  ALL_SEMESTERS_LABEL,
  buildYorpSemesterOptions,
  deriveSemesterFromDate,
  isOrganizationInSemester,
  normalizeSemesterLabel,
} from "./yorp-semester";
import type { OrganizationProfile, YPOPEntry, YPOPPeriod } from "./lydo-connect-data";

describe("YORP Semester Filtering & Utilities", () => {
  it("derives correct semester from 1st semester date", () => {
    const res = deriveSemesterFromDate("2026-03-15T10:00:00Z");
    expect(res).not.toBeNull();
    expect(res?.year).toBe(2026);
    expect(res?.semesterNumber).toBe(1);
    expect(res?.semesterKey).toBe("2026-1");
    expect(res?.semesterLabel).toBe("2026 1st Semester");
  });

  it("derives correct semester from 2nd semester date", () => {
    const res = deriveSemesterFromDate("2026-08-20T10:00:00Z");
    expect(res).not.toBeNull();
    expect(res?.year).toBe(2026);
    expect(res?.semesterNumber).toBe(2);
    expect(res?.semesterKey).toBe("2026-2");
    expect(res?.semesterLabel).toBe("2026 2nd Semester");
  });

  it("builds sorted dynamic semester options with All Semesters first", () => {
    const mockPeriods: YPOPPeriod[] = [
      {
        id: "p1",
        semesterKey: "2025-1",
        semesterLabel: "2025 1st Semester",
        status: "closed",
        validationDeadline: "2025-06-30T00:00:00Z",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      {
        id: "p2",
        semesterKey: "2026-2",
        semesterLabel: "2026 2nd Semester",
        status: "open",
        validationDeadline: "2026-12-31T00:00:00Z",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-01T00:00:00Z",
      },
    ];

    const options = buildYorpSemesterOptions(mockPeriods);
    expect(options[0].key).toBe(ALL_SEMESTERS_KEY);
    expect(options[0].label).toBe(ALL_SEMESTERS_LABEL);

    // Verify chronological descending order (2026-2, 2026-1, 2025-1)
    const keys = options.map((o) => o.key);
    expect(keys).toContain("2026-2");
    expect(keys).toContain("2026-1");
    expect(keys).toContain("2025-1");
    expect(keys.indexOf("2026-2")).toBeLessThan(keys.indexOf("2025-1"));
  });

  it("filters organization by semester correctly based on verifiedAt date", () => {
    const orgSem1: OrganizationProfile = {
      id: "org-1",
      referenceId: "REG-2026-001",
      userId: "u-1",
      organizationName: "Youth Org Alpha",
      organizationEmail: "alpha@test.com",
      contactNumber: "09170000000",
      district: "District I",
      barangay: "Bagong Ilog",
      isExistingOrganization: false,
      organizationIdentifierNumber: "06-26-001",
      registrationType: "new_organization",
      urn: "06-26-001",
      urnNormalized: "06-26-001",
      urnReviewStatus: "verified",
      urnAdminRemarks: "",
      urnReviewedBy: "admin-1",
      urnReviewedAt: "2026-02-10T00:00:00Z",
      verificationMethod: "documents",
      majorClassification: "Youth Organization",
      subClassification: "Community-Based",
      advocacies: [],
      adviserName: "Adviser A",
      representativeName: "Rep A",
      address: "Address 1",
      facebookPageUrl: "",
      profileStatus: "verified",
      verifiedAt: "2026-02-10T00:00:00Z",
      internalNotes: "",
      yorpRegisteredYear: 2026,
      yorpRenewedYear: null,
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-10T00:00:00Z",
    };

    const orgSem2: OrganizationProfile = {
      ...orgSem1,
      id: "org-2",
      organizationName: "Youth Org Beta",
      verifiedAt: "2026-09-15T00:00:00Z",
      createdAt: "2026-09-01T00:00:00Z",
    };

    const options = buildYorpSemesterOptions();

    // All Semesters returns true for both
    expect(isOrganizationInSemester(orgSem1, "all", options)).toBe(true);
    expect(isOrganizationInSemester(orgSem2, "all", options)).toBe(true);

    // 2026 1st Semester matches orgSem1 only
    expect(isOrganizationInSemester(orgSem1, "2026-1", options)).toBe(true);
    expect(isOrganizationInSemester(orgSem2, "2026-1", options)).toBe(false);

    // 2026 2nd Semester matches orgSem2 only
    expect(isOrganizationInSemester(orgSem1, "2026-2", options)).toBe(false);
    expect(isOrganizationInSemester(orgSem2, "2026-2", options)).toBe(true);
  });

  it("filters organization based on YPOP entry semester linkage", () => {
    const orgWithYpop: OrganizationProfile = {
      id: "org-3",
      referenceId: "REG-2025-001",
      userId: "u-3",
      organizationName: "Youth Org Gamma",
      organizationEmail: "gamma@test.com",
      contactNumber: "09170000000",
      district: "District II",
      barangay: "Rosario",
      isExistingOrganization: false,
      organizationIdentifierNumber: "17-25-001",
      registrationType: "new_organization",
      urn: "17-25-001",
      urnNormalized: "17-25-001",
      urnReviewStatus: "verified",
      urnAdminRemarks: "",
      urnReviewedBy: "admin-1",
      urnReviewedAt: "2025-03-01T00:00:00Z",
      verificationMethod: "documents",
      majorClassification: "Youth Organization",
      subClassification: "Community-Based",
      advocacies: [],
      adviserName: "",
      representativeName: "",
      address: "",
      facebookPageUrl: "",
      profileStatus: "verified",
      verifiedAt: "2025-03-01T00:00:00Z",
      internalNotes: "",
      yorpRegisteredYear: 2025,
      yorpRenewedYear: null,
      createdAt: "2025-03-01T00:00:00Z",
      updatedAt: "2025-03-01T00:00:00Z",
    };

    const ypopEntries: YPOPEntry[] = [
      {
        id: "entry-1",
        organizationId: "org-3",
        submittedBy: "u-3",
        semester: "2026-1",
        semesterLabel: "2026 1st Semester",
        pointsEarned: 100,
        pointsRequired: 70,
        totalPoints: 100,
        status: "qualified",
        adminRemarks: "",
        submissionNote: "",
        validationDeadline: "2026-06-30T00:00:00Z",
        submittedAt: "2026-04-01T00:00:00Z",
        validatedAt: "2026-04-05T00:00:00Z",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-05T00:00:00Z",
      },
    ];

    const options = buildYorpSemesterOptions();

    // Matches 2026 1st Semester via YPOP entry
    expect(isOrganizationInSemester(orgWithYpop, "2026-1", options, ypopEntries)).toBe(true);
    // Does NOT match 2026 2nd Semester
    expect(isOrganizationInSemester(orgWithYpop, "2026-2", options, ypopEntries)).toBe(false);
  });
});
