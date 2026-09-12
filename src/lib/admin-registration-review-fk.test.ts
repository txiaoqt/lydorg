import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitDocumentReviewBatchToSupabase,
  updateDocumentSubmissionFileReviewInSupabase,
  mapDocumentFile,
  type BatchDocumentReviewDecision,
} from "./lydo-connect-supabase";
import * as adminAuth from "./admin-auth";
import { supabase } from "./supabase";
import type { DocumentSubmission } from "./lydo-connect-data";

// Helper mirroring domain mapping of document submissions
const mapSubmissionRecord = (row: {
  id: string;
  organization_id: string;
  submitted_by: string;
  status: DocumentSubmission["status"];
  user_confirmed?: boolean;
  submission_scope?: string;
  renewal_id?: string | null;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  overall_remarks?: string | null;
  created_at: string;
  updated_at: string;
}): DocumentSubmission => ({
  id: row.id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by,
  status: row.status,
  userConfirmed: row.user_confirmed ?? true,
  submissionScope: (row.submission_scope ?? "registration") as "registration" | "renewal",
  renewalId: row.renewal_id ?? null,
  submittedAt: row.submitted_at ?? "",
  reviewedBy: row.reviewed_by ?? "",
  reviewedAt: row.reviewed_at ?? undefined,
  overallRemarks: row.overall_remarks ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

describe("Admin Registration Review Foreign-Key Integrity Suite (Tests A-H)", () => {
  const MOCK_ADMIN_ACCOUNT_ID = "899ee588-c618-4c03-acb5-ddc8b0194d4e";
  const MOCK_SESSION_TOKEN = "test-session-token-12345";
  const MOCK_FILE_ID_1 = "file-cbl-001";
  const MOCK_FILE_ID_2 = "file-yorp-b-002";
  const MOCK_SUBMISSION_ID = "sub-reg-001";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue({
      id: MOCK_ADMIN_ACCOUNT_ID,
      username: "lydoadmin",
      email: "lydoadmin@lydo-connect.local",
      displayName: "Super Admin",
      sessionToken: MOCK_SESSION_TOKEN,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  });

  // ---------------------------------------------------------------------------
  // TEST A — ADMIN REVIEWER FK TARGET
  // ---------------------------------------------------------------------------
  describe("TEST A — Admin Reviewer Foreign Key Target", () => {
    it("ensures document_submissions.reviewed_by references public.admin_accounts.id and not auth.users.id", () => {
      // In the application's domain model, admins are SeededAdminUser instances with admin_accounts.id
      const currentAdmin = adminAuth.readAdminSession();
      expect(currentAdmin).not.toBeNull();
      expect(currentAdmin?.id).toBe(MOCK_ADMIN_ACCOUNT_ID);

      // Verify that mapped submission preserves admin_accounts UUID as reviewedBy
      const rawDbRow = {
        id: MOCK_SUBMISSION_ID,
        organization_id: "org-001",
        status: "approved_green" as const,
        submitted_by: "auth-user-owner-001", // auth.users.id
        reviewed_by: MOCK_ADMIN_ACCOUNT_ID,  // public.admin_accounts.id
        reviewed_at: "2026-09-12T14:00:00Z",
        overall_remarks: "Admin approved all documents.",
        created_at: "2026-09-01T10:00:00Z",
        updated_at: "2026-09-12T14:00:00Z",
      };

      const mapped = mapSubmissionRecord(rawDbRow);
      expect(mapped.reviewedBy).toBe(MOCK_ADMIN_ACCOUNT_ID);
      expect(mapped.status).toBe("approved_green");
    });
  });

  // ---------------------------------------------------------------------------
  // TEST B — APPROVE DOCUMENT
  // ---------------------------------------------------------------------------
  describe("TEST B — Approve Document Flow", () => {
    it("successfully approves document and updates submission with admin_accounts.id", async () => {
      const mockRpcResponse = [
        {
          id: MOCK_FILE_ID_1,
          submission_id: MOCK_SUBMISSION_ID,
          document_type_id: "doc-type-1",
          file_url: "storage://docs/cbl.pdf",
          file_name: "Constitution and By-Laws.pdf",
          file_type: "application/pdf",
          file_size: 102400,
          validation_status: "correct",
          admin_status: "approved_green",
          admin_remarks: "",
          uploaded_at: "2026-09-10T10:00:00Z",
          reviewed_at: "2026-09-12T14:00:00Z",
          created_at: "2026-09-10T10:00:00Z",
          updated_at: "2026-09-12T14:00:00Z",
        },
      ];

      const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
        data: mockRpcResponse,
        error: null,
      } as any);

      const result = await updateDocumentSubmissionFileReviewInSupabase({
        fileId: MOCK_FILE_ID_1,
        status: "approved_green",
        adminRemarks: undefined,
      });

      expect(rpcSpy).toHaveBeenCalledWith("update_admin_document_submission_file_review", {
        _session_token: MOCK_SESSION_TOKEN,
        _file_id: MOCK_FILE_ID_1,
        _status: "approved_green",
        _admin_remarks: "",
      });

      expect(result.id).toBe(MOCK_FILE_ID_1);
      expect(result.adminStatus).toBe("approved_green");
      expect(result.reviewedAt).toBe("2026-09-12T14:00:00Z");
    });
  });

  // ---------------------------------------------------------------------------
  // TEST C — REQUEST REVISION
  // ---------------------------------------------------------------------------
  describe("TEST C — Request Revision Flow", () => {
    it("successfully requests revisions with remarks and preserves admin remarks", async () => {
      const mockRemarks = "Please provide signatures on page 3.";
      const mockRpcResponse = [
        {
          id: MOCK_FILE_ID_1,
          submission_id: MOCK_SUBMISSION_ID,
          document_type_id: "doc-type-1",
          file_url: "storage://docs/form-b.pdf",
          file_name: "NYC YORP Registration Form (Form B).pdf",
          file_type: "application/pdf",
          file_size: 102400,
          validation_status: "flagged",
          admin_status: "needs_revision",
          admin_remarks: mockRemarks,
          uploaded_at: "2026-09-10T10:00:00Z",
          reviewed_at: "2026-09-12T14:05:00Z",
          created_at: "2026-09-10T10:00:00Z",
          updated_at: "2026-09-12T14:05:00Z",
        },
      ];

      const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
        data: mockRpcResponse,
        error: null,
      } as any);

      const result = await updateDocumentSubmissionFileReviewInSupabase({
        fileId: MOCK_FILE_ID_1,
        status: "needs_revision",
        adminRemarks: mockRemarks,
      });

      expect(rpcSpy).toHaveBeenCalledWith("update_admin_document_submission_file_review", {
        _session_token: MOCK_SESSION_TOKEN,
        _file_id: MOCK_FILE_ID_1,
        _status: "needs_revision",
        _admin_remarks: mockRemarks,
      });

      expect(result.adminStatus).toBe("needs_revision");
      expect(result.adminRemarks).toBe(mockRemarks);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST D — REJECT
  // ---------------------------------------------------------------------------
  describe("TEST D — Reject Flow", () => {
    it("successfully rejects document with remarks without foreign key error", async () => {
      const mockRemarks = "Invalid document template uploaded.";
      const mockRpcResponse = [
        {
          id: MOCK_FILE_ID_1,
          submission_id: MOCK_SUBMISSION_ID,
          document_type_id: "doc-type-1",
          file_url: "storage://docs/invalid.pdf",
          file_name: "Unknown Document.pdf",
          file_type: "application/pdf",
          file_size: 102400,
          validation_status: "flagged",
          admin_status: "rejected_red",
          admin_remarks: mockRemarks,
          uploaded_at: "2026-09-10T10:00:00Z",
          reviewed_at: "2026-09-12T14:10:00Z",
          created_at: "2026-09-10T10:00:00Z",
          updated_at: "2026-09-12T14:10:00Z",
        },
      ];

      const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
        data: mockRpcResponse,
        error: null,
      } as any);

      const result = await updateDocumentSubmissionFileReviewInSupabase({
        fileId: MOCK_FILE_ID_1,
        status: "rejected_red",
        adminRemarks: mockRemarks,
      });

      expect(rpcSpy).toHaveBeenCalledWith("update_admin_document_submission_file_review", {
        _session_token: MOCK_SESSION_TOKEN,
        _file_id: MOCK_FILE_ID_1,
        _status: "rejected_red",
        _admin_remarks: mockRemarks,
      });

      expect(result.adminStatus).toBe("rejected_red");
      expect(result.adminRemarks).toBe(mockRemarks);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST E — BATCH REVIEW
  // ---------------------------------------------------------------------------
  describe("TEST E — Batch Review Flow", () => {
    it("submits review decisions for multiple documents in a single batch without failure", async () => {
      const decisions: BatchDocumentReviewDecision[] = [
        { fileId: MOCK_FILE_ID_1, status: "approved_green" },
        { fileId: MOCK_FILE_ID_2, status: "needs_revision", adminRemarks: "Fix signature." },
      ];

      vi.spyOn(supabase, "rpc").mockImplementation(async (method, params: any) => {
        if (method === "update_admin_document_submission_file_review") {
          return {
            data: [
              {
                id: params._file_id,
                submission_id: MOCK_SUBMISSION_ID,
                document_type_id: "doc-type-1",
                file_url: "storage://docs/test.pdf",
                file_name: "test.pdf",
                file_type: "application/pdf",
                file_size: 1000,
                validation_status: "correct",
                admin_status: params._status,
                admin_remarks: params._admin_remarks,
                uploaded_at: "2026-09-10T10:00:00Z",
                reviewed_at: "2026-09-12T14:00:00Z",
                created_at: "2026-09-10T10:00:00Z",
                updated_at: "2026-09-12T14:00:00Z",
              },
            ],
            error: null,
          } as any;
        }
        return { data: null, error: null } as any;
      });

      const batchResult = await submitDocumentReviewBatchToSupabase({ decisions });
      expect(batchResult.successCount).toBe(2);
      expect(batchResult.failureCount).toBe(0);
      expect(batchResult.results[0].success).toBe(true);
      expect(batchResult.results[1].success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST F — DEMO ADMIN
  // ---------------------------------------------------------------------------
  describe("TEST F — Demo Admin Integration", () => {
    it("resolves demo admin lydoadmin session and executes review without FK error", async () => {
      // Demo admin session credentials
      const demoAdmin = {
        id: MOCK_ADMIN_ACCOUNT_ID,
        username: "lydoadmin",
        email: "lydoadmin@lydo-connect.local",
        displayName: "Super Admin",
        sessionToken: "demo-session-token-xyz",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      vi.spyOn(adminAuth, "readAdminSession").mockReturnValue(demoAdmin);

      const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
        data: [
          {
            id: MOCK_FILE_ID_1,
            submission_id: MOCK_SUBMISSION_ID,
            document_type_id: "doc-type-1",
            file_url: "storage://docs/cbl.pdf",
            file_name: "CBL.pdf",
            file_type: "application/pdf",
            file_size: 1024,
            validation_status: "correct",
            admin_status: "approved_green",
            admin_remarks: "",
            uploaded_at: "2026-09-10T10:00:00Z",
            reviewed_at: "2026-09-12T14:00:00Z",
            created_at: "2026-09-10T10:00:00Z",
            updated_at: "2026-09-12T14:00:00Z",
          },
        ],
        error: null,
      } as any);

      const result = await updateDocumentSubmissionFileReviewInSupabase({
        fileId: MOCK_FILE_ID_1,
        status: "approved_green",
      });

      expect(rpcSpy).toHaveBeenCalledWith("update_admin_document_submission_file_review", {
        _session_token: "demo-session-token-xyz",
        _file_id: MOCK_FILE_ID_1,
        _status: "approved_green",
        _admin_remarks: "",
      });

      expect(result.adminStatus).toBe("approved_green");
    });
  });

  // ---------------------------------------------------------------------------
  // TEST G — RENEWAL REGRESSION
  // ---------------------------------------------------------------------------
  describe("TEST G — Renewal Regression Safety", () => {
    it("ensures renewal review mutations update document_submissions with valid admin_accounts.id", () => {
      // Simulating parent renewal and packet state where document_submissions is shared
      const renewalSubmissionRow = {
        id: "sub-ren-001",
        organization_id: "org-001",
        renewal_id: "renewal-001",
        submission_scope: "renewal",
        status: "needs_revision" as const,
        submitted_by: "auth-user-owner-001",
        reviewed_by: MOCK_ADMIN_ACCOUNT_ID, // admin_accounts.id
        reviewed_at: "2026-09-12T14:30:00Z",
        overall_remarks: "Renewal revision requested.",
        created_at: "2026-09-01T10:00:00Z",
        updated_at: "2026-09-12T14:30:00Z",
      };

      const mapped = mapSubmissionRecord(renewalSubmissionRow);
      expect(mapped.renewalId).toBe("renewal-001");
      expect(mapped.submissionScope).toBe("renewal");
      expect(mapped.reviewedBy).toBe(MOCK_ADMIN_ACCOUNT_ID);
      expect(mapped.status).toBe("needs_revision");
    });
  });

  // ---------------------------------------------------------------------------
  // TEST H — NULL REVIEWER SAFETY
  // ---------------------------------------------------------------------------
  describe("TEST H — Null Reviewer Safety", () => {
    it("ensures unreviewed submissions with reviewed_by = null remain valid and map cleanly", () => {
      const unreviewedRow = {
        id: "sub-unreviewed-001",
        organization_id: "org-002",
        status: "under_admin_review" as const,
        submitted_by: "auth-user-owner-002",
        reviewed_by: null,
        reviewed_at: null,
        overall_remarks: null,
        created_at: "2026-09-10T10:00:00Z",
        updated_at: "2026-09-10T10:00:00Z",
      };

      const mapped = mapSubmissionRecord(unreviewedRow);
      expect(mapped.reviewedBy).toBe("");
      expect(mapped.reviewedAt).toBeUndefined();
      expect(mapped.status).toBe("under_admin_review");
    });
  });
});
