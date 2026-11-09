import { it, expect } from "vitest";
import { jsPDF } from "jspdf";
import { generateReportPdfDocument, exportReportAsPdf, type PdfPageConfig, type ReportExportConfig, type ReportExportOptions } from "./report-export";
import { yorpRegistryExportConfig, budgetRequestExportConfig, allocationByBarangayExportConfig, budgetMonitoringExportConfig, buildBudgetMonitoringPdfTotalsRow } from "./report-export-configs";
import { ypopParticipationExportConfig } from "./ypop-participation-report";
import { liquidationReportExportConfig } from "./liquidation-report-export";
import { activityLogExportConfig } from "./activity-log-export";
import { buildAdminReportHeading } from "./admin-report-heading";
import { generateYpopQualificationReportPdf } from "./ypop-points-qualification-report";
import { generateBudgetMonitoringReportPdf } from "./budget-monitoring-report-pdf";
import { CANONICAL_PASIG_BARANGAYS, getPasigDistrictForBarangay } from "./pasig-districts";

// Rows that answer any field with a plausible value, so every column renders.
const sampleRow = (i: number) => new Proxy({}, {
  get: (_target, prop) => {
    const key = String(prop);
    if (key === "toJSON" || key === "then") return undefined;
    if (/amount|rate|points|count|total|bonus|subtotal|activities$|size/i.test(key)) return 1000 * (i + 1);
    if (/(At|Date|date|Until)$/.test(key)) return "2026-03-15T08:00:00.000Z";
    if (/advocacies|emails|numbers|files/i.test(key)) return [];
    if (key === "status") return "approved";
    return `Sample ${key} ${i + 1}`;
  },
});
const rows = Array.from({ length: 18 }, (_, i) => sampleRow(i));

const heading = (title: string) => buildAdminReportHeading({
  program: "office", title, period: { mode: "quarter", year: 2026, quarter: 4 }, generatedBy: "Administrator",
  filters: ["District: All", "Barangay: All", "Classification: All"], sortedBy: "Default",
  summaryMetrics: [{ label: "Total Records", value: "18" }, { label: "Total Approved Amount", value: "₱1,234,567.00" }, { label: "Total Released Amount", value: "₱1,234,567.00" }],
  summaryMetricsAlign: "center",
});

const tabular: Array<[string, ReportExportConfig<unknown>]> = [
  ["YORP Registry", yorpRegistryExportConfig as ReportExportConfig<unknown>],
  ["Budget Requests", budgetRequestExportConfig as ReportExportConfig<unknown>],
  ["Allocation by Barangay", allocationByBarangayExportConfig as ReportExportConfig<unknown>],
  ["Budget Monitoring (records)", budgetMonitoringExportConfig as ReportExportConfig<unknown>],
  ["YPOP Participation", ypopParticipationExportConfig as ReportExportConfig<unknown>],
  ["Liquidation Reports", liquidationReportExportConfig as ReportExportConfig<unknown>],
  ["Activity Logs", activityLogExportConfig as ReportExportConfig<unknown>],
  ["Administrators", { title: "Administrators", filenamePrefix: "admins", pdfUseUnicodeFont: true, orientation: "landscape",
    columns: ["Name", "Email", "Role", "Status", "Last Sign-in"].map(label => ({ label, value: (row: Record<string, string>) => row[label] })) } as ReportExportConfig<unknown>],
];

const ypopRows = CANONICAL_PASIG_BARANGAYS.map((b, i) => ({
  organizationId: `o${i}`, organizationName: `Org ${i}`, urn: `01-26-${i}`, mandatoryPoints: 0, invitationalPoints: 0, partnershipPoints: 0,
  cityLedSubtotal: 0, verifiedOrgLedActivities: 0, orgLedBonus: 0, totalPoints: 70, status: i % 3 ? "qualified" as const : "not_qualified" as const,
  latestActivityDate: "2026-11-01", majorClassification: "Youth Organization", subClassification: "community-based", advocacies: ["education"],
  district: getPasigDistrictForBarangay(b.name) || "District I", barangay: b.name,
}));
const bmRecords = Array.from({ length: 8 }, (_, i) => ({ organizationName: `Org ${i}`, recordCode: `BR-${i}`, activity: `Activity ${i}`, approvedAmount: 20000,
  releasedAmount: 10000, remainingAmount: 10000, utilizationRate: 50, budgetStatus: "Released", liquidationStatus: "Pending", releaseDate: "", goSignalAt: "",
  deadlineAt: "2026-12-01", hardCopySubmittedAt: "", completedAt: "", remarks: "", riskLabel: "Low" }));
const budgetMonitoringPdf = (cfg?: PdfPageConfig) => generateBudgetMonitoringReportPdf({
  heading: heading("Budget Monitoring Report"), allocationLabel: "FY 2026", allocation: 1500000, allocationComparisonAvailable: true,
  approved: 160000, released: 80000, liquidated: 20000,
  purposeCategories: [{ category: "health", approvedAmount: 100000, releasedAmount: 50000, count: 2 }, { category: "education", approvedAmount: 60000, releasedAmount: 30000, count: 1 }],
  organizations: bmRecords.map((r, i) => ({ urn: `01-26-${i}`, organizationName: r.organizationName, barangay: "Palatiw", totalRequested: 25000, totalApproved: 20000, totalReleased: 10000, totalLiquidated: 0 })),
  records: bmRecords, recordsConfig: budgetMonitoringExportConfig, recordsTotalsRow: buildBudgetMonitoringPdfTotalsRow(bmRecords),
}, cfg);

const orientations: PdfPageConfig[] = [{ paperSize: "a4", orientation: "portrait" }, { paperSize: "a4", orientation: "landscape" }];

it("every PDF export honours the selected portrait or landscape orientation", async () => {
  const results: string[] = [];
  const failures: string[] = [];
  const check = (name: string, cfg: PdfPageConfig, build: () => Promise<jsPDF>) => build().then(doc => {
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const ok = cfg.orientation === "landscape" ? width > height : height > width;
    results.push(`${ok ? "OK" : "FAIL"} ${name} ${cfg.orientation} ${Math.round(width)}x${Math.round(height)} pages=${doc.getNumberOfPages()}`);
    if (!ok) failures.push(`${name} ${cfg.orientation}`);
  }, (error: Error) => {
    results.push(`ERR ${name} ${cfg.orientation}: ${error.message}`);
    failures.push(`${name} ${cfg.orientation}`);
  });

  for (const cfg of orientations) {
    for (const [name, config] of tabular) {
      await check(name, cfg, () => generateReportPdfDocument({ config, rows, pdfHeading: heading(name), pageConfig: cfg } as ReportExportOptions<unknown>));
    }
    await check("YPOP Qualification (official)", cfg, () => generateYpopQualificationReportPdf(ypopRows, heading("Qualification Report"), { mode: "quarter", year: 2026, quarter: 4 }, cfg));
    await check("Budget Monitoring (official)", cfg, () => budgetMonitoringPdf(cfg));
  }

  // Dialog path: exportReport(pdf, options, pageConfig) must hand the chosen orientation to the official renderer.
  let received: PdfPageConfig | undefined;
  const originalSave = jsPDF.prototype.save;
  jsPDF.prototype.save = function save(this: jsPDF) { return this; } as typeof jsPDF.prototype.save;
  try {
    await exportReportAsPdf({ config: budgetMonitoringExportConfig, rows: [], pageConfig: { paperSize: "a4", orientation: "landscape" },
      pdfRenderer: cfg => { received = cfg; return budgetMonitoringPdf(cfg); } });
  } finally {
    jsPDF.prototype.save = originalSave;
  }
  if (received?.orientation !== "landscape") failures.push(`pdfRenderer received ${JSON.stringify(received)}`);

  expect(failures, results.join("\n")).toEqual([]);
}, 120000);
