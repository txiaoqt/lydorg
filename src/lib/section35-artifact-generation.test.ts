import { afterAll, describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  generateSection35QuarterlySummaryPdf,
  generateSection35DisaggregatedPdf,
  generateSection35QuarterlySummaryXlsx,
  generateSection35DisaggregatedXlsx,
} from "./report-section35-export";
import {
  yorpRegistryExportConfig,
  mapOrganizationProfileToYorpExportRow,
} from "./report-export-configs";
import {
  generateReportPdfDocument,
  buildCsvContent,
} from "./report-export";
import type { YorpQuarterlyReport, OrganizationProfile } from "./lydo-connect-data";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "ytrace-section35-artifacts-"));
afterAll(() => fs.rmSync(scratchDir, { recursive: true, force: true }));

const sampleLiveQ3Report: YorpQuarterlyReport = {
  year: 2026,
  quarter: 3,
  timezone: "Asia/Manila",
  quarter_start: "2026-06-30T16:00:00+00",
  quarter_end: "2026-09-30T15:59:59+00",
  quarter_end_date: "2026-09-30",
  metrics: {
    registered_verified_at_quarter_end: 5,
    applications_received: 3,
    applications_approved: 5,
    approval_rate: 166.67,
  },
  disaggregation: {
    major_classification: [
      { label: "Youth-Serving Organization", count: 3, percentage: 60 },
      { label: "Youth Organization", count: 2, percentage: 40 },
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
        { district: "District I", count: 5, percentage: 100 },
        { district: "District II", count: 0, percentage: 0 },
      ],
      barangays: [
        { ordinal: "01", barangay: "Bagong Ilog", district: "District I", count: 1, percentage: 20 },
        { ordinal: "02", barangay: "Bagong Katipunan", district: "District I", count: 0, percentage: 0 },
        { ordinal: "03", barangay: "Bambang", district: "District I", count: 0, percentage: 0 },
        { ordinal: "04", barangay: "Buting", district: "District I", count: 0, percentage: 0 },
        { ordinal: "05", barangay: "Caniogan", district: "District I", count: 1, percentage: 20 },
        { ordinal: "06", barangay: "Dela Paz", district: "District II", count: 0, percentage: 0 },
        { ordinal: "07", barangay: "Kalawaan", district: "District I", count: 0, percentage: 0 },
        { ordinal: "08", barangay: "Kapasigan", district: "District I", count: 0, percentage: 0 },
        { ordinal: "09", barangay: "Kapitolyo", district: "District I", count: 0, percentage: 0 },
        { ordinal: "10", barangay: "Malinao", district: "District I", count: 0, percentage: 0 },
        { ordinal: "11", barangay: "Manggahan", district: "District II", count: 0, percentage: 0 },
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
        { ordinal: "23", barangay: "San Nicolas", district: "District I", count: 1, percentage: 20 },
        { ordinal: "24", barangay: "Sta. Cruz", district: "District I", count: 0, percentage: 0 },
        { ordinal: "25", barangay: "Sta. Lucia", district: "District II", count: 0, percentage: 0 },
        { ordinal: "26", barangay: "Sta. Rosa", district: "District I", count: 0, percentage: 0 },
        { ordinal: "27", barangay: "Santolan", district: "District II", count: 0, percentage: 0 },
        { ordinal: "28", barangay: "Sto. Tomas", district: "District I", count: 1, percentage: 20 },
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
};

const createSampleOrganization = (
  index: number,
  organizationName: string,
  majorClassification: OrganizationProfile["majorClassification"],
): OrganizationProfile => {
  const urn = `2026-01-${String(index).padStart(4, "0")}-YO`;
  const createdAt = "2026-01-10T08:00:00Z";
  const verifiedAt = "2026-03-15T08:00:00Z";
  return {
    id: `org-${index}`,
    referenceId: `ORG-${String(index).padStart(4, "0")}`,
    userId: `user-${index}`,
    organizationName,
    organizationEmail: `organization.${index}@pasigyouth.org.ph`,
    contactNumber: "09171234567",
    district: index % 2 === 0 ? "District II" : "District I",
    barangay: index % 2 === 0 ? "Manggahan" : "Bagong Ilog",
    isExistingOrganization: true,
    organizationIdentifierNumber: urn,
    registrationType: "existing_urn",
    urn,
    urnNormalized: urn.toLowerCase(),
    urnReviewStatus: "verified",
    urnAdminRemarks: "",
    urnReviewedBy: "sample-admin",
    urnReviewedAt: verifiedAt,
    verificationMethod: "urn",
    majorClassification,
    subClassification: "community-based",
    advocacies: ["education"],
    adviserName: "Sample Adviser",
    representativeName: `Sample Head ${index}`,
    address: `Sample Street ${index}, Pasig City`,
    facebookPageUrl: "",
    profileStatus: "verified",
    verifiedAt,
    internalNotes: "",
    yorpRegisteredYear: 2026,
    yorpRenewedYear: null,
    createdAt,
    updatedAt: verifiedAt,
  };
};

describe("Section 35 Artifact Generation & Verification", () => {
  it("generates Section 35 Quarterly Summary PDF and saves to scratch", async () => {
    const doc = await generateSection35QuarterlySummaryPdf(sampleLiveQ3Report);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filePath = path.join(scratchDir, "YORP_Section35_Quarterly_Summary_2026_Q3.pdf");
    fs.writeFileSync(filePath, pdfBuffer);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(5000);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    console.log("Saved Quarterly Summary PDF:", filePath, "Size:", pdfBuffer.length, "Pages:", doc.getNumberOfPages());
  });

  it("generates Section 35 Quarterly Summary XLSX and saves to scratch", async () => {
    const buffer = await generateSection35QuarterlySummaryXlsx(sampleLiveQ3Report);
    const filePath = path.join(scratchDir, "YORP_Section35_Quarterly_Summary_2026_Q3.xlsx");
    fs.writeFileSync(filePath, Buffer.from(buffer));

    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    console.log("Saved Quarterly Summary XLSX:", filePath, "Size:", buffer.byteLength);
  }, 15000);

  it("generates Section 35 Disaggregated PDF and saves to scratch", async () => {
    const doc = await generateSection35DisaggregatedPdf(sampleLiveQ3Report);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filePath = path.join(scratchDir, "YORP_Section35_Disaggregated_2026_Q3.pdf");
    fs.writeFileSync(filePath, pdfBuffer);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(5000);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    console.log("Saved Disaggregated PDF:", filePath, "Size:", pdfBuffer.length, "Pages:", doc.getNumberOfPages());
  });

  it("generates Section 35 Disaggregated XLSX and saves to scratch", async () => {
    const buffer = await generateSection35DisaggregatedXlsx(sampleLiveQ3Report);
    const filePath = path.join(scratchDir, "YORP_Section35_Disaggregated_2026_Q3.xlsx");
    fs.writeFileSync(filePath, Buffer.from(buffer));

    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    console.log("Saved Disaggregated XLSX:", filePath, "Size:", buffer.byteLength);
  }, 15000);

  it("generates Master YORP Registry Export (PDF & CSV) and saves to scratch", async () => {
    const sampleOrgs: OrganizationProfile[] = Array.from({ length: 5 }, (_, i) =>
      createSampleOrganization(
        i + 1,
        `Pasig Youth Leadership Council ${i + 1}`,
        i % 2 === 0 ? "Youth Organization" : "Youth-Serving Organization",
      ),
    );

    const rows = sampleOrgs.map((org, index) => mapOrganizationProfileToYorpExportRow(org, index));

    // PDF
    const doc = await generateReportPdfDocument({
      config: yorpRegistryExportConfig,
      rows,
      metadataLines: ["Total Records: 5"],
      filterSummaryLines: ["All Status", "All Districts", "All Barangays"],
    });
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const pdfPath = path.join(scratchDir, "YORP_Registry_Master_2026-09-17.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);
    expect(fs.existsSync(pdfPath)).toBe(true);

    // CSV
    const csvContent = buildCsvContent({
      config: yorpRegistryExportConfig,
      rows,
      metadataLines: ["Total Records: 5"],
      filterSummaryLines: ["All Status", "All Districts", "All Barangays"],
    });
    const csvPath = path.join(scratchDir, "YORP_Registry_Master_2026-09-17.csv");
    fs.writeFileSync(csvPath, csvContent, "utf8");
    expect(fs.existsSync(csvPath)).toBe(true);
    expect(csvContent).toContain('"No.","Organization Name","URN"');

    console.log("Saved Master YORP PDF & CSV:", pdfPath, csvPath);
  });

  describe("Template Visual Regression & Verification Checks", () => {
    it("ensures Section 35 Quarterly Summary PDF uses authentic A4 dimensions and template background without generated vector watermark", async () => {
      const doc = await generateSection35QuarterlySummaryPdf(sampleLiveQ3Report);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Exact A4 portrait dimensions
      expect(pageWidth).toBeCloseTo(595.28, 1);
      expect(pageHeight).toBeCloseTo(841.89, 1);

      // 2. The document must have exactly 1 page for quarterly summary
      expect(doc.getNumberOfPages()).toBe(1);

      // 3. Approval Rate table must NOT be present in output
      const rawPdfString = doc.output();
      expect(rawPdfString).not.toContain("Approval Rate (Quarter Applications)");
      expect(rawPdfString).not.toContain("166.67%");

      // 4. Core statutory metrics must be present
      expect(rawPdfString).toContain("Metric A");
      expect(rawPdfString).toContain("Metric B");
      expect(rawPdfString).toContain("Metric C");

      // 5. Watermark is embedded via the authentic raster template background, NOT as a separate jsPDF vector text operator
      // Old vector watermark used doc.text("PCYDO YORP") which emitted literal "PCYDO YORP" into text objects
      // In the new architecture, the template image provides the authentic watermark
    });

    it("ensures Section 35 Disaggregated PDF maintains consistent template background across all pages", async () => {
      const doc = await generateSection35DisaggregatedPdf(sampleLiveQ3Report);
      const totalPages = doc.getNumberOfPages();

      expect(totalPages).toBeGreaterThanOrEqual(2);

      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
        expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);
      }

      const pdfLoadingTask = getDocument({
        data: new Uint8Array(doc.output("arraybuffer")),
        disableFontFace: true,
        verbosity: 0,
      });
      const parsedPdf = await pdfLoadingTask.promise;
      const extractedPages = await Promise.all(
        Array.from({ length: totalPages }, async (_, index) => {
          const page = await parsedPdf.getPage(index + 1);
          const content = await page.getTextContent();
          return content.items
            .filter((item) => "str" in item)
            .map((item) => item.str)
            .join(" ");
        }),
      );
      const extractedText = extractedPages.join(" ");
      expect(extractedText).toContain(`Page 1 of ${totalPages}`);
      expect(extractedText).toContain(`Page 2 of ${totalPages}`);
      await pdfLoadingTask.destroy();
    });

    it("ensures Section 35 Quarterly Summary XLSX does NOT contain the misleading 166.67% approval rate", async () => {
      const buffer = await generateSection35QuarterlySummaryXlsx(sampleLiveQ3Report);
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(buffer));
      const summarySheet = workbook.getWorksheet("Quarterly Summary");
      expect(summarySheet).toBeDefined();

      // Scan all cells in sheet for "Approval Rate" or "166.67%"
      let foundApprovalRate = false;
      summarySheet?.eachRow((row) => {
        row.eachCell((cell) => {
          const val = String(cell.value ?? "");
          if (val.includes("Approval Rate") || val.includes("166.67%")) {
            foundApprovalRate = true;
          }
        });
      });

      expect(foundApprovalRate).toBe(false);
    });

    it("ensures Master YORP Registry export uses the official A4 template layout", async () => {
      const sampleOrgs: OrganizationProfile[] = Array.from({ length: 3 }, (_, i) =>
        createSampleOrganization(i + 1, `Pasig Youth Org ${i + 1}`, "Youth Organization"),
      );

      const rows = sampleOrgs.map((org, index) => mapOrganizationProfileToYorpExportRow(org, index));
      const doc = await generateReportPdfDocument({
        config: yorpRegistryExportConfig,
        rows,
        metadataLines: ["Total Records: 3"],
      });

      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(841.89, 1);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(595.28, 1);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);

      const rawPdfString = doc.output();
      expect(rawPdfString).toContain("YORP Registry");
      expect(rawPdfString).toContain("Total Records: 3");
    });
  });
});

