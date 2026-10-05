export const PWA_DOCUMENT_PREVIEW_EVENT = "ytrace:pwa-document-preview";
export type PwaDocumentPreviewRequest = { reference: string; title: string };

export function requestPwaDocumentPreview(reference: string, title: string) {
  if (!reference || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PwaDocumentPreviewRequest>(PWA_DOCUMENT_PREVIEW_EVENT, { detail: { reference, title } }));
}
