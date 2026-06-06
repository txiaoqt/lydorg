import React from "react";
import { DisclosureDocType, DisclosureDocument } from "../types";

const DOC_TYPE_STYLES: Record<string, string> = {
  program_outcome: "bg-primary/10 text-primary border-primary/20",
  ordinance: "bg-warning/12 text-warning border-warning/30",
  financial_statement: "bg-success/12 text-success border-success/30",
  resolution: "bg-info/12 text-info border-info/30",
  bac_document: "bg-destructive/10 text-destructive border-destructive/20",
  executive_order: "bg-info/12 text-info border-info/30",
  other: "bg-muted text-muted-foreground border-border",
};

export const DOCUMENT_TYPE_LABELS: Record<DisclosureDocType, string> = {
  ordinance: "Ordinance",
  resolution: "Resolution",
  executive_order: "Executive Order",
  bac_document: "BAC Document",
  financial_statement: "Financial Statement",
  program_outcome: "Program Outcome",
  other: "Other",
};

export function getDocumentTypeLabel(doc: DisclosureDocument) {
  if (doc.document_type === "other") {
    return doc.document_type_other?.trim() || "Other / Custom Type";
  }
  return DOCUMENT_TYPE_LABELS[doc.document_type] || "Other / Custom Type";
}

export function getDocumentTypeBadgeClasses(documentType: string) {
  return DOC_TYPE_STYLES[documentType] ?? DOC_TYPE_STYLES.other;
}

type DocumentTypeBadgeProps = {
  doc: DisclosureDocument;
};

export function DocumentTypeBadge({ doc }: DocumentTypeBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getDocumentTypeBadgeClasses(
        doc.document_type,
      )}`}
    >
      {getDocumentTypeLabel(doc)}
    </span>
  );
}
