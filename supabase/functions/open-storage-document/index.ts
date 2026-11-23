const allowedBuckets = new Set([
  "organization-documents",
  "budget-request-files",
  "liquidation-report-files",
  "ypop-files",
  "move-files",
  "template-files",
  "news-release-images",
]);

// This function is invoked by a browser form with no auth header. A private
// Storage URL is the short-lived capability; Storage revalidates it on fetch.
const MAX_REQUEST_BYTES = 32 * 1024;

const errorResponse = (status: number, message: string) => new Response(message, {
  status,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  },
});

const readBoundedForm = async (request: Request) => {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") return null;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return null;

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new URLSearchParams(new TextDecoder().decode(body));
};

const sanitizeFileName = (value: string | null) => {
  const fileName = (value ?? "document")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "_")
    .trim()
    .slice(0, 180);

  return fileName || "document";
};

const contentDispositionFor = (fileName: string) => {
  const asciiFileName = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\;]/g, "_");
  const encodedFileName = encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  try {
    const form = await readBoundedForm(request);
    const sourceValue = form?.get("source") ?? "";
    const requestedFileName = form?.get("filename") ?? "";
    if (!form || !sourceValue || sourceValue.length > 8192 || requestedFileName.length > 255) {
      return errorResponse(400, "Invalid file request.");
    }

    const sourceUrl = new URL(sourceValue);
    const configuredStorageOrigin = new URL(Deno.env.get("SUPABASE_URL") ?? "").origin;
    const objectMatch = sourceUrl.pathname.match(/^\/storage\/v1\/object\/(sign|public)\/([^/]+)\/.+$/);
    if (
      sourceUrl.origin !== configuredStorageOrigin ||
      sourceUrl.username ||
      sourceUrl.password ||
      sourceUrl.hash ||
      !objectMatch ||
      !allowedBuckets.has(decodeURIComponent(objectMatch[2])) ||
      (objectMatch[1] === "sign" && !sourceUrl.searchParams.get("token"))
    ) {
      return errorResponse(403, "File access could not be authorized.");
    }

    const upstream = await fetch(sourceUrl, { method: "GET" });
    if (!upstream.ok) {
      return errorResponse(
        upstream.status === 404 ? 404 : upstream.status === 400 || upstream.status === 401 || upstream.status === 403 ? 403 : 502,
        "The file could not be opened. It may have expired or you may no longer have access.",
      );
    }

    const responseHeaders = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": contentDispositionFor(sanitizeFileName(requestedFileName)),
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });

    for (const headerName of ["content-length", "content-type", "etag", "last-modified"]) {
      const value = upstream.headers.get(headerName);
      if (value) responseHeaders.set(headerName, value);
    }
    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "application/octet-stream");
    }

    return new Response(upstream.body, { status: 200, headers: responseHeaders });
  } catch {
    return errorResponse(502, "The file could not be opened right now.");
  }
});
