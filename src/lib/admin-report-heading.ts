import { adminReportMetadata, getAdminReportPeriodLabel, type AdminReportPeriod } from "./admin-report-period";
import type { PdfReportHeading } from "./report-export";

export const ADMIN_REPORT_PROGRAMS = {
  system: "Y-TRACE",
  yorp: "Youth Organization Registration Program",
  ypop: "Youth Participation Organization Passport",
  office: "Pasig City Youth Development Office",
} as const;

/** PDF-only presentation context. It never changes export rows, filters or spreadsheet metadata. */
export function buildAdminReportHeading(input: {
  program: keyof typeof ADMIN_REPORT_PROGRAMS;
  title: string;
  period?: AdminReportPeriod;
  generatedBy?: string;
  generatedAt?: Date;
  filters?: string[];
  sortedBy?: string;
  contextLines?: string[];
  reportingLines?: string[];
  summaryMetrics?: PdfReportHeading["summaryMetrics"];
  summaryMetricsAlign?: PdfReportHeading["summaryMetricsAlign"];
}): PdfReportHeading {
  return {
    programTitle: ADMIN_REPORT_PROGRAMS[input.program],
    title: input.period && input.period.mode !== "all"
      ? `${input.title} — ${getAdminReportPeriodLabel(input.period)}` : input.title,
    generatedBy: input.generatedBy?.trim() || undefined,
    generatedAt: input.generatedAt,
    reportingLines: input.reportingLines ?? (input.period ? [adminReportMetadata(input.period).join(" | ")] : []),
    filters: input.filters,
    sortedBy: input.sortedBy,
    contextLines: input.contextLines,
    summaryMetrics: input.summaryMetrics,
    summaryMetricsAlign: input.summaryMetricsAlign,
  };
}

export const reportFilterValue = (value: string | null | undefined) =>
  !value || value === "all" ? "All" : value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());

/** Describe a sort only when every exported row follows it. Leave the supplied row order untouched. */
export function describeReportOrder<Row>(rows: Row[], rules: Array<{ label: string; compare: (left: Row, right: Row) => number }>, fallback: string): string {
  return rules.find(rule => rows.every((row, index) => index === 0 || rule.compare(rows[index - 1], row) <= 0))?.label ?? fallback;
}

/** Mirrors the existing barangay grouping comparator; this only describes it. */
export function describeAllocationReportOrder(sortBy: string): string {
  if (sortBy === "org_asc" || sortBy === "category_asc") return "District, then Barangay Name (A-Z)";
  if (sortBy === "org_desc" || sortBy === "category_desc") return "District, then Barangay Name (Z-A)";
  const amount = sortBy.startsWith("approved") ? "Approved" : sortBy.startsWith("requested") ? "Requested"
    : sortBy.startsWith("liquidated") ? "Liquidated" : "Released";
  return `District, then ${amount} Amount (${sortBy.endsWith("_asc") ? "Lowest" : "Highest"} first), then Barangay Name (A-Z)`;
}
