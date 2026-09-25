import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitOrganizationDocumentToSupabase,
  submitOrganizationDocumentsBatchToSupabase,
  submitDocumentSubmissionForReviewInSupabase,
  loadOrganizationDocumentSubmissionState,
} from "./lydo-connect-supabase";
import { supabase } from "./supabase";

// Mock supabase
vi.mock("./supabase", () => {
  const fromMock = vi.fn();
  const rpcMock = vi.fn();
  const authMock = {
    getSession: vi.fn(),
  };
  const storageMock = {
    from: vi.fn(),
  };
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
      auth: authMock,
      storage: storageMock,
    },
    isSupabaseConfigured: () => true,
    ORGANIZATION_DOCUMENTS_BUCKET: "organization-documents",
  };
});

const createMockPdfFile = (name: string, content = "Mock PDF content"): File => {
  const pdfHeader = "%PDF-1.4\n";
  const str = pdfHeader + content;
  const buf = new TextEncoder().encode(str).buffer;
  const file = new File([str], name, { type: "application/pdf" });
  file.slice = (start?: number, end?: number) => {
    const slicedBuf = buf.slice(start, end);
    return {
      arrayBuffer: async () => slicedBuf,
    } as any;
  };
  return file;
};

describe("Document Submission Performance & Targeted Synchronization Suite", () => {
  const orgId = "org-test-111";
  const userId = "user-test-111";
  const submissionId = "sub-test-111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Targeted State Refresh (loadOrganizationDocumentSubmissionState)", () => {
    it("fetches only document submission and files without executing unrelated domain queries", async () => {
      (supabase!.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: userId } } },
      });

      const profileSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: orgId, user_id: userId, organization_name: "Youth Circle" },
            error: null,
          }),
        }),
      });

      const submissionSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: submissionId,
                  organization_id: orgId,
                  status: "under_admin_review",
                  user_confirmed: true,
                  submitted_at: "2026-09-24T00:00:00.000Z",
                  created_at: "2026-09-24T00:00:00.000Z",
                  updated_at: "2026-09-24T00:00:00.000Z",
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      const filesSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: "file-01",
              submission_id: submissionId,
              document_type_id: "doc-type-01",
              file_url: "storage://organization-documents/file-01.pdf",
              file_name: "resolution.pdf",
              file_type: "application/pdf",
              file_size: 1024,
              validation_status: "correct",
              admin_status: "under_admin_review",
              admin_remarks: null,
              revision_history: [],
              uploaded_at: "2026-09-24T00:00:00.000Z",
              reviewed_at: null,
              created_at: "2026-09-24T00:00:00.000Z",
              updated_at: "2026-09-24T00:00:00.000Z",
              required_document_types: { id: "doc-type-01", name: "Resolution" },
            },
          ],
          error: null,
        }),
      });

      const queriedTables: string[] = [];
      (supabase!.from as any).mockImplementation((table: string) => {
        queriedTables.push(table);
        if (table === "organization_profiles") return { select: profileSelectMock };
        if (table === "document_submissions") return { select: submissionSelectMock };
        if (table === "document_submission_files") return { select: filesSelectMock };
        return {};
      });

      const result = await loadOrganizationDocumentSubmissionState(userId);

      expect(result).toBeDefined();
      expect(result?.documentSubmissions).toHaveLength(1);
      expect(result?.documentSubmissions?.[0].id).toBe(submissionId);
      expect(result?.documentSubmissionFiles).toHaveLength(1);
      expect(result?.documentSubmissionFiles?.[0].id).toBe("file-01");

      // Verify that NO unrelated tables were queried
      expect(queriedTables).toContain("organization_profiles");
      expect(queriedTables).toContain("document_submissions");
      expect(queriedTables).toContain("document_submission_files");
      expect(queriedTables).not.toContain("budget_requests");
      expect(queriedTables).not.toContain("liquidation_reports");
      expect(queriedTables).not.toContain("ypop_entries");
      expect(queriedTables).not.toContain("ypop_periods");
      expect(queriedTables).not.toContain("news_releases");
      expect(queriedTables).not.toContain("inquiries");
    });
  });

  describe("2. Single Document Submission with Context Reusability", () => {
    it("submits a document and reuses preloaded context without redundant network lookups", async () => {
      const mockFile = createMockPdfFile("bylaws.pdf");
      const mockStorageUpload = vi.fn().mockResolvedValue({ error: null });

      (supabase!.storage.from as any).mockReturnValue({
        upload: mockStorageUpload,
      });

      const existingFilesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const upsertFileMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "file-new-1",
              submission_id: submissionId,
              document_type_id: "doc-type-bylaws",
              file_url: `storage://organization-documents/${orgId}/doc-type-bylaws/bylaws.pdf`,
              file_name: "bylaws.pdf",
              file_type: "application/pdf",
              file_size: mockFile.size,
              validation_status: "correct",
              admin_status: "under_admin_review",
              admin_remarks: null,
              revision_history: [],
              uploaded_at: "2026-09-24T00:00:00.000Z",
              reviewed_at: null,
              created_at: "2026-09-24T00:00:00.000Z",
              updated_at: "2026-09-24T00:00:00.000Z",
              required_document_types: { id: "doc-type-bylaws", name: "Constitution & By-Laws" },
            },
            error: null,
          }),
        }),
      });

      const updateSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase!.from as any).mockImplementation((table: string) => {
        if (table === "document_submission_files") {
          return {
            select: existingFilesSelect,
            upsert: upsertFileMock,
          };
        }
        if (table === "document_submissions") {
          return {
            update: updateSubmissionMock,
          };
        }
        return {};
      });

      const mockSession = { user: { id: userId } };
      const mockOrgProfile = {
        id: orgId,
        user_id: userId,
        organization_name: "Youth Circle",
      } as any;
      const mockDocType = {
        id: "doc-type-bylaws",
        name: "Constitution & By-Laws",
        is_active: true,
      } as any;
      const mockSubmission = {
        id: submissionId,
        organization_id: orgId,
        status: "draft",
        submitted_at: null,
      } as any;

      const result = await submitOrganizationDocumentToSupabase({
        documentTypeId: "doc-type-bylaws",
        documentTypeName: "Constitution & By-Laws",
        file: mockFile,
        context: {
          session: mockSession,
          organizationProfile: mockOrgProfile,
          documentTypeRow: mockDocType,
          submission: mockSubmission,
        },
      });

      expect(result.submissionId).toBe(submissionId);
      expect(result.file.fileName).toBe("bylaws.pdf");
      expect(mockStorageUpload).toHaveBeenCalledTimes(1);
      expect(upsertFileMock).toHaveBeenCalledTimes(1);
      expect(updateSubmissionMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Bulk Submission with Controlled Concurrency and Partial Failure Resilience", () => {
    it("processes a batch of valid files concurrently without overwriting and executes review finalization", async () => {
      (supabase!.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: userId } } },
      });

      const mockStorageUpload = vi.fn().mockResolvedValue({ error: null });
      (supabase!.storage.from as any).mockReturnValue({
        upload: mockStorageUpload,
      });

      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: orgId, user_id: userId, organization_name: "Youth Circle" },
            error: null,
          }),
        }),
      });

      const selectSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: submissionId, organization_id: orgId, status: "draft", submitted_at: null }],
              error: null,
            }),
          }),
        }),
      });

      const selectTemplateRowsMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: "doc-01", name: "Doc Type 1", is_active: true },
              { id: "doc-02", name: "Doc Type 2", is_active: true },
              { id: "doc-03", name: "Doc Type 3", is_active: true },
            ],
            error: null,
          }),
        }),
      });

      const existingFilesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const upsertFileMock = vi.fn().mockImplementation((payload) => ({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: `file-${payload.document_type_id}`,
              submission_id: submissionId,
              document_type_id: payload.document_type_id,
              file_url: payload.file_url,
              file_name: payload.file_name,
              file_type: "application/pdf",
              file_size: 1024,
              validation_status: "correct",
              admin_status: "under_admin_review",
              admin_remarks: null,
              revision_history: [],
              uploaded_at: "2026-09-24T00:00:00.000Z",
              reviewed_at: null,
              created_at: "2026-09-24T00:00:00.000Z",
              updated_at: "2026-09-24T00:00:00.000Z",
              required_document_types: { id: payload.document_type_id, name: payload.document_type_id },
            },
            error: null,
          }),
        }),
      }));

      const updateSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const reviewSelectSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: submissionId, status: "draft", submitted_at: null },
              error: null,
            }),
          }),
        }),
      });

      const reviewSelectFilesMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "file-doc-01", file_name: "file1.pdf", file_type: "application/pdf" }],
          error: null,
        }),
      });

      const reviewUpdateFilesMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      (supabase!.from as any).mockImplementation((table: string) => {
        if (table === "organization_profiles") return { select: selectProfileMock };
        if (table === "required_document_types") return selectTemplateRowsMock();
        if (table === "document_submissions") {
          return {
            select: (cols: string) => {
              if (cols === "id,status,submitted_at") {
                return reviewSelectSubmissionMock();
              }
              return selectSubmissionMock();
            },
            update: updateSubmissionMock,
          };
        }
        if (table === "document_submission_files") {
          return {
            select: (cols: string) => {
              if (cols === "id,file_name,file_type") return reviewSelectFilesMock();
              return existingFilesSelect();
            },
            upsert: upsertFileMock,
            update: reviewUpdateFilesMock,
          };
        }
        return {};
      });

      const batchResult = await submitOrganizationDocumentsBatchToSupabase({
        submitMode: "review",
        documents: [
          { documentTypeId: "doc-01", documentTypeName: "Doc Type 1", file: createMockPdfFile("file1.pdf") },
          { documentTypeId: "doc-02", documentTypeName: "Doc Type 2", file: createMockPdfFile("file2.pdf") },
          { documentTypeId: "doc-03", documentTypeName: "Doc Type 3", file: createMockPdfFile("file3.pdf") },
        ],
      });

      expect(batchResult.successCount).toBe(3);
      expect(batchResult.failureCount).toBe(0);
      expect(batchResult.results).toHaveLength(3);
      expect(mockStorageUpload).toHaveBeenCalledTimes(3);
    });

    it("preserves successful files when one file in the batch fails validation or upload", async () => {
      (supabase!.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: userId } } },
      });

      const mockStorageUpload = vi.fn().mockImplementation((path: string) => {
        if (path.includes("doc-bad")) {
          return Promise.resolve({ error: { message: "Storage upload failed for bad file" } });
        }
        return Promise.resolve({ error: null });
      });
      (supabase!.storage.from as any).mockReturnValue({
        upload: mockStorageUpload,
      });

      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: orgId, user_id: userId, organization_name: "Youth Circle" },
            error: null,
          }),
        }),
      });

      const selectSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: submissionId, organization_id: orgId, status: "draft", submitted_at: null }],
              error: null,
            }),
          }),
        }),
      });

      const selectTemplateRowsMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: "doc-good-1", name: "Good Doc 1", is_active: true },
              { id: "doc-bad", name: "Bad Doc", is_active: true },
              { id: "doc-good-2", name: "Good Doc 2", is_active: true },
            ],
            error: null,
          }),
        }),
      });

      const existingFilesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const upsertFileMock = vi.fn().mockImplementation((payload) => ({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: `file-${payload.document_type_id}`,
              submission_id: submissionId,
              document_type_id: payload.document_type_id,
              file_url: payload.file_url,
              file_name: payload.file_name,
              file_type: "application/pdf",
              file_size: 1024,
              validation_status: "correct",
              admin_status: "draft",
              admin_remarks: null,
              revision_history: [],
              uploaded_at: "2026-09-24T00:00:00.000Z",
              reviewed_at: null,
              created_at: "2026-09-24T00:00:00.000Z",
              updated_at: "2026-09-24T00:00:00.000Z",
              required_document_types: { id: payload.document_type_id, name: payload.document_type_id },
            },
            error: null,
          }),
        }),
      }));

      const updateSubmissionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase!.from as any).mockImplementation((table: string) => {
        if (table === "organization_profiles") return { select: selectProfileMock };
        if (table === "required_document_types") return selectTemplateRowsMock();
        if (table === "document_submissions") {
          return {
            select: selectSubmissionMock,
            update: updateSubmissionMock,
          };
        }
        if (table === "document_submission_files") {
          return {
            select: existingFilesSelect,
            upsert: upsertFileMock,
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
          };
        }
        return {};
      });

      const batchResult = await submitOrganizationDocumentsBatchToSupabase({
        submitMode: "draft",
        documents: [
          { documentTypeId: "doc-good-1", documentTypeName: "Good Doc 1", file: createMockPdfFile("good1.pdf") },
          { documentTypeId: "doc-bad", documentTypeName: "Bad Doc", file: createMockPdfFile("bad.pdf") },
          { documentTypeId: "doc-good-2", documentTypeName: "Good Doc 2", file: createMockPdfFile("good2.pdf") },
        ],
      });

      expect(batchResult.successCount).toBe(2);
      expect(batchResult.failureCount).toBe(1);
      expect(batchResult.results[0].success).toBe(true);
      expect(batchResult.results[1].success).toBe(false);
      expect(batchResult.results[1].error).toContain("Storage upload failed");
      expect(batchResult.results[2].success).toBe(true);
    });
  });
});
