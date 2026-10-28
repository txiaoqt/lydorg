import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";

const FALLBACK_RENEWAL_FILENAME = "Renewal document.pdf";
const OBJECT_URL_CLEANUP_DELAY_MS = 1000;

function cleanFilename(value: string | undefined): string {
  return (value ?? "")
    .replace(/[\\/\u0000-\u001f<>:"|?*]/g, "_")
    .trim()
    .replace(/^\.+$/, "");
}

export function getPwaDocumentFilename(
  reference: string,
  originalFilename?: string,
): string {
  const original = cleanFilename(originalFilename);
  if (original) return original;

  try {
    const pathname = new URL(reference, window.location.origin).pathname;
    const finalSegment = pathname.split("/").filter(Boolean).pop() ?? "";
    const decoded = cleanFilename(decodeURIComponent(finalSegment));
    if (decoded) return decoded;
  } catch {
    // Invalid or incomplete URL paths use a neutral filename below.
  }

  return FALLBACK_RENEWAL_FILENAME;
}

async function resolveAuthorizedUrl(reference: string): Promise<string> {
  try {
    const url = await resolveSupabaseFileUrl(reference);
    if (url) return url;
  } catch {
    // Do not propagate resolver errors that may contain a signed URL.
  }
  throw new Error("The document is unavailable.");
}

export async function downloadPwaDocument(
  reference: string,
  filename: string,
): Promise<void> {
  let objectUrl: string | null = null;
  let anchor: HTMLAnchorElement | null = null;
  try {
    const authorizedUrl = await resolveAuthorizedUrl(reference);
    const response = await fetch(authorizedUrl);
    if (!response.ok) throw new Error("The document download failed.");

    const file = await response.blob();
    objectUrl = URL.createObjectURL(file);
    anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = getPwaDocumentFilename(reference, filename);
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
  } catch {
    throw new Error("Unable to download this document. Please check your connection and try again.");
  } finally {
    anchor?.remove();
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl!), OBJECT_URL_CLEANUP_DELAY_MS);
  }
}

export async function openPwaDocumentInNewTab(reference: string): Promise<void> {
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("Allow pop-ups to open this document in a new tab.");

  // Retain the browsing-context handle for the asynchronous signed-URL lookup,
  // then clear opener access before loading the private document.
  popup.opener = null;
  try {
    const authorizedUrl = await resolveAuthorizedUrl(reference);
    popup.location.replace(authorizedUrl);
  } catch {
    popup.close();
    throw new Error("Unable to open this document. Please check your connection and try again.");
  }
}
