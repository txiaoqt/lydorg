import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrationRetryDocuments, submitOrganizationDocumentsBatchToSupabase, submitOrganizationDocumentToSupabase } from "./lydo-connect-supabase";
import type { BatchOrganizationDocumentUploadInput } from "./lydo-connect-supabase";

const mock = vi.hoisted(() => ({ from: vi.fn(), upload: vi.fn(), remove: vi.fn(), invoke: vi.fn(), getSession: vi.fn() }));
vi.mock("./supabase", () => ({
  supabaseUrl: "https://example-ref.supabase.co",
  supabase: { from: mock.from, auth: { getSession: mock.getSession }, storage: { from: vi.fn(() => ({ upload: mock.upload, remove: mock.remove })) }, functions: { invoke: mock.invoke } },
}));

type Row = Record<string, any>;
const org = { id: "org", user_id: "user", organization_name: "Test Organization" };
const templates = ["Constitution and By-Laws", "Registration Form", "List of Members"].map((name, index) => ({ id: `00000000-0000-4000-8000-00000000000${index}`, name, is_active: true }));
function pdf(name: string, signature = "%PDF-1.4", size?: number): File {
  const file = new File([signature], name, { type: "application/pdf" });
  Object.defineProperty(file, "slice", { value: (start?: number, end?: number) => ({ arrayBuffer: async () => new TextEncoder().encode(signature.slice(start, end)).buffer }) });
  if (size != null) Object.defineProperty(file, "size", { value: size });
  return file;
}
const documents = (): BatchOrganizationDocumentUploadInput[] => templates.map((type, index) => ({ documentTypeId: type.id, documentTypeName: type.name, file: pdf(`file-${index}.pdf`) }));

describe("registration bulk reliability and review lock regressions", () => {
  let rows: Row[];
  let parent: Row;
  let queries: { table: string; action: string; payload?: Row; ids?: string[] }[];
  let metadataFailure: Row | null;
  let metadataThrows: boolean;
  let commitBeforeError: boolean;
  let failFinalization: boolean;
  let failParent: boolean;
  let unverifiedSave: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
    rows = []; queries = []; metadataFailure = null; metadataThrows = false; commitBeforeError = false; failFinalization = false; failParent = false; unverifiedSave = false;
    parent = { id: "submission", organization_id: "org", submitted_by: "user", submission_scope: "registration", renewal_id: null, status: "draft", submitted_at: null };
    mock.getSession.mockResolvedValue({ data: { session: { user: { id: "user" }, access_token: "token" } } });
    mock.upload.mockResolvedValue({ error: null }); mock.remove.mockResolvedValue({ error: null }); mock.invoke.mockResolvedValue({ data: null, error: null });
    mock.from.mockImplementation((table: string) => {
      let action = "select";
      let payload: Row | undefined;
      const filters: [string, unknown][] = [];
      let ids: string[] | undefined;
      const execute = async (single = false) => {
        queries.push({ table, action, payload, ids });
        const matches = (row: Row) => filters.every(([key, value]) => row[key] === value) && (!ids || ids.includes(row.id));
        if (table === "organization_profiles") return { data: single ? org : [org], error: null };
        if (table === "required_document_types") return { data: single ? templates.find(matches) : templates.filter(matches), error: null };
        if (table === "document_submissions") {
          if (action === "update") {
            if (failParent) return { data: null, error: { status: 400, message: "Parent update failed" } };
            Object.assign(parent, payload); return { data: null, error: null };
          }
          return { data: single ? parent : [parent], error: null };
        }
        if (table !== "document_submission_files") throw new Error(`Unnecessary network query: ${table}`);
        if (action === "upsert") {
          if (metadataFailure && !commitBeforeError) {
            if (metadataThrows) throw metadataFailure;
            return { data: null, error: metadataFailure };
          }
          const old = rows.find((row) => row.submission_id === payload!.submission_id && row.document_type_id === payload!.document_type_id);
          const row = { ...payload, id: old?.id ?? `new-${rows.length}`, created_at: "2026-10-08T00:00:00Z", updated_at: "2026-10-08T00:00:00Z", required_document_types: templates.find((type) => type.id === payload!.document_type_id) };
          if (old) rows[rows.indexOf(old)] = row; else rows.push(row);
          return metadataFailure ? { data: null, error: metadataFailure } : { data: row, error: null };
        }
        if (action === "update") {
          if (failFinalization) return { data: null, error: { status: 400, message: "Review finalization failed" } };
          rows.filter(matches).forEach((row) => Object.assign(row, payload));
          return { data: null, error: null };
        }
        if (unverifiedSave && single) return { data: null, error: { status: 503, message: "Read unavailable" } };
        const selected = rows.filter(matches);
        return { data: single ? selected[0] ?? null : selected, error: null };
      };
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        in: (_key: string, values: string[]) => { ids = values; return query; },
        order: () => query, limit: () => query,
        upsert: (value: Row) => { action = "upsert"; payload = value; return query; },
        update: (value: Row) => { action = "update"; payload = value; return query; },
        single: () => execute(true), maybeSingle: () => execute(true),
        then: (resolve: any, reject: any) => execute().then(resolve, reject),
      };
      return query;
    });
  });

  it("adds missing documents while another file is under review and finalizes only newly persisted draft IDs", async () => {
    const locked = { id: "locked", submission_id: parent.id, document_type_id: "other-type", file_url: "storage://organization-documents/existing.pdf", file_name: "existing.pdf", file_type: "application/pdf", admin_status: "under_admin_review" };
    rows.push(locked); parent.status = "under_admin_review";
    mock.upload.mockImplementation(async (_path, file) => ({ error: file.name === "file-1.pdf" ? { status: 400, message: "Invalid upload" } : null }));
    const progress = vi.fn();
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: documents(), onProgress: progress });
    expect(result.successCount).toBe(2); expect(result.failureCount).toBe(1);
    expect(locked.admin_status).toBe("under_admin_review");
    const finalize = queries.filter((query) => query.table === "document_submission_files" && query.action === "update");
    expect(finalize).toHaveLength(1);
    expect(finalize[0].ids).toEqual(result.results.filter((entry) => entry.success).map((entry) => entry.file!.id));
    expect(finalize[0].ids).not.toContain("locked");
    expect(queries.filter((query) => query.table === "document_submissions" && query.action === "update")).toHaveLength(1);
    expect(queries.filter((query) => query.table === "required_document_types")).toHaveLength(1);
    expect(progress.mock.calls.some(([, event]) => event.phase === "submitting")).toBe(true);
  });
  it("Retry Failed uploads only unsuccessful items and preserves the correct type and parent", async () => {
    const input = documents();
    mock.upload.mockImplementation(async (_path, file) => ({ error: file.name === "file-1.pdf" ? { status: 400, message: "Failure" } : null }));
    const first = await submitOrganizationDocumentsBatchToSupabase({ documents: input });
    const retry = registrationRetryDocuments(input, first.results);
    expect(retry).toHaveLength(1); expect(retry[0].documentTypeId).toBe(templates[1].id);
    mock.upload.mockResolvedValue({ error: null });
    const second = await submitOrganizationDocumentsBatchToSupabase({ documents: retry });
    expect(second.successCount).toBe(1);
    expect(second.results[0].submissionId).toBe(parent.id);
    expect(mock.upload.mock.calls.map(([, file]) => file.name).filter((name) => name === "file-0.pdf")).toHaveLength(1);
    expect(mock.upload.mock.calls.map(([, file]) => file.name).filter((name) => name === "file-2.pdf")).toHaveLength(1);
    expect(rows).toHaveLength(3);
  });
  it.each(["file status", "parent status"])("retries a failed %s finalization without uploading saved files twice", async (stage) => {
    failFinalization = stage === "file status"; failParent = stage === "parent status";
    const input = documents();
    const first = await submitOrganizationDocumentsBatchToSupabase({ documents: input });
    expect(first.failureCount).toBe(3); expect(rows).toHaveLength(3);
    expect(first.results.every((entry) => entry.file && entry.submissionId)).toBe(true);
    failFinalization = false; failParent = false;
    const second = await submitOrganizationDocumentsBatchToSupabase({ documents: registrationRetryDocuments(input, first.results) });
    expect(second.successCount).toBe(3); expect(parent.status).toBe("under_admin_review");
    expect(mock.upload).toHaveBeenCalledTimes(3);
    expect(queries.filter((query) => query.action === "upsert")).toHaveLength(3);
    expect(queries.filter((query) => query.table === "document_submission_files" && query.action === "update")).toHaveLength(stage === "file status" ? 2 : 1);
  });
  it("calculates draft parent status only once after all upload workers finish", async () => {
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: documents(), submitMode: "draft" });
    expect(result.successCount).toBe(3);
    const updates = queries.filter((query) => query.table === "document_submissions" && query.action === "update");
    expect(updates).toHaveLength(1); expect(parent.status).toBe("draft");
    expect(rows.every((row) => row.admin_status === "draft")).toBe(true);
  });
  it("rejects a retry whose document type no longer matches the saved file", async () => {
    failFinalization = true;
    const first = await submitOrganizationDocumentsBatchToSupabase({ documents: [documents()[0]] });
    const retry = { ...documents()[1], retryResult: first.results[0] };
    failFinalization = false;
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: [retry] });
    expect(result.results[0].error).toContain("document type changed");
    expect(mock.upload).toHaveBeenCalledOnce();
    expect(rows).toHaveLength(1);
  });
  it.each([false, true])("cleans only the new object on DB save failure (thrown=%s), preserving the original error", async (throws) => {
    metadataFailure = { status: 400, message: "Original metadata save error" }; metadataThrows = throws;
    const old = { id: "old", submission_id: parent.id, document_type_id: templates[0].id, file_url: "storage://organization-documents/old-valid.pdf", admin_status: "draft" };
    rows.push(old);
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: [documents()[0]], submitMode: "draft" });
    expect(result.failureCount).toBe(1); expect(result.results[0].error).toBe("Original metadata save error");
    expect(mock.remove).toHaveBeenCalledWith([mock.upload.mock.calls[0][0]]);
    expect(mock.remove.mock.calls[0][0]).not.toContain("old-valid.pdf");
    expect(rows[0]).toBe(old);
  });
  it("logs cleanup failure without hiding the metadata error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    metadataFailure = { status: 400, message: "Save error" };
    mock.remove.mockResolvedValue({ error: { message: "Cleanup denied" } });
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: [documents()[0]] });
    expect(result.results[0].error).toBe("Save error"); expect(warn).toHaveBeenCalled(); warn.mockRestore();
  });
  it("reconciles a committed metadata save after response loss and never deletes that valid new file", async () => {
    metadataFailure = { status: 503, message: "Lost save response" }; commitBeforeError = true;
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: [documents()[0]] });
    expect(result.successCount).toBe(1); expect(mock.remove).not.toHaveBeenCalled();
    expect(rows[0].admin_status).toBe("under_admin_review");
  });
  it("does not delete the new object when an ambiguous save cannot be verified", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    metadataFailure = { status: 503, message: "Save response unavailable" }; unverifiedSave = true;
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: [documents()[0]] });
    expect(result.failureCount).toBe(1); expect(mock.remove).not.toHaveBeenCalled(); expect(warn).toHaveBeenCalled(); warn.mockRestore();
  });
  it.each(["under_admin_review", "approved_green", "needs_revision"])("keeps the existing %s document lock/business rule", async (status) => {
    rows.push({ id: "locked", submission_id: parent.id, document_type_id: templates[0].id, file_url: "storage://organization-documents/valid.pdf", admin_status: status });
    const result = await submitOrganizationDocumentsBatchToSupabase({ documents: [documents()[0]], submitMode: "draft" });
    expect(result.failureCount).toBe(1); expect(mock.upload).not.toHaveBeenCalled(); expect(rows[0].admin_status).toBe(status);
    expect(result.results[0].error).toMatch(status === "needs_revision" ? /corrected document/ : /review|locked/);
  });
  it.each([
    [pdf("too-big.pdf", "%PDF-1.4", 10 * 1024 * 1024 + 1), "must not exceed 10 MB"],
    [pdf("invalid.pdf", "bogus"), "valid PDF"],
    [new File(["text"], "wrong.txt", { type: "text/plain" }), "must be a PDF"],
    [new File([], "empty.pdf", { type: "application/pdf" }), "cannot be empty"],
  ])("retains PDF/size validation before Storage requests", async (file, message) => {
    await expect(submitOrganizationDocumentToSupabase({ documentTypeName: templates[0].name, file: file as File })).rejects.toThrow(message as string);
    expect(mock.upload).not.toHaveBeenCalled();
  });
});
