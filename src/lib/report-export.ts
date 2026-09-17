import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PCYDO_HEADER_DATA_URL,
  PCYDO_FOOTER_DATA_URL,
  PCYDO_HEADER_ASPECT_RATIO,
  PCYDO_FOOTER_ASPECT_RATIO,
  PCYDO_A4_TEMPLATE_DATA_URL,
  PCYDO_WATERMARK_DATA_URL,
  PCYDO_WATERMARK_ASPECT_RATIO,
} from "./report-letterhead-assets";

export type ExportFormat = "csv" | "pdf" | "xlsx";

export type PdfPaperSize = "a4" | "letter" | "long_bond" | "legal" | "a3" | "tabloid";
export type PdfOrientation = "portrait" | "landscape";

export type PdfPageConfig = {
  paperSize?: PdfPaperSize;
  orientation?: PdfOrientation;
};

export type PaperSizeOption = {
  id: PdfPaperSize;
  label: string;
  dimensions: string;
  description: string;
};

export const PDF_PAPER_SIZE_OPTIONS: PaperSizeOption[] = [
  {
    id: "a4",
    label: "A4",
    dimensions: "210 × 297 mm",
    description: "Standard A4 (210 × 297 mm)",
  },
  {
    id: "letter",
    label: "Short Bond (Letter)",
    dimensions: "8.5 × 11 in",
    description: "Short Bond / Letter (8.5 × 11 in)",
  },
  {
    id: "long_bond",
    label: "Long Bond (Folio)",
    dimensions: "8.5 × 13 in",
    description: "Philippine Long Bond (8.5 × 13 in)",
  },
  {
    id: "legal",
    label: "Legal",
    dimensions: "8.5 × 14 in",
    description: "US Legal (8.5 × 14 in)",
  },
  {
    id: "a3",
    label: "A3",
    dimensions: "297 × 420 mm",
    description: "Large A3 (297 × 420 mm)",
  },
  {
    id: "tabloid",
    label: "Tabloid",
    dimensions: "11 × 17 in",
    description: "Tabloid / Ledger (11 × 17 in)",
  },
];

export const getJsPdfFormat = (paperSize: PdfPaperSize): string | [number, number] => {
  switch (paperSize) {
    case "letter":
      return "letter";
    case "legal":
      return "legal";
    case "a3":
      return "a3";
    case "tabloid":
      return "tabloid";
    case "long_bond":
      return [612, 936]; // 8.5 x 13 inches (Folio) in points
    case "a4":
    default:
      return "a4";
  }
};

export type ReportCellValue = string | number | Array<string | number> | null | undefined;

export type ReportColumn<Row> = {
  label: string;
  value: (row: Row, index: number) => ReportCellValue;
  csvValue?: (row: Row, index: number) => ReportCellValue;
  csvPreserveLineBreaks?: boolean;
  pdfValue?: (row: Row, index: number) => ReportCellValue;
  xlsxValue?: (row: Row, index: number) => ReportCellValue;
  pdfWidth?: number;
  pdfAlign?: "left" | "center" | "right";
  preserveSpreadsheetText?: boolean;
  xlsxAlign?: "left" | "center" | "right";
  xlsxWidth?: number;
  xlsxMinWidth?: number;
  xlsxMaxWidth?: number;
  xlsxWrap?: boolean;
  xlsxType?: "text" | "currency" | "integer" | "decimal" | "date";
  excludeFromPdf?: boolean;
};

export type ReportExportConfig<Row> = {
  title: string;
  filenamePrefix: string;
  columns: ReportColumn<Row>[];
  orientation?: PdfOrientation;
  paperSize?: PdfPaperSize;
  logoUrl?: string;
  headerTitle?: string;
  footerText?: string;
  xlsxSheetName?: string;
  pdfUseUnicodeFont?: boolean;
  pdfFontSize?: number;
  pdfCellPadding?: number;
};

export type ReportExportOptions<Row> = {
  config: ReportExportConfig<Row>;
  rows: Row[];
  filterSummaryLines?: string[];
  metadataLines?: string[];
  totalsRow?: ReportCellValue[];
  xlsxTotalsRow?: ReportCellValue[];
  pageConfig?: PdfPageConfig;
};

const DEFAULT_HEADER_TITLE = "PASIG CITY YOUTH DEVELOPMENT OFFICE";
const DEFAULT_FOOTER_TEXT = "Pasig City Youth Development Office";
const XLSX_CURRENCY_FORMAT = '"₱"#,##0.00';
const XLSX_DATE_FORMAT = "mmm d, yyyy";
const PDF_FONT_REGULAR_NAME = "SegoeUI";
const PDF_FONT_BOLD_NAME = "SegoeUIBold";
const PDF_FONT_REGULAR_URL = "/fonts/segoeui.ttf";
const PDF_FONT_BOLD_URL = "/fonts/segoeuib.ttf";
export const PDF_COLORS = {
  darkBlue: [22, 54, 98] as const,
  lightBlue: [240, 244, 248] as const,
  border: [190, 198, 210] as const,
  divider: [210, 218, 226] as const,
  text: [32, 41, 57] as const,
  muted: [92, 102, 120] as const,
  zebra: [248, 250, 252] as const,
};

const formatFilenameDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const getExportFilename = (filenamePrefix: string, format: ExportFormat) => {
  const separator = filenamePrefix.includes("_") ? "_" : "-";
  return `${filenamePrefix}${separator}${formatFilenameDate()}.${format}`;
};

export const formatReportGeneratedAt = (date = new Date()) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

export const formatDateDisplay = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatCurrencyCsv = (value: number) => Number(value || 0).toFixed(2);

export const formatCurrencyPdf = (value: number) => `₱${Number(value || 0).toLocaleString("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export const getExcelColumnLetter = (columnNumber: number) => {
  let result = "";
  let value = columnNumber;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
};

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeCellParts = (value: ReportCellValue): string[] => {
  if (value == null) return [""];
  const parts = Array.isArray(value) ? value : [value];
  const normalized = parts
    .flatMap((part) => String(part).split(/\r?\n/g))
    .map((part) => collapseWhitespace(part))
    .filter((part) => part.length > 0);
  return normalized.length ? normalized : [""];
};

const sanitizeForSpreadsheet = (value: string, preserveSpreadsheetText?: boolean) => {
  if (!value) return "";

  const looksLikeNumericText = /^[+]?[\d\s().-]+$/.test(value);
  const startsDangerously = /^[=+\-@]/.test(value);

  if (preserveSpreadsheetText && looksLikeNumericText) {
    return `'${value}`;
  }

  if (startsDangerously) {
    return `'${value}`;
  }

  return value;
};

const toCsvCell = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;
const toPdfCell = (value: ReportCellValue) => normalizeCellParts(value).join("\n");

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob."));
    reader.readAsDataURL(blob);
  });

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const loadLogoDataUrl = async (logoUrl?: string) => {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
};

const ensurePdfFonts = async (doc: jsPDF) => {
  const fontState = doc as jsPDF & { __yTraceFontsLoaded?: boolean; __yTraceSegoeFontLoaded?: boolean };
  if (fontState.__yTraceFontsLoaded) return;

  try {
    let regularBuffer: ArrayBuffer | null = null;
    let boldBuffer: ArrayBuffer | null = null;

    try {
      const [regularResponse, boldResponse] = await Promise.all([
        fetch(PDF_FONT_REGULAR_URL),
        fetch(PDF_FONT_BOLD_URL),
      ]);

      if (regularResponse.ok && boldResponse.ok) {
        [regularBuffer, boldBuffer] = await Promise.all([
          regularResponse.arrayBuffer(),
          boldResponse.arrayBuffer(),
        ]);
      }
    } catch {
      // In Node / Vitest or offline environment, read directly from local public/fonts
      try {
        const fsModule = "node:fs";
        const pathModule = "node:path";
        const { readFileSync } = await import(/* @vite-ignore */ fsModule);
        const { resolve } = await import(/* @vite-ignore */ pathModule);
        const regularPath = resolve(process.cwd(), "public", "fonts", "segoeui.ttf");
        const boldPath = resolve(process.cwd(), "public", "fonts", "segoeuib.ttf");
        const regFile = readFileSync(regularPath);
        const boldFile = readFileSync(boldPath);
        regularBuffer = regFile.buffer.slice(regFile.byteOffset, regFile.byteOffset + regFile.byteLength);
        boldBuffer = boldFile.buffer.slice(boldFile.byteOffset, boldFile.byteOffset + boldFile.byteLength);
      } catch {
        // Fall back to helvetica
      }
    }

    if (regularBuffer && boldBuffer) {
      doc.addFileToVFS("segoeui.ttf", arrayBufferToBase64(regularBuffer));
      doc.addFont("segoeui.ttf", PDF_FONT_REGULAR_NAME, "normal");
      doc.addFileToVFS("segoeuib.ttf", arrayBufferToBase64(boldBuffer));
      doc.addFont("segoeuib.ttf", PDF_FONT_BOLD_NAME, "bold");
      fontState.__yTraceSegoeFontLoaded = true;
    }
  } catch {
    // If font loading fails, fallback to standard helvetica
  } finally {
    fontState.__yTraceFontsLoaded = true;
  }
};

export const buildCsvContent = <Row,>({ config, rows, totalsRow }: ReportExportOptions<Row>) => {
  const headerRow = config.columns.map((column) => toCsvCell(column.label));
  const bodyRows = rows.map((row, index) =>
    config.columns.map((column) => {
      const rawValue = (column.csvValue ?? column.value)(row, index);
      const joinedValue = column.csvPreserveLineBreaks
        ? (Array.isArray(rawValue) ? rawValue : [rawValue])
            .filter((part) => part != null)
            .map((part) => String(part))
            .join("; ")
        : normalizeCellParts(rawValue).join("; ");
      return toCsvCell(sanitizeForSpreadsheet(joinedValue, column.preserveSpreadsheetText));
    }),
  );

  const footerRows = totalsRow
    ? [
        totalsRow.map((cell, index) => {
          const joinedValue = normalizeCellParts(cell).join("; ");
          return toCsvCell(sanitizeForSpreadsheet(joinedValue, config.columns[index]?.preserveSpreadsheetText));
        }),
      ]
    : [];

  return `\uFEFF${[headerRow, ...bodyRows, ...footerRows].map((row) => row.join(",")).join("\r\n")}`;
};

export type PdfHeaderLayout = {
  headerTitle: string;
  reportTitle: string;
  footerText: string;
  detailLines: string[];
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  headerHeight: number;
  footerHeight: number;
  dividerY: number;
  startY: number;
  continuationTop: number;
};

export const buildPdfHeaderLayout = async <Row,>(
  doc: jsPDF,
  options: ReportExportOptions<Row>,
  marginLeft: number,
  marginRight: number,
): Promise<PdfHeaderLayout> => {
  const { config, metadataLines = [], filterSummaryLines = [] } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const headerHeight = pageWidth / PCYDO_HEADER_ASPECT_RATIO;
  const footerHeight = pageWidth / PCYDO_FOOTER_ASPECT_RATIO;

  const detailLines = [`Generated: ${formatReportGeneratedAt()}`, ...metadataLines, ...filterSummaryLines];
  const detailWidth = pageWidth - marginLeft - marginRight;

  const titleY = headerHeight + 14;
  let currentY = titleY + 16;

  const useUnicodeFont = Boolean((doc as jsPDF & { __yTraceUseUnicodeFont?: boolean }).__yTraceUseUnicodeFont);
  doc.setFont(useUnicodeFont ? PDF_FONT_REGULAR_NAME : "helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setCharSpace(0);
  detailLines.forEach((line) => {
    const wrappedLines = doc.splitTextToSize(line, detailWidth) as string[];
    currentY += wrappedLines.length * 10.5;
  });

  const dividerY = currentY + 4;
  return {
    headerTitle: config.headerTitle ?? DEFAULT_HEADER_TITLE,
    reportTitle: config.title,
    footerText: config.footerText ?? DEFAULT_FOOTER_TEXT,
    detailLines,
    pageWidth,
    pageHeight,
    marginLeft,
    marginRight,
    headerHeight,
    footerHeight,
    dividerY,
    startY: dividerY + 8,
    continuationTop: headerHeight + 10,
  };
};

/**
 * Applies the authoritative PCYDO A4 letterhead template background to the document.
 * Draws the high-resolution rasterized template background (preserving the authentic
 * header logos, diagonal PCYDO YORP watermark, and footer line/branding) on the current page
 * and installs an addPage hook so every subsequently created page automatically gets
 * the template background drawn FIRST (behind all dynamic content and tables).
 */
export const applyOfficialTemplateBackground = (doc: jsPDF) => {
  const drawBackground = () => {
    try {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const isA4Portrait = Math.abs(pageWidth - 595.28) < 10 && Math.abs(pageHeight - 841.89) < 10;

      if (isA4Portrait) {
        doc.addImage(PCYDO_A4_TEMPLATE_DATA_URL, "JPEG", 0, 0, pageWidth, pageHeight);
      } else {
        const headerHeight = pageWidth / PCYDO_HEADER_ASPECT_RATIO;
        const footerHeight = pageWidth / PCYDO_FOOTER_ASPECT_RATIO;
        doc.addImage(PCYDO_HEADER_DATA_URL, "JPEG", 0, 0, pageWidth, headerHeight);
        doc.addImage(PCYDO_FOOTER_DATA_URL, "JPEG", 0, pageHeight - footerHeight, pageWidth, footerHeight);

        // Watermark in the middle between header and footer:
        // Derive proportional dimensions from page width and available vertical height without stretching/distortion
        const availableHeight = pageHeight - headerHeight - footerHeight;
        const maxWmWidth = pageWidth * 0.65;
        const maxWmHeight = availableHeight * 0.70;

        let wmWidth = maxWmWidth;
        let wmHeight = wmWidth / PCYDO_WATERMARK_ASPECT_RATIO;

        if (wmHeight > maxWmHeight) {
          wmHeight = maxWmHeight;
          wmWidth = wmHeight * PCYDO_WATERMARK_ASPECT_RATIO;
        }

        const wmX = (pageWidth - wmWidth) / 2;
        const wmY = headerHeight + (availableHeight - wmHeight) / 2;

        doc.addImage(PCYDO_WATERMARK_DATA_URL, "PNG", wmX, wmY, wmWidth, wmHeight);
      }
    } catch {
      // Fallback if image rendering fails
    }
  };

  const hookedDoc = doc as jsPDF & { __yTraceTemplateBgHooked?: boolean };
  if (!hookedDoc.__yTraceTemplateBgHooked) {
    hookedDoc.__yTraceTemplateBgHooked = true;
    drawBackground();

    const originalAddPage = doc.addPage.bind(doc);
    doc.addPage = function (...args: any[]) {
      const res = originalAddPage.apply(this, args as any);
      drawBackground();
      return res;
    };
  }
};

export const renderPdfPageDecoration = (
  doc: jsPDF,
  layout: PdfHeaderLayout,
  pageNumber: number,
  totalPages: number,
) => {
  const useUnicodeFont = (doc as jsPDF & { __yTraceUseUnicodeFont?: boolean }).__yTraceUseUnicodeFont;
  const regularFont = useUnicodeFont ? PDF_FONT_REGULAR_NAME : "helvetica";
  const boldFont = useUnicodeFont ? PDF_FONT_BOLD_NAME : "helvetica";
  doc.setCharSpace(0);

  // 1. Dynamic report-specific footer text and page numbering (placed in safe area above template footer)
  doc.setFont(regularFont, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);

  const footerTextY = layout.pageHeight - layout.footerHeight - 6;
  doc.text(layout.footerText, layout.marginLeft, footerTextY);
  doc.text(`Page ${pageNumber} of ${totalPages}`, layout.pageWidth - layout.marginRight, footerTextY, {
    align: "right",
  });

  // 2. Page 1 header elements: Report Title, Metadata, Filter Summary, and Divider Line
  if (pageNumber === 1) {
    const titleY = layout.headerHeight + 14;
    doc.setFont(boldFont, "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(layout.reportTitle, layout.marginLeft, titleY);

    doc.setFont(regularFont, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.muted);

    let currentY = titleY + 14;
    const detailWidth = layout.pageWidth - layout.marginLeft - layout.marginRight;
    layout.detailLines.forEach((line) => {
      const wrappedLines = doc.splitTextToSize(line, detailWidth) as string[];
      doc.text(wrappedLines, layout.marginLeft, currentY);
      currentY += wrappedLines.length * 10.5;
    });

    doc.setDrawColor(...PDF_COLORS.divider);
    doc.setLineWidth(0.7);
    doc.line(layout.marginLeft, layout.dividerY, layout.pageWidth - layout.marginRight, layout.dividerY);
  }
};

export const exportReportAsCsv = async <Row,>(options: ReportExportOptions<Row>) => {
  const filename = getExportFilename(options.config.filenamePrefix, "csv");
  const csvContent = buildCsvContent(options);
  downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), filename);
};

export const generateReportPdfDocument = async <Row,>(options: ReportExportOptions<Row>) => {
  const { config, rows, totalsRow, pageConfig } = options;
  const paperSize: PdfPaperSize = pageConfig?.paperSize ?? config.paperSize ?? "a4";
  const orientation: PdfOrientation = pageConfig?.orientation ?? config.orientation ?? "portrait";

  const jsPdfFormat = getJsPdfFormat(paperSize);
  const doc = new jsPDF({
    orientation,
    unit: "pt",
    format: jsPdfFormat,
  });
  applyOfficialTemplateBackground(doc);

  if (config.pdfUseUnicodeFont) {
    await ensurePdfFonts(doc);
  }
  const hasSegoeFont = Boolean((doc as jsPDF & { __yTraceSegoeFontLoaded?: boolean }).__yTraceSegoeFontLoaded);
  const useUnicodeFont = Boolean(config.pdfUseUnicodeFont) && hasSegoeFont;
  (doc as jsPDF & { __yTraceUseUnicodeFont?: boolean }).__yTraceUseUnicodeFont = useUnicodeFont;
  doc.setFont(useUnicodeFont ? PDF_FONT_REGULAR_NAME : "helvetica", "normal");
  doc.setCharSpace(0);

  const marginLeft = 30;
  const marginRight = 30;
  const headerLayout = await buildPdfHeaderLayout(doc, options, marginLeft, marginRight);
  const marginBottom = headerLayout.footerHeight + 20;

  // Filter out any columns explicitly excluded from PDF
  const pdfColumns = config.columns.filter((column) => !column.excludeFromPdf);

  // Calculate dynamic proportional column widths based on available table width
  const availableTableWidth = headerLayout.pageWidth - marginLeft - marginRight;
  const hasConfiguredWidths = pdfColumns.every((col) => typeof col.pdfWidth === "number" && col.pdfWidth > 0);
  const totalConfiguredWidth = hasConfiguredWidths
    ? pdfColumns.reduce((sum, col) => sum + (col.pdfWidth ?? 0), 0)
    : 0;

  const columnStyles = Object.fromEntries(
    pdfColumns.map((column, index) => {
      let cellWidth: number | "auto" = "auto";
      if (typeof column.pdfWidth === "number" && column.pdfWidth > 0) {
        if (totalConfiguredWidth > 0) {
          cellWidth = (column.pdfWidth / totalConfiguredWidth) * availableTableWidth;
        } else {
          cellWidth = column.pdfWidth;
        }
      }
      return [
        index,
        {
          cellWidth,
          halign: column.pdfAlign ?? "left",
          valign: "middle" as const,
        },
      ];
    }),
  );

  // Map totalsRow to match pdfColumns if any columns were excluded
  let mappedTotalsRow: ReportCellValue[] | undefined = undefined;
  if (totalsRow) {
    if (pdfColumns.length === config.columns.length) {
      mappedTotalsRow = totalsRow;
    } else {
      mappedTotalsRow = config.columns
        .map((col, idx) => ({ col, value: totalsRow[idx] }))
        .filter(({ col }) => !col.excludeFromPdf)
        .map(({ value }) => value);
    }
  }

  autoTable(doc, {
    startY: headerLayout.startY,
    margin: {
      top: headerLayout.continuationTop,
      right: marginRight,
      bottom: marginBottom,
      left: marginLeft,
    },
    head: [pdfColumns.map((column) => column.label)],
    body: rows.map((row, index) =>
      pdfColumns.map((column) => toPdfCell((column.pdfValue ?? column.value)(row, index))),
    ),
    foot: mappedTotalsRow ? [mappedTotalsRow.map((cell) => toPdfCell(cell))] : undefined,
    showFoot: mappedTotalsRow ? "lastPage" : "never",
    theme: "grid",
    styles: {
      fontSize: config.pdfFontSize ?? 8,
      cellPadding: config.pdfCellPadding ?? { top: 4.5, right: 4.5, bottom: 4.5, left: 4.5 },
      lineColor: [...PDF_COLORS.border],
      lineWidth: 0.5,
      textColor: [...PDF_COLORS.text],
      valign: "middle",
      overflow: "linebreak",
      font: useUnicodeFont ? PDF_FONT_REGULAR_NAME : "helvetica",
      fontStyle: "normal",
      fillColor: false,
    },
    bodyStyles: {
      fillColor: false,
      textColor: [...PDF_COLORS.text],
      font: useUnicodeFont ? PDF_FONT_REGULAR_NAME : "helvetica",
    },
    headStyles: {
      fillColor: [...PDF_COLORS.darkBlue],
      textColor: [255, 255, 255],
      font: useUnicodeFont ? PDF_FONT_BOLD_NAME : "helvetica",
      fontStyle: "bold",
      halign: "left",
      valign: "middle",
    },
    footStyles: {
      fillColor: false,
      textColor: [...PDF_COLORS.text],
      font: useUnicodeFont ? PDF_FONT_BOLD_NAME : "helvetica",
      fontStyle: "bold",
      valign: "middle",
      lineWidth: 0.75,
      lineColor: [...PDF_COLORS.border],
    },
    alternateRowStyles: {
      fillColor: false,
    },
    columnStyles,
  });

  // Second pass: Decorate all pages with official PCYDO header, footer, metadata, and page numbers
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    renderPdfPageDecoration(doc, headerLayout, page, totalPages);
  }

  return doc;
};

export const exportReportAsPdf = async <Row,>(options: ReportExportOptions<Row>) => {
  const doc = await generateReportPdfDocument(options);
  doc.save(getExportFilename(options.config.filenamePrefix, "pdf"));
};

const calculateColumnWidth = (values: string[], minWidth: number, maxWidth: number) => {
  const longest = values.reduce((max, value) => Math.max(max, String(value ?? "").length), 0);
  return Math.min(Math.max(longest + 2, minWidth), maxWidth);
};

type ExcelJsModuleShape = {
  Workbook?: new () => {
    creator?: string;
    created?: Date;
    addWorksheet: (name: string) => ExcelWorksheetShape;
    xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
  };
  default?: ExcelJsModuleShape;
};

type ExcelWorksheetShape = {
  mergeCells: (range: string) => void;
  getCell: (reference: string) => ExcelCellShape;
  getRow: (index: number) => ExcelRowShape;
  columns: Array<{ width?: number }>;
  autoFilter?: { from: string; to: string };
  views?: Array<{ state: string; ySplit: number }>;
  pageSetup?: {
    orientation: "portrait" | "landscape";
    fitToPage: boolean;
    fitToWidth: number;
    fitToHeight: number;
    printArea: string;
    printTitlesRow: string;
    margins: {
      left: number;
      right: number;
      top: number;
      bottom: number;
      header: number;
      footer: number;
    };
  };
};

type ExcelRowShape = {
  height?: number;
  getCell: (index: number) => ExcelCellShape;
};

type ExcelCellShape = {
  value: unknown;
  font?: Record<string, unknown>;
  alignment?: Record<string, unknown>;
  fill?: Record<string, unknown>;
  border?: Record<string, unknown>;
  numFmt?: string;
};

export const resolveExcelJsWorkbook = async () => {
  const excelJsModule = (await import("exceljs")) as ExcelJsModuleShape;
  const workbookCtor = excelJsModule.Workbook ?? excelJsModule.default?.Workbook;

  if (!workbookCtor) {
    throw new Error("ExcelJS workbook constructor is unavailable.");
  }

  return workbookCtor;
};

const getWorksheetCellValue = <Row,>(column: ReportColumn<Row>, row: Row, index: number) => {
  const rawValue = (column.xlsxValue ?? column.value)(row, index);
  if (column.xlsxType === "currency" || column.xlsxType === "integer" || column.xlsxType === "decimal") {
    if (typeof rawValue === "number") return rawValue;
    const numeric = Number(Array.isArray(rawValue) ? rawValue[0] ?? 0 : rawValue ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  if (column.xlsxType === "date") {
    const dateValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (!dateValue) return "";
    const date = new Date(String(dateValue));
    return Number.isNaN(date.getTime()) ? "" : date;
  }

  const separator = column.xlsxWrap ? "\n" : "; ";
  return normalizeCellParts(rawValue).join(separator);
};

const estimateRowHeight = (values: unknown[]) => {
  const lineCount = values.reduce((max, value) => {
    const text = String(value ?? "");
    const lines = text.split("\n").length;
    return Math.max(max, lines);
  }, 1);
  return Math.max(22, lineCount * 16);
};

export const exportReportAsXlsx = async <Row,>(options: ReportExportOptions<Row>) => {
  const Workbook = await resolveExcelJsWorkbook();
  const workbook = new Workbook();
  workbook.creator = "OpenAI Codex";
  workbook.created = new Date();

  const { config, rows, metadataLines = [], filterSummaryLines = [], xlsxTotalsRow } = options;
  const worksheet = workbook.addWorksheet(config.xlsxSheetName ?? config.title);
  const totalColumns = config.columns.length;
  const lastColumnLetter = getExcelColumnLetter(totalColumns);

  let currentRow = 1;
  worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = config.headerTitle ?? DEFAULT_HEADER_TITLE;
  titleCell.font = { bold: true, size: 14, color: { argb: "202939" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(currentRow).height = 22;

  currentRow += 1;
  worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
  const subtitleCell = worksheet.getCell(`A${currentRow}`);
  subtitleCell.value = config.title;
  subtitleCell.font = { bold: true, size: 12, color: { argb: "202939" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(currentRow).height = 20;

  const summaryLines = [`Generated: ${formatReportGeneratedAt()}`, ...metadataLines, ...filterSummaryLines];
  summaryLines.forEach((line) => {
    currentRow += 1;
    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
    const lineCell = worksheet.getCell(`A${currentRow}`);
    lineCell.value = line;
    lineCell.font = { size: 10, color: { argb: "5C6678" } };
    lineCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    worksheet.getRow(currentRow).height = 18;
  });

  currentRow += 1;
  const headerRowNumber = currentRow;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 28;

  config.columns.forEach((column, columnIndex) => {
    const cell = headerRow.getCell(columnIndex + 1);
    cell.value = column.label;
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
  });

  rows.forEach((row, index) => {
    const rowNumber = headerRowNumber + index + 1;
    const dataRow = worksheet.getRow(rowNumber);
    const rowValues = config.columns.map((column) => getWorksheetCellValue(column, row, index));
    dataRow.height = estimateRowHeight(rowValues);

    config.columns.forEach((column, columnIndex) => {
      const cell = dataRow.getCell(columnIndex + 1);
      cell.value = rowValues[columnIndex] as never;
      cell.alignment = {
        vertical: "middle",
        horizontal:
          column.xlsxAlign ??
          (column.pdfAlign === "right" ? "right" : column.pdfAlign === "center" ? "center" : "left"),
        wrapText: column.xlsxWrap ?? true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "D2DAE2" } },
        left: { style: "thin", color: { argb: "D2DAE2" } },
        bottom: { style: "thin", color: { argb: "D2DAE2" } },
        right: { style: "thin", color: { argb: "D2DAE2" } },
      };
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F8FAFC" },
        };
      }
      if (column.xlsxType === "currency") cell.numFmt = XLSX_CURRENCY_FORMAT;
      if (column.xlsxType === "integer") cell.numFmt = "0";
      if (column.xlsxType === "decimal") cell.numFmt = "0.00";
      if (column.xlsxType === "date" && rowValues[columnIndex] instanceof Date) cell.numFmt = XLSX_DATE_FORMAT;
      if (column.xlsxType === "text" || column.preserveSpreadsheetText) cell.numFmt = "@";
    });
  });

  if (xlsxTotalsRow?.length) {
    const totalsRowNumber = headerRowNumber + rows.length + 1;
    const totalsRow = worksheet.getRow(totalsRowNumber);
    totalsRow.height = 22;

    config.columns.forEach((column, columnIndex) => {
      const cell = totalsRow.getCell(columnIndex + 1);
      cell.value = (xlsxTotalsRow[columnIndex] ?? "") as never;
      cell.font = { bold: true, color: { argb: "202939" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F0F4F8" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal:
          column.xlsxAlign ??
          (column.pdfAlign === "right" ? "right" : column.pdfAlign === "center" ? "center" : "left"),
        wrapText: column.xlsxWrap ?? true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "BEC6D2" } },
        left: { style: "thin", color: { argb: "BEC6D2" } },
        bottom: { style: "thin", color: { argb: "BEC6D2" } },
        right: { style: "thin", color: { argb: "BEC6D2" } },
      };
      if (column.xlsxType === "currency") cell.numFmt = XLSX_CURRENCY_FORMAT;
      if (column.xlsxType === "integer") cell.numFmt = "0";
      if (column.xlsxType === "decimal") cell.numFmt = "0.00";
      if (column.xlsxType === "text" || column.preserveSpreadsheetText) cell.numFmt = "@";
    });
  }

  worksheet.columns = config.columns.map((column, columnIndex) => {
    const values = [
      column.label,
      ...rows.map((row, rowIndex) => {
        const value = getWorksheetCellValue(column, row, rowIndex);
        return value instanceof Date ? formatDateDisplay(value.toISOString()) : String(value ?? "");
      }),
      ...(xlsxTotalsRow ? [String(xlsxTotalsRow[columnIndex] ?? "")] : []),
    ];
    return {
      width:
        column.xlsxWidth ??
        calculateColumnWidth(values, column.xlsxMinWidth ?? 12, column.xlsxMaxWidth ?? 40),
    };
  });

  const lastDataRow = headerRowNumber + rows.length + (xlsxTotalsRow?.length ? 1 : 0);
  worksheet.autoFilter = {
    from: `A${headerRowNumber}`,
    to: `${lastColumnLetter}${headerRowNumber}`,
  };
  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
  worksheet.pageSetup = {
    orientation: config.orientation === "portrait" ? "portrait" : "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printArea: `A1:${lastColumnLetter}${lastDataRow}`,
    printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    getExportFilename(config.filenamePrefix, "xlsx"),
  );
};

export const exportReport = async <Row,>(
  format: ExportFormat,
  options: ReportExportOptions<Row>,
  pageConfig?: PdfPageConfig,
) => {
  if (format === "csv") {
    await exportReportAsCsv(options);
    return;
  }

  if (format === "xlsx") {
    await exportReportAsXlsx(options);
    return;
  }

  await exportReportAsPdf({
    ...options,
    pageConfig: pageConfig ?? options.pageConfig,
  });
};
