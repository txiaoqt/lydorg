import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import { addYears } from "date-fns";
import {
  formatCurrencyCsv,
  formatDateDisplay,
  formatCurrencyPdf,
  type ReportExportConfig,
} from "@/lib/report-export";

export type YorpRegistryExportRow = {
  organizationName: string;
  majorClassification: string;
  address: string;
  urn: string;
  registrationDate: string;
  expiryDate: string;
  // Backward compatibility fields for test mocks / legacy objects
  no?: number;
  subClassification?: string;
  advocacyThemes?: string[];
  district?: string;
  barangay?: string;
  status?: string;
  contactNumbers?: string[];
  emails?: string[];
  yorpUniqueRegistrationNumber?: string;
  classification?: string;
  officialContactNumber?: string;
  officialEmailAddress?: string;
  approvedAt?: string | null;
  validUntil?: string | null;
  createdAt?: string | null;
  advocacies?: string[];
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

const normalizeMultiValue = (value?: string | null) =>
  (value || "")
    .split(/[;\n,]+/g)
    .map((part) => part.trim())
    .filter(Boolean);

const DISTRICT_2_BARANGAYS = new Set([
  "dela paz",
  "manggahan",
  "maybunga",
  "pinagbuhatan",
  "rosario",
  "san miguel",
  "sta. lucia",
  "santa lucia",
  "santolan",
]);

export const resolveDistrictFromBarangay = (barangay?: string | null): string => {
  if (!barangay) return "District I";
  const clean = barangay.trim().toLowerCase().replace(/^(barangay|brgy\.?)\s+/i, "");
  return DISTRICT_2_BARANGAYS.has(clean) ? "District II" : "District I";
};

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

export type YorpRegistryExportInput =
  | OrganizationProfile
  | {
      org: OrganizationProfile;
      registrationDate?: Date | string | null;
      expiryDate?: Date | string | null;
      yorpStatus?: string | null;
    };

export const mapOrganizationProfileToYorpExportRow = (
  input: YorpRegistryExportInput,
  index?: number,
): YorpRegistryExportRow => {
  const organization = "org" in input ? input.org : input;
  const rawRegDate =
    "org" in input && input.registrationDate
      ? input.registrationDate
      : organization.verifiedAt || organization.createdAt;
  const regDateObj = rawRegDate ? new Date(rawRegDate) : null;
  const rawExpDate =
    "org" in input && input.expiryDate
      ? input.expiryDate
      : organization.accreditationExpiresAt
      ? organization.accreditationExpiresAt
      : regDateObj && !Number.isNaN(regDateObj.getTime())
      ? addYears(regDateObj, 3)
      : null;

  return {
    organizationName: (organization.organizationName || "").trim(),
    majorClassification: normalizeClassificationLabel(organization.majorClassification || ""),
    address: (organization.address || "").trim(),
    urn: (organization.urn || "").trim(),
    registrationDate:
      regDateObj && !Number.isNaN(regDateObj.getTime())
        ? formatDateDisplay(regDateObj.toISOString())
        : "",
    expiryDate:
      rawExpDate && !Number.isNaN(new Date(rawExpDate).getTime())
        ? formatDateDisplay(new Date(rawExpDate).toISOString())
        : "",
  };
};

export const yorpRegistryExportConfig: ReportExportConfig<YorpRegistryExportRow> = {
  title: "YORP Registry",
  filenamePrefix: "YORP_Registry_Master",
  orientation: "portrait",
  headerTitle: "PASIG CITY YOUTH DEVELOPMENT OFFICE",
  footerText: "Pasig City Youth Development Office - YORP Registry",
  xlsxSheetName: "YORP Registry",
  columns: [
    {
      label: "No.",
      value: (_row, index) => index + 1,
      pdfWidth: 24,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 6,
      xlsxMinWidth: 5,
      xlsxMaxWidth: 8,
      xlsxType: "integer",
    },
    {
      label: "Name of the Organization",
      value: (row) => row.organizationName || "",
      pdfWidth: 136,
      xlsxWidth: 34,
      xlsxMinWidth: 26,
      xlsxMaxWidth: 45,
      xlsxWrap: true,
    },
    {
      label: "Major Classification",
      value: (row) => normalizeClassificationLabel(row.majorClassification || row.classification || ""),
      pdfWidth: 74,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 22,
      xlsxMinWidth: 18,
      xlsxMaxWidth: 26,
      xlsxWrap: true,
    },
    {
      label: "Address",
      value: (row) => row.address || "",
      pdfWidth: 135,
      xlsxWidth: 34,
      xlsxMinWidth: 26,
      xlsxMaxWidth: 45,
      xlsxWrap: true,
    },
    {
      label: "URN",
      value: (row) => row.urn || row.yorpUniqueRegistrationNumber || "",
      pdfWidth: 62,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 20,
      xlsxWrap: true,
    },
    {
      label: "Date of Registration",
      value: (row) =>
        row.registrationDate ||
        (row.approvedAt
          ? formatDateDisplay(row.approvedAt)
          : row.createdAt
          ? formatDateDisplay(row.createdAt)
          : ""),
      pdfWidth: 52,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 18,
    },
    {
      label: "Date of Expiration",
      value: (row) => row.expiryDate || (row.validUntil ? formatDateDisplay(row.validUntil) : ""),
      pdfWidth: 52,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 18,
    },
  ],
};

export const budgetRequestExportConfig: ReportExportConfig<BudgetRequestExportRow> = {
  title: "Budget Request Report",
  filenamePrefix: "budget-requests",
  orientation: "portrait",
  headerTitle: "PASIG CITY YOUTH DEVELOPMENT OFFICE",
  footerText: "Pasig City Youth Development Office - Budget Request Report",
  xlsxSheetName: "Budget Requests",
  pdfUseUnicodeFont: true,
  columns: [
    {
      label: "No.",
      value: (_row, index) => index + 1,
      pdfWidth: 28,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxType: "integer",
      xlsxWidth: 8,
    },
    {
      label: "Organization Name",
      value: (row) => row.organizationName,
      pdfWidth: 135,
      xlsxWidth: 30,
      xlsxMinWidth: 24,
      xlsxMaxWidth: 34,
      xlsxWrap: true,
    },
    {
      label: "Activity",
      value: (row) => row.activity,
      pdfWidth: 152,
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
      pdfWidth: 72,
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
      pdfWidth: 72,
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
      pdfWidth: 76,
      pdfAlign: "center",
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
  orientation: "portrait",
  headerTitle: "PASIG CITY YOUTH DEVELOPMENT OFFICE",
  footerText: "Pasig City Youth Development Office - Allocation by Barangay",
  xlsxSheetName: "Allocation by Barangay",
  pdfUseUnicodeFont: true,
  columns: [
    {
      label: "No.",
      value: (_row, index) => index + 1,
      pdfWidth: 28,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxType: "integer",
      xlsxWidth: 8,
    },
    {
      label: "District",
      value: (row) => row.district,
      pdfWidth: 72,
      xlsxWidth: 20,
      xlsxMinWidth: 16,
      xlsxMaxWidth: 24,
      xlsxWrap: true,
    },
    {
      label: "Barangay",
      value: (row) => row.barangay,
      pdfWidth: 85,
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
      pdfWidth: 190,
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
      pdfWidth: 80,
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
      pdfWidth: 80,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 22,
    },
  ],
};

export type BudgetMonitoringExportRow = {
  organizationName: string;
  recordCode: string;
  activity: string;
  approvedAmount: number;
  releasedAmount: number;
  remainingAmount: number;
  utilizationRate: number;
  budgetStatus: string;
  liquidationStatus: string;
  releaseDate: string;
  goSignalAt: string;
  deadlineAt: string;
  hardCopySubmittedAt: string;
  completedAt: string;
  remarks: string;
  riskLabel: string;
};

export const budgetMonitoringExportConfig: ReportExportConfig<BudgetMonitoringExportRow> = {
  title: "Budget Monitoring Report",
  filenamePrefix: "budget-monitoring",
  orientation: "portrait",
  headerTitle: "PASIG CITY YOUTH DEVELOPMENT OFFICE",
  footerText: "Pasig City Youth Development Office - Budget Monitoring Report",
  xlsxSheetName: "Budget Monitoring",
  pdfUseUnicodeFont: true,
  columns: [
    {
      label: "No.",
      value: (_row, index) => index + 1,
      pdfWidth: 24,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxType: "integer",
      xlsxWidth: 6,
    },
    {
      label: "Organization",
      value: (row) => row.organizationName,
      pdfWidth: 92,
      xlsxWidth: 32,
      xlsxMinWidth: 24,
      xlsxMaxWidth: 40,
      xlsxWrap: true,
    },
    {
      label: "Record Code",
      value: (row) => row.recordCode,
      xlsxWidth: 18,
      excludeFromPdf: true,
    },
    {
      label: "Activity",
      value: (row) => row.activity,
      pdfWidth: 105,
      xlsxWidth: 35,
      xlsxMinWidth: 26,
      xlsxMaxWidth: 45,
      xlsxWrap: true,
    },
    {
      label: "Approved Amount",
      value: (row) => row.approvedAmount,
      csvValue: (row) => formatCurrencyCsv(row.approvedAmount),
      pdfValue: (row) => formatCurrencyPdf(row.approvedAmount),
      xlsxValue: (row) => row.approvedAmount,
      pdfWidth: 58,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 18,
    },
    {
      label: "Released Amount",
      value: (row) => row.releasedAmount,
      csvValue: (row) => formatCurrencyCsv(row.releasedAmount),
      pdfValue: (row) => formatCurrencyPdf(row.releasedAmount),
      xlsxValue: (row) => row.releasedAmount,
      pdfWidth: 58,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 18,
    },
    {
      label: "Remaining Amount",
      value: (row) => row.remainingAmount,
      csvValue: (row) => formatCurrencyCsv(row.remainingAmount),
      pdfValue: (row) => formatCurrencyPdf(row.remainingAmount),
      xlsxValue: (row) => row.remainingAmount,
      pdfWidth: 58,
      pdfAlign: "right",
      xlsxAlign: "right",
      xlsxType: "currency",
      xlsxWidth: 18,
    },
    {
      label: "Utilization",
      value: (row) => `${row.utilizationRate}%`,
      csvValue: (row) => `${row.utilizationRate}%`,
      pdfValue: (row) => `${row.utilizationRate}%`,
      xlsxValue: (row) => row.utilizationRate / 100,
      xlsxType: "decimal",
      pdfWidth: 42,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 14,
    },
    {
      label: "Budget Status",
      value: (row) => row.budgetStatus,
      xlsxWidth: 18,
      excludeFromPdf: true,
    },
    {
      label: "Liquidation Status",
      value: (row) => row.liquidationStatus,
      xlsxWidth: 22,
      excludeFromPdf: true,
    },
    {
      label: "Release Date",
      value: (row) => formatDateDisplay(row.releaseDate),
      csvValue: (row) => formatDateDisplay(row.releaseDate),
      xlsxValue: (row) => row.releaseDate,
      xlsxType: "date",
      xlsxWidth: 16,
      excludeFromPdf: true,
    },
    {
      label: "Go Signal Date",
      value: (row) => formatDateDisplay(row.goSignalAt),
      csvValue: (row) => formatDateDisplay(row.goSignalAt),
      xlsxValue: (row) => row.goSignalAt,
      xlsxType: "date",
      xlsxWidth: 16,
      excludeFromPdf: true,
    },
    {
      label: "Deadline",
      value: (row) => formatDateDisplay(row.deadlineAt),
      csvValue: (row) => formatDateDisplay(row.deadlineAt),
      pdfValue: (row) => formatDateDisplay(row.deadlineAt),
      xlsxValue: (row) => row.deadlineAt,
      xlsxType: "date",
      pdfWidth: 50,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
    },
    {
      label: "Hard-Copy Date",
      value: (row) => formatDateDisplay(row.hardCopySubmittedAt),
      csvValue: (row) => formatDateDisplay(row.hardCopySubmittedAt),
      xlsxValue: (row) => row.hardCopySubmittedAt,
      xlsxType: "date",
      xlsxWidth: 16,
      excludeFromPdf: true,
    },
    {
      label: "Completion Date",
      value: (row) => formatDateDisplay(row.completedAt),
      csvValue: (row) => formatDateDisplay(row.completedAt),
      xlsxValue: (row) => row.completedAt,
      xlsxType: "date",
      xlsxWidth: 16,
      excludeFromPdf: true,
    },
    {
      label: "Remarks",
      value: (row) => row.remarks,
      xlsxWidth: 26,
      xlsxWrap: true,
      excludeFromPdf: true,
    },
    {
      label: "Risk Level",
      value: (row) => row.riskLabel,
      pdfWidth: 48,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
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

export const buildBudgetMonitoringTotalsRow = (rows: BudgetMonitoringExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  const totalRemaining = rows.reduce((sum, row) => sum + row.remainingAmount, 0);
  const avgUtilization = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.utilizationRate, 0) / rows.length)
    : 0;
  return [
    "",
    "TOTAL",
    "",
    "",
    formatCurrencyCsv(totalApproved),
    formatCurrencyCsv(totalReleased),
    formatCurrencyCsv(totalRemaining),
    `${avgUtilization}%`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
};

export const buildBudgetMonitoringPdfTotalsRow = (rows: BudgetMonitoringExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  const totalRemaining = rows.reduce((sum, row) => sum + row.remainingAmount, 0);
  const avgUtilization = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.utilizationRate, 0) / rows.length)
    : 0;
  return [
    "",
    "TOTAL",
    "",
    formatCurrencyPdf(totalApproved),
    formatCurrencyPdf(totalReleased),
    formatCurrencyPdf(totalRemaining),
    `${avgUtilization}%`,
    "",
    "",
  ];
};

export const buildBudgetMonitoringXlsxTotalsRow = (rows: BudgetMonitoringExportRow[]) => {
  const totalApproved = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
  const totalReleased = rows.reduce((sum, row) => sum + row.releasedAmount, 0);
  const totalRemaining = rows.reduce((sum, row) => sum + row.remainingAmount, 0);
  const avgUtilization = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.utilizationRate, 0) / rows.length)
    : 0;
  return [
    "",
    "TOTAL",
    "",
    "",
    totalApproved,
    totalReleased,
    totalRemaining,
    avgUtilization / 100,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
};
