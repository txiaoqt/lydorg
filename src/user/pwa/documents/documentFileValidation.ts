export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const formatDocumentFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

export const documentAcceptsSpreadsheet = (documentTypeId: string) => documentTypeId === "yorp-members";

export const getAcceptedDocumentFormats = (documentTypeId: string) =>
  documentAcceptsSpreadsheet(documentTypeId) ? "PDF, XLS, or XLSX" : "PDF";

export const getDocumentInputAccept = (documentTypeId: string) =>
  documentAcceptsSpreadsheet(documentTypeId)
    ? ".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : ".pdf,application/pdf";

const hasUnsafeFileName = (name: string) =>
  !name.trim()
  || name.length > 180
  || name === "."
  || name === ".."
  || /[\\/]/.test(name)
  || Array.from(name).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

const readSignature = async (file: File, length = 8) =>
  new Uint8Array(await file.slice(0, length).arrayBuffer());

export const validateOrganizationDocumentFile = async (documentTypeId: string, file: File) => {
  if (hasUnsafeFileName(file.name)) return "Use a shorter file name without slashes or control characters.";
  if (!file.size) return "The selected file is empty.";
  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
    return `The file must not exceed ${formatDocumentFileSize(DOCUMENT_UPLOAD_MAX_BYTES)}.`;
  }

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isXlsx = /\.xlsx$/i.test(file.name);
  const isXls = /\.xls$/i.test(file.name);
  if (!isPdf && !(documentAcceptsSpreadsheet(documentTypeId) && (isXlsx || isXls))) {
    return documentAcceptsSpreadsheet(documentTypeId)
      ? "The members list must be a PDF, XLS, or XLSX file."
      : "This document must be a PDF file.";
  }

  const signature = await readSignature(file);
  if (isPdf && String.fromCharCode(...signature.slice(0, 5)) !== "%PDF-") {
    return "This file does not appear to be a valid PDF.";
  }
  if (isXlsx && !(signature[0] === 0x50 && signature[1] === 0x4b)) {
    return "This file does not appear to be a valid XLSX workbook.";
  }
  if (isXls) {
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    if (!ole.every((byte, index) => signature[index] === byte)) {
      return "This file does not appear to be a valid XLS workbook.";
    }
  }
  return "";
};
