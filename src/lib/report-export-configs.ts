import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import {
  formatCurrencyCsv,
  formatDateDisplay,
  formatCurrencyPdf,
  type ReportExportConfig,
} from "@/lib/report-export";

export type YorpRegistryExportRow = {
  organizationName: string;
  barangay: string;
  majorClassification: string;
  contactNumbers: string[];
  emails: string[];
};

export type BudgetRequestExportRow = {
  organizationName: string;
  activity: string;
  approvedAmount: number;
  releasedAmount: number;
  releasedDate: string;
};

export type AllocationByBarangayExportRow = {
  district: string;
  barangay: string;
  organizationNames: string[];
  approvedAmount: number;
  releasedAmount: number;
};

const normalizeMultiValue = (value: string) =>
  value
    .split(/[;\n,]+/g)
    .map((part) => part.trim())
    .filter(Boolean);

export const normalizeClassificationLabel = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "youth-serving organization" || normalized === "youth serving organization") {
    return "Youth-Serving Organization";
  }
  if (normalized === "youth organization") {
    return "Youth Organization";
  }
  return value.trim();
};

export const mapOrganizationProfileToYorpExportRow = (organization: OrganizationProfile): YorpRegistryExportRow => ({
  organizationName: organization.organizationName.trim(),
  barangay: organization.barangay.trim(),
  majorClassification: normalizeClassificationLabel(organization.majorClassification || ""),
  contactNumbers: normalizeMultiValue(organization.contactNumber),
  emails: normalizeMultiValue(organization.organizationEmail),
});

export const yorpRegistryExportConfig: ReportExportConfig<YorpRegistryExportRow> = {
  title: "YORP Registry",
  filenamePrefix: "yorp-registry",
  orientation: "landscape",
  logoUrl: "/y-trace-logo.png",
  headerTitle: "Y-TRACE / LYDO YORP Registry",
  footerText: "Pasig City YORP registry export",
  xlsxSheetName: "YORP Registry",
  columns: [
    {
      label: "No.",
      value: (_row, index) => index + 1,
      pdfWidth: 40,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxType: "integer",
      xlsxWidth: 8,
    },
    {
      label: "Name of Organization",
      value: (row) => row.organizationName,
      pdfWidth: 220,
      xlsxWidth: 35,
      xlsxMinWidth: 24,
      xlsxMaxWidth: 40,
      xlsxWrap: true,
    },
    {
      label: "Barangay",
      value: (row) => row.barangay,
      pdfWidth: 90,
      xlsxWidth: 20,
      xlsxMinWidth: 16,
      xlsxMaxWidth: 24,
    },
    {
      label: "Major Classification",
      value: (row) => row.majorClassification,
      pdfWidth: 110,
      xlsxWidth: 25,
      xlsxMinWidth: 18,
      xlsxMaxWidth: 28,
      xlsxWrap: true,
    },
    {
      label: "Contact Numbers",
      value: (row) => row.contactNumbers,
      pdfWidth: 150,
      preserveSpreadsheetText: true,
      xlsxValue: (row) => row.contactNumbers.join("\n"),
      xlsxType: "text",
      xlsxWidth: 24,
      xlsxMinWidth: 20,
      xlsxMaxWidth: 26,
      xlsxWrap: true,
    },
    {
      label: "Emails",
      value: (row) => row.emails,
      pdfWidth: 168,
      xlsxValue: (row) => row.emails.join("\n"),
      xlsxWidth: 40,
      xlsxMinWidth: 28,
      xlsxMaxWidth: 44,
      xlsxWrap: true,
    },
  ],
};

export const budgetRequestExportConfig: ReportExportConfig<BudgetRequestExportRow> = {
  title: "Budget Request Report",
  filenamePrefix: "budget-requests",
  orientation: "landscape",
  logoUrl: "/y-trace-logo.png",
  headerTitle: "Y-TRACE / LYDO Budget Requests",
  footerText: "Budget request export",
  xlsxSheetName: "Budget Requests",
  pdfUseUnicodeFont: true,
  columns: [
    {
      label: "No.",
      value: (_row, index) => index + 1,
      pdfWidth: 46,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxType: "integer",
      xlsxWidth: 8,
    },
    {
      label: "Organization Name",
      value: (row) => row.organizationName,
      pdfWidth: 169,
      xlsxWidth: 30,
      xlsxMinWidth: 24,
      xlsxMaxWidth: 34,
      xlsxWrap: true,
    },
    {
      label: "Activity",
      value: (row) => row.activity,
      pdfWidth: 208,
      xlsxWidth: 45,
      xlsxMinWidth: 34,
      xlsxMaxWidth: 50,
      xlsxWrap: true,
    },
    {
      label: "Approved Amount",
      value: (row) => row.approvedAmount,
      csvValue: (row) => formatCurrencyCsv(row.approvedAmount),
      pdfValue: (row) => formatCurrencyPdf(row.approvedAmount),
      xlsxValue: (row) => row.approvedAmount,
      pdfWidth: 115,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 20,
    },
    {
      label: "Released Amount",
      value: (row) => row.releasedAmount,
      csvValue: (row) => formatCurrencyCsv(row.releasedAmount),
      pdfValue: (row) => formatCurrencyPdf(row.releasedAmount),
      xlsxValue: (row) => row.releasedAmount,
      pdfWidth: 115,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 20,
    },
    {
      label: "Released Date",
      value: (row) => formatDateDisplay(row.releasedDate),
      csvValue: (row) => formatDateDisplay(row.releasedDate),
      pdfValue: (row) => formatDateDisplay(row.releasedDate),
      pdfWidth: 115,
      xlsxValue: (row) => row.releasedDate,
      xlsxAlign: "center",
      xlsxType: "date",
      xlsxWidth: 18,
      xlsxMinWidth: 16,
      xlsxMaxWidth: 20,
    },
  ],
};

export const allocationByBarangayExportConfig: ReportExportConfig<AllocationByBarangayExportRow> = {
  title: "Allocation by Barangay",
  filenamePrefix: "allocation-by-barangay",
  orientation: "landscape",
  logoUrl: "/y-trace-logo.png",
  headerTitle: "Y-TRACE / LYDO Allocation by Barangay",
  footerText: "Allocation by barangay export",
  xlsxSheetName: "Allocation by Barangay",
  pdfUseUnicodeFont: true,
  columns: [
    {
      label: "No.",
      value: (_row, index) => index + 1,
      pdfWidth: 46,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxType: "integer",
      xlsxWidth: 8,
    },
    {
      label: "District",
      value: (row) => row.district,
      pdfWidth: 115,
      xlsxWidth: 20,
      xlsxMinWidth: 16,
      xlsxMaxWidth: 24,
      xlsxWrap: true,
    },
    {
      label: "Barangay",
      value: (row) => row.barangay,
      pdfWidth: 131,
      xlsxWidth: 28,
      xlsxMinWidth: 22,
      xlsxMaxWidth: 32,
      xlsxWrap: true,
    },
    {
      label: "Organization Names",
      value: (row) => row.organizationNames,
      csvValue: (row) => row.organizationNames.join("; "),
      xlsxValue: (row) => row.organizationNames.join("\n"),
      pdfWidth: 246,
      xlsxAlign: "left",
      xlsxType: "text",
      xlsxWidth: 45,
      xlsxMinWidth: 32,
      xlsxMaxWidth: 50,
      xlsxWrap: true,
    },
    {
      label: "Approved Total Amount",
      value: (row) => row.approvedAmount,
      csvValue: (row) => formatCurrencyCsv(row.approvedAmount),
      pdfValue: (row) => formatCurrencyPdf(row.approvedAmount),
      xlsxValue: (row) => row.approvedAmount,
      pdfWidth: 115,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 20,
    },
    {
      label: "Released Total Amount",
      value: (row) => row.releasedAmount,
      csvValue: (row) => formatCurrencyCsv(row.releasedAmount),
      pdfValue: (row) => formatCurrencyPdf(row.releasedAmount),
      xlsxValue: (row) => row.releasedAmount,
      pdfWidth: 115,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 22,
    },
  ],
};

export const buildBudgetRequestTotalsRow = (rows: BudgetRequestExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  return ["", "TOTAL", "", formatCurrencyCsv(totalApproved), formatCurrencyCsv(totalReleased), ""];
};

export const buildBudgetRequestPdfTotalsRow = (rows: BudgetRequestExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  return ["", "TOTAL", "", formatCurrencyPdf(totalApproved), formatCurrencyPdf(totalReleased), ""];
};

export const buildBudgetRequestXlsxTotalsRow = (rows: BudgetRequestExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  return ["", "TOTAL", "", totalApproved, totalReleased, ""];
};

export const buildAllocationTotalsRow = (rows: AllocationByBarangayExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  return ["", "TOTAL", "", "", formatCurrencyCsv(totalApproved), formatCurrencyCsv(totalReleased)];
};

export const buildAllocationPdfTotalsRow = (rows: AllocationByBarangayExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  return ["", "TOTAL", "", "", formatCurrencyPdf(totalApproved), formatCurrencyPdf(totalReleased)];
};

export const buildAllocationXlsxTotalsRow = (rows: AllocationByBarangayExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  return ["", "TOTAL", "", "", totalApproved, totalReleased];
};
