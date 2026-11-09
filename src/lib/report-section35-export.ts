import type { jsPDF } from "jspdf";
import type { YorpQuarterlyReport } from "@/lib/lydo-connect-data";
import {
  downloadBlob,
  formatReportGeneratedAt,
  getExcelColumnLetter,
  resolveExcelJsWorkbook,
  type ReportGenerationContext,
} from "@/lib/report-export";
import { buildAdminReportHeading } from "./admin-report-heading";
import {
  bold, boldStyle, centerOfYouthParticipationRank, createOfficialReport, describeReportingPeriod, drawBullets, drawNote,
  drawNothingFollows, formatCenterOfYouthParticipation,
  drawOfficialHeading, drawOfficialTable, drawReportingMethodology, drawSectionTitle, drawSignatories, groupRow, newPage,
} from "./official-report-pdf";

const DEFAULT_HEADER_TITLE = "PASIG CITY YOUTH DEVELOPMENT OFFICE";
const SUMMARY_REPORT_TITLE = "YORP QUARTERLY SUMMARY REPORT";
const DISAGGREGATED_REPORT_TITLE = "YORP DISAGGREGATED REPORT";

export const getQuarterPeriodLabel = (year: number, quarter: number): string => {
  switch (quarter) {
    case 1:
      return `January 1, ${year} – March 31, ${year}`;
    case 2:
      return `April 1, ${year} – June 30, ${year}`;
    case 3:
      return `July 1, ${year} – September 30, ${year}`;
    case 4:
      return `October 1, ${year} – December 31, ${year}`;
    default:
      return `Quarter ${quarter}, ${year}`;
  }
};

const getSummaryFilename = (year: number, quarter: number, format: "pdf" | "xlsx") =>
  `YORP_Quarterly_Summary_${year}_Q${quarter}.${format}`;

const getDisaggregatedFilename = (year: number, quarter: number, format: "pdf" | "xlsx") =>
  `YORP_Disaggregated_Report_${year}_Q${quarter}.${format}`;

// ==============================================================================
// 1. PDF EXPORT GENERATORS
// ==============================================================================

const quarterPeriod = (report: YorpQuarterlyReport) =>
  ({ mode: "quarter" as const, year: report.year, quarter: report.quarter as 1 | 2 | 3 | 4 });

/**
 * Generates the official YORP Quarterly Summary Report PDF.
 */
export const generateSection35QuarterlySummaryPdf = async (
  report: YorpQuarterlyReport,
  context: ReportGenerationContext = {},
): Promise<jsPDF> => {
  const r = await createOfficialReport();
  drawOfficialHeading(r, {
    heading: buildAdminReportHeading({
      program: "yorp", title: "Quarterly Summary Report", period: quarterPeriod(report), ...context,
      contextLines: [`Quarter-End Point-in-Time Date: ${report.quarter_end_date}`],
    }),
  });

  drawOfficialTable(r, {
    head: ["Code", "Indicator", "Count"],
    headStyle: "navy",
    columnStyles: {
      0: { cellWidth: 60, halign: "center", ...boldStyle(r) },
      1: { cellWidth: r.width - 120 },
      2: { cellWidth: 60, halign: "center", ...boldStyle(r) },
    },
    body: [
      ["Metric A", "Total Registered and Verified Youth and Youth-Serving Organizations as of Quarter End", String(report.metrics.registered_verified_at_quarter_end)],
      ["Metric B", "New Registration Applications Received During the Quarter", String(report.metrics.applications_received)],
      ["Metric C", "New Registration Applications Approved During the Quarter", String(report.metrics.applications_approved)],
    ],
    gapAfter: 26,
  });

  drawSectionTitle(r, "I. Reporting Scope and Period", 11);
  drawBullets(r, [
    { lead: "Organizations Covered.", text: "This report covers youth and youth-serving organizations recorded in the Pasig City Youth Development Office (PCYDO) registry at the city/municipal level. The registry does not currently distinguish organizations by operational coverage, such as barangay-based or city-wide." },
    { lead: "Reporting Period.", text: "The reporting quarter begins at 12:00 AM on the first day of the quarter and ends immediately before 12:00 AM on the first day of the following quarter, based on Philippine Standard Time (UTC+08:00). Application counts are determined using the applicable submission or approval date." },
  ]);
  drawSectionTitle(r, "II. Indicator Definitions and Counting Rules", 11);
  drawBullets(r, [
    { lead: "Registered and Verified Organizations.", text: "Refers to the number of organizations with verified registration status as of the end of the reporting quarter." },
    { lead: "New Registration Applications Received.", text: "Refers to the number of initial registration applications submitted during the reporting quarter. Renewal applications are excluded." },
    { lead: "New Registration Applications Approved.", text: "Refers to the number of initial registration applications approved during the reporting quarter, regardless of when they were originally submitted." },
  ]);

  drawSignatories(r);
  drawNothingFollows(r);
  return r.doc;
};

/**
 * Generates the official YORP Disaggregated Report PDF.
 */
export const generateSection35DisaggregatedPdf = async (
  report: YorpQuarterlyReport,
  context: ReportGenerationContext = {},
): Promise<jsPDF> => {
  const r = await createOfficialReport();
  const metricA = report.metrics.registered_verified_at_quarter_end;
  drawOfficialHeading(r, {
    heading: buildAdminReportHeading({
      program: "yorp", title: "Disaggregated Report", period: quarterPeriod(report), ...context,
      contextLines: [`Authoritative Population Base (Metric A): ${metricA} registered and verified organizations at quarter end`],
    }),
  });

  const pct = (value: number) => `${Number(value).toFixed(2)}%`;
  const third = r.width / 3;
  const thirds = { 0: { cellWidth: third }, 1: { cellWidth: third }, 2: { cellWidth: third } };
  const totalRow = () => [bold(r, "Total (Metric A)"), bold(r, metricA), bold(r, "100.00%")];
  const breakdown = (title: string, firstColumn: string, rows: Array<{ label: string; count: number; percentage: number }>, withTotal = true) =>
    drawOfficialTable(r, {
      title, head: [firstColumn, "Organizations", "% of Metric A"], columnStyles: thirds,
      body: [...rows.map(row => [row.label, String(row.count), pct(row.percentage)]), ...(withTotal ? [totalRow()] : [])],
    });

  const d = report.disaggregation;
  breakdown("1. Major Classification", "Classification", d.major_classification);
  breakdown("2. Sub-Classification", "Classification", d.sub_classification);
  breakdown("3. Organizational Level", "Level", d.organizational_level);
  breakdown("4. Centers of Youth Participation", "Theme", [...d.advocacy_themes]
    .sort((a, b) => centerOfYouthParticipationRank(a.theme) - centerOfYouthParticipationRank(b.theme))
    .map(row => ({ label: formatCenterOfYouthParticipation(row.theme), count: row.count, percentage: row.percentage })), false);
  drawNote(r, "Non-additive: An organization may have multiple advocacy themes, so it may appear under more than one theme. Consequently, the totals across themes may exceed the number of unique participating organizations. Percentages reflect proportion of Metric A.");
  breakdown("5.1 Geography \u2014District Summary", "District", d.geography.districts.map(row => ({ label: row.district, count: row.count, percentage: row.percentage })));

  const barangayBody = d.geography.districts.flatMap(district => {
    const rows = d.geography.barangays.filter(row => row.district === district.district);
    return [
      groupRow(r, district.district, 4),
      [bold(r, "No."), bold(r, "Barangay"), bold(r, "Organizations"), bold(r, "% of Metric A")],
      ...rows.map((row, index) => [String(index + 1), row.barangay, String(row.count), pct(row.percentage)]),
      ["", bold(r, `${district.district} Subtotal`), bold(r, district.count), bold(r, pct(district.percentage))],
    ];
  });
  drawOfficialTable(r, {
    title: "5.2 Geography \u2014Barangay Summary", columnCount: 4, body: barangayBody,
    columnStyles: { 0: { cellWidth: 32, halign: "center" }, 1: { cellWidth: 194 }, 2: { cellWidth: 112 }, 3: { cellWidth: r.width - 338 } },
  });

  newPage(r);
  drawReportingMethodology(r, describeReportingPeriod({
    label: `Q${report.quarter} ${report.year}`,
    startDate: report.quarter_start.slice(0, 10),
    endDate: report.quarter_end_date,
    referenceDate: report.quarter_end_date,
  }));
  drawSignatories(r);
  drawNothingFollows(r);
  return r.doc;
};

// ==============================================================================
// 2. XLSX EXPORT GENERATORS
// ==============================================================================

const applyExcelHeaderStyle = (
  worksheet: any,
  rowNumber: number,
  columnCount: number,
) => {
  const row = worksheet.getRow(rowNumber);
  row.height = 26;
  for (let col = 1; col <= columnCount; col++) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "2460A7" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "BEC6D2" } },
      left: { style: "thin", color: { argb: "BEC6D2" } },
      bottom: { style: "thin", color: { argb: "BEC6D2" } },
      right: { style: "thin", color: { argb: "BEC6D2" } },
    };
  }
};

const applyExcelTotalRowStyle = (
  worksheet: any,
  rowNumber: number,
  columnCount: number,
) => {
  const row = worksheet.getRow(rowNumber);
  row.height = 22;
  for (let col = 1; col <= columnCount; col++) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: "202939" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F0F4F8" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "BEC6D2" } },
      left: { style: "thin", color: { argb: "BEC6D2" } },
      bottom: { style: "thin", color: { argb: "BEC6D2" } },
      right: { style: "thin", color: { argb: "BEC6D2" } },
    };
  }
};

const applyExcelDataBorders = (cell: any, isZebra: boolean) => {
  cell.border = {
    top: { style: "thin", color: { argb: "D2DAE2" } },
    left: { style: "thin", color: { argb: "D2DAE2" } },
    bottom: { style: "thin", color: { argb: "D2DAE2" } },
    right: { style: "thin", color: { argb: "D2DAE2" } },
  };
  if (isZebra) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F8FAFC" },
    };
  }
};

/**
 * Generates the official Section 35 Quarterly Summary Report XLSX workbook buffer.
 */
export const generateSection35QuarterlySummaryXlsx = async (
  report: YorpQuarterlyReport,
): Promise<ArrayBuffer> => {
  const Workbook = await resolveExcelJsWorkbook();
  const workbook = new Workbook();
  workbook.creator = "Pasig City Youth Development Office";
  workbook.created = new Date();

  // Sheet 1: Quarterly Summary
  const summarySheet = workbook.addWorksheet("Quarterly Summary");
  const periodLabel = getQuarterPeriodLabel(report.year, report.quarter);

  // Title block
  summarySheet.mergeCells("A1:D1");
  const t1 = summarySheet.getCell("A1");
  t1.value = DEFAULT_HEADER_TITLE;
  t1.font = { bold: true, size: 14, color: { argb: "202939" } };
  t1.alignment = { vertical: "middle", horizontal: "left" };
  summarySheet.getRow(1).height = 22;

  summarySheet.mergeCells("A2:D2");
  const t2 = summarySheet.getCell("A2");
  t2.value = SUMMARY_REPORT_TITLE;
  t2.font = { bold: true, size: 12, color: { argb: "2460A7" } };
  t2.alignment = { vertical: "middle", horizontal: "left" };
  summarySheet.getRow(2).height = 20;

  const metaRows = [
    `Reporting Period: Quarter ${report.quarter}, ${report.year} (${periodLabel})`,
    `Quarter-End Point-in-Time Date: ${report.quarter_end_date}`,
    `Timezone: Asia/Manila (PST, UTC+08:00)`,
    `Generated: ${formatReportGeneratedAt()}`,
  ];

  let curRow = 3;
  metaRows.forEach((txt) => {
    summarySheet.mergeCells(`A${curRow}:D${curRow}`);
    const c = summarySheet.getCell(`A${curRow}`);
    c.value = txt;
    c.font = { size: 9.5, color: { argb: "5C6678" } };
    c.alignment = { vertical: "middle", horizontal: "left" };
    summarySheet.getRow(curRow).height = 18;
    curRow++;
  });

  curRow++; // empty spacing row

  // Section Header: Statutory Core Metrics
  const coreHeaderRow = curRow;
  const coreHeaders = ["Metric Code", "Statutory Metric Description", "Methodology / Baseline", "Count"];
  coreHeaders.forEach((h, idx) => {
    summarySheet.getCell(coreHeaderRow, idx + 1).value = h;
  });
  applyExcelHeaderStyle(summarySheet, coreHeaderRow, 4);

  const coreData = [
    ["Metric A", "Total Registered and Verified Youth Organizations at Quarter End", "Point-in-time quarter-end population (authoritative accreditation terms)", report.metrics.registered_verified_at_quarter_end],
    ["Metric B", "Total Registration Applications Received in Quarter", "Initial registration applications formally submitted in quarter interval", report.metrics.applications_received],
    ["Metric C", "Total Registration Applications Approved in Quarter", "Initial registration accreditation approvals (Term 1) within quarter", report.metrics.applications_approved],
  ];

  curRow++;
  coreData.forEach((rowVals, rIdx) => {
    const row = summarySheet.getRow(curRow);
    row.height = 24;
    rowVals.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.alignment = {
        vertical: "middle",
        horizontal: cIdx === 0 ? "center" : cIdx === 3 ? "right" : "left",
      };
      if (cIdx === 3) cell.numFmt = "#,##0";
      applyExcelDataBorders(cell, rIdx % 2 === 1);
    });
    curRow++;
  });

  curRow += 2;

  // Methodology / Disclosures
  summarySheet.mergeCells(`A${curRow}:D${curRow}`);
  const dTitle = summarySheet.getCell(`A${curRow}`);
  dTitle.value = "STATUTORY REPORTING DISCLOSURES & METHODOLOGY";
  dTitle.font = { bold: true, size: 10, color: { argb: "202939" } };
  curRow++;

  const disclosures = [
    "1. Organizational Level Scope: " + report.metadata.organizational_level_note,
    "2. Authoritative Profile Classification: " + report.metadata.classification_note,
    "3. Advocacy Themes Non-Additive: " + report.metadata.advocacy_note,
    "4. Statutory Half-Open Interval: Quarterly boundaries are strictly evaluated as half-open intervals [start_date 00:00:00, next_quarter_start 00:00:00) in Asia/Manila (UTC+08:00).",
  ];

  disclosures.forEach((d) => {
    summarySheet.mergeCells(`A${curRow}:D${curRow}`);
    const c = summarySheet.getCell(`A${curRow}`);
    c.value = d;
    c.font = { size: 8.5, color: { argb: "5C6678" } };
    c.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    summarySheet.getRow(curRow).height = 24;
    curRow++;
  });

  summarySheet.columns = [
    { width: 14 },
    { width: 44 },
    { width: 50 },
    { width: 16 },
  ];

  summarySheet.views = [{ state: "frozen", ySplit: coreHeaderRow }];

  // Sheet 2: Metadata
  const metaSheet = workbook.addWorksheet("Metadata");
  metaSheet.columns = [{ width: 28 }, { width: 65 }];

  metaSheet.getRow(1).values = ["Parameter / Key", "Value"];
  applyExcelHeaderStyle(metaSheet, 1, 2);

  const metaEntries = [
    ["Report Title", SUMMARY_REPORT_TITLE],
    ["Reporting Year", report.year],
    ["Reporting Quarter", `Q${report.quarter}`],
    ["Reporting Period", periodLabel],
    ["Quarter-End Point-in-Time Date", report.quarter_end_date],
    ["Quarter Interval Start", report.quarter_start],
    ["Quarter Interval End", report.quarter_end],
    ["Timezone", report.timezone],
    ["Generated At", report.metadata.generated_at],
    ["Organizational Level Scope", report.metadata.organizational_level_note],
    ["Classification Note", report.metadata.classification_note],
    ["Advocacy Themes Note", report.metadata.advocacy_note],
  ];

  metaEntries.forEach((entry, idx) => {
    const rNum = idx + 2;
    const row = metaSheet.getRow(rNum);
    row.values = entry;
    row.height = 20;
    const c1 = row.getCell(1);
    const c2 = row.getCell(2);
    c1.font = { bold: true };
    c1.alignment = { vertical: "middle", horizontal: "left" };
    c2.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    applyExcelDataBorders(c1, idx % 2 === 1);
    applyExcelDataBorders(c2, idx % 2 === 1);
  });

  metaSheet.views = [{ state: "frozen", ySplit: 1 }];

  return await workbook.xlsx.writeBuffer();
};

/**
 * Generates the official YORP Disaggregated Report XLSX workbook buffer.
 */
export const generateSection35DisaggregatedXlsx = async (
  report: YorpQuarterlyReport,
): Promise<ArrayBuffer> => {
  const Workbook = await resolveExcelJsWorkbook();
  const workbook = new Workbook();
  workbook.creator = "Pasig City Youth Development Office";
  workbook.created = new Date();

  const metricATotal = report.metrics.registered_verified_at_quarter_end;

  // Helper to build a standard disaggregation sheet
  const buildDisaggSheet = (
    sheetName: string,
    titleText: string,
    headers: string[],
    dataRows: Array<[string, number, number]>,
    colWidths: number[],
  ) => {
    const sheet = workbook.addWorksheet(sheetName);

    // Title Block
    sheet.mergeCells(`A1:${getExcelColumnLetter(headers.length)}1`);
    const t1 = sheet.getCell("A1");
    t1.value = `${DEFAULT_HEADER_TITLE} - ${DISAGGREGATED_REPORT_TITLE}`;
    t1.font = { bold: true, size: 12, color: { argb: "202939" } };
    t1.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(1).height = 22;

    sheet.mergeCells(`A2:${getExcelColumnLetter(headers.length)}2`);
    const t2 = sheet.getCell("A2");
    t2.value = `${titleText} (Q${report.quarter} ${report.year} | Metric A Population = ${metricATotal})`;
    t2.font = { bold: true, size: 10, color: { argb: "2460A7" } };
    t2.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(2).height = 20;

    // Headers
    const headerRow = 4;
    headers.forEach((h, i) => {
      sheet.getCell(headerRow, i + 1).value = h;
    });
    applyExcelHeaderStyle(sheet, headerRow, headers.length);

    let rIdx = 5;
    dataRows.forEach((row, idx) => {
      const dataRow = sheet.getRow(rIdx);
      dataRow.height = 22;

      dataRow.getCell(1).value = row[0];
      dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

      const countCell = dataRow.getCell(2);
      countCell.value = row[1];
      countCell.numFmt = "#,##0";
      countCell.alignment = { vertical: "middle", horizontal: "right" };

      const pctCell = dataRow.getCell(3);
      pctCell.value = row[2] / 100;
      pctCell.numFmt = "0.00%";
      pctCell.alignment = { vertical: "middle", horizontal: "right" };

      for (let c = 1; c <= 3; c++) {
        applyExcelDataBorders(dataRow.getCell(c), idx % 2 === 1);
      }
      rIdx++;
    });

    // Total Row
    if (sheetName !== "Advocacy Themes") {
      const totRow = sheet.getRow(rIdx);
      totRow.getCell(1).value = "Total (Metric A)";
      totRow.getCell(2).value = metricATotal;
      totRow.getCell(2).numFmt = "#,##0";
      totRow.getCell(3).value = 1;
      totRow.getCell(3).numFmt = "0.00%";
      totRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      totRow.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
      totRow.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
      applyExcelTotalRowStyle(sheet, rIdx, headers.length);
    }

    sheet.columns = colWidths.map((w) => ({ width: w }));
    sheet.views = [{ state: "frozen", ySplit: headerRow }];
  };

  // 1. Major Classification Sheet
  buildDisaggSheet(
    "Major Classification",
    "Organizations by Major Classification",
    ["Major Classification", "Organization Count", "Percentage of Metric A"],
    report.disaggregation.major_classification.map((r) => [r.label, r.count, r.percentage]),
    [32, 22, 24],
  );

  // 2. Sub-Classification Sheet
  buildDisaggSheet(
    "Sub-Classification",
    "Organizations by Sub-Classification",
    ["Sub-Classification", "Organization Count", "Percentage of Metric A"],
    report.disaggregation.sub_classification.map((r) => [r.label, r.count, r.percentage]),
    [32, 22, 24],
  );

  // 3. Organizational Level Sheet
  buildDisaggSheet(
    "Organizational Level",
    "Organizations by Organizational Level",
    ["Organizational Level", "Organization Count", "Percentage of Metric A"],
    report.disaggregation.organizational_level.map((r) => [r.label, r.count, r.percentage]),
    [32, 22, 24],
  );

  // 4. Advocacy Themes Sheet
  buildDisaggSheet(
    "Advocacy Themes",
    "Organizations by Canonical Y-TRACE Advocacy Theme (Non-Additive)",
    ["Canonical Advocacy Theme", "Organizations Selected", "Proportion of Organizations"],
    report.disaggregation.advocacy_themes.map((r) => [r.theme, r.count, r.percentage]),
    [35, 24, 26],
  );

  // 5. Geography - District Sheet
  buildDisaggSheet(
    "Geography - District",
    "Organizations by Pasig City District",
    ["District", "Organization Count", "Percentage of Metric A"],
    report.disaggregation.geography.districts.map((r) => [r.district, r.count, r.percentage]),
    [28, 22, 24],
  );

  // 6. Geography - Barangay Sheet
  const brgySheet = workbook.addWorksheet("Geography - Barangay");
  brgySheet.mergeCells("A1:E1");
  brgySheet.getCell("A1").value = `${DEFAULT_HEADER_TITLE} - ${DISAGGREGATED_REPORT_TITLE}`;
  brgySheet.getCell("A1").font = { bold: true, size: 12, color: { argb: "202939" } };
  brgySheet.getRow(1).height = 22;

  brgySheet.mergeCells("A2:E2");
  brgySheet.getCell("A2").value = `Barangay Breakdown (All 30 Canonical Barangays | Metric A = ${metricATotal})`;
  brgySheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "2460A7" } };
  brgySheet.getRow(2).height = 20;

  const brgyHeaders = ["No.", "Barangay", "District", "Organization Count", "Percentage of Metric A"];
  brgyHeaders.forEach((h, i) => {
    brgySheet.getCell(4, i + 1).value = h;
  });
  applyExcelHeaderStyle(brgySheet, 4, 5);

  let bRowIdx = 5;
  report.disaggregation.geography.barangays.forEach((b, idx) => {
    const row = brgySheet.getRow(bRowIdx);
    row.height = 20;
    row.getCell(1).value = b.ordinal;
    row.getCell(2).value = b.barangay;
    row.getCell(3).value = b.district;

    const countCell = row.getCell(4);
    countCell.value = b.count;
    countCell.numFmt = "#,##0";

    const pctCell = row.getCell(5);
    pctCell.value = b.percentage / 100;
    pctCell.numFmt = "0.00%";

    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    row.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
    row.getCell(3).alignment = { vertical: "middle", horizontal: "left" };
    countCell.alignment = { vertical: "middle", horizontal: "right" };
    pctCell.alignment = { vertical: "middle", horizontal: "right" };

    for (let c = 1; c <= 5; c++) {
      applyExcelDataBorders(row.getCell(c), idx % 2 === 1);
    }
    bRowIdx++;
  });

  const bTotRow = brgySheet.getRow(bRowIdx);
  bTotRow.getCell(1).value = "";
  bTotRow.getCell(2).value = "Total (Metric A)";
  bTotRow.getCell(3).value = "";
  bTotRow.getCell(4).value = metricATotal;
  bTotRow.getCell(4).numFmt = "#,##0";
  bTotRow.getCell(5).value = 1;
  bTotRow.getCell(5).numFmt = "0.00%";
  bTotRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
  bTotRow.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
  bTotRow.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
  applyExcelTotalRowStyle(brgySheet, bRowIdx, 5);

  brgySheet.columns = [
    { width: 8 },
    { width: 28 },
    { width: 18 },
    { width: 22 },
    { width: 24 },
  ];
  brgySheet.views = [{ state: "frozen", ySplit: 4 }];

  // 7. Methodology & Notes Sheet
  const notesSheet = workbook.addWorksheet("Methodology & Notes");
  notesSheet.columns = [{ width: 30 }, { width: 75 }];
  notesSheet.getRow(1).values = ["Section", "Methodology Disclosure"];
  applyExcelHeaderStyle(notesSheet, 1, 2);

  const notesRows = [
    ["1. Organizational Level Scope", report.metadata.organizational_level_note],
    ["2. Profile Classification Baseline", report.metadata.classification_note],
    ["3. Advocacy Themes Specification", report.metadata.advocacy_note],
    ["4. Point-in-Time Population", `Evaluated at quarter-end date ${report.quarter_end_date} in Asia/Manila (UTC+08:00).`],
    ["5. Geographic Administration", "30 canonical Pasig barangays mapped into District I (22 barangays) and District II (8 barangays)."],
  ];

  notesRows.forEach((entry, idx) => {
    const rNum = idx + 2;
    const row = notesSheet.getRow(rNum);
    row.values = entry;
    row.height = 26;
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    row.getCell(2).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    applyExcelDataBorders(row.getCell(1), idx % 2 === 1);
    applyExcelDataBorders(row.getCell(2), idx % 2 === 1);
  });

  notesSheet.views = [{ state: "frozen", ySplit: 1 }];

  return await workbook.xlsx.writeBuffer();
};

// ==============================================================================
// 3. MAIN EXPORT ACTIONS (DOWNLOAD TRIGGER)
// ==============================================================================

/**
 * Triggers download of YORP Quarterly Summary Report in PDF or XLSX.
 */
export const exportYorpQuarterlySummary = async (
  report: YorpQuarterlyReport,
  format: "pdf" | "xlsx",
  context: ReportGenerationContext = {},
): Promise<void> => {
  const filename = getSummaryFilename(report.year, report.quarter, format);

  if (format === "pdf") {
    const doc = await generateSection35QuarterlySummaryPdf(report, context);
    doc.save(filename);
    return;
  }

  const buffer = await generateSection35QuarterlySummaryXlsx(report);
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
};

/**
 * Triggers download of YORP Disaggregated Report in PDF or XLSX.
 */
export const exportYorpDisaggregatedReport = async (
  report: YorpQuarterlyReport,
  format: "pdf" | "xlsx",
  context: ReportGenerationContext = {},
): Promise<void> => {
  const filename = getDisaggregatedFilename(report.year, report.quarter, format);

  if (format === "pdf") {
    const doc = await generateSection35DisaggregatedPdf(report, context);
    doc.save(filename);
    return;
  }

  const buffer = await generateSection35DisaggregatedXlsx(report);
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
};

// Backward-compatible exports
export const exportSection35QuarterlySummary = exportYorpQuarterlySummary;
export const exportSection35DisaggregatedReport = exportYorpDisaggregatedReport;
export const generateYorpQuarterlySummaryPdf = generateSection35QuarterlySummaryPdf;
export const generateYorpDisaggregatedPdf = generateSection35DisaggregatedPdf;
export const generateYorpQuarterlySummaryXlsx = generateSection35QuarterlySummaryXlsx;
export const generateYorpDisaggregatedXlsx = generateSection35DisaggregatedXlsx;

