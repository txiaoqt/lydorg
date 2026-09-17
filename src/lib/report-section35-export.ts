import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { YorpQuarterlyReport } from "@/lib/lydo-connect-data";
import {
  applyOfficialTemplateBackground,
  downloadBlob,
  formatReportGeneratedAt,
  getExcelColumnLetter,
  PDF_COLORS,
  renderPdfPageDecoration,
  resolveExcelJsWorkbook,
  type PdfHeaderLayout,
} from "@/lib/report-export";
import {
  PCYDO_HEADER_ASPECT_RATIO,
  PCYDO_FOOTER_ASPECT_RATIO,
} from "@/lib/report-letterhead-assets";

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
  `YORP_Disaggregated_${year}_Q${quarter}.${format}`;

// ==============================================================================
// 1. PDF EXPORT GENERATORS
// ==============================================================================

const createBaseReportPdf = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });
  applyOfficialTemplateBackground(doc);
  return doc;
};

/**
 * Generates the official YORP Quarterly Summary Report PDF.
 */
export const generateSection35QuarterlySummaryPdf = async (
  report: YorpQuarterlyReport,
): Promise<jsPDF> => {
  const doc = createBaseReportPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 42.64; // ~15mm (595.28 - 2*42.64 = 510.00pt content width)
  const marginRight = 42.64;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const headerHeight = pageWidth / PCYDO_HEADER_ASPECT_RATIO;
  const footerHeight = pageWidth / PCYDO_FOOTER_ASPECT_RATIO;

  const periodLabel = getQuarterPeriodLabel(report.year, report.quarter);
  const detailLines = [
    `Reporting Period: Quarter ${report.quarter}, ${report.year} (${periodLabel})`,
    `Quarter-End Point-in-Time Date: ${report.quarter_end_date}`,
    `Timezone: Asia/Manila (PST, UTC+08:00)`,
    `Generated: ${formatReportGeneratedAt()}`,
  ];

  // Calculate start position for body
  const titleY = headerHeight + 14;
  let currentY = titleY + 16;
  detailLines.forEach((line) => {
    currentY += 11;
  });
  const dividerY = currentY + 4;
  const startY = dividerY + 10;

  const layout: PdfHeaderLayout = {
    headerTitle: DEFAULT_HEADER_TITLE,
    reportTitle: SUMMARY_REPORT_TITLE,
    footerText: `Pasig City Youth Development Office - YORP Quarterly Summary Report (Q${report.quarter} ${report.year})`,
    detailLines,
    pageWidth,
    pageHeight,
    marginLeft,
    marginRight,
    headerHeight,
    footerHeight,
    dividerY,
    startY,
    continuationTop: headerHeight + 14,
  };

  // Statutory Core Metrics Table
  const coreMetricsRows = [
    [
      "Metric A",
      "Total Registered and Verified Youth Organizations at Quarter End",
      "Point-in-time quarter-end population (authoritative accreditation terms)",
      String(report.metrics.registered_verified_at_quarter_end),
    ],
    [
      "Metric B",
      "Total Registration Applications Received in Quarter",
      "Initial registration applications formally submitted in quarter interval",
      String(report.metrics.applications_received),
    ],
    [
      "Metric C",
      "Total Registration Applications Approved in Quarter",
      "Initial registration accreditation approvals (Term 1) within quarter",
      String(report.metrics.applications_approved),
    ],
  ];

  autoTable(doc, {
    startY: layout.startY,
    margin: {
      top: layout.continuationTop,
      right: marginRight,
      bottom: 85,
      left: marginLeft,
    },
    head: [["Code", "Statutory Metric Description", "Methodology / Baseline", "Count"]],
    body: coreMetricsRows,
    theme: "grid",
    showHead: "everyPage",
    styles: {
      fontSize: 8,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      lineColor: [...PDF_COLORS.border],
      lineWidth: 0.5,
      textColor: [...PDF_COLORS.text],
      valign: "middle",
    },
    headStyles: {
      fillColor: [...PDF_COLORS.darkBlue],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [...PDF_COLORS.zebra],
    },
    columnStyles: {
      0: { cellWidth: 55, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 200, halign: "left" },
      2: { cellWidth: 195, halign: "left", textColor: [...PDF_COLORS.muted] },
      3: { cellWidth: 60, halign: "right", fontStyle: "bold" },
    },
  });

  let nextY = (doc as any).lastAutoTable.finalY + 16;

  // Methodology Notes & Disclosures Box
  const disclosures = [
    "1. Organizational Level Scope: In accordance with the current Pasig City Youth Development Office registry scope, registered youth and youth-serving organizations are reported at the City/Municipal organizational level. Organizational operational scope (e.g., barangay-based vs city-wide) is not currently stored as a separate registry field.",
    "2. Authoritative Profile Classification: Disaggregated classifications and advocacy themes reflect the organization's authoritative profile record at the time of report generation.",
    "3. Advocacy Themes Non-Additive: Advocacy theme counts are non-additive; organizations may register across multiple canonical Y-TRACE advocacy areas.",
    "4. Statutory Half-Open Interval: Quarterly boundaries are strictly evaluated as half-open intervals [start_date 00:00:00, next_quarter_start 00:00:00) in Asia/Manila (UTC+08:00).",
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text("STATUTORY REPORTING DISCLOSURES & METHODOLOGY", marginLeft, nextY);
  nextY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  disclosures.forEach((disc) => {
    const lines = doc.splitTextToSize(disc, contentWidth) as string[];
    doc.text(lines, marginLeft, nextY);
    nextY += lines.length * 9.5;
  });

  // Administrative Sign-Off Area
  nextY += 14;
  if (nextY > pageHeight - 150) {
    doc.addPage();
    nextY = layout.continuationTop + 20;
  }

  const signBlockWidth = (contentWidth - 40) / 3;
  const signTitles = [
    { title: "Prepared By:", role: "YORP Administrative Staff", name: "_____________________________" },
    { title: "Verified By:", role: "Registry & Compliance Officer", name: "_____________________________" },
    { title: "Approved By:", role: "PCYDO Officer-in-Charge / Head", name: "_____________________________" },
  ];

  signTitles.forEach((sign, i) => {
    const x = marginLeft + i * (signBlockWidth + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(sign.title, x, nextY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(sign.name, x, nextY + 35);
    doc.text(sign.role, x, nextY + 46);
  });

  // Second pass: Decorate every page with header, footer, watermark, page numbers
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    renderPdfPageDecoration(doc, layout, page, totalPages);
  }

  return doc;
};

/**
 * Generates the official Section 35 Disaggregated Report PDF.
 */
export const generateSection35DisaggregatedPdf = async (
  report: YorpQuarterlyReport,
): Promise<jsPDF> => {
  const doc = createBaseReportPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 42.64; // ~15mm (595.28 - 2*42.64 = 510.00pt content width)
  const marginRight = 42.64;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const headerHeight = pageWidth / PCYDO_HEADER_ASPECT_RATIO;
  const footerHeight = pageWidth / PCYDO_FOOTER_ASPECT_RATIO;

  const periodLabel = getQuarterPeriodLabel(report.year, report.quarter);
  const metricATotal = report.metrics.registered_verified_at_quarter_end;

  const detailLines = [
    `Reporting Period: Quarter ${report.quarter}, ${report.year} (${periodLabel})`,
    `Authoritative Population Base (Metric A): ${metricATotal} registered and verified organizations at quarter end`,
    `Timezone: Asia/Manila (PST, UTC+08:00) | Generated: ${formatReportGeneratedAt()}`,
  ];

  const titleY = headerHeight + 14;
  let currentY = titleY + 16;
  detailLines.forEach(() => {
    currentY += 11;
  });
  const dividerY = currentY + 4;
  const startY = dividerY + 10;

  const layout: PdfHeaderLayout = {
    headerTitle: DEFAULT_HEADER_TITLE,
    reportTitle: DISAGGREGATED_REPORT_TITLE,
    footerText: `Pasig City Youth Development Office - YORP Disaggregated Report (Q${report.quarter} ${report.year})`,
    detailLines,
    pageWidth,
    pageHeight,
    marginLeft,
    marginRight,
    headerHeight,
    footerHeight,
    dividerY,
    startY,
    continuationTop: headerHeight + 14,
  };

  let nextY = layout.startY;

  // Helper for autoTable styling
  const commonTableConfig = {
    margin: {
      top: layout.continuationTop,
      right: marginRight,
      bottom: 85,
      left: marginLeft,
    },
    theme: "grid" as const,
    showHead: "everyPage" as const,
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 3.5, right: 5, bottom: 3.5, left: 5 },
      lineColor: [...PDF_COLORS.border],
      lineWidth: 0.5,
      textColor: [...PDF_COLORS.text],
      valign: "middle" as const,
    },
    headStyles: {
      fillColor: [...PDF_COLORS.darkBlue],
      textColor: [255, 255, 255],
      fontStyle: "bold" as const,
    },
    footStyles: {
      fillColor: [...PDF_COLORS.lightBlue],
      textColor: [...PDF_COLORS.text],
      fontStyle: "bold" as const,
    },
    alternateRowStyles: {
      fillColor: [...PDF_COLORS.zebra],
    },
  };

  // ============================================================================
  // PAGE 1: CLASSIFICATIONS & ADVOCACY THEMES
  // ============================================================================

  // 1. Major Classification Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("1. MAJOR CLASSIFICATION", marginLeft, nextY);
  nextY += 8;

  const majorRows = report.disaggregation.major_classification.map((row) => [
    row.label,
    String(row.count),
    `${Number(row.percentage).toFixed(2)}%`,
  ]);

  autoTable(doc, {
    ...commonTableConfig,
    startY: nextY,
    head: [["Major Classification", "Organization Count", "Percentage of Metric A"]],
    body: majorRows,
    foot: [["Total (Metric A)", String(metricATotal), "100.00%"]],
    columnStyles: {
      0: { cellWidth: 270, halign: "left" },
      1: { cellWidth: 120, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 120, halign: "right" },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;

  // 2. Sub-Classification Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("2. SUB-CLASSIFICATION", marginLeft, nextY);
  nextY += 8;

  const subRows = report.disaggregation.sub_classification.map((row) => [
    row.label,
    String(row.count),
    `${Number(row.percentage).toFixed(2)}%`,
  ]);

  autoTable(doc, {
    ...commonTableConfig,
    startY: nextY,
    head: [["Sub-Classification", "Organization Count", "Percentage of Metric A"]],
    body: subRows,
    foot: [["Total (Metric A)", String(metricATotal), "100.00%"]],
    columnStyles: {
      0: { cellWidth: 270, halign: "left" },
      1: { cellWidth: 120, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 120, halign: "right" },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;

  // 3. Organizational Level Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("3. ORGANIZATIONAL LEVEL", marginLeft, nextY);
  nextY += 8;

  const orgLevelRows = report.disaggregation.organizational_level.map((row) => [
    row.label,
    String(row.count),
    `${Number(row.percentage).toFixed(2)}%`,
  ]);

  autoTable(doc, {
    ...commonTableConfig,
    startY: nextY,
    head: [["Organizational Level", "Organization Count", "Percentage of Metric A"]],
    body: orgLevelRows,
    foot: [["Total (Metric A)", String(metricATotal), "100.00%"]],
    columnStyles: {
      0: { cellWidth: 270, halign: "left" },
      1: { cellWidth: 120, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 120, halign: "right" },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;

  // 4. Advocacy Themes Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("4. ORGANIZATIONS BY ADVOCACY THEME", marginLeft, nextY);
  nextY += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    "Non-additive: organizations may select multiple advocacy themes. Percentages reflect proportion of Metric A.",
    marginLeft,
    nextY,
  );
  nextY += 7;

  const advocacyRows = report.disaggregation.advocacy_themes.map((row) => [
    row.theme,
    String(row.count),
    `${Number(row.percentage).toFixed(2)}%`,
  ]);

  autoTable(doc, {
    ...commonTableConfig,
    startY: nextY,
    head: [["Canonical Y-TRACE Advocacy Theme", "Organizations Selected", "Proportion of Metric A"]],
    body: advocacyRows,
    columnStyles: {
      0: { cellWidth: 270, halign: "left" },
      1: { cellWidth: 120, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 120, halign: "right" },
    },
  });

  // ============================================================================
  // PAGE 2: GEOGRAPHIC DISAGGREGATION (DISTRICT & BARANGAY BREAKDOWN)
  // ============================================================================
  doc.addPage();
  nextY = layout.continuationTop + 10;

  // 5. Geography - District Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("5. GEOGRAPHY — DISTRICT SUMMARY", marginLeft, nextY);
  nextY += 8;

  const districtRows = report.disaggregation.geography.districts.map((row) => [
    row.district,
    String(row.count),
    `${Number(row.percentage).toFixed(2)}%`,
  ]);

  autoTable(doc, {
    ...commonTableConfig,
    startY: nextY,
    head: [["District", "Organization Count", "Percentage of Metric A"]],
    body: districtRows,
    foot: [["Total (Metric A)", String(metricATotal), "100.00%"]],
    columnStyles: {
      0: { cellWidth: 270, halign: "left" },
      1: { cellWidth: 120, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 120, halign: "right" },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;

  // 6. Geography - Barangay Breakdown Table (All 30 canonical barangays fit cleanly on Page 2)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("6. GEOGRAPHY — BARANGAY BREAKDOWN (ALL 30 CANONICAL BARANGAYS)", marginLeft, nextY);
  nextY += 8;

  const barangayRows = report.disaggregation.geography.barangays.map((row) => [
    row.ordinal,
    row.barangay,
    row.district,
    String(row.count),
    `${Number(row.percentage).toFixed(2)}%`,
  ]);

  autoTable(doc, {
    ...commonTableConfig,
    startY: nextY,
    styles: {
      ...commonTableConfig.styles,
      fontSize: 7.2,
      cellPadding: { top: 2.8, right: 4, bottom: 2.8, left: 4 },
    },
    head: [["No.", "Barangay", "District", "Count", "Percentage"]],
    body: barangayRows,
    foot: [["", "Total (Metric A)", "", String(metricATotal), "100.00%"]],
    columnStyles: {
      0: { cellWidth: 32, halign: "center" },
      1: { cellWidth: 198, halign: "left" },
      2: { cellWidth: 120, halign: "left" },
      3: { cellWidth: 80, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 80, halign: "right" },
    },
  });

  // ============================================================================
  // PAGE 3: INTENTIONAL REPORTING NOTES, METHODOLOGY & SIGN-OFF
  // ============================================================================
  doc.addPage();
  nextY = layout.continuationTop + 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("REPORTING NOTES & METHODOLOGY", marginLeft, nextY);
  nextY += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    "Official statutory disclosures, scope definitions, and technical aggregation parameters.",
    marginLeft,
    nextY,
  );
  nextY += 10;

  const methodologyRows = [
    [
      "1. Organizational Level Scope",
      report.metadata.organizational_level_note,
    ],
    [
      "2. Profile Classification Baseline",
      report.metadata.classification_note,
    ],
    [
      "3. Advocacy Themes Specification",
      report.metadata.advocacy_note,
    ],
    [
      "4. Point-in-Time Basis & Interval",
      `Quarterly metrics evaluated strictly for quarter-end date ${report.quarter_end_date} (interval: ${report.quarter_start} to ${report.quarter_end}) in Asia/Manila (PST, UTC+08:00).`,
    ],
    [
      "5. Geographic Administration",
      "The 30 canonical Pasig City barangays are classified under District I (22 barangays) and District II (8 barangays) in accordance with the official PCYDO geographic directory.",
    ],
  ];

  autoTable(doc, {
    startY: nextY,
    margin: {
      top: layout.continuationTop,
      right: marginRight,
      bottom: 85,
      left: marginLeft,
    },
    theme: "grid",
    head: [["Item / Dimension", "Statutory Policy & Methodology Disclosure"]],
    body: methodologyRows,
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 5, right: 7, bottom: 5, left: 7 },
      lineColor: [...PDF_COLORS.border],
      lineWidth: 0.5,
      textColor: [...PDF_COLORS.text],
      valign: "top",
    },
    headStyles: {
      fillColor: [...PDF_COLORS.darkBlue],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [...PDF_COLORS.zebra],
    },
    columnStyles: {
      0: { cellWidth: 140, fontStyle: "bold" },
      1: { cellWidth: 370 },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 28;

  // Administrative Attestation & Sign-Off Area
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text("ADMINISTRATIVE ATTESTATION & SIGN-OFF", marginLeft, nextY);
  nextY += 18;

  const signBlockWidth = (contentWidth - 40) / 3;
  const signTitles = [
    { title: "Prepared By:", role: "YORP Administrative Staff", name: "_____________________________" },
    { title: "Verified By:", role: "Registry & Compliance Officer", name: "_____________________________" },
    { title: "Approved By:", role: "PCYDO Officer-in-Charge / Head", name: "_____________________________" },
  ];

  signTitles.forEach((sign, i) => {
    const x = marginLeft + i * (signBlockWidth + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(sign.title, x, nextY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(sign.name, x, nextY + 38);
    doc.text(sign.role, x, nextY + 49);
  });

  // Second pass: Decorate every page
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    renderPdfPageDecoration(doc, layout, page, totalPages);
  }

  return doc;
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
): Promise<void> => {
  const filename = getSummaryFilename(report.year, report.quarter, format);

  if (format === "pdf") {
    const doc = await generateSection35QuarterlySummaryPdf(report);
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
): Promise<void> => {
  const filename = getDisaggregatedFilename(report.year, report.quarter, format);

  if (format === "pdf") {
    const doc = await generateSection35DisaggregatedPdf(report);
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

