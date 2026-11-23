import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { supabaseUrl } from "@/lib/supabase";

const STORAGE_BUCKETS = new Set([
  "organization-documents",
  "budget-request-files",
  "liquidation-report-files",
  "ypop-files",
  "move-files",
  "template-files",
  "news-release-images",
]);

export const getStorageObjectDisplayFileName = (sourceUrl: string, fallback = "document.pdf") => {
  try {
    const source = new URL(sourceUrl);
    const storagePathMatch = source.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/);
    const storageUriMatch = source.protocol === "storage:"
      ? source.href.match(/^storage:\/\/([^/]+)\/(.+)$/)
      : null;
    const objectPath = storageUriMatch?.[2] ?? storagePathMatch?.[2];
    if (!objectPath) return fallback;

    let fileName = decodeURIComponent(objectPath.split("/").pop() ?? "");
    fileName = fileName
      .replace(/^\d{9,}-/, "")
      .replace(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}-/i, "");
    return fileName || fallback;
  } catch {
    return fallback;
  }
};

const getStorageObjectRequest = (sourceUrl: string) => {
  try {
    const source = new URL(sourceUrl);
    if (source.protocol !== "https:" && source.protocol !== "http:") return null;
    if (!supabaseUrl || source.origin !== new URL(supabaseUrl).origin) return null;

    const objectMatch = source.pathname.match(/^\/storage\/v1\/object\/(sign|public)\/([^/]+)\/.+$/);
    if (!objectMatch || !STORAGE_BUCKETS.has(decodeURIComponent(objectMatch[2]))) return null;
    if (objectMatch[1] === "sign" && !source.searchParams.get("token")) return null;

    return {
      source: source.toString(),
      endpoint: new URL("/functions/v1/open-storage-document", source.origin).toString(),
    };
  } catch {
    return null;
  }
};

const createPreviewTab = () => {
  const previewWindow = window.open("about:blank", "_blank");
  if (!previewWindow) return null;

  previewWindow.opener = null;
  return previewWindow;
};

const submitInlineDocumentRequest = (
  previewWindow: Window,
  endpoint: string,
  sourceUrl: string,
  fileName: string,
) => {
  const form = previewWindow.document.createElement("form");
  form.method = "POST";
  form.action = endpoint;
  form.target = "_self";
  form.hidden = true;

  for (const [name, value] of [["source", sourceUrl], ["filename", fileName || "document"]]) {
    const input = previewWindow.document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  previewWindow.document.body.appendChild(form);
  form.submit();
  form.remove();
};

export const openStorageDocumentInNewTab = (sourceUrl: string, fileName: string) => {
  if (!sourceUrl || typeof window === "undefined" || typeof document === "undefined") return null;

  const storageRequest = getStorageObjectRequest(sourceUrl);
  if (storageRequest) {
    const previewWindow = createPreviewTab();
    if (!previewWindow) return null;
    submitInlineDocumentRequest(previewWindow, storageRequest.endpoint, storageRequest.source, fileName);
    return previewWindow;
  }

  if (sourceUrl.startsWith("storage://")) {
    const previewWindow = createPreviewTab();
    if (!previewWindow) return null;

    void resolveSupabaseFileUrl(sourceUrl)
      .then((resolvedUrl) => {
        const resolvedRequest = resolvedUrl ? getStorageObjectRequest(resolvedUrl) : null;
        if (resolvedRequest) {
          submitInlineDocumentRequest(previewWindow, resolvedRequest.endpoint, resolvedRequest.source, fileName);
        } else if (resolvedUrl) {
          previewWindow.location.replace(resolvedUrl);
        } else {
          previewWindow.close();
        }
      })
      .catch(() => previewWindow.close());

    return previewWindow;
  }

  return window.open(sourceUrl, "_blank", "noopener,noreferrer");
};
