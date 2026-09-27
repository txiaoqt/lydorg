import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import { addYears } from "date-fns";
import {
  formatCurrencyCsv,
  formatDateDisplay,
  formatCurrencyPdf,
  type ReportExportConfig,
} from "@/lib/report-export";

export type YorpRegistryExportRow = {
  no?: number;
  referenceId?: string;
  organizationName: string;
  majorClassification: string;
  subClassification?: string;
  registrationType?: string;
  address: string;
  district?: string;
  barangay?: string;
  urn: string;
  organizationHead: string;
  adviserName?: string;
  contactNumber: string;
  email: string;
  facebookPageUrl?: string;
  registrationDate: string;
  verifiedDate: string;
  expiryDate?: string;
  status?: string;
  // Backward compatibility fields for test mocks / legacy objects
  advocacyThemes?: string[];
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
      : organization.accreditationStartDate || organization.createdAt || organization.verifiedAt;
  const regDateObj = rawRegDate ? new Date(rawRegDate) : null;
  const rawVerifiedDate = organization.verifiedAt ? new Date(organization.verifiedAt) : null;
  const rawExpDate =
    "org" in input && input.expiryDate
      ? input.expiryDate
      : organization.accreditationExpiresAt
      ? organization.accreditationExpiresAt
      : regDateObj && !Number.isNaN(regDateObj.getTime())
      ? addYears(regDateObj, 3)
      : null;

  const yorpStatusFormatted =
    "org" in input && input.yorpStatus
      ? input.yorpStatus === "active"
        ? "Active"
        : input.yorpStatus === "expiring_soon"
        ? "Expiring Soon"
        : input.yorpStatus === "expired"
        ? "Expired"
        : String(input.yorpStatus)
      : organization.profileStatus === "verified"
      ? "Active"
      : organization.profileStatus || "";

  return {
    no: typeof index === "number" ? index + 1 : undefined,
    referenceId: (organization.referenceId || "").trim(),
    organizationName: (organization.organizationName || "").trim(),
    majorClassification: normalizeClassificationLabel(
      organization.majorClassification || organization.classification || "",
    ),
    subClassification: (organization.subClassification || "").trim(),
    registrationType:
      organization.registrationType === "new"
        ? "New Organization"
        : organization.registrationType === "existing"
        ? "Existing Organization"
        : organization.registrationType || "",
    address: (organization.address || "").trim(),
    district: (organization.district || resolveDistrictFromBarangay(organization.barangay) || "").trim(),
    barangay: (organization.barangay || "").trim(),
    urn: (organization.urn || organization.yorpUniqueRegistrationNumber || "").trim(),
    organizationHead: (organization.representativeName || "").trim(),
    adviserName: (organization.adviserName || "").trim(),
    contactNumber: (organization.contactNumber || organization.officialContactNumber || "").trim(),
    email: (organization.organizationEmail || organization.officialEmailAddress || "").trim(),
    facebookPageUrl: (organization.facebookPageUrl || "").trim(),
    registrationDate:
      regDateObj && !Number.isNaN(regDateObj.getTime())
        ? formatDateDisplay(regDateObj.toISOString())
        : organization.yorpRegisteredYear
        ? String(organization.yorpRegisteredYear)
        : "",
    verifiedDate:
      rawVerifiedDate && !Number.isNaN(rawVerifiedDate.getTime())
        ? formatDateDisplay(rawVerifiedDate.toISOString())
        : organization.approvedAt
        ? formatDateDisplay(organization.approvedAt)
        : "",
    expiryDate:
      rawExpDate && !Number.isNaN(new Date(rawExpDate).getTime())
        ? formatDateDisplay(new Date(rawExpDate).toISOString())
        : "",
    status: yorpStatusFormatted,
    advocacyThemes: organization.advocacies,
    contactNumbers: organization.contactNumber ? normalizeMultiValue(organization.contactNumber) : undefined,
    emails: organization.organizationEmail ? normalizeMultiValue(organization.organizationEmail) : undefined,
  };
};

export type YorpRegistryColumnGroupKey =
  | "identification"
  | "organization_details"
  | "contact_location"
  | "registration_status";

export type YorpRegistryColumnDef = {
  key: string;
  label: string;
  description: string;
  group: YorpRegistryColumnGroupKey;
  column: ReportColumn<YorpRegistryExportRow>;
  isDefault: boolean;
};

export const YORP_REGISTRY_AVAILABLE_COLUMNS: YorpRegistryColumnDef[] = [
  // IDENTIFICATION
  {
    key: "no",
    label: "No.",
    description: "Row number in export",
    group: "identification",
    isDefault: true,
    column: {
      label: "No.",
      value: (row, index) => (typeof row.no === "number" ? row.no : index + 1),
      pdfWidth: 20,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 6,
      xlsxMinWidth: 5,
      xlsxMaxWidth: 8,
      xlsxType: "integer",
    },
  },
  {
    key: "organizationName",
    label: "Organization Name",
    description: "Full registered youth organization name",
    group: "identification",
    isDefault: true,
    column: {
      label: "Organization Name",
      value: (row) => row.organizationName || "",
      pdfWidth: 125,
      xlsxWidth: 28,
      xlsxMinWidth: 20,
      xlsxMaxWidth: 40,
      xlsxWrap: true,
    },
  },
  {
    key: "urn",
    label: "URN",
    description: "Unique Registration Number",
    group: "identification",
    isDefault: true,
    column: {
      label: "URN",
      value: (row) => row.urn || row.yorpUniqueRegistrationNumber || "",
      pdfWidth: 65,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 14,
      xlsxMinWidth: 12,
      xlsxMaxWidth: 18,
      preserveSpreadsheetText: true,
      xlsxWrap: true,
    },
  },
  {
    key: "referenceId",
    label: "Reference ID",
    description: "System registration reference code (e.g. REG-2026-0001)",
    group: "identification",
    isDefault: false,
    column: {
      label: "Reference ID",
      value: (row) => row.referenceId || "",
      pdfWidth: 65,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
      preserveSpreadsheetText: true,
    },
  },

  // ORGANIZATION DETAILS
  {
    key: "majorClassification",
    label: "Major Classification",
    description: "Youth Organization or Youth-Serving Organization",
    group: "organization_details",
    isDefault: true,
    column: {
      label: "Major Classification",
      value: (row) => normalizeClassificationLabel(row.majorClassification || row.classification || ""),
      pdfWidth: 85,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 20,
      xlsxMinWidth: 16,
      xlsxMaxWidth: 26,
      xlsxWrap: true,
    },
  },
  {
    key: "subClassification",
    label: "Sub-Classification",
    description: "Community-Based, School-Based, Faith-Based, etc.",
    group: "organization_details",
    isDefault: false,
    column: {
      label: "Sub-Classification",
      value: (row) => row.subClassification || "",
      pdfWidth: 80,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 20,
      xlsxWrap: true,
    },
  },
  {
    key: "organizationHead",
    label: "Organization Head",
    description: "President or authorized head representative",
    group: "organization_details",
    isDefault: true,
    column: {
      label: "Organization Head",
      value: (row) => row.organizationHead || "",
      pdfWidth: 90,
      xlsxWidth: 24,
      xlsxMinWidth: 18,
      xlsxMaxWidth: 32,
      xlsxWrap: true,
    },
  },
  {
    key: "adviserName",
    label: "Adviser Name",
    description: "Registered adult adviser or mentor name",
    group: "organization_details",
    isDefault: false,
    column: {
      label: "Adviser Name",
      value: (row) => row.adviserName || "",
      pdfWidth: 80,
      xlsxWidth: 22,
      xlsxWrap: true,
    },
  },
  {
    key: "registrationType",
    label: "Registration Type",
    description: "New Organization or Existing Organization",
    group: "organization_details",
    isDefault: false,
    column: {
      label: "Registration Type",
      value: (row) => row.registrationType || "",
      pdfWidth: 65,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
    },
  },

  // CONTACT & LOCATION
  {
    key: "address",
    label: "Address",
    description: "Physical headquarters or official address",
    group: "contact_location",
    isDefault: true,
    column: {
      label: "Address",
      value: (row) => row.address || "",
      pdfWidth: 135,
      xlsxWidth: 35,
      xlsxMinWidth: 24,
      xlsxMaxWidth: 50,
      xlsxWrap: true,
    },
  },
  {
    key: "district",
    label: "District",
    description: "Pasig District I or District II",
    group: "contact_location",
    isDefault: false,
    column: {
      label: "District",
      value: (row) => row.district || "",
      pdfWidth: 55,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 14,
    },
  },
  {
    key: "barangay",
    label: "Barangay",
    description: "Barangay of official registration",
    group: "contact_location",
    isDefault: false,
    column: {
      label: "Barangay",
      value: (row) => row.barangay || "",
      pdfWidth: 65,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
    },
  },
  {
    key: "contactNumber",
    label: "Contact Number",
    description: "Official contact phone / mobile number",
    group: "contact_location",
    isDefault: true,
    column: {
      label: "Contact Number",
      value: (row) => row.contactNumber || row.officialContactNumber || "",
      pdfWidth: 65,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 18,
      xlsxMinWidth: 14,
      xlsxMaxWidth: 22,
      preserveSpreadsheetText: true,
    },
  },
  {
    key: "email",
    label: "Email",
    description: "Official organization email address",
    group: "contact_location",
    isDefault: true,
    column: {
      label: "Email",
      value: (row) => row.email || row.officialEmailAddress || "",
      pdfWidth: 105,
      xlsxWidth: 30,
      xlsxMinWidth: 20,
      xlsxMaxWidth: 38,
      xlsxWrap: true,
    },
  },
  {
    key: "facebookPageUrl",
    label: "Facebook Page",
    description: "Official social media / Facebook page URL",
    group: "contact_location",
    isDefault: false,
    column: {
      label: "Facebook Page",
      value: (row) => row.facebookPageUrl || "",
      pdfWidth: 80,
      xlsxWidth: 28,
      xlsxWrap: true,
    },
  },

  // REGISTRATION & STATUS
  {
    key: "registrationDate",
    label: "Registration Date",
    description: "Initial registration or accreditation date",
    group: "registration_status",
    isDefault: true,
    column: {
      label: "Registration Date",
      value: (row) =>
        row.registrationDate ||
        (row.createdAt
          ? formatDateDisplay(row.createdAt)
          : ""),
      pdfWidth: 55,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
      xlsxMinWidth: 14,
      xlsxMaxWidth: 20,
    },
  },
  {
    key: "verifiedDate",
    label: "Verified Date",
    description: "Date accreditation was verified by Administrator",
    group: "registration_status",
    isDefault: true,
    column: {
      label: "Verified Date",
      value: (row) =>
        row.verifiedDate ||
        (row.approvedAt
          ? formatDateDisplay(row.approvedAt)
          : ""),
      pdfWidth: 55,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
      xlsxMinWidth: 14,
      xlsxMaxWidth: 20,
    },
  },
  {
    key: "expiryDate",
    label: "Expiration Date",
    description: "3-Year YORP accreditation validity expiration date",
    group: "registration_status",
    isDefault: false,
    column: {
      label: "Expiration Date",
      value: (row) => row.expiryDate || "",
      pdfWidth: 55,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 16,
    },
  },
  {
    key: "status",
    label: "Registration Status",
    description: "Active, Expiring Soon, or Expired status",
    group: "registration_status",
    isDefault: false,
    column: {
      label: "Registration Status",
      value: (row) => row.status || "",
      pdfWidth: 55,
      pdfAlign: "center",
      xlsxAlign: "center",
      xlsxWidth: 14,
    },
  },
];

export const YORP_REGISTRY_COLUMN_GROUPS: {
  key: YorpRegistryColumnGroupKey;
  label: string;
  description: string;
}[] = [
  {
    key: "identification",
    label: "IDENTIFICATION",
    description: "Unique identifiers and official organization name",
  },
  {
    key: "organization_details",
    label: "ORGANIZATION DETAILS",
    description: "Classifications, heads, advisers, and registration scope",
  },
  {
    key: "contact_location",
    label: "CONTACT & LOCATION",
    description: "Address, district, barangay, and contact information",
  },
  {
    key: "registration_status",
    label: "REGISTRATION",
    description: "Dates, verification milestones, and accreditation status",
  },
];

export const YORP_REGISTRY_AVAILABLE_COLUMNS_MAP: Record<string, YorpRegistryColumnDef> =
  Object.fromEntries(YORP_REGISTRY_AVAILABLE_COLUMNS.map((def) => [def.key, def]));

export const DEFAULT_YORP_REGISTRY_COLUMN_KEYS: string[] = [
  "no",
  "organizationName",
  "majorClassification",
  "address",
  "urn",
  "organizationHead",
  "contactNumber",
  "email",
  "registrationDate",
  "verifiedDate",
];

export const YORP_REGISTRY_COLUMN_ORDER: string[] = [
  "no",
  "organizationName",
  "majorClassification",
  "subClassification",
  "registrationType",
  "address",
  "district",
  "barangay",
  "urn",
  "referenceId",
  "organizationHead",
  "adviserName",
  "contactNumber",
  "email",
  "facebookPageUrl",
  "registrationDate",
  "verifiedDate",
  "expiryDate",
  "status",
];

export const buildYorpRegistryExportConfig = (
  selectedKeys: string[],
  baseConfig: Partial<ReportExportConfig<YorpRegistryExportRow>> = {},
): ReportExportConfig<YorpRegistryExportRow> => {
  const selectedKeySet = new Set(selectedKeys);
  const selectedDefs = YORP_REGISTRY_COLUMN_ORDER
    .filter((key) => selectedKeySet.has(key))
    .map((key) => YORP_REGISTRY_AVAILABLE_COLUMNS_MAP[key])
    .filter((def): def is YorpRegistryColumnDef => Boolean(def));

  const columns = selectedDefs.map((def) => def.column);
  const columnCount = columns.length;

  const pdfFontSize =
    columnCount > 13 ? 6 : columnCount > 9 ? 7 : columnCount > 5 ? 7.5 : 8.5;
  const pdfCellPadding = columnCount > 13 ? 2 : columnCount > 9 ? 3 : 3.5;

  return {
    ...yorpRegistryExportConfig,
    ...baseConfig,
    columns: columns.length > 0 ? columns : yorpRegistryExportConfig.columns,
    pdfFontSize,
    pdfCellPadding,
  };
};

export const yorpRegistryExportConfig: ReportExportConfig<YorpRegistryExportRow> = {
  title: "YORP Registry",
  filenamePrefix: "YORP_Registry_Master",
  orientation: "landscape",
  paperSize: "a4",
  headerTitle: "PASIG CITY YOUTH DEVELOPMENT OFFICE",
  footerText: "Pasig City Youth Development Office - YORP Registry",
  xlsxSheetName: "YORP Registry",
  pdfFontSize: 7,
  pdfCellPadding: 3,
  columns: DEFAULT_YORP_REGISTRY_COLUMN_KEYS.map(
    (key) => YORP_REGISTRY_AVAILABLE_COLUMNS_MAP[key].column,
  ),
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
