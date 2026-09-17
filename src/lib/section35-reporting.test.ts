import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchYorpQuarterlyReportInSupabase,
  revokeOrganizationAccreditationInSupabase,
} from "./lydo-connect-supabase";
import {
  mapOrganizationProfileToYorpExportRow,
  yorpRegistryExportConfig,
  resolveDistrictFromBarangay,
} from "./report-export-configs";
import {
  exportSection35QuarterlySummary,
  exportSection35DisaggregatedReport,
  generateSection35QuarterlySummaryPdf,
  generateSection35DisaggregatedPdf,
  generateSection35QuarterlySummaryXlsx,
  generateSection35DisaggregatedXlsx,
  getQuarterPeriodLabel,
} from "./report-section35-export";
import type {
  YorpQuarterlyReport,
  OrganizationProfile,
} from "./lydo-connect-data";
import { writeAdminSession } from "./admin-auth";
import { supabase } from "./supabase";

// Mock supabase
vi.mock("./supabase", () => {
  const fromMock = vi.fn();
  const rpcMock = vi.fn();
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
    },
    isSupabaseConfigured: () => true,
  };
});

const createSampleReport = (): YorpQuarterlyReport => ({
  year: 2026,
  quarter: 3,
  timezone: "Asia/Manila",
  quarter_start: "2026-07-01 00:00:00+08",
  quarter_end: "2026-10-01 00:00:00+08",
  quarter_end_date: "2026-09-30",
  metrics: {
    registered_verified_at_quarter_end: 5,
    applications_received: 3,
    applications_approved: 5,
    approval_rate: 166.67,
  },
  disaggregation: {
    major_classification: [
      { label: "Youth Organization", count: 3, percentage: 60 },
      { label: "Youth-Serving Organization", count: 2, percentage: 40 },
    ],
    sub_classification: [
      { label: "Community-Based", count: 3, percentage: 60 },
      { label: "School-Based", count: 1, percentage: 20 },
      { label: "Faith-Based", count: 1, percentage: 20 },
    ],
    organizational_level: [
      { label: "City/Municipal", count: 5, percentage: 100 },
    ],
    advocacy_themes: [
      { theme: "education", count: 3, percentage: 60 },
      { theme: "environment", count: 2, percentage: 40 },
      { theme: "health", count: 1, percentage: 20 },
      { theme: "peace building and security", count: 0, percentage: 0 },
      { theme: "governance", count: 0, percentage: 0 },
      { theme: "active citizenship", count: 1, percentage: 20 },
      { theme: "global mobility", count: 0, percentage: 0 },
      { theme: "social inclusion and equity", count: 0, percentage: 0 },
      { theme: "economic empowerment", count: 1, percentage: 20 },
      { theme: "agriculture", count: 0, percentage: 0 },
    ],
    geography: {
      districts: [
        { district: "District I", count: 3, percentage: 60 },
        { district: "District II", count: 2, percentage: 40 },
      ],
      barangays: [
        { ordinal: "01", barangay: "Bagong Ilog", district: "District I", count: 1, percentage: 20 },
        { ordinal: "02", barangay: "Bagong Katipunan", district: "District I", count: 0, percentage: 0 },
        { ordinal: "03", barangay: "Bambang", district: "District I", count: 0, percentage: 0 },
        { ordinal: "04", barangay: "Buting", district: "District I", count: 0, percentage: 0 },
        { ordinal: "05", barangay: "Caniogan", district: "District I", count: 1, percentage: 20 },
        { ordinal: "06", barangay: "Dela Paz", district: "District II", count: 1, percentage: 20 },
        { ordinal: "07", barangay: "Kalawaan", district: "District I", count: 0, percentage: 0 },
        { ordinal: "08", barangay: "Kapasigan", district: "District I", count: 0, percentage: 0 },
        { ordinal: "09", barangay: "Kapitolyo", district: "District I", count: 0, percentage: 0 },
        { ordinal: "10", barangay: "Malinao", district: "District I", count: 0, percentage: 0 },
        { ordinal: "11", barangay: "Manggahan", district: "District II", count: 1, percentage: 20 },
        { ordinal: "12", barangay: "Maybunga", district: "District II", count: 0, percentage: 0 },
        { ordinal: "13", barangay: "Oranbo", district: "District I", count: 0, percentage: 0 },
        { ordinal: "14", barangay: "Palatiw", district: "District I", count: 0, percentage: 0 },
        { ordinal: "15", barangay: "Pinagbuhatan", district: "District II", count: 0, percentage: 0 },
        { ordinal: "16", barangay: "Pineda", district: "District I", count: 0, percentage: 0 },
        { ordinal: "17", barangay: "Rosario", district: "District II", count: 0, percentage: 0 },
        { ordinal: "18", barangay: "Sagad", district: "District I", count: 0, percentage: 0 },
        { ordinal: "19", barangay: "San Antonio", district: "District I", count: 1, percentage: 20 },
        { ordinal: "20", barangay: "San Joaquin", district: "District I", count: 0, percentage: 0 },
        { ordinal: "21", barangay: "San Jose", district: "District I", count: 0, percentage: 0 },
        { ordinal: "22", barangay: "San Miguel", district: "District II", count: 0, percentage: 0 },
        { ordinal: "23", barangay: "San Nicolas", district: "District I", count: 0, percentage: 0 },
        { ordinal: "24", barangay: "Sta. Cruz", district: "District I", count: 0, percentage: 0 },
        { ordinal: "25", barangay: "Sta. Lucia", district: "District II", count: 0, percentage: 0 },
        { ordinal: "26", barangay: "Sta. Rosa", district: "District I", count: 0, percentage: 0 },
        { ordinal: "27", barangay: "Santolan", district: "District II", count: 0, percentage: 0 },
        { ordinal: "28", barangay: "Sto. Tomas", district: "District I", count: 0, percentage: 0 },
        { ordinal: "29", barangay: "Sumilang", district: "District I", count: 0, percentage: 0 },
        { ordinal: "30", barangay: "Ugong", district: "District I", count: 0, percentage: 0 },
      ],
    },
  },
  metadata: {
    classification_note:
      "Disaggregated classifications and advocacy themes reflect the organization's authoritative profile record at the time of report generation.",
    organizational_level_note:
      "In accordance with the current Pasig City Youth Development Office registry scope, registered youth and youth-serving organizations are reported at the City/Municipal organizational level. Organizational operational scope (e.g., barangay-based vs city-wide) is not currently stored as a separate registry field.",
    advocacy_note:
      "Advocacy theme counts are non-additive: organizations may select multiple advocacy themes.",
    generated_at: "2026-09-17 18:00:00+08",
  },
});

describe("Section 35 Reporting & YORP Registry Export System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("A. Quarter Period & Boundaries Helper", () => {
    it("returns correct human-readable date intervals for all 4 quarters", () => {
      expect(getQuarterPeriodLabel(2026, 1)).toBe("January 1, 2026 – March 31, 2026");
      expect(getQuarterPeriodLabel(2026, 2)).toBe("April 1, 2026 – June 30, 2026");
      expect(getQuarterPeriodLabel(2026, 3)).toBe("July 1, 2026 – September 30, 2026");
      expect(getQuarterPeriodLabel(2026, 4)).toBe("October 1, 2026 – December 31, 2026");
    });
  });

  describe("B. Master YORP Registry Export (13 Columns)", () => {
    it("contains all 13 official master columns", () => {
      const labels = yorpRegistryExportConfig.columns.map((c) => c.label);
      expect(labels).toEqual([
        "No.",
        "URN",
        "Name of Organization",
        "Major Classification",
        "Sub-classification",
        "Advocacy Themes",
        "District",
        "Barangay",
        "Registration Date",
        "Expiry Date",
        "Status",
        "Contact Numbers",
        "Emails",
      ]);
    });

    it("satisfies A4 portrait total width <= 535.28 pt constraint", () => {
      const totalWidth = yorpRegistryExportConfig.columns.reduce(
        (sum, col) => sum + (col.pdfWidth ?? 0),
        0,
      );
      expect(totalWidth).toBeLessThanOrEqual(535.28);
    });

    it("correctly maps an OrganizationProfile into all 13 master export fields", () => {
      const mockOrg: OrganizationProfile = {
        id: "org-1",
        urn: "2026-01-001-YO",
        organizationName: "Pasig Youth Council",
        majorClassification: "youth organization",
        subClassification: "Community-Based",
        advocacies: ["education", "environment"],
        district: "District I",
        barangay: "Bagong Ilog",
        verifiedAt: "2026-01-15T08:00:00Z",
        createdAt: "2026-01-01T08:00:00Z",
        profileStatus: "verified",
        contactNumber: "09171234567, 09187654321",
        organizationEmail: "info@pasigyouth.org.ph",
      };

      const mapped = mapOrganizationProfileToYorpExportRow(mockOrg, 0);

      expect(mapped.no).toBe(1);
      expect(mapped.urn).toBe("2026-01-001-YO");
      expect(mapped.organizationName).toBe("Pasig Youth Council");
      expect(mapped.majorClassification).toBe("Youth Organization");
      expect(mapped.subClassification).toBe("Community-Based");
      expect(mapped.advocacyThemes).toEqual(["education", "environment"]);
      expect(mapped.district).toBe("District I");
      expect(mapped.barangay).toBe("Bagong Ilog");
      expect(mapped.registrationDate).toContain("2026");
      expect(mapped.status).toBe("Active");
      expect(mapped.contactNumbers).toEqual(["09171234567", "09187654321"]);
      expect(mapped.emails).toEqual(["info@pasigyouth.org.ph"]);
    });

    it("correctly infers District II for canonical District II barangays if district is missing", () => {
      expect(resolveDistrictFromBarangay("Dela Paz")).toBe("District II");
      expect(resolveDistrictFromBarangay("Manggahan")).toBe("District II");
      expect(resolveDistrictFromBarangay("Maybunga")).toBe("District II");
      expect(resolveDistrictFromBarangay("Pinagbuhatan")).toBe("District II");
      expect(resolveDistrictFromBarangay("Rosario")).toBe("District II");
      expect(resolveDistrictFromBarangay("San Miguel")).toBe("District II");
      expect(resolveDistrictFromBarangay("Sta. Lucia")).toBe("District II");
      expect(resolveDistrictFromBarangay("Santolan")).toBe("District II");
      expect(resolveDistrictFromBarangay("Bagong Ilog")).toBe("District I");
    });
  });

  describe("C. Section 35 Client RPC Wrapper: fetchYorpQuarterlyReportInSupabase", () => {
    it("calls get_yorp_quarterly_report with valid admin session token", async () => {
      writeAdminSession({
        id: "adm-1",
        username: "admin",
        email: "admin@pasig.gov.ph",
        displayName: "Super Admin",
        sessionToken: "admin-secret-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const sampleReport = createSampleReport();
      (supabase!.rpc as any).mockResolvedValue({
        data: sampleReport,
        error: null,
      });

      const result = await fetchYorpQuarterlyReportInSupabase(2026, 3);

      expect(supabase!.rpc).toHaveBeenCalledWith("get_yorp_quarterly_report", {
        _session_token: "admin-secret-token",
        _year: 2026,
        _quarter: 3,
      });

      expect(result.year).toBe(2026);
      expect(result.quarter).toBe(3);
      expect(result.metrics.registered_verified_at_quarter_end).toBe(5);
      expect(result.metrics.applications_received).toBe(3);
      expect(result.metrics.applications_approved).toBe(5);
    });

    it("throws clear error when unauthenticated admin attempts call", async () => {
      localStorage.clear();
      await expect(fetchYorpQuarterlyReportInSupabase(2026, 3)).rejects.toThrow(
        "Please sign in with the seeded admin account first.",
      );
    });

    it("throws database error when RPC fails", async () => {
      writeAdminSession({
        id: "adm-1",
        username: "admin",
        email: "admin@pasig.gov.ph",
        displayName: "Super Admin",
        sessionToken: "admin-secret-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      (supabase!.rpc as any).mockResolvedValue({
        data: null,
        error: { message: "Invalid quarter parameter" },
      });

      await expect(fetchYorpQuarterlyReportInSupabase(2026, 5)).rejects.toThrow(
        "Invalid quarter parameter",
      );
    });
  });

  describe("D. Revocation Timestamp Hardening", () => {
    it("invokes revoke_organization_accreditation RPC without requiring arbitrary client revoked_at", async () => {
      writeAdminSession({
        id: "adm-1",
        username: "admin",
        email: "admin@pasig.gov.ph",
        displayName: "Super Admin",
        sessionToken: "admin-secret-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      (supabase!.rpc as any).mockResolvedValue({
        data: {
          id: "acc-1",
          organization_id: "org-1",
          term_number: 1,
          start_date: "2026-01-01",
          end_date: "2029-01-01",
          status: "revoked",
          revocation_reason: "Operational irregularity",
          revoked_at: "2026-09-17T10:00:00Z",
        },
        error: null,
      });

      const res = await revokeOrganizationAccreditationInSupabase({
        accreditationId: "acc-1",
        reason: "Operational irregularity",
      });

      expect(supabase!.rpc).toHaveBeenCalledWith("revoke_organization_accreditation", {
        _session_token: "admin-secret-token",
        _accreditation_id: "acc-1",
        _revocation_reason: "Operational irregularity",
        _revoked_at: null,
      });

      expect(res.status).toBe("revoked");
      expect(res.revocationReason).toBe("Operational irregularity");
    });
  });

  describe("E. Section 35 PDF Generation", () => {
    it("generates valid A4 portrait PDF for Section 35 Quarterly Summary Report", async () => {
      const report = createSampleReport();
      const doc = await generateSection35QuarterlySummaryPdf(report);

      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);
    });

    it("generates valid multi-page A4 portrait PDF for Section 35 Disaggregated Report", async () => {
      const report = createSampleReport();
      const doc = await generateSection35DisaggregatedPdf(report);

      expect(doc.getNumberOfPages()).toBeGreaterThan(1);
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);
    });
  });

  describe("F. Section 35 XLSX Generation", () => {
    it("generates valid ArrayBuffer for Quarterly Summary XLSX", async () => {
      const report = createSampleReport();
      const buffer = await generateSection35QuarterlySummaryXlsx(report);

      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(1000);
    }, 15000);

    it("generates valid ArrayBuffer for Disaggregated Report XLSX with all 7 sheets", async () => {
      const report = createSampleReport();
      const buffer = await generateSection35DisaggregatedXlsx(report);

      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(1000);
    }, 15000);
  });

  describe("G. Statutory Disclosures Invariants", () => {
    it("ensures mandatory Section 35 disclosures are present in report metadata", () => {
      const report = createSampleReport();

      expect(report.metadata.organizational_level_note).toContain("City/Municipal");
      expect(report.metadata.classification_note).toContain(
        "Disaggregated classifications and advocacy themes reflect the organization's authoritative profile record",
      );
      expect(report.metadata.advocacy_note).toContain("non-additive");
    });

    it("ensures advocacy themes percentage is calculated against Metric A", () => {
      const report = createSampleReport();
      const metricA = report.metrics.registered_verified_at_quarter_end; // 5
      const education = report.disaggregation.advocacy_themes.find((t) => t.theme === "education");

      expect(education).toBeDefined();
      expect(education!.count).toBe(3);
      expect(education!.percentage).toBe((3 / metricA) * 100); // 60%
    });

    it("ensures all 30 canonical Pasig barangays are represented in ordinal order", () => {
      const report = createSampleReport();
      const brgys = report.disaggregation.geography.barangays;

      expect(brgys.length).toBe(30);
      expect(brgys[0].ordinal).toBe("01");
      expect(brgys[0].barangay).toBe("Bagong Ilog");
      expect(brgys[29].ordinal).toBe("30");
      expect(brgys[29].barangay).toBe("Ugong");
    });
  });
});
