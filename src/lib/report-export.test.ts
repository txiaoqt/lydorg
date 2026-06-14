import { describe, expect, it } from "vitest";
import {
  allocationByBarangayExportConfig,
  buildAllocationTotalsRow,
  buildBudgetRequestTotalsRow,
  budgetRequestExportConfig,
} from "@/lib/report-export-configs";
import {
  buildCsvContent,
  formatDateDisplay,
  getExcelColumnLetter,
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
          organizationName: "Alpha Youth Council",
          activity: "Leadership Training",
          approvedAmount: 15000,
          releasedAmount: 12300,
          releasedDate: "2026-06-14T08:14:00.000Z",
        },
      ],
    });

    expect(csv).toContain(
      '"No.","Organization Name","Activity","Approved Amount","Released Amount","Released Date"',
    );
    expect(csv).toContain('"1","Alpha Youth Council","Leadership Training","15000.00","12300.00","Jun 14, 2026"');
  });

  it("builds the expected totals row shape", () => {
    expect(
      buildBudgetRequestTotalsRow([
        {
          organizationName: "Alpha Youth Council",
          activity: "Leadership Training",
          approvedAmount: 15000,
          releasedAmount: 12300,
          releasedDate: "2026-06-14T08:14:00.000Z",
        },
      ]),
    ).toEqual(["", "TOTAL", "", "15000.00", "12300.00", ""]);
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
          organizationNames: ["Organization Alpha", "Organization Beta"],
          approvedAmount: 15000,
          releasedAmount: 15300,
        },
      ],
    });

    expect(csv).toContain(
      '"No.","District","Barangay","Organization Names","Approved Total Amount","Released Total Amount"',
    );
    expect(csv).toContain(
      '"1","District 1","Bagong Ilog","Organization Alpha; Organization Beta","15000.00","15300.00"',
    );
  });

  it("builds the expected totals row shape", () => {
    expect(
      buildAllocationTotalsRow([
        {
          district: "District 1",
          barangay: "Bagong Ilog",
          organizationNames: ["Organization Alpha", "Organization Beta"],
          approvedAmount: 15000,
          releasedAmount: 15300,
        },
      ]),
    ).toEqual(["", "TOTAL", "", "", "15000.00", "15300.00"]);
  });
});
