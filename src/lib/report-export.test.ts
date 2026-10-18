import { describe, expect, it } from "vitest";
import {
  allocationByBarangayExportConfig,
  buildAllocationTotalsRow,
  buildBudgetMonitoringTotalsRow,
  buildBudgetRequestTotalsRow,
  budgetMonitoringExportConfig,
  budgetRequestExportConfig,
  yorpRegistryExportConfig,
} from "@/lib/report-export-configs";
import {
  buildCsvContent,
  formatDateDisplay,
  getExcelColumnLetter,
  generateReportPdfDocument,
  type ReportExportConfig,
} from "@/lib/report-export";

type CsvRow = {
  name: string;
  contacts: string[];
  amount: number;
};

const csvTestConfig: ReportExportConfig<CsvRow> = {
  title: "CSV Test",
  filenamePrefix: "csv-test",
  columns: [
    { label: "Name", value: (row) => row.name },
    {
      label: "Contact Numbers",
      value: (row) => row.contacts,
      preserveSpreadsheetText: true,
    },
    {
      label: "Approved Amount",
      value: (row) => row.amount,
      csvValue: (row) => row.amount.toFixed(2),
    },
  ],
};

describe("buildCsvContent", () => {
  it("adds a BOM, escapes quotes, and appends totals", () => {
    const csv = buildCsvContent({
      config: csvTestConfig,
      rows: [
        {
          name: 'Alpha "Youth", Org',
          contacts: ["09123456789", "09987654321"],
          amount: 125000,
        },
      ],
      totalsRow: ["TOTAL", "", "125000.00"],
    });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Alpha ""Youth"", Org"');
    expect(csv).toContain('"09123456789; 09987654321"');
    expect(csv).toContain('"TOTAL","","125000.00"');
  });

  it("neutralizes dangerous leading spreadsheet formulas", () => {
    const csv = buildCsvContent({
      config: csvTestConfig,
      rows: [
        {
          name: '=HYPERLINK("https://example.com")',
          contacts: ["+639123456789"],
          amount: 10,
        },
      ],
    });

    expect(csv).toContain("\"'=HYPERLINK(\"\"https://example.com\"\")\"");
    expect(csv).toContain("\"'+639123456789\"");
  });
});

describe("getExcelColumnLetter", () => {
  it("returns the correct letter for single and multi-letter columns", () => {
    expect(getExcelColumnLetter(1)).toBe("A");
    expect(getExcelColumnLetter(6)).toBe("F");
    expect(getExcelColumnLetter(26)).toBe("Z");
    expect(getExcelColumnLetter(27)).toBe("AA");
  });
});

describe("formatDateDisplay", () => {
  it("formats valid dates and hides invalid values", () => {
    expect(formatDateDisplay("2026-06-14T08:14:00.000Z")).toBe("Jun 14, 2026");
    expect(formatDateDisplay("")).toBe("");
    expect(formatDateDisplay("not-a-date")).toBe("");
  });
});

describe("budget request export config", () => {
  it("uses the required CSV columns and released date format", () => {
    const csv = buildCsvContent({
      config: budgetRequestExportConfig,
      rows: [
        {
          requestId: "BR-2026-001",
          organizationName: "Alpha Youth Council",
          activity: "Leadership Training",
          requestedAmount: 18000,
          approvedAmount: 15000,
          releasedAmount: 12300,
          releasedDate: "2026-06-14T08:14:00.000Z",
          status: "Budget Released",
        },
      ],
    });

    expect(csv).toContain(
      '"No.","Request ID","Organization","Activity","Requested Amount","Approved Amount","Released Amount","Released Date","Status"',
    );
    expect(csv).toContain('"1","BR-2026-001","Alpha Youth Council","Leadership Training","18000.00","15000.00","12300.00","Jun 14, 2026","Budget Released"');
  });

  it("builds the expected totals row shape", () => {
    expect(
      buildBudgetRequestTotalsRow([
        {
          requestId: "BR-2026-001",
          organizationName: "Alpha Youth Council",
          activity: "Leadership Training",
          requestedAmount: 18000,
          approvedAmount: 15000,
          releasedAmount: 12300,
          releasedDate: "2026-06-14T08:14:00.000Z",
          status: "Budget Released",
        },
      ]),
    ).toEqual(["", "TOTAL", "", "", "18000.00", "15000.00", "12300.00", "", ""]);
  });
});

describe("allocation by barangay export config", () => {
  it("uses semicolon-separated organization names in CSV", () => {
    const csv = buildCsvContent({
      config: allocationByBarangayExportConfig,
      rows: [
        {
          district: "District 1",
          barangay: "Bagong Ilog",
          organizationCount: 2,
          organizationNames: ["Organization Alpha", "Organization Beta"],
          approvedAmount: 15000,
          releasedAmount: 15300,
        },
      ],
    });

    expect(csv).toContain(
      '"No.","District","Barangay","No. of Organizations","Organization","Approved Total Amount","Released Total Amount"',
    );
    expect(csv).toContain(
      '"1","District 1","Bagong Ilog","2","Organization Alpha; Organization Beta","15000.00","15300.00"',
    );
  });

  it("builds the expected totals row shape", () => {
    expect(
      buildAllocationTotalsRow([
        {
          district: "District 1",
          barangay: "Bagong Ilog",
          organizationCount: 2,
          organizationNames: ["Organization Alpha", "Organization Beta"],
          approvedAmount: 15000,
          releasedAmount: 15300,
        },
      ]),
    ).toEqual(["", "", "TOTAL", 2, "", "15000.00", "15300.00"]);
  });
});

describe("budget monitoring export config", () => {
  it("uses the required monitoring CSV columns and formats numbers correctly", () => {
    const csv = buildCsvContent({
      config: budgetMonitoringExportConfig,
      rows: [
        {
          organizationName: "Youth Leaders Org",
          recordCode: "BR-2026-001",
          activity: "Summer Leadership Camp",
          approvedAmount: 50000,
          releasedAmount: 40000,
          remainingAmount: 10000,
          utilizationRate: 80,
          budgetStatus: "Partially Released",
          liquidationStatus: "Pending Liquidation",
          deadlineAt: "2026-07-30T00:00:00.000Z",
          remarks: "First tranche released",
          riskLabel: "Low Risk",
        },
      ],
    });

    expect(csv).toContain(
      '"No.","Organization","Activity","Approved Amount","Released Amount","Remaining Amount","Utilization","Deadline","Risk Level"',
    );
    expect(csv).toContain(
      '"1","Youth Leaders Org","Summer Leadership Camp","50000.00","40000.00","10000.00","80%","Jul 30, 2026","Low Risk"',
    );
  });

  it("builds the expected totals row shape", () => {
    expect(
      buildBudgetMonitoringTotalsRow([
        {
          organizationName: "Youth Leaders Org",
          recordCode: "BR-2026-001",
          activity: "Summer Leadership Camp",
          approvedAmount: 50000,
          releasedAmount: 40000,
          remainingAmount: 10000,
          utilizationRate: 80,
          budgetStatus: "Partially Released",
          liquidationStatus: "Pending Liquidation",
          deadlineAt: "2026-07-30T00:00:00.000Z",
          remarks: "First tranche released",
          riskLabel: "Low Risk",
        },
      ]),
    ).toEqual(["", "TOTAL", "", "50000.00", "40000.00", "10000.00", "80%", "", ""]);
  });
});

describe("A4 report orientation and proportional width geometry", () => {
  it("renders the actual registry PDF within A4 landscape margins", async () => {
    const doc = await generateReportPdfDocument({ config: yorpRegistryExportConfig, rows: [] });
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(841.89, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(595.28, 1);
    const table = (doc as unknown as { lastAutoTable: { columns: Array<{ width: number }> } }).lastAutoTable;
    expect(table.columns).toHaveLength(10);
    expect(table.columns.every(column => column.width > 0)).toBe(true);
    expect(table.columns.reduce((sum, column) => sum + column.width, 0)).toBeCloseTo(doc.internal.pageSize.getWidth() - 60, 1);
  });
  it("preserves landscape registry and portrait financial reports with positive width weights", () => {
    const configs = [
      yorpRegistryExportConfig,
      budgetRequestExportConfig,
      budgetMonitoringExportConfig,
      allocationByBarangayExportConfig,
    ];

    for (const config of configs) {
      expect(config.orientation).toBe(config === yorpRegistryExportConfig ? "landscape" : "portrait");
      const pdfColumns = config.columns.filter(column => !column.excludeFromPdf);
      const totalWidth = pdfColumns.reduce(
        (sum, column) => sum + (column.pdfWidth ?? 0),
        0,
      );
      expect(totalWidth).toBeGreaterThan(0);
      const availableWidth = (config.orientation === "landscape" ? 841.89 : 595.28) - 60;
      const scaled = pdfColumns.map(column => (column.pdfWidth! / totalWidth) * availableWidth);
      expect(scaled.every(width => width > 0)).toBe(true);
      expect(scaled.reduce((sum, width) => sum + width, 0)).toBeCloseTo(availableWidth, 2);
    }
  });
});
