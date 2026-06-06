import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { read, utils } from "xlsx";
import { createWorker } from "tesseract.js";
import tesseractWorkerUrl from "tesseract.js/dist/worker.min.js?url";
import {
  DOCUMENT_SCHEMAS,
  getDocumentSchemaForSlot,
  type DocumentCheckboxGroupDefinition,
  type DocumentExtractionMode,
  type DocumentFieldDefinition,
  type DocumentFieldStatus,
  type DocumentFieldType,
  type DocumentSchema,
  type DocumentSchemaId,
  type DocumentTableColumnDefinition,
  type DocumentTableDefinition,
} from "@/lib/ocr/documentSchemas";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type DocumentOcrIssueSeverity = "warning" | "error";

export type DocumentOcrIssue = {
  severity: DocumentOcrIssueSeverity;
  title: string;
  description: string;
};

export type DocumentOcrBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocumentOcrConfidenceBand = "green" | "yellow" | "red";

export type DocumentOcrFieldSection = string;

export type DocumentOcrField = {
  id: string;
  key: string;
  label: string;
  value: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
  confidenceBand: DocumentOcrConfidenceBand;
  source: string;
  sourceSnippet: string;
  sourcePage: number;
  pageNumber: number;
  boundingBox: DocumentOcrBoundingBox | null;
  section: DocumentOcrFieldSection;
  fieldType: DocumentFieldType;
  validationErrors: string[];
  duplicateKeys: string[];
  status: DocumentFieldStatus;
  required: boolean;
  expectedValues?: string[];
  helpText?: string;
  isCustom?: boolean;
};

export type DocumentOcrAuditEntry = {
  id: string;
  action: "detected" | "edited" | "added" | "deleted" | "merged";
  fieldId: string;
  fieldLabel: string;
  previousValue: string;
  nextValue: string;
  timestamp: string;
  note?: string;
};

export type DocumentOcrTableCell = {
  id: string;
  key: string;
  label: string;
  value: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
  confidenceBand: DocumentOcrConfidenceBand;
  fieldType: DocumentFieldType;
  status: DocumentFieldStatus;
  required: boolean;
  validationErrors: string[];
  sourcePage: number;
};

export type DocumentOcrTableRow = {
  id: string;
  rowNumber: number;
  status: DocumentFieldStatus;
  cells: Record<string, DocumentOcrTableCell>;
};

export type DocumentOcrTable = {
  id: string;
  key: string;
  label: string;
  section: string;
  columns: DocumentTableColumnDefinition[];
  rows: DocumentOcrTableRow[];
  minimumRows: number;
  duplicateWarnings: string[];
  validationWarnings: string[];
  helpText?: string;
};

export type DocumentOcrPageResult = {
  pageNumber: number;
  text: string;
  confidence: number;
  confidenceBand: DocumentOcrConfidenceBand;
  width: number;
  height: number;
  previewDataUrl: string;
  tableCount: number;
  checkboxCount: number;
  signatureCount: number;
  dates: string[];
  numericValues: string[];
};

export type DocumentOcrStructuredData = Record<string, unknown>;

export type DocumentOcrSummary = {
  extractedFieldsCount: number;
  totalExpectedFields: number;
  requiredFieldsCount: number;
  completedRequiredFieldsCount: number;
  missingRequiredFieldsCount: number;
  tableRowCount: number;
};

export type DocumentOcrScanResult = {
  text: string;
  confidence: number;
  confidenceBand: DocumentOcrConfidenceBand;
  pageCount: number;
  pageConfidenceScore: number;
  issues: DocumentOcrIssue[];
  canSubmit: boolean;
  extractedFields: DocumentOcrField[];
  tables: DocumentOcrTable[];
  pages: DocumentOcrPageResult[];
  documentType: string;
  documentTypeConfidence: number;
  schemaId: DocumentSchemaId;
  templateId: string;
  extractionMode: DocumentExtractionMode;
  structuredData: DocumentOcrStructuredData;
  duplicates: Array<{ key: string; values: string[] }>;
  flags: string[];
  possibleWrongDocument: boolean;
  auditTrail: DocumentOcrAuditEntry[];
  summary: DocumentOcrSummary;
};

type OcrLineLike = {
  text?: string;
  confidence?: number;
  bbox?: { x0?: number; y0?: number; x1?: number; y1?: number };
};

type PdfTextLine = {
  text: string;
  bbox: DocumentOcrBoundingBox | null;
  pageNumber: number;
  confidence: number;
};

const emailPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;
const phonePattern = /(?:\+?63|0)\s?\d[\d\s-]{7,}\d/;
const urlPattern = /https?:\/\/[^\s)]+/i;
const datePattern = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/;
const numericPattern = /\b\d[\d,]*(?:\.\d+)?\b/g;
const phMobilePattern = /^09\d{9}$/;
const whitespacePattern = /\s+/g;

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

const toConfidenceBand = (confidence: number): DocumentOcrConfidenceBand =>
  confidence >= 95 ? "green" : confidence >= 80 ? "yellow" : "red";

const normalizeOcrLine = (value: string) => value.replace(/\r/g, "").replace(whitespacePattern, " ").trim();

const splitOcrLines = (value: string) =>
  value
    .split(/\n+/)
    .map((line) => normalizeOcrLine(line))
    .filter(Boolean);

const canonicalize = (value: string) => normalizeOcrLine(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const titleCaseStatus = (status: DocumentFieldStatus) =>
  ({
    auto_detected: "Auto-detected",
    needs_review: "Needs review",
    missing: "Missing",
    low_confidence: "Low confidence",
    manually_corrected: "Manually corrected",
    not_applicable: "Not applicable",
  })[status];

const bboxFromAny = (bbox?: { x0?: number; y0?: number; x1?: number; y1?: number } | null): DocumentOcrBoundingBox | null => {
  if (!bbox) return null;
  const x0 = Number(bbox.x0 ?? 0);
  const y0 = Number(bbox.y0 ?? 0);
  const x1 = Number(bbox.x1 ?? 0);
  const y1 = Number(bbox.y1 ?? 0);
  if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return null;
  return {
    x: x0,
    y: y0,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
  };
};

const isPdfFile = (file: File) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
const isSpreadsheetFile = (file: File) => /\.(xlsx|xls)$/i.test(file.name) || /spreadsheet|excel|sheet/i.test(file.type);

const normalizePhpPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
};

const normalizeDateValue = (value: string) => {
  const trimmed = normalizeOcrLine(value);
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
};

const normalizeTextValue = (value: string) => normalizeOcrLine(value);

export const normalizeOcrFieldValue = (field: Pick<DocumentOcrField | DocumentOcrTableCell, "fieldType" | "value" | "label" | "key">) => {
  const trimmed = normalizeOcrLine(field.value);
  if (!trimmed) return "";
  if (field.fieldType === "email") return trimmed.toLowerCase();
  if (field.fieldType === "phone") return normalizePhpPhone(trimmed);
  if (field.fieldType === "date") return normalizeDateValue(trimmed);
  if (field.fieldType === "number") return trimmed.replace(/,/g, "");
  if (field.fieldType === "url") return trimmed;
  if (field.fieldType === "multiselect") {
    return trimmed
      .split(",")
      .map((part) => normalizeOcrLine(part))
      .filter(Boolean)
      .join(", ");
  }
  if (field.fieldType === "boolean") return /^(true|yes|present|detected|checked)$/i.test(trimmed) ? "true" : trimmed.toLowerCase() === "false" ? "false" : trimmed;
  return trimmed;
};

export const validateOcrFieldValue = (
  field: Pick<DocumentOcrField | DocumentOcrTableCell, "fieldType" | "value" | "label" | "key">,
  options?: { required?: boolean; expectedValues?: string[] },
) => {
  const value = normalizeOcrFieldValue(field);
  const errors: string[] = [];

  if (options?.required && !value) {
    errors.push("Value is required.");
    return errors;
  }

  if (!value) return errors;

  if (field.fieldType === "email" && !emailPattern.test(value)) errors.push("Enter a valid email address.");
  if (field.fieldType === "phone" && !phMobilePattern.test(normalizePhpPhone(value))) errors.push("Enter a valid 11-digit PH mobile number.");
  if (field.fieldType === "date" && Number.isNaN(new Date(value).getTime())) errors.push("Enter a valid date.");
  if (field.fieldType === "url") {
    try {
      new URL(value);
    } catch {
      errors.push("Enter a valid URL.");
    }
  }
  if (field.fieldType === "number" && !/^\d+$/.test(value)) errors.push("Enter a numeric value.");
  if (field.fieldType === "boolean" && !["true", "false", "yes", "no", "present", "missing", "detected", "checked"].includes(value.toLowerCase())) {
    errors.push("Use Yes/No or Present/Missing.");
  }
  if (options?.expectedValues?.length && field.fieldType === "multiselect") {
    const values = value.split(",").map((item) => normalizeOcrLine(item)).filter(Boolean);
    const invalid = values.filter((item) => !options.expectedValues!.some((option) => canonicalize(option) === canonicalize(item)));
    if (invalid.length) errors.push(`Unknown option: ${invalid.join(", ")}`);
  }

  return errors;
};

const inferFieldStatus = (value: string, confidence: number, required: boolean): DocumentFieldStatus => {
  if (!value) return required ? "missing" : "not_applicable";
  if (confidence >= 90) return "auto_detected";
  if (confidence >= 70) return "needs_review";
  return "low_confidence";
};

const makeField = (
  definition: DocumentFieldDefinition | DocumentCheckboxGroupDefinition,
  patch?: Partial<DocumentOcrField>,
): DocumentOcrField => {
  const value = patch?.value ?? "";
  const confidence = patch?.confidence ?? 0;
  const normalizedValue = patch?.normalizedValue ?? normalizeOcrFieldValue({
    fieldType: "fieldType" in definition ? definition.fieldType : "multiselect",
    value,
    label: definition.label,
    key: definition.key,
  });
  const fieldType = "fieldType" in definition ? definition.fieldType : "multiselect";
  const required = definition.required ?? false;
  const status = patch?.status ?? inferFieldStatus(value, confidence, required);
  const expectedValues = "options" in definition ? definition.options : definition.expectedValues;
  return {
    id: patch?.id ?? createId("ocr-field"),
    key: definition.key,
    label: definition.label,
    value,
    rawValue: patch?.rawValue ?? value,
    normalizedValue,
    confidence,
    confidenceBand: toConfidenceBand(confidence),
    source: patch?.source ?? "",
    sourceSnippet: patch?.sourceSnippet ?? "",
    sourcePage: patch?.sourcePage ?? patch?.pageNumber ?? 1,
    pageNumber: patch?.pageNumber ?? 1,
    boundingBox: patch?.boundingBox ?? null,
    section: definition.section,
    fieldType,
    validationErrors:
      patch?.validationErrors ??
      validateOcrFieldValue(
        {
          fieldType,
          value,
          label: definition.label,
          key: definition.key,
        },
        { required, expectedValues },
      ),
    duplicateKeys: patch?.duplicateKeys ?? [],
    status,
    required,
    expectedValues,
    helpText: definition.helpText,
    isCustom: patch?.isCustom ?? false,
  };
};

const makeTableCell = (column: DocumentTableColumnDefinition, value = "", confidence = 0, pageNumber = 1): DocumentOcrTableCell => {
  const normalizedValue = normalizeOcrFieldValue({ fieldType: column.fieldType, value, label: column.label, key: column.key });
  return {
    id: createId("ocr-cell"),
    key: column.key,
    label: column.label,
    value,
    rawValue: value,
    normalizedValue,
    confidence,
    confidenceBand: toConfidenceBand(confidence),
    fieldType: column.fieldType,
    status: inferFieldStatus(value, confidence, column.required ?? false),
    required: column.required ?? false,
    validationErrors: validateOcrFieldValue(
      { fieldType: column.fieldType, value, label: column.label, key: column.key },
      { required: column.required },
    ),
    sourcePage: pageNumber,
  };
};

const makeEmptyTable = (definition: DocumentTableDefinition): DocumentOcrTable => ({
  id: createId("ocr-table"),
  key: definition.key,
  label: definition.label,
  section: definition.section,
  columns: definition.columns,
  rows: [],
  minimumRows: definition.minimumRows ?? 0,
  duplicateWarnings: [],
  validationWarnings: [],
  helpText: definition.helpText,
});

const buildStructuredFields = (fields: DocumentOcrField[]) =>
  fields.reduce<Record<string, Record<string, unknown>>>((sections, field) => {
    const sectionKey = field.section.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (!sections[sectionKey]) sections[sectionKey] = {};
    sections[sectionKey][field.key] = {
      label: field.label,
      value: field.value,
      raw_value: field.rawValue,
      normalized_value: field.normalizedValue,
      confidence: field.confidence,
      status: field.status,
      source_page: field.pageNumber,
      bbox: field.boundingBox,
      required: field.required,
    };
    return sections;
  }, {});

export const buildStructuredOcrData = (fields: DocumentOcrField[], tables: DocumentOcrTable[] = []): DocumentOcrStructuredData => {
  const sections = buildStructuredFields(fields);
  if (tables.length) {
    sections.tables = tables.reduce<Record<string, unknown>>((result, table) => {
      result[table.key] = table.rows.map((row) =>
        table.columns.reduce<Record<string, unknown>>((cells, column) => {
          const cell = row.cells[column.key];
          cells[column.key] = {
            label: column.label,
            value: cell?.value ?? "",
            raw_value: cell?.rawValue ?? "",
            normalized_value: cell?.normalizedValue ?? "",
            confidence: cell?.confidence ?? 0,
            status: cell?.status ?? "missing",
          };
          return cells;
        }, {}),
      );
      return result;
    }, {});
  }
  return sections;
};

const getFieldSummary = (fields: DocumentOcrField[], tables: DocumentOcrTable[]): DocumentOcrSummary => {
  const requiredFields = fields.filter((field) => field.required);
  const completedRequiredFields = requiredFields.filter((field) => field.normalizedValue && field.status !== "missing");
  return {
    extractedFieldsCount: fields.filter((field) => field.normalizedValue).length,
    totalExpectedFields: fields.length,
    requiredFieldsCount: requiredFields.length,
    completedRequiredFieldsCount: completedRequiredFields.length,
    missingRequiredFieldsCount: requiredFields.length - completedRequiredFields.length,
    tableRowCount: tables.reduce((total, table) => total + table.rows.length, 0),
  };
};

const groupTextItemsIntoLines = (items: Array<{ str?: string; transform?: number[]; width?: number; height?: number }>, pageNumber: number): PdfTextLine[] => {
  const buckets = new Map<number, PdfTextLine[]>();

  items.forEach((item) => {
    const text = normalizeOcrLine(item.str ?? "");
    if (!text) return;
    const transform = item.transform ?? [];
    const x = Number(transform[4] ?? 0);
    const y = Number(transform[5] ?? 0);
    const width = Number(item.width ?? text.length * 6);
    const height = Math.abs(Number(item.height ?? transform[0] ?? 12)) || 12;
    const key = Math.round(y / 6) * 6;
    const entry: PdfTextLine = {
      text,
      pageNumber,
      confidence: 98,
      bbox: { x, y: Math.max(0, y - height), width, height },
    };
    const bucket = buckets.get(key) ?? [];
    bucket.push(entry);
    buckets.set(key, bucket);
  });

  return [...buckets.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, bucket]) => {
      const ordered = [...bucket].sort((left, right) => (left.bbox?.x ?? 0) - (right.bbox?.x ?? 0));
      const text = normalizeOcrLine(ordered.map((item) => item.text).join(" "));
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      return {
        text,
        pageNumber,
        confidence: 98,
        bbox: first?.bbox && last?.bbox
          ? {
              x: first.bbox.x,
              y: Math.min(...ordered.map((item) => item.bbox?.y ?? first.bbox!.y)),
              width: (last.bbox.x + last.bbox.width) - first.bbox.x,
              height: Math.max(...ordered.map((item) => item.bbox?.height ?? first.bbox!.height)),
            }
          : null,
      };
    })
    .filter((line) => line.text);
};

const preprocessCanvasForOcr = (canvas: HTMLCanvasElement) => {
  const processed = document.createElement("canvas");
  processed.width = canvas.width;
  processed.height = canvas.height;
  const context = processed.getContext("2d");
  if (!context) return canvas;
  context.drawImage(canvas, 0, 0);
  const imageData = context.getImageData(0, 0, processed.width, processed.height);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const avg = Math.min(255, Math.max(0, (data[index] + data[index + 1] + data[index + 2]) / 3 * 1.15));
    const sharpened = avg > 175 ? 255 : avg < 110 ? 0 : avg;
    data[index] = sharpened;
    data[index + 1] = sharpened;
    data[index + 2] = sharpened;
  }
  context.putImageData(imageData, 0, 0);
  return processed;
};

const runTesseractOnCanvas = async (
  worker: Awaited<ReturnType<typeof createWorker>>,
  canvas: HTMLCanvasElement,
): Promise<{ lines: PdfTextLine[]; text: string; confidence: number }> => {
  const result = await worker.recognize(preprocessCanvasForOcr(canvas));
  const lines =
    ((result.data as { lines?: OcrLineLike[] }).lines ?? [])
      .map((line) => ({
        text: normalizeOcrLine(line.text ?? ""),
        bbox: bboxFromAny(line.bbox ?? null),
        pageNumber: 1,
        confidence: Number.isFinite(line.confidence) ? Math.round(Number(line.confidence)) : Math.round(Number(result.data.confidence ?? 0)),
      }))
      .filter((line) => line.text);
  return {
    lines,
    text: (result.data.text ?? "").replace(/\r/g, "").trim(),
    confidence: Math.round(Number(result.data.confidence ?? 0)),
  };
};

const getPdfPageData = async (
  file: File,
  onProgress?: (state: { stage: "loading" | "rendering" | "ocr"; page: number; totalPages: number; progress?: number }) => void,
) => {
  const pdfBuffer = new Uint8Array(await file.arrayBuffer());
  const pdfDocument = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const worker = await createWorker("eng", 1, {
    workerPath: tesseractWorkerUrl,
    logger: (message) => {
      if (message.status !== "recognizing text") return;
      onProgress?.({
        stage: "ocr",
        page: 0,
        totalPages: pdfDocument.numPages,
        progress: message.progress,
      });
    },
  });

  try {
    const pages: DocumentOcrPageResult[] = [];
    const allLines: PdfTextLine[] = [];
    const textParts: string[] = [];
    const pageConfidences: number[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      onProgress?.({ stage: "rendering", page: pageNumber, totalPages: pdfDocument.numPages });
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas context is unavailable in this browser.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;

      const textContent = await page.getTextContent();
      const pdfLines = groupTextItemsIntoLines(textContent.items as Array<{ str?: string; transform?: number[]; width?: number; height?: number }>, pageNumber);
      let text = pdfLines.map((line) => line.text).join("\n");
      let confidence = pdfLines.length ? 98 : 0;
      let lines = pdfLines;

      if (normalizeOcrLine(text).length < 60) {
        onProgress?.({ stage: "ocr", page: pageNumber, totalPages: pdfDocument.numPages });
        const ocrResult = await runTesseractOnCanvas(worker, canvas);
        lines = ocrResult.lines.map((line) => ({ ...line, pageNumber }));
        text = ocrResult.text;
        confidence = ocrResult.confidence;
      }

      const dates = Array.from(new Set((text.match(new RegExp(datePattern, "g")) ?? []).map(normalizeOcrLine)));
      const numericValues = Array.from(new Set(text.match(numericPattern) ?? []));
      const checkboxCount = (text.match(/[☑☐✓■]/g) ?? []).length;
      const tableCount = Math.max(0, splitOcrLines(text).filter((line) => /\s{2,}|\|/.test(line)).length);
      const signatureCount = /\bsignature\b/i.test(text) ? 1 : 0;

      textParts.push(text);
      if (confidence) pageConfidences.push(confidence);
      allLines.push(...lines);
      pages.push({
        pageNumber,
        text,
        confidence,
        confidenceBand: toConfidenceBand(confidence),
        width: canvas.width,
        height: canvas.height,
        previewDataUrl: canvas.toDataURL("image/jpeg", 0.86),
        tableCount,
        checkboxCount,
        signatureCount,
        dates,
        numericValues,
      });
    }

    return {
      pages,
      lines: allLines,
      text: textParts.join("\n\n").trim(),
      confidence: pageConfidences.length ? Math.round(pageConfidences.reduce((sum, value) => sum + value, 0) / pageConfidences.length) : 0,
      pageCount: pdfDocument.numPages,
    };
  } finally {
    await worker.terminate();
  }
};

const findLabelIndex = (lines: PdfTextLine[], aliases: string[]) => {
  const canonicalAliases = aliases.map(canonicalize);
  return lines.findIndex((line) => canonicalAliases.some((alias) => canonicalize(line.text).startsWith(alias)));
};

const findValueForField = (definition: DocumentFieldDefinition, lines: PdfTextLine[]): Partial<DocumentOcrField> => {
  const aliases = [definition.label, ...(definition.aliases ?? [])];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const canonicalLine = canonicalize(line.text);
    for (const alias of aliases) {
      const canonicalAlias = canonicalize(alias);
      if (!canonicalAlias) continue;
      if (canonicalLine === canonicalAlias || canonicalLine.startsWith(`${canonicalAlias} `) || canonicalLine.startsWith(`${canonicalAlias}:`)) {
        const inlineValue = normalizeOcrLine(line.text.replace(new RegExp(`^${alias}\\s*[:\\-]?`, "i"), ""));
        const nextLines = lines.slice(index + 1, index + (definition.multiline ? 4 : 2)).map((entry) => entry.text);
        const value = inlineValue && canonicalize(inlineValue) !== canonicalAlias
          ? inlineValue
          : normalizeOcrLine(nextLines.join(definition.multiline ? " " : " "));
        return {
          value,
          rawValue: value,
          source: line.text,
          sourceSnippet: line.text,
          sourcePage: line.pageNumber,
          pageNumber: line.pageNumber,
          boundingBox: line.bbox,
          confidence: inlineValue ? line.confidence : Math.max(72, line.confidence - 8),
        };
      }
    }
  }

  const fullText = lines.map((line) => line.text).join("\n");
  if (definition.fieldType === "email") {
    const match = fullText.match(emailPattern);
    if (match) return { value: match[0], rawValue: match[0], confidence: 82, pageNumber: 1, sourcePage: 1, source: "pattern", sourceSnippet: match[0], boundingBox: null };
  }
  if (definition.fieldType === "phone") {
    const match = fullText.match(phonePattern);
    if (match) return { value: match[0], rawValue: match[0], confidence: 80, pageNumber: 1, sourcePage: 1, source: "pattern", sourceSnippet: match[0], boundingBox: null };
  }
  if (definition.fieldType === "date") {
    const match = fullText.match(datePattern);
    if (match) return { value: match[0], rawValue: match[0], confidence: 78, pageNumber: 1, sourcePage: 1, source: "pattern", sourceSnippet: match[0], boundingBox: null };
  }
  if (definition.fieldType === "url") {
    const match = fullText.match(urlPattern);
    if (match) return { value: match[0], rawValue: match[0], confidence: 78, pageNumber: 1, sourcePage: 1, source: "pattern", sourceSnippet: match[0], boundingBox: null };
  }

  return { value: "", rawValue: "", confidence: 0, source: "", sourceSnippet: "", sourcePage: 1, pageNumber: 1, boundingBox: null };
};

const findValueForCheckboxGroup = (definition: DocumentCheckboxGroupDefinition, lines: PdfTextLine[]): Partial<DocumentOcrField> => {
  const fullText = lines.map((line) => line.text).join("\n");
  const matches = definition.options.filter((option) => {
    const pattern = new RegExp(`(?:☑|✓|■)?\\s*${option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    return pattern.test(fullText);
  });
  return {
    value: matches.join(", "),
    rawValue: matches.join(", "),
    confidence: matches.length ? 74 : 0,
    source: definition.label,
    sourceSnippet: definition.label,
    sourcePage: 1,
    pageNumber: 1,
    boundingBox: null,
  };
};

const extractFixedFormFields = (schema: DocumentSchema, lines: PdfTextLine[]) => {
  const fields: DocumentOcrField[] = [];
  const auditTrail: DocumentOcrAuditEntry[] = [];

  schema.fields.forEach((definition) => {
    const patch = findValueForField(definition, lines);
    const field = makeField(definition, patch);
    fields.push(field);
    auditTrail.push({
      id: createId("ocr-audit"),
      action: "detected",
      fieldId: field.id,
      fieldLabel: field.label,
      previousValue: "",
      nextValue: field.value,
      timestamp: new Date().toISOString(),
      note: field.value ? `Detected from ${field.source || "document text"}.` : `Expected ${field.label} but no value was detected automatically.`,
    });
  });

  (schema.checkboxGroups ?? []).forEach((definition) => {
    const patch = findValueForCheckboxGroup(definition, lines);
    const field = makeField(definition, patch);
    fields.push(field);
    auditTrail.push({
      id: createId("ocr-audit"),
      action: "detected",
      fieldId: field.id,
      fieldLabel: field.label,
      previousValue: "",
      nextValue: field.value,
      timestamp: new Date().toISOString(),
      note: field.value ? `Detected checkbox selection for ${field.label}.` : `Expected ${field.label} but no checked option was detected automatically.`,
    });
  });

  return { fields, auditTrail, tables: (schema.tables ?? []).map(makeEmptyTable) };
};

const sectionTextBetween = (text: string, sectionTitle: string, nextSectionTitles: string[]) => {
  const startPattern = new RegExp(`${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?`, "i");
  const startMatch = text.match(startPattern);
  if (!startMatch) return "";
  const startIndex = startMatch.index ?? 0;
  const remainder = text.slice(startIndex);
  const nextIndex = nextSectionTitles
    .map((title) => remainder.search(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")))
    .filter((index) => index > 0)
    .sort((left, right) => left - right)[0];
  return normalizeOcrLine(nextIndex ? remainder.slice(0, nextIndex) : remainder);
};

const extractConstitutionFields = (schema: DocumentSchema, text: string) => {
  const sections = schema.requiredArticles ?? [];
  const sectionBodies = Object.fromEntries(
    sections.map((sectionTitle, index) => [sectionTitle, sectionTextBetween(text, sectionTitle, sections.slice(index + 1))]),
  );

  const fields = schema.fields.map((definition) => {
    const sourceSection = Object.entries(sectionBodies).find(([, body]) =>
      (definition.aliases ?? [definition.label]).some((alias) => canonicalize(body).includes(canonicalize(alias))),
    );
    const value = sourceSection?.[1] ?? "";
    const hasPlaceholder = (schema.placeholderChecks ?? []).some((placeholder) => value.includes(placeholder));
    const confidence = value ? 92 : 0;
    return makeField(definition, {
      value,
      rawValue: value,
      confidence,
      source: sourceSection?.[0] ?? definition.label,
      sourceSnippet: value.slice(0, 220),
      sourcePage: 1,
      pageNumber: 1,
      boundingBox: null,
      status: hasPlaceholder ? "needs_review" : inferFieldStatus(value, confidence, definition.required ?? false),
    });
  });

  const auditTrail = fields.map((field) => ({
    id: createId("ocr-audit"),
    action: "detected" as const,
    fieldId: field.id,
    fieldLabel: field.label,
    previousValue: "",
    nextValue: field.value,
    timestamp: new Date().toISOString(),
    note: field.value ? `Mapped from constitution section text.` : `Expected ${field.label} but it appears blank or missing.`,
  }));

  return { fields, auditTrail, tables: [] as DocumentOcrTable[] };
};

const inferRowStatus = (cells: DocumentOcrTableCell[]) => {
  if (cells.some((cell) => cell.required && !cell.normalizedValue)) return "missing";
  if (cells.some((cell) => cell.validationErrors.length)) return "needs_review";
  if (cells.some((cell) => cell.confidence < 70)) return "low_confidence";
  return "auto_detected";
};

const buildRowsFromObjects = (definition: DocumentTableDefinition, rows: Array<Record<string, unknown>>, pageNumber = 1): DocumentOcrTableRow[] =>
  rows.map((row, rowIndex) => {
    const cells = Object.fromEntries(
      definition.columns.map((column) => {
        const rawValue = String(row[column.key] ?? "");
        return [column.key, makeTableCell(column, rawValue, rawValue ? 96 : 0, pageNumber)];
      }),
    ) as Record<string, DocumentOcrTableCell>;
    return {
      id: createId("ocr-row"),
      rowNumber: rowIndex + 1,
      status: inferRowStatus(Object.values(cells)),
      cells,
    };
  });

const extractDirectoryTable = (schema: DocumentSchema, lines: PdfTextLine[]) => {
  const tableDefinition = schema.tables?.[0];
  const tables = tableDefinition ? [makeEmptyTable(tableDefinition)] : [];
  if (!tableDefinition) return { fields: schema.fields.map((definition) => makeField(definition)), tables, auditTrail: [] as DocumentOcrAuditEntry[] };

  const contentLines = lines.map((line) => line.text);
  const officerRows: Array<Record<string, string>> = [];
  contentLines.forEach((line) => {
    if (!line || /^position$/i.test(line) || /^adviser/i.test(line) || /^identification card/i.test(line)) return;
    const emailMatch = line.match(emailPattern)?.[0] ?? "";
    const phoneMatch = line.match(phonePattern)?.[0] ?? "";
    const ageMatch = line.match(/\b\d{1,2}\b/)?.[0] ?? "";
    if (!emailMatch && !phoneMatch && !ageMatch) return;
    const cleaned = line.replace(emailMatch, "").replace(phoneMatch, "").replace(ageMatch, "").trim();
    const segments = cleaned.split(/\s{2,}|\t+/).map((segment) => normalizeOcrLine(segment)).filter(Boolean);
    officerRows.push({
      position: segments[0] ?? "",
      name: segments[1] ?? segments[0] ?? "",
      age: ageMatch,
      sex: segments.find((segment) => /^(m|f)$/i.test(segment)) ?? "",
      gender_identity: segments.find((segment) => /^(l|g|b|t|q|i|m|f)$/i.test(segment)) ?? "",
      address: segments.slice(2).join(", "),
      email: emailMatch,
      contact_number: phoneMatch,
    });
  });

  tables[0].rows = buildRowsFromObjects(tableDefinition, officerRows);
  tables[0].validationWarnings = officerRows.length ? [] : ["No officer rows were detected automatically. Add the entries manually if needed."];
  tables[0].duplicateWarnings = buildDuplicateWarnings(tables[0], ["name", "contact_number"]);

  const adviserNamePatch = findValueForField(schema.fields.find((field) => field.key === "adviser_name")!, lines);
  const adviserPositionPatch = findValueForField(schema.fields.find((field) => field.key === "adviser_position")!, lines);
  const fields = schema.fields.map((definition) => {
    if (definition.key === "adviser_name") return makeField(definition, adviserNamePatch);
    if (definition.key === "adviser_position") return makeField(definition, adviserPositionPatch);
    if (definition.key === "id_front_present") return makeField(definition, { value: canonicalize(lines.map((line) => line.text).join(" ")).includes("identification card front") ? "true" : "", confidence: 88 });
    if (definition.key === "id_back_present") return makeField(definition, { value: canonicalize(lines.map((line) => line.text).join(" ")).includes("identification card back") ? "true" : "", confidence: 88 });
    return makeField(definition);
  });

  return {
    fields,
    tables,
    auditTrail: fields.map((field) => ({
      id: createId("ocr-audit"),
      action: "detected" as const,
      fieldId: field.id,
      fieldLabel: field.label,
      previousValue: "",
      nextValue: field.value,
      timestamp: new Date().toISOString(),
      note: field.value ? `Detected ${field.label}.` : `Expected ${field.label} but it needs manual review.`,
    })),
  };
};

const buildDuplicateWarnings = (table: DocumentOcrTable, keys: string[]) => {
  const warnings: string[] = [];
  keys.forEach((key) => {
    const seen = new Map<string, number[]>();
    table.rows.forEach((row) => {
      const value = row.cells[key]?.normalizedValue ?? "";
      if (!value) return;
      const list = seen.get(value) ?? [];
      list.push(row.rowNumber);
      seen.set(value, list);
    });
    seen.forEach((rows, value) => {
      if (rows.length > 1) warnings.push(`Duplicate ${key.replaceAll("_", " ")} "${value}" found in row(s) ${rows.join(", ")}.`);
    });
  });
  return warnings;
};

const extractMembersSpreadsheet = async (schema: DocumentSchema, file: File) => {
  const workbook = read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<(string | number | Date | null)[]>(sheet, { header: 1, raw: false });
  const tableDefinition = schema.tables?.[0];
  const table = tableDefinition ? makeEmptyTable(tableDefinition) : null;
  const fields = schema.fields.map((definition) => makeField(definition));
  const auditTrail: DocumentOcrAuditEntry[] = [];
  if (!tableDefinition || !table) return { fields, tables: [], auditTrail, pages: [] as DocumentOcrPageResult[], text: "", confidence: 99 };

  const organizationRow = rows.find((row) => canonicalize(String(row[0] ?? "")).includes("organization name"));
  if (organizationRow) {
    const organizationName = normalizeOcrLine(String(organizationRow.slice(1).find(Boolean) ?? ""));
    const field = fields.find((entry) => entry.key === "organization_name");
    if (field) {
      field.value = organizationName;
      field.rawValue = organizationName;
      field.normalizedValue = normalizeTextValue(organizationName);
      field.confidence = organizationName ? 99 : 0;
      field.confidenceBand = toConfidenceBand(field.confidence);
      field.status = inferFieldStatus(field.value, field.confidence, field.required);
      field.validationErrors = validateOcrFieldValue(field, { required: field.required });
    }
  }

  const headerRowIndex = rows.findIndex((row) => canonicalize(row.join(" ")).includes("surname") && canonicalize(row.join(" ")).includes("first name"));
  const dataRows = headerRowIndex >= 0 ? rows.slice(headerRowIndex + 2) : [];
  const parsedRows = dataRows
    .map((row) => ({
      surname: normalizeOcrLine(String(row[0] ?? "")),
      first_name: normalizeOcrLine(String(row[1] ?? "")),
      middle_initial: normalizeOcrLine(String(row[2] ?? "")),
      age: normalizeOcrLine(String(row[3] ?? "")),
      date_of_birth: normalizeOcrLine(String(row[4] ?? "")),
      address: normalizeOcrLine(String(row[5] ?? "")),
      contact_number: normalizeOcrLine(String(row[6] ?? "")),
    }))
    .filter((row) => Object.values(row).some(Boolean));

  table.rows = buildRowsFromObjects(tableDefinition, parsedRows);
  table.duplicateWarnings = buildDuplicateWarnings(table, ["surname", "contact_number"]);
  table.validationWarnings = [];
  if (table.rows.length < table.minimumRows) {
    table.validationWarnings.push(`Minimum member count check failed. At least ${table.minimumRows} members are required.`);
  }
  if (!table.rows.length) {
    table.validationWarnings.push("No member rows were detected automatically.");
  }

  table.rows.forEach((row) => {
    if (Object.values(row.cells).some((cell) => cell.validationErrors.length)) {
      table.validationWarnings.push(`Row ${row.rowNumber} has validation issues that need review.`);
    }
  });

  fields.forEach((field) => {
    auditTrail.push({
      id: createId("ocr-audit"),
      action: "detected",
      fieldId: field.id,
      fieldLabel: field.label,
      previousValue: "",
      nextValue: field.value,
      timestamp: new Date().toISOString(),
      note: field.value ? `Parsed directly from spreadsheet cells.` : `Expected ${field.label} but it was blank in the spreadsheet.`,
    });
  });

  return {
    fields,
    tables: [table],
    auditTrail,
    pages: [] as DocumentOcrPageResult[],
    text: parsedRows
      .map((row) => Object.values(row).join(" | "))
      .join("\n"),
    confidence: 99,
  };
};

const extractFormData = async (schema: DocumentSchema, file: File, onProgress?: (state: { stage: "loading" | "rendering" | "ocr"; page: number; totalPages: number; progress?: number }) => void) => {
  if (schema.id === "yorp_members_good_standing" && isSpreadsheetFile(file)) {
    return extractMembersSpreadsheet(schema, file);
  }

  const pdfData = await getPdfPageData(file, onProgress);
  if (schema.id === "constitution_and_bylaws") {
    return { ...extractConstitutionFields(schema, pdfData.text), ...pdfData };
  }
  if (schema.id === "yorp_directory_officers_adviser") {
    return { ...extractDirectoryTable(schema, pdfData.lines), ...pdfData };
  }
  return { ...extractFixedFormFields(schema, pdfData.lines), ...pdfData };
};

const detectWrongDocument = (schema: DocumentSchema, text: string) => {
  const titleHits = schema.expectedTitlePatterns.filter((pattern) => pattern.test(text)).length;
  const phraseHits = schema.expectedKeyPhrases.filter((pattern) => pattern.test(text)).length;
  const confidence = Math.min(100, 55 + titleHits * 20 + phraseHits * 8);
  return {
    confidence,
    wrong: titleHits === 0 && phraseHits <= 1,
  };
};

const buildSchemaIssues = (
  schema: DocumentSchema,
  text: string,
  confidence: number,
  fields: DocumentOcrField[],
  tables: DocumentOcrTable[],
  possibleWrongDocument: boolean,
): { issues: DocumentOcrIssue[]; flags: string[] } => {
  const issues: DocumentOcrIssue[] = [];
  const flags: string[] = [];
  const requiredFields = fields.filter((field) => field.required);
  const missingRequired = requiredFields.filter((field) => !field.normalizedValue || field.status === "missing");
  const lowConfidenceFields = fields.filter((field) => field.status === "low_confidence");
  const invalidFields = fields.filter((field) => field.validationErrors.length);

  if (!normalizeOcrLine(text) && schema.id !== "yorp_members_good_standing") {
    issues.push({
      severity: "error",
      title: "No readable text",
      description: "The scanner could not read the uploaded document. Reupload a clearer file or check whether the file is corrupted.",
    });
    flags.push("no_text_detected");
  }

  if (possibleWrongDocument) {
    issues.push({
      severity: "error",
      title: "Possible wrong document uploaded",
      description: `The uploaded file does not strongly match the expected template for ${schema.label}.`,
    });
    flags.push("possible_wrong_document");
  }

  if (confidence < 80) {
    issues.push({
      severity: "warning",
      title: "Low page confidence",
      description: "Page-level OCR confidence is below 80%. Review the extracted values carefully before submission.",
    });
    flags.push("low_page_confidence");
  }

  if (missingRequired.length) {
    issues.push({
      severity: "warning",
      title: "Missing required fields",
      description: `${missingRequired.length} required field(s) were not detected automatically and need manual review.`,
    });
    flags.push("missing_required_fields");
  }

  if (lowConfidenceFields.length) {
    issues.push({
      severity: "warning",
      title: "Low confidence fields detected",
      description: `${lowConfidenceFields.length} field(s) are below the confidence threshold and should be reviewed manually.`,
    });
    flags.push("low_confidence_field_detected");
  }

  if (invalidFields.length) {
    issues.push({
      severity: "warning",
      title: "Validation issues found",
      description: `${invalidFields.length} extracted field(s) do not pass validation yet.`,
    });
    flags.push("validation_issues");
  }

  if (schema.id === "constitution_and_bylaws") {
    const placeholderHits = (schema.placeholderChecks ?? []).filter((placeholder) => text.includes(placeholder));
    if (placeholderHits.length) {
      issues.push({
        severity: "error",
        title: "Template placeholders still present",
        description: `${placeholderHits.length} placeholder(s) from the constitution template are still present and must be replaced.`,
      });
      flags.push("template_placeholders_present");
    }
    const missingArticles = (schema.requiredArticles ?? []).filter((article) => !text.includes(article));
    if (missingArticles.length) {
      issues.push({
        severity: "warning",
        title: "Missing required articles",
        description: `Some constitution sections appear missing: ${missingArticles.join(", ")}.`,
      });
      flags.push("missing_required_article");
    }
  }

  tables.forEach((table) => {
    if (table.rows.length < table.minimumRows) flags.push(`minimum_rows_not_met:${table.key}`);
    if (table.duplicateWarnings.length) flags.push(`duplicate_rows:${table.key}`);
    table.validationWarnings.forEach(() => flags.push(`table_validation_warning:${table.key}`));
  });

  return { issues, flags };
};

const dedupeFields = (fields: DocumentOcrField[]) => {
  const byKey = new Map<string, DocumentOcrField[]>();
  fields.forEach((field) => {
    const key = `${field.key}:${field.normalizedValue || field.value}`.toLowerCase();
    const list = byKey.get(key) ?? [];
    list.push(field);
    byKey.set(key, list);
  });

  const merged: DocumentOcrField[] = [];
  const duplicates: Array<{ key: string; values: string[] }> = [];
  const auditTrail: DocumentOcrAuditEntry[] = [];

  byKey.forEach((group) => {
    const winner = [...group].sort((left, right) => right.confidence - left.confidence)[0];
    if (group.length > 1 && (winner.normalizedValue || winner.value)) {
      duplicates.push({
        key: winner.key,
        values: Array.from(new Set(group.map((entry) => entry.value).filter(Boolean))),
      });
      auditTrail.push({
        id: createId("ocr-audit"),
        action: "merged",
        fieldId: winner.id,
        fieldLabel: winner.label,
        previousValue: group.map((entry) => entry.value).join(" | "),
        nextValue: winner.value,
        timestamp: new Date().toISOString(),
        note: "Duplicate extracted values were merged automatically.",
      });
    }
    merged.push({ ...winner, duplicateKeys: group.filter((entry) => entry.id !== winner.id).map((entry) => entry.id) });
  });

  return { merged, duplicates, auditTrail };
};

export const summarizeEditableOcrData = (fields: DocumentOcrField[], tables: DocumentOcrTable[]) => getFieldSummary(fields, tables);

export const scanPdfForOcr = async (
  file: File,
  documentSlotName?: string,
  onProgress?: (state: { stage: "loading" | "rendering" | "ocr"; page: number; totalPages: number; progress?: number }) => void,
): Promise<DocumentOcrScanResult> => {
  const schema = getDocumentSchemaForSlot(documentSlotName ?? "") ?? DOCUMENT_SCHEMAS.pasig_yorp_form_a;

  if (!isPdfFile(file) && !(schema.id === "yorp_members_good_standing" && isSpreadsheetFile(file))) {
    throw new Error("Unsupported file type for this document slot.");
  }

  const extracted = await extractFormData(schema, file, onProgress);
  const deduped = dedupeFields(extracted.fields);
  const text = extracted.text ?? "";
  const { confidence: documentTypeConfidence, wrong: possibleWrongDocument } = detectWrongDocument(schema, text);
  const { issues, flags } = buildSchemaIssues(schema, text, extracted.confidence, deduped.merged, extracted.tables, possibleWrongDocument);
  const summary = getFieldSummary(deduped.merged, extracted.tables);

  return {
    text,
    confidence: extracted.confidence,
    confidenceBand: toConfidenceBand(extracted.confidence),
    pageCount: extracted.pageCount ?? extracted.pages.length,
    pageConfidenceScore: extracted.confidence,
    issues,
    canSubmit: !issues.some((issue) => issue.severity === "error"),
    extractedFields: deduped.merged,
    tables: extracted.tables,
    pages: extracted.pages,
    documentType: schema.label,
    documentTypeConfidence,
    schemaId: schema.id,
    templateId: schema.templateId,
    extractionMode: schema.extractionMode,
    structuredData: buildStructuredOcrData(deduped.merged, extracted.tables),
    duplicates: deduped.duplicates,
    flags,
    possibleWrongDocument,
    auditTrail: [...(extracted.auditTrail ?? []), ...deduped.auditTrail],
    summary,
  };
};

export { DOCUMENT_SCHEMAS, getDocumentSchemaForSlot, titleCaseStatus };
