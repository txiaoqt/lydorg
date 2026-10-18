import { isLiquidationOverdue, statusLabelMap, type BudgetRequest, type LiquidationReport, type OrganizationProfile } from "./lydo-connect-data";
import { formatCurrencyCsv, formatCurrencyPdf, formatDateDisplay, type ExportFormat, type ReportExportConfig } from "./report-export";

export type LiquidationReportExportSource = {
  report: LiquidationReport;
  budgetRequest: Partial<BudgetRequest> & Pick<BudgetRequest, "id" | "organizationId" | "activityTitle">;
  organization: Pick<OrganizationProfile, "id" | "organizationName">;
};

export type LiquidationReportExportRow = {
  liquidationId: string;
  requestId: string;
  organization: string;
  activity: string;
  requestedAmount: number;
  approvedAmount: number;
  releasedAmount: number;
  liquidatedAmount: number;
  unliquidatedBalance: number;
  deadlineAt: string;
  status: string;
  isLiquidated: boolean;
};

const amount = (value: number | undefined) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("A liquidation report contains an invalid financial amount.");
  return parsed;
};

/** Match budget monitoring's completion-based recognition; no partial expenses are inferred. */
export function mapLiquidationReportToExportRow({ report, budgetRequest, organization }: LiquidationReportExportSource): LiquidationReportExportRow {
  if (!budgetRequest || budgetRequest.id !== report.budgetRequestId || budgetRequest.organizationId !== report.organizationId
    || organization.id !== report.organizationId) throw new Error("A liquidation report's linked budget or organization could not be verified.");
  const isLiquidated = report.status === "completed_liquidated";
  const releasedAmount = amount(budgetRequest.releasedAmount);
  const liquidatedAmount = isLiquidated ? releasedAmount : 0;
  return {
    liquidationId: report.publicRecordCode || report.id,
    requestId: budgetRequest.publicRecordCode || budgetRequest.id,
    organization: organization.organizationName,
    activity: budgetRequest.activityTitle,
    requestedAmount: amount(budgetRequest.requestedAmount),
    approvedAmount: amount(budgetRequest.approvedAmount),
    releasedAmount,
    liquidatedAmount,
    unliquidatedBalance: Math.max(releasedAmount - liquidatedAmount, 0),
    deadlineAt: report.deadlineAt,
    status: report.status === "overdue" || isLiquidationOverdue(report.deadlineAt, report.status)
      ? "Overdue" : statusLabelMap[report.status] ?? report.status.replaceAll("_", " "),
    isLiquidated,
  };
}

const deadlineTime = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : Number.POSITIVE_INFINITY;

export const compareLiquidationReportExportRows = (a: LiquidationReportExportRow, b: LiquidationReportExportRow) =>
  Number(a.isLiquidated) - Number(b.isLiquidated)
  || deadlineTime(a.deadlineAt) - deadlineTime(b.deadlineAt)
  || a.organization.localeCompare(b.organization) || a.liquidationId.localeCompare(b.liquidationId);

type AmountField = "requestedAmount" | "approvedAmount" | "releasedAmount" | "liquidatedAmount" | "unliquidatedBalance";
const currencyColumn = (label: string, field: AmountField) => ({
  label, value: (row: LiquidationReportExportRow) => row[field],
  csvValue: (row: LiquidationReportExportRow) => formatCurrencyCsv(row[field]),
  pdfValue: (row: LiquidationReportExportRow) => formatCurrencyPdf(row[field]),
  xlsxValue: (row: LiquidationReportExportRow) => row[field],
  pdfWidth: 45, pdfAlign: "right" as const, xlsxAlign: "right" as const, xlsxType: "currency" as const, xlsxWidth: 22,
});

export const liquidationReportExportConfig: ReportExportConfig<LiquidationReportExportRow> = {
  title: "Liquidation Reports", filenamePrefix: "liquidation-reports", xlsxSheetName: "Liquidation Reports",
  orientation: "portrait", paperSize: "a4", pdfUseUnicodeFont: true, pdfFontSize: 6.5, pdfCellPadding: 2,
  footerText: "Pasig City Youth Development Office - Liquidation Reports",
  columns: [
    { label: "No.", value: (_row, index) => index + 1, pdfWidth: 20, pdfAlign: "center", xlsxWidth: 6, xlsxType: "integer" },
    { label: "Liquidation ID", value: row => row.liquidationId, pdfWidth: 45, xlsxWidth: 25, xlsxWrap: true, preserveSpreadsheetText: true },
    { label: "Request ID", value: row => row.requestId, pdfWidth: 45, xlsxWidth: 25, xlsxWrap: true, preserveSpreadsheetText: true },
    { label: "Organization", value: row => row.organization, pdfWidth: 60, xlsxWidth: 30, xlsxWrap: true },
    { label: "Activity", value: row => row.activity, pdfWidth: 62, xlsxWidth: 36, xlsxWrap: true },
    currencyColumn("Requested Amount", "requestedAmount"),
    currencyColumn("Approved Amount", "approvedAmount"),
    currencyColumn("Released Amount", "releasedAmount"),
    currencyColumn("Liquidated Amount", "liquidatedAmount"),
    currencyColumn("Unliquidated Balance", "unliquidatedBalance"),
    { label: "Deadline", value: row => formatDateDisplay(row.deadlineAt), xlsxValue: row => row.deadlineAt, xlsxType: "date",
      pdfWidth: 38, pdfAlign: "center", xlsxAlign: "center", xlsxWidth: 18 },
    { label: "Status", value: row => row.status, pdfWidth: 40, xlsxWidth: 25, xlsxWrap: true },
  ],
};

export function buildLiquidationReportTotalsRow(rows: LiquidationReportExportRow[], format: ExportFormat) {
  const total = (field: AmountField) => {
    const sum = rows.reduce((value, row) => value + row[field], 0);
    return format === "xlsx" ? sum : format === "pdf" ? formatCurrencyPdf(sum) : formatCurrencyCsv(sum);
  };
  return ["", "TOTAL", "", "", "", total("requestedAmount"), total("approvedAmount"), total("releasedAmount"),
    total("liquidatedAmount"), total("unliquidatedBalance"), "", ""];
}
