export type ReportQuarter = 1 | 2 | 3 | 4;
export type AdminReportPeriod =
  | { mode: "all" }
  | { mode: "quarter_all_years"; quarter: ReportQuarter }
  | { mode: "year"; year: number }
  | { mode: "quarter"; year: number; quarter: ReportQuarter }
  | { mode: "custom"; startDate: string; endDate: string };

/** Initial reporting filters follow the current Philippine calendar quarter. */
export function getCurrentAdminReportPeriod(now = new Date()): Extract<AdminReportPeriod, { mode: "quarter" }> {
  const manila = new Date(now.getTime() + 8 * 3600000);
  return { mode: "quarter", year: manila.getUTCFullYear(), quarter: (Math.floor(manila.getUTCMonth() / 3) + 1) as ReportQuarter };
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const dayAfter = (value: string) => new Date(Date.parse(`${value}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
const dayBefore = (value: string) => new Date(Date.parse(`${value}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
export function getAdminReportRange(period: AdminReportPeriod): { startDate: string | null; endDateExclusive: string | null; quarter?: ReportQuarter } {
  if (period.mode === "all") return { startDate: null, endDateExclusive: null };
  if (period.mode === "quarter_all_years") {
    if (![1, 2, 3, 4].includes(period.quarter)) throw new Error("Choose a valid quarter.");
    return { startDate: null, endDateExclusive: null, quarter: period.quarter };
  }
  if (period.mode === "custom") {
    if (!validDate(period.startDate) || !validDate(period.endDate) || period.startDate > period.endDate) {
      throw new Error("Choose valid start and end dates. Start must be before or equal to end.");
    }
    return { startDate: period.startDate, endDateExclusive: dayAfter(period.endDate) };
  }
  if (!Number.isInteger(period.year) || period.year < 2000 || period.year > 2100) throw new Error("Choose a year between 2000 and 2100.");
  const quarter = period.mode === "quarter" ? period.quarter : 1;
  if (![1, 2, 3, 4].includes(quarter)) throw new Error("Choose a valid quarter.");
  const startDate = `${period.year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`;
  const endDateExclusive = period.mode === "year" || quarter === 4
    ? `${period.year + 1}-01-01` : `${period.year}-${String(quarter * 3 + 1).padStart(2, "0")}-01`;
  return { startDate, endDateExclusive };
}
export function getAdminReportPeriodError(period: AdminReportPeriod): string | null {
  try { getAdminReportRange(period); return null; } catch (error) { return (error as Error).message; }
}
export function getAdminReportPeriodLabel(period: AdminReportPeriod): string {
  if (period.mode === "all") return "All Periods";
  if (period.mode === "quarter_all_years") return `Q${period.quarter} · All Years`;
  if (period.mode === "year") return `${period.year} · All Periods`;
  if (period.mode === "quarter") return `Q${period.quarter} ${period.year}`;
  return `${period.startDate} – ${period.endDate}`;
}
export function getAdminReportFilenameToken(period: AdminReportPeriod): string {
  if (period.mode === "all") return "";
  if (period.mode === "quarter_all_years") return `all-years-q${period.quarter}`;
  if (period.mode === "year") return `${period.year}-all-year`;
  if (period.mode === "quarter") return `${period.year}-q${period.quarter}`;
  return `${period.startDate}-to-${period.endDate}`;
}
export function adminReportFilename(prefix: string, period: AdminReportPeriod): string {
  const token = getAdminReportFilenameToken(period);
  return token ? `${prefix}-${token}` : prefix;
}
export const adminReportTitle = (title: string, period: AdminReportPeriod) => period.mode === "all" ? title : `${title} - ${getAdminReportPeriodLabel(period)}`;
export function adminReportMetadata(period: AdminReportPeriod): string[] {
  if (getAdminReportPeriodError(period)) return ["Reporting Period: Invalid date range"];
  const range = getAdminReportRange(period);
  return [`Reporting Period: ${getAdminReportPeriodLabel(period)}`, ...(range.startDate && range.endDateExclusive
    ? [`Date Range: ${range.startDate} – ${dayBefore(range.endDateExclusive)} (Asia/Manila)`] : [])];
}
/** Date-only fields retain their date; timestamps are interpreted in Asia/Manila. */
export function getManilaReportDate(value: string): string | null {
  if (validDate(value)) return value;
  // Require an explicit offset for timestamp fields; never use the browser's timezone.
  if (!/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time + 8 * 3600000).toISOString().slice(0, 10);
}
export function matchesAdminReportPeriod(value: string | null | undefined, period: AdminReportPeriod): boolean {
  if (period.mode === "all") return true;
  const date = value ? getManilaReportDate(value) : null;
  const range = getAdminReportRange(period);
  if (period.mode === "quarter_all_years") return Boolean(date && Math.ceil(Number(date.slice(5, 7)) / 3) === period.quarter);
  return Boolean(date && date >= range.startDate! && date < range.endDateExclusive!);
}
/** Monitoring's established RPC has an inclusive end and a separate fiscal-year filter. */
export function toBudgetMonitoringPeriod(period: AdminReportPeriod, fiscalYear: number) {
  if (period.mode === "all") return { mode: "all" as const, fiscalYear };
  if (period.mode === "quarter_all_years") return { mode: "quarter_all_years" as const, fiscalYear, quarter: period.quarter };
  if (period.mode === "year") return { mode: "fiscal_year" as const, fiscalYear: period.year };
  const range = getAdminReportRange(period);
  return { mode: "custom" as const, fiscalYear: period.mode === "quarter" ? period.year : fiscalYear,
    startDate: range.startDate!, endDate: dayBefore(range.endDateExclusive!) };
}
export function fromBudgetMonitoringPeriod(period: { mode: "fiscal_year" | "custom" | "all" | "quarter_all_years"; fiscalYear: number; startDate?: string; endDate?: string; quarter?: ReportQuarter }): AdminReportPeriod {
  if (period.mode === "all") return { mode: "all" };
  if (period.mode === "quarter_all_years") return { mode: "quarter_all_years", quarter: period.quarter! };
  if (period.mode === "fiscal_year") return { mode: "year", year: period.fiscalYear };
  for (const quarter of [1, 2, 3, 4] as const) {
    const candidate = { mode: "quarter" as const, year: period.fiscalYear, quarter };
    const range = toBudgetMonitoringPeriod(candidate, period.fiscalYear);
    if (range.mode === "custom" && range.startDate === period.startDate && range.endDate === period.endDate) return candidate;
  }
  return { mode: "custom", startDate: period.startDate ?? "", endDate: period.endDate ?? "" };
}

export function withAdminReportPeriod<T extends { title: string; filenamePrefix: string }>(config: T, period: AdminReportPeriod): T & { filenameDateSuffix?: boolean } {
  return { ...config, title: adminReportTitle(config.title, period), filenamePrefix: adminReportFilename(config.filenamePrefix, period),
    ...(period.mode !== "all" ? { filenameDateSuffix: false } : {}) };
}
