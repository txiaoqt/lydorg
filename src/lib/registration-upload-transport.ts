import type { SupabaseClient } from "@supabase/supabase-js";

export type UploadPhase = "waiting" | "uploading" | "retrying" | "uploaded" | "submitting" | "success" | "failed";
export type UploadProgress = { phase: UploadPhase; percent?: number };
export type UploadOptions = {
  slowMode?: boolean;
  onProgress?: (progress: UploadProgress) => void;
  onTransientFailure?: () => void;
};
export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
export const UPLOAD_RETRY_DELAYS = [0, 3000, 5000, 10000, 20000];

export function registrationUploadError(error: unknown): Error {
  if (error instanceof Error) return error;
  const details = error && typeof error === "object" ? error : {};
  const message = "message" in details ? String(details.message) : "The document upload failed.";
  return Object.assign(new Error(message), details);
}

export function connectionNeedsSlowMode(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; downlink?: number; rtt?: number } }).connection;
  return Boolean(connection && (connection.saveData || ["slow-2g", "2g", "3g"].includes(connection.effectiveType ?? "") || (connection.downlink != null && connection.downlink < 1) || (connection.rtt != null && connection.rtt > 600)));
}

export function isTransientUploadError(error: unknown): boolean {
  const value = error as { status?: number | string; statusCode?: number | string; originalResponse?: { getStatus(): number }; message?: string } | null;
  const status = Number(value?.originalResponse?.getStatus() ?? value?.statusCode ?? value?.status ?? 0);
  if (status) return status === 408 || status === 429 || (status >= 500 && status <= 599);
  if (value?.originalResponse?.getStatus() === 0) return true;
  const message = value?.message ?? String(error);
  if (/rls|row.level security|permission|unauthori|forbidden|locked|schema|validation/i.test(message)) return false;
  return /failed to fetch|fetch failed|network|connection (?:lost|interrupted|reset)|timed? ?out|timeout|\bload failed\b/i.test(message);
}

export function resumableStorageEndpoint(configuration: string): string {
  const url = new URL(configuration);
  if (url.username || url.password || !["https:", "http:"].includes(url.protocol)) throw new Error("Invalid Supabase Storage configuration.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Supabase Storage requires HTTPS.");
  if (/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)) url.hostname = url.hostname.replace(".supabase.co", ".storage.supabase.co");
  url.pathname = "/storage/v1/upload/resumable";
  url.search = "";
  url.hash = "";
  return url.toString();
}

// State changes are immediate; byte progress is limited to four updates per second.
export function throttledUploadProgress(callback?: UploadOptions["onProgress"]): NonNullable<UploadOptions["onProgress"]> {
  let lastPhase: UploadPhase | undefined;
  let lastTime = 0;
  let lastPercent: number | undefined;
  return (progress) => {
    const now = Date.now();
    if (progress.phase !== lastPhase || (lastPercent == null && progress.percent != null) || progress.percent === 100 || (now - lastTime >= 250 && progress.percent !== lastPercent)) {
      lastPhase = progress.phase;
      lastPercent = progress.percent;
      lastTime = now;
      callback?.(progress);
    }
  };
}

export async function uploadRegistrationObject(params: {
  client: SupabaseClient;
  configuration: string | (() => string);
  userId: string;
  bucket: string;
  objectPath: string;
  file: File;
  options?: UploadOptions;
}): Promise<string> {
  const { client, bucket, objectPath, file, options = {} } = params;
  const report = throttledUploadProgress(options.onProgress);
  const slow = options.slowMode || connectionNeedsSlowMode();
  report({ phase: "uploading" });
  if (!slow && file.size < TUS_CHUNK_BYTES) {
    let standardError: unknown;
    try {
      const { error } = await client.storage.from(bucket).upload(objectPath, file, { upsert: false, contentType: file.type || "application/pdf" });
      standardError = error;
    } catch (error) { standardError = error; }
    if (!standardError) {
      report({ phase: "uploaded", percent: 100 });
      return `storage://${bucket}/${objectPath}`;
    }
    if (!isTransientUploadError(standardError)) throw registrationUploadError(standardError);
    options.onTransientFailure?.();
    report({ phase: "retrying" });
    // A lost response may have created this unique object. Remove only this
    // attempt before restarting with TUS; never overwrite another document.
    try {
      const { error } = await client.storage.from(bucket).remove([objectPath]);
      if (error) throw error;
    } catch (cleanupError) {
      console.warn("Unable to clean up interrupted registration upload", cleanupError);
      throw registrationUploadError(standardError);
    }
  }

  const { Upload } = await import("tus-js-client");
  const endpoint = resumableStorageEndpoint(typeof params.configuration === "function" ? params.configuration() : params.configuration);
  const { data: { session }, error: authError } = await client.auth.getSession();
  if (authError) throw authError;
  if (!session?.access_token || session.user.id !== params.userId) throw new Error("Please sign in with your organization account before uploading.");
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint,
      chunkSize: TUS_CHUNK_BYTES,
      retryDelays: UPLOAD_RETRY_DELAYS,
      uploadDataDuringCreation: true,
      // Resume within this upload/retry lifecycle without persisting URLs across accounts.
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: true,
      headers: { authorization: `Bearer ${session.access_token}` },
      metadata: { bucketName: bucket, objectName: objectPath, contentType: file.type || "application/pdf", cacheControl: "3600" },
      onBeforeRequest: async (request) => {
        const { data: { session: current }, error } = await client.auth.getSession();
        if (error) throw error;
        if (!current?.access_token || current.user.id !== params.userId) throw new Error("Organization authentication expired. Please sign in again.");
        request.setHeader("authorization", `Bearer ${current.access_token}`);
      },
      onShouldRetry: (error) => {
        if (!isTransientUploadError(error)) return false;
        options.onTransientFailure?.();
        report({ phase: "retrying" });
        return true;
      },
      onProgress: (sent, total) => report({ phase: "uploading", percent: total ? Math.min(99, Math.floor(sent / total * 100)) : undefined }),
      onError: (error) => reject(registrationUploadError(error)),
      onSuccess: () => { report({ phase: "uploaded", percent: 100 }); resolve(); },
    });
    upload.start();
  });
  return `storage://${bucket}/${objectPath}`;
}

export async function runAdaptiveUploadQueue<T>(items: T[], work: (item: T, index: number, reduceConcurrency: () => void) => Promise<void>, slowMode: boolean): Promise<void> {
  let nextIndex = 0;
  let concurrency = slowMode ? 1 : 3;
  let active = 0;
  let idleWaiter: (() => void) | undefined;
  const reduceConcurrency = () => { concurrency = 1; };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async (_, worker) => {
    while (nextIndex < items.length) {
      if (worker >= concurrency) return;
      // Existing workers may finish; the remaining worker waits for them before
      // starting another file, so the reduced queue is truly sequential.
      if (concurrency === 1 && active > 0) await new Promise<void>((resolve) => { idleWaiter = resolve; });
      if (nextIndex >= items.length) return;
      const index = nextIndex++;
      active++;
      try { await work(items[index], index, reduceConcurrency); }
      finally {
        active--;
        if (!active) { idleWaiter?.(); idleWaiter = undefined; }
      }
    }
  }));
}
