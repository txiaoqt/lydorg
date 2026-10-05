import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { PortalDocumentPreviewModal } from "@/components/portal/PortalDocumentPreviewModal";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { PWA_DOCUMENT_PREVIEW_EVENT, type PwaDocumentPreviewRequest } from "@/lib/pwa-document-preview";

type PreviewRequest = PwaDocumentPreviewRequest;

export function PwaDocumentPreviewHost() {
  const [request, setRequest] = useState<PreviewRequest | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleRequest = (event: Event) => setRequest((event as CustomEvent<PreviewRequest>).detail);
    window.addEventListener(PWA_DOCUMENT_PREVIEW_EVENT, handleRequest);
    return () => window.removeEventListener(PWA_DOCUMENT_PREVIEW_EVENT, handleRequest);
  }, []);

  useEffect(() => {
    let active = true;
    setResolvedUrl("");
    setError("");
    if (!request) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    void resolveSupabaseFileUrl(request.reference).then((url) => {
      if (!url) throw new Error("This file is currently unavailable.");
      if (active) setResolvedUrl(url);
    }).catch(() => {
      if (active) setError("This file could not be loaded. Check your connection and try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]);

  const extension = request?.title.split(".").pop()?.toLowerCase();
  const inline = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension ?? "");

  return (
    <PortalDocumentPreviewModal
      open={Boolean(request)}
      onOpenChange={(open) => { if (!open) setRequest(null); }}
      previewTitle={request?.title || "Document preview"}
      previewUrl={resolvedUrl}
      previewCanInline={inline}
      updatedAt="Not recorded"
      previewEmptyMessage={loading ? "Loading secure file preview…" : error || "The preview is not available."}
      className="pwa-document-preview"
    />
  );
}
