// No credentials or signed URLs are logged. Authorization is an authoritative
// database operation; a bucket/path supplied by the browser is only a lookup key.
export type StorageGrant = { bucket_id: string; object_name: string };
export type StorageAccessDependencies = {
  authorize: (token: string, action: string, bucket: string, path: string, resourceId: string | null, fileName: string | null) => Promise<StorageGrant | null>;
  sign: (grant: StorageGrant, seconds: number) => Promise<string | null>;
  upload: (grant: StorageGrant) => Promise<{ token: string } | null>;
  remove: (grant: StorageGrant) => Promise<boolean>;
};
const headers = {
  "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const buckets = new Set(["organization-documents", "budget-request-files", "liquidation-report-files", "ypop-files", "move-files", "template-files", "news-release-images"]);
export function createStorageAccessHandler(deps: StorageAccessDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
    try {
      // Bound JSON input before parsing; upload binaries go directly to Storage.
      const reader = request.body?.getReader();
      if (!reader) return reply({ error: "Invalid storage request." }, 400);
      const decoder = new TextDecoder(); let raw = "", bytes = 0;
      while (true) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 8192) { await reader.cancel(); return reply({ error: "Invalid storage request." }, 400); }
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
      const body = JSON.parse(raw);
      const { action, bucket, path = "", resourceId = null, fileName = null, sessionToken } = body ?? {};
      if (!["sign", "upload", "delete"].includes(action) || !buckets.has(bucket) ||
          typeof path !== "string" || path.length > 2048 || path.split("/").some((part: string) => part === ".." || part === ".") ||
          typeof sessionToken !== "string" || !sessionToken || sessionToken.length > 4096 ||
          (resourceId !== null && (typeof resourceId !== "string" || !/^[0-9a-f-]{36}$/i.test(resourceId))) ||
          (fileName !== null && (typeof fileName !== "string" || fileName.length > 255))) {
        return reply({ error: "Invalid storage request." }, 400);
      }
      if (action !== "sign" && !["template-files", "news-release-images"].includes(bucket)) {
        return reply({ error: "Operation not permitted." }, 403);
      }
      const grant = await deps.authorize(sessionToken, action, bucket, path, resourceId, fileName);
      if (!grant || grant.bucket_id !== bucket || !grant.object_name ||
          (action !== "upload" && grant.object_name !== path)) return reply({ error: "Storage access denied." }, 403);
      if (action === "sign") {
        // Preserve current lifetime pending real iframe/download duration tests.
        const signedUrl = await deps.sign(grant, 3600);
        return signedUrl ? reply({ signedUrl, expiresIn: 3600 }) : reply({ error: "File temporarily unavailable." }, 503);
      }
      if (action === "upload") {
        const result = await deps.upload(grant);
        return result ? reply({ bucket: grant.bucket_id, path: grant.object_name, token: result.token }) : reply({ error: "Upload temporarily unavailable." }, 503);
      }
      return await deps.remove(grant) ? reply({ removed: true }) : reply({ error: "Removal temporarily unavailable." }, 503);
    } catch {
      // Do not relay database messages, paths, tokens or SDK errors to logs/client.
      return reply({ error: "Storage request could not be authorized or completed." }, 400);
    }
  };
}
