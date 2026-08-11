export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const formatDocumentFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

export const documentAcceptsSpreadsheet = (_documentTypeId: string) => false;

export const getAcceptedDocumentFormats = (_documentTypeId: string) => "PDF";

export const getDocumentInputAccept = (_documentTypeId: string) => ".pdf,application/pdf";

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

export const validateOrganizationDocumentFile = async (_documentTypeId: string, file: File) => {
  if (hasUnsafeFileName(file.name)) return "Use a shorter file name without slashes or control characters.";
  if (!file.size) return "The selected file is empty.";
  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
    return `The file must not exceed ${formatDocumentFileSize(DOCUMENT_UPLOAD_MAX_BYTES)}.`;
  }

  const isPdf = file.type === "application/pdf" && /\.pdf$/i.test(file.name);
  if (!isPdf) return "This document must be a PDF file.";

  const signature = await readSignature(file);
  if (String.fromCharCode(...signature.slice(0, 5)) !== "%PDF-") {
    return "This file does not appear to be a valid PDF.";
  }
  return "";
};
