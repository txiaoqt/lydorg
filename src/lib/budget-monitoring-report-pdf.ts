import { formatBudgetPurposeCategory } from "./lydo-connect-data";
import { isCanonicalPurposeCategory } from "./budget-category-colors";
import { BUDGET_MONITORING_LABELS, deriveBudgetMonitoringMetrics } from "./budget-monitoring-presentation";
import { formatCurrencyPdf, type PdfPageConfig, type PdfReportHeading, type ReportCellValue, type ReportExportConfig } from "./report-export";
import type { BudgetMonitoringExportRow } from "./report-export-configs";
import { bold, createOfficialReport, drawNote, drawOfficialHeading, drawOfficialTable, percentOf } from "./official-report-pdf";

export type BudgetMonitoringReportInput = {
  heading: PdfReportHeading;
  /** "FY 2026" or "All Years". */
  allocationLabel: string;
  /** Configured FY allocation, or null when none is set. */
  allocation: number | null;
  /** False when the period cannot be compared against a full annual allocation (headroom unavailable). */
  allocationComparisonAvailable: boolean;
  approved: number;
  released: number;
  liquidated: number;
  purposeCategories: Array<{ category: string; approvedAmount: number; releasedAmount: number; count: number }>;
  organizations: Array<{ urn: string; organizationName: string; barangay: string; totalRequested: number; totalApproved?: number; totalReleased: number; totalLiquidated: number }>;
  records: BudgetMonitoringExportRow[];
  recordsConfig: ReportExportConfig<BudgetMonitoringExportRow>;
  recordsTotalsRow?: ReportCellValue[];
};

const peso = (value: number) => formatCurrencyPdf(value);
const cellText = (value: ReportCellValue | ReportCellValue[] | undefined): string =>
  Array.isArray(value) ? value.map(cellText).join("\n") : value == null ? "" : String(value);

/** Official Budget Monitoring Report: everything on the Budget Monitoring overview, then the monitored records. */
export async function generateBudgetMonitoringReportPdf(input: BudgetMonitoringReportInput, pageConfig?: PdfPageConfig) {
  const r = await createOfficialReport(pageConfig);
  const { approved, released, liquidated } = input;
  const comparableAllocation = input.allocationComparisonAvailable ? input.allocation : null;
  const { pendingDisbursement, remainingHeadroom, isDeficit, deficitAmount } = deriveBudgetMonitoringMetrics({ allocation: comparableAllocation, approved, released });
  const unliquidated = Math.max(released - liquidated, 0);

  drawOfficialHeading(r, {
    heading: input.heading, generatedLabel: "Generated",
    metrics: [
      { label: "Total Approved Amount", value: peso(approved) },
      { label: "Total Released Amount", value: peso(released) },
      { label: "Total Undisbursed Balance", value: peso(pendingDisbursement) },
      { label: "Total Unliquidated Balance", value: peso(unliquidated) },
    ],
  });

  const right = { halign: "right" as const };
  const amountColumn = { cellWidth: 110, ...right };
  const headroomText = remainingHeadroom === null ? "Unavailable" : isDeficit ? `-${peso(deficitAmount)}` : peso(remainingHeadroom);
  drawOfficialTable(r, {
    title: "1. Budget Overview",
    head: ["Indicator", { content: "Amount", styles: { ...bold(r, "").styles, ...right } }, "Details"],
    columnStyles: { 0: { cellWidth: 150 }, 1: amountColumn, 2: { cellWidth: r.width - 260 } },
    body: [
      [bold(r, `${BUDGET_MONITORING_LABELS.allocation} (${input.allocationLabel})`), input.allocation === null ? "Not configured" : peso(input.allocation), "Approved annual statutory ceiling"],
      [bold(r, BUDGET_MONITORING_LABELS.committed), peso(approved), "Approved and committed by administrators"],
      [bold(r, BUDGET_MONITORING_LABELS.pendingDisbursement), peso(pendingDisbursement), "Approved but not yet released"],
      [bold(r, BUDGET_MONITORING_LABELS.released), peso(released), `Disbursed to youth organizations (${percentOf(released, approved)} of approved)`],
      [bold(r, BUDGET_MONITORING_LABELS.liquidated), peso(liquidated), `Released funds cleared through liquidation review (${percentOf(liquidated, released)} cleared)`],
      [bold(r, BUDGET_MONITORING_LABELS.remainingHeadroom), headroomText,
        remainingHeadroom === null ? "Requires a full fiscal period with complete allocation coverage"
          : isDeficit ? "Approved commitments exceed the FY allocation" : `${percentOf(Math.max(remainingHeadroom, 0), comparableAllocation ?? 0)} of the FY allocation available`],
    ],
  });

  const ofAllocation = (value: number | null) => value === null || !comparableAllocation ? "—" : percentOf(value, comparableAllocation);
  drawOfficialTable(r, {
    title: "2. Budget Execution Pipeline",
    head: ["Stage", { content: "Amount", styles: { ...bold(r, "").styles, ...right } }, { content: "% of FY Allocation", styles: { ...bold(r, "").styles, ...right } }],
    columnStyles: { 0: { cellWidth: r.width - 220 }, 1: amountColumn, 2: { cellWidth: 110, ...right } },
    body: [
      [BUDGET_MONITORING_LABELS.releasedAndLiquidated, peso(released), ofAllocation(released)],
      [BUDGET_MONITORING_LABELS.pendingDisbursement, peso(pendingDisbursement), ofAllocation(pendingDisbursement)],
      [BUDGET_MONITORING_LABELS.remainingHeadroom, headroomText, ofAllocation(remainingHeadroom)],
    ],
  });
  if (remainingHeadroom === null) drawNote(r, "Remaining headroom is unavailable for partial periods or when annual allocation coverage is incomplete. Liquidated funds are already included in the released amount.");

  const categories = input.purposeCategories.filter(item => item.approvedAmount > 0 && isCanonicalPurposeCategory(item.category));
  const categoryTotal = categories.reduce((sum, item) => sum + item.approvedAmount, 0);
  drawOfficialTable(r, {
    title: "3. Budget Allocation by Purpose",
    head: ["Purpose / Category", ...["Approved", "Released", "% of Total"].map(label => ({ content: label, styles: { ...bold(r, "").styles, ...right } }))],
    columnStyles: { 0: { cellWidth: r.width - 300 }, 1: amountColumn, 2: amountColumn, 3: { cellWidth: 80, ...right } },
    body: [
      ...(categories.length
        ? categories.map(item => [formatBudgetPurposeCategory(item.category), peso(item.approvedAmount), peso(item.releasedAmount), percentOf(item.approvedAmount, categoryTotal)])
        : [[{ content: "No approved budget requests for this reporting period.", colSpan: 4 }]]),
      [bold(r, "Total"), bold(r, peso(categoryTotal), right), bold(r, peso(categories.reduce((sum, item) => sum + item.releasedAmount, 0)), right), bold(r, categoryTotal > 0 ? "100.00%" : "0.00%", right)],
    ],
  });

  const amount = { cellWidth: 60, ...right };
  drawOfficialTable(r, {
    title: "4. Organization Funding", fontSize: 8,
    head: ["No.", "Organization", "URN", "Barangay", ...["Requested", "Approved", "Released", "Liquidated"].map(label => ({ content: label, styles: { ...bold(r, "").styles, ...right } }))],
    columnStyles: { 0: { cellWidth: 22, halign: "center" }, 1: { cellWidth: r.width - 366 }, 2: { cellWidth: 50 }, 3: { cellWidth: 54 }, 4: amount, 5: amount, 6: amount, 7: amount },
    body: [
      ...(input.organizations.length
        ? input.organizations.map((row, index) => [String(index + 1), row.organizationName, row.urn || "—", row.barangay || "—",
          peso(row.totalRequested), peso(row.totalApproved ?? 0), peso(row.totalReleased), peso(row.totalLiquidated)])
        : [[{ content: "No organizations have budget requests for this reporting period.", colSpan: 8 }]]),
      ["", bold(r, "Total"), "", "",
        ...[(o: typeof input.organizations[number]) => o.totalRequested, (o: typeof input.organizations[number]) => o.totalApproved ?? 0,
          (o: typeof input.organizations[number]) => o.totalReleased, (o: typeof input.organizations[number]) => o.totalLiquidated]
          .map(pick => bold(r, peso(input.organizations.reduce((sum, row) => sum + pick(row), 0)), right))],
    ],
  });

  const columns = input.recordsConfig.columns.filter(column => !column.excludeFromPdf);
  // Fixed widths keep numbers and short headers on one line; text columns share the rest.
  const fixedWidths: Record<string, number> = {
    "No.": 22, "Approved Amount": 57, "Released Amount": 57, "Remaining Amount": 57, Utilization: 48, Deadline: 46, "Risk Level": 32,
  };
  const fixedTotal = columns.reduce((sum, column) => sum + (fixedWidths[column.label] ?? 0), 0);
  const flexible = columns.filter(column => !(column.label in fixedWidths));
  const flexibleWeight = flexible.reduce((sum, column) => sum + (column.pdfWidth ?? 50), 0);
  const widthOf = (column: typeof columns[number]) => fixedWidths[column.label]
    ?? Math.max(40, (column.pdfWidth ?? 50) / (flexibleWeight || 1) * (r.width - fixedTotal));
  const totalWidth = columns.reduce((sum, column) => sum + widthOf(column), 0);
  drawOfficialTable(r, {
    title: "5. Budget Monitoring Records", fontSize: 8,
    head: columns.map(column => column.pdfAlign && column.pdfAlign !== "left"
      ? { content: column.label, styles: { ...bold(r, "").styles, halign: column.pdfAlign } } : column.label),
    columnStyles: Object.fromEntries(columns.map((column, index) => [index, { cellWidth: widthOf(column) / totalWidth * r.width, halign: column.pdfAlign ?? "left" }])),
    body: [
      ...input.records.map((row, index) => columns.map(column => cellText((column.pdfValue ?? column.value)(row, index)))),
      ...(input.recordsTotalsRow ? [input.recordsTotalsRow.map((cell, index) => bold(r, cellText(cell), { halign: columns[index]?.pdfAlign ?? "left" }))] : []),
    ],
  });
  return r.doc;
}
