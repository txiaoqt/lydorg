import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadOptions as TusOptions } from "tus-js-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connectionNeedsSlowMode, isTransientUploadError, resumableStorageEndpoint, runAdaptiveUploadQueue, throttledUploadProgress, TUS_CHUNK_BYTES, UPLOAD_RETRY_DELAYS, uploadRegistrationObject } from "./registration-upload-transport";

const tus = vi.hoisted(() => ({ options: null as TusOptions | null, starts: 0, scenario: null as ((options: TusOptions) => void) | null }));
vi.mock("tus-js-client", () => ({ Upload: class {
  constructor(_file: File, options: TusOptions) { tus.options = options; }
  start() { tus.starts++; tus.scenario?.(tus.options!); }
} }));

describe("registration upload transport", () => {
  const upload = vi.fn();
  const remove = vi.fn();
  const getSession = vi.fn();
  const from = vi.fn();
  const client = { auth: { getSession }, storage: { from } } as unknown as SupabaseClient;
  const small = new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" });
  const params = () => ({ client, configuration: "https://example-ref.supabase.co", userId: "user", bucket: "organization-documents", objectPath: "org/type/unique.pdf", file: small });
  beforeEach(() => {
    vi.resetAllMocks();
    tus.options = null; tus.starts = 0;
    tus.scenario = (options) => options.onSuccess?.({} as never);
    from.mockReturnValue({ upload, remove });
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({ data: { session: { user: { id: "user" }, access_token: "organization-token" } }, error: null });
    Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("uses standard upload for a small healthy file without auth, signing, preview or download requests", async () => {
    expect(await uploadRegistrationObject(params())).toBe("storage://organization-documents/org/type/unique.pdf");
    expect(upload).toHaveBeenCalledOnce();
    expect(upload.mock.calls[0][2].upsert).toBe(false);
    expect(getSession).not.toHaveBeenCalled();
    expect(tus.starts).toBe(0);
    expect(from).toHaveBeenCalledTimes(1);
  });
  it("derives a direct Storage endpoint safely and supports local/self-hosted configuration", () => {
    expect(resumableStorageEndpoint("https://example-ref.supabase.co/?secret=no")).toBe("https://example-ref.storage.supabase.co/storage/v1/upload/resumable");
    expect(resumableStorageEndpoint("http://localhost:54321")).toContain("localhost:54321/storage/v1/upload/resumable");
    expect(resumableStorageEndpoint("https://api.example.org")).toContain("api.example.org/storage/v1/upload/resumable");
    expect(() => resumableStorageEndpoint("https://user:pass@example.org")).toThrow();
    expect(() => resumableStorageEndpoint("http://example.org")).toThrow();
  });
  it.each(["slow", "threshold", "data saver"])("uses TUS for %s with 6 MiB chunks and current organization credentials", async (reason) => {
    if (reason === "data saver") Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });
    const file = reason === "threshold" ? new File([new Uint8Array(TUS_CHUNK_BYTES)], "large.pdf", { type: "application/pdf" }) : small;
    await uploadRegistrationObject({ ...params(), file, options: { slowMode: reason === "slow" } });
    expect(upload).not.toHaveBeenCalled();
    expect(tus.options?.chunkSize).toBe(TUS_CHUNK_BYTES);
    expect(tus.options?.retryDelays).toEqual(UPLOAD_RETRY_DELAYS);
    expect(tus.options?.headers).toEqual({ authorization: "Bearer organization-token" });
    expect(tus.options?.metadata?.objectName).toBe(params().objectPath);
    expect(tus.options?.storeFingerprintForResuming).toBe(false);
    const setHeader = vi.fn();
    await tus.options?.onBeforeRequest?.({ setHeader } as never);
    expect(setHeader).toHaveBeenCalledWith("authorization", "Bearer organization-token");
  });
  it("rejects an account change before issuing the next authenticated TUS request", async () => {
    await uploadRegistrationObject({ ...params(), options: { slowMode: true } });
    getSession.mockResolvedValue({ data: { session: { user: { id: "different-user" }, access_token: "other-token" } } });
    const setHeader = vi.fn();
    await expect(tus.options!.onBeforeRequest!({ setHeader } as never)).rejects.toThrow("authentication expired");
    expect(setHeader).not.toHaveBeenCalled();
  });
  it("falls back once to TUS after a transient standard failure, cleaning only its unique attempt", async () => {
    upload.mockResolvedValue({ error: { status: 503, message: "Temporary storage failure" } });
    const onTransientFailure = vi.fn();
    await uploadRegistrationObject({ ...params(), options: { onTransientFailure } });
    expect(upload).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith([params().objectPath]);
    expect(tus.starts).toBe(1);
    expect(onTransientFailure).toHaveBeenCalledOnce();
  });
  it("preserves the original failure if an interrupted standard attempt cannot be cleaned up safely", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    upload.mockResolvedValue({ error: { status: 503, message: "Original connection failure" } });
    remove.mockResolvedValue({ error: { status: 403, message: "Cleanup forbidden" } });
    await expect(uploadRegistrationObject(params())).rejects.toThrow("Original connection failure");
    expect(tus.starts).toBe(0); expect(warn).toHaveBeenCalled(); warn.mockRestore();
  });
  it("requires a current organization token before starting a resumable upload", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(uploadRegistrationObject({ ...params(), options: { slowMode: true } })).rejects.toThrow("sign in");
    expect(tus.starts).toBe(0);
  });
  it.each([400, 401, 403, 409, 413, 422])("does not retry a deterministic %s response", async (status) => {
    const error = { status, message: "Original storage error" };
    upload.mockResolvedValue({ error });
    await expect(uploadRegistrationObject(params())).rejects.toMatchObject(error);
    expect(tus.starts).toBe(0);
    expect(remove).not.toHaveBeenCalled();
  });
  it("classifies only transient failures and keeps workflow/RLS errors permanent", () => {
    for (const status of [408, 429, 500, 502, 503, 504]) expect(isTransientUploadError({ status })).toBe(true);
    for (const message of ["Failed to fetch", "Network connection lost", "Load failed"]) expect(isTransientUploadError(new Error(message))).toBe(true);
    for (const message of ["RLS denied", "This registration is locked", "Storage upload failed for bad file", "Invalid document type"]) expect(isTransientUploadError(new Error(message))).toBe(false);
  });
  it("reports interruption, resume progress, and completion without early success", async () => {
    const progress = vi.fn();
    const networkError = { originalResponse: { getStatus: () => 503 }, message: "Connection interrupted" };
    tus.scenario = (options) => {
      options.onProgress?.(small.size / 2, small.size);
      expect(options.onShouldRetry?.(networkError as never, 0, options as never)).toBe(true);
      options.onProgress?.(small.size, small.size);
      expect(progress.mock.calls.some(([p]) => p.phase === "uploaded")).toBe(false);
      options.onSuccess?.({} as never);
    };
    await uploadRegistrationObject({ ...params(), options: { slowMode: true, onProgress: progress } });
    expect(progress.mock.calls.map(([p]) => p.phase)).toEqual(["uploading", "uploading", "retrying", "uploading", "uploaded"]);
    expect(progress.mock.calls.at(-1)?.[0]).toEqual({ phase: "uploaded", percent: 100 });
  });
  it("lets the TUS client exhaust its bounded policy and preserves the final error", async () => {
    const error = { originalResponse: { getStatus: () => 503 }, message: "Still unavailable" };
    tus.scenario = (options) => {
      for (let retry = 0; retry < options.retryDelays!.length; retry++) expect(options.onShouldRetry?.(error as never, retry, options as never)).toBe(true);
      options.onError?.(error as never);
    };
    await expect(uploadRegistrationObject({ ...params(), options: { slowMode: true } })).rejects.toMatchObject(error);
    expect(tus.starts).toBe(1);
  });
  it("does not retry auth/RLS/schema failures on the resumable path", async () => {
    const error = { originalResponse: { getStatus: () => 403 }, message: "RLS denied" };
    tus.scenario = (options) => {
      expect(options.onShouldRetry?.(error as never, 0, options as never)).toBe(false);
      options.onError?.(error as never);
    };
    await expect(uploadRegistrationObject({ ...params(), options: { slowMode: true } })).rejects.toMatchObject(error);
  });
  it("throttles byte updates while delivering state transitions immediately", () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const callback = vi.fn(); const report = throttledUploadProgress(callback);
    report({ phase: "uploading", percent: 1 });
    for (let percent = 2; percent < 50; percent++) report({ phase: "uploading", percent });
    expect(callback).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(250); report({ phase: "uploading", percent: 50 });
    report({ phase: "retrying" }); report({ phase: "uploaded", percent: 100 });
    expect(callback).toHaveBeenCalledTimes(4);
  });
  it.each([[false, 3], [true, 1]] as const)("uses bounded concurrency in slow=%s", async (slow, expected) => {
    let active = 0; let maximum = 0;
    const visits: number[] = [];
    await runAdaptiveUploadQueue([0, 1, 2, 3, 4, 5], async (item) => {
      visits.push(item); active++; maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1)); active--;
    }, slow);
    expect(maximum).toBe(expected); expect(new Set(visits).size).toBe(6);
  });
  it("reduces remaining work to one worker after a transient failure without duplicate uploads", async () => {
    const visits: number[] = [];
    let active = 0; let lateMaximum = 0;
    await runAdaptiveUploadQueue([0, 1, 2, 3, 4, 5, 6], async (item, _, reduce) => {
      visits.push(item); active++;
      if (item === 0) { await Promise.resolve(); reduce(); }
      if (item >= 3) lateMaximum = Math.max(lateMaximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1)); active--;
    }, false);
    expect(new Set(visits).size).toBe(7); expect(visits).toHaveLength(7); expect(lateMaximum).toBe(1);
  });
  it("treats Network Information as an optional hint", () => {
    expect(connectionNeedsSlowMode()).toBe(false);
    Object.defineProperty(navigator, "connection", { value: { effectiveType: "3g" }, configurable: true });
    expect(connectionNeedsSlowMode()).toBe(true);
  });
});
