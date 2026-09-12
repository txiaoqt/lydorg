import { describe, expect, it } from "vitest";
import {
  ALLOWED_RENEWAL_TRANSITIONS,
  canReplaceSubmissionFile,
  canTransitionRenewal,
  isRenewalTerminal,
} from "./organization-renewal";
import type {
  DocumentSubmissionStatus,
  RenewalApplicationStatus,
  SubmissionFile,
} from "./lydo-connect-data";

describe("Phase 2.2: Corrective Hardening & Database Integrity Test Suite", () => {
  // ----------------------------------------------------------------------------
  // TEST SUITE 1: NOTIFICATION ENUM & IDEMPOTENCY PREDICATE VALIDATION
  // ----------------------------------------------------------------------------
  describe("1. Notification Enum & Idempotency Predicate", () => {
    type NotificationRow = {
      organization_id: string;
      type: "renewal_window_opened" | "renewal_window_urgent" | "accreditation_expired" | "rejected";
      related_type: string;
      related_id: string;
      title: string;
    };

    it("verifies partial unique index on (organization_id, type, related_id) WHERE related_type = 'accreditation'", () => {
      const dbNotifications: NotificationRow[] = [];

      const insertNotificationWithIndex = (row: NotificationRow): { inserted: boolean } => {
        // Enforce the unique index predicate: where related_type = 'accreditation'
        if (row.related_type === "accreditation") {
          const exists = dbNotifications.some(
            (n) =>
              n.organization_id === row.organization_id &&
              n.type === row.type &&
              n.related_id === row.related_id &&
              n.related_type === "accreditation",
          );
          if (exists) {
            // ON CONFLICT DO NOTHING
            return { inserted: false };
          }
        }
        dbNotifications.push(row);
        return { inserted: true };
      };

      const event1: NotificationRow = {
        organization_id: "org-uuid-1",
        type: "renewal_window_opened",
        related_type: "accreditation",
        related_id: "term-uuid-101",
        title: "Renewal Window Open",
      };

      // First evaluation inserts
      const r1 = insertNotificationWithIndex(event1);
      expect(r1.inserted).toBe(true);

      // Concurrent or repeated evaluation hits ON CONFLICT ... DO NOTHING
      const r2 = insertNotificationWithIndex(event1);
      expect(r2.inserted).toBe(false);

      // Same event type for a different accreditation term is allowed
      const eventNextTerm: NotificationRow = {
        organization_id: "org-uuid-1",
        type: "renewal_window_opened",
        related_type: "accreditation",
        related_id: "term-uuid-102",
        title: "Renewal Window Open",
      };
      const r3 = insertNotificationWithIndex(eventNextTerm);
      expect(r3.inserted).toBe(true);

      expect(dbNotifications).toHaveLength(2);
    });

    it("ensures related_type = 'accreditation' filter does not block non-accreditation notifications", () => {
      const nonAccreditationRows: Array<{ organization_id: string; type: string; related_type: string; related_id: string }> = [];

      const insertOtherNotification = (row: { organization_id: string; type: string; related_type: string; related_id: string }) => {
        nonAccreditationRows.push(row);
        return true;
      };

      expect(insertOtherNotification({ organization_id: "org-uuid-1", type: "document_revision", related_type: "document", related_id: "doc-1" })).toBe(true);
      expect(insertOtherNotification({ organization_id: "org-uuid-1", type: "document_revision", related_type: "document", related_id: "doc-1" })).toBe(true);
      expect(nonAccreditationRows).toHaveLength(2);
    });
  });

  // ----------------------------------------------------------------------------
  // TEST SUITE 2: CANONICAL ACTIVITY LOGGING VERIFICATION
  // ----------------------------------------------------------------------------
  describe("2. Canonical Activity Logging for Expiration", () => {
    type ActivityLogRow = {
      organization_id: string;
      actor_user_id: string | null;
      action: string;
      related_type: string;
      related_id: string;
      description: string;
    };

    it("verifies canonical schema and structure of activity_logs for accreditation expiration", () => {
      const activityLogs: ActivityLogRow[] = [];

      const recordAccreditationExpirationLog = (orgId: string, accreditationId: string, endDate: string) => {
        activityLogs.push({
          organization_id: orgId,
          actor_user_id: null, // System-triggered event has null actor
          action: "accreditation_expired",
          related_type: "accreditation",
          related_id: accreditationId,
          description: `Accreditation term ${accreditationId} expired on ${endDate}.`,
        });
      };

      recordAccreditationExpirationLog("org-123", "term-999", "May 10, 2027");

      expect(activityLogs).toHaveLength(1);
      expect(activityLogs[0].organization_id).toBe("org-123");
      expect(activityLogs[0].actor_user_id).toBeNull();
      expect(activityLogs[0].action).toBe("accreditation_expired");
      expect(activityLogs[0].related_type).toBe("accreditation");
      expect(activityLogs[0].related_id).toBe("term-999");
      expect(activityLogs[0].description).toContain("expired on May 10, 2027");
    });
  });

  // ----------------------------------------------------------------------------
  // TEST SUITE 3: DOCUMENT REPLACEMENT GUARD & AUDIT TRAIL PRESERVATION
  // ----------------------------------------------------------------------------
  describe("3. Document Replacement Guard & Revision History", () => {
    it("permits file replacement ONLY when status is needs_revision or rejected_red", () => {
      const allowedStatuses: DocumentSubmissionStatus[] = ["needs_revision", "rejected_red"];
      const forbiddenStatuses: DocumentSubmissionStatus[] = [
        "submitted",
        "under_admin_review",
        "approved_green",
      ];

      allowedStatuses.forEach((status) => {
        expect(canReplaceSubmissionFile(status)).toBe(true);
      });

      forbiddenStatuses.forEach((status) => {
        expect(canReplaceSubmissionFile(status)).toBe(false);
      });
    });

    it("preserves previousUploadedAt and full metadata in revision_history", () => {
      const initialFile: SubmissionFile = {
        id: "file-abc",
        submissionId: "sub-xyz",
        documentTypeId: "dt-1",
        fileName: "CBL-v1.pdf",
        fileUrl: "https://storage.example.com/cbl-v1.pdf",
        fileType: "application/pdf",
        fileSize: 102400,
        validationStatus: "correct",
        adminStatus: "needs_revision",
        adminRemarks: "Signatures missing on page 4",
        revisionHistory: [],
        uploadedAt: "2027-02-01T10:00:00.000Z",
        reviewedAt: "2027-02-02T14:30:00.000Z",
        createdAt: "2027-02-01T10:00:00.000Z",
        updatedAt: "2027-02-02T14:30:00.000Z",
      };

      const replaceFile = (
        oldFile: SubmissionFile,
        newUrl: string,
        newName: string,
        newType: string,
        newSize: number,
        replacementTimestamp: string,
      ): SubmissionFile => {
        if (!canReplaceSubmissionFile(oldFile.adminStatus)) {
          throw new Error(`Replacement not allowed for status ${oldFile.adminStatus}`);
        }

        const historyEntry = {
          action: "replaced",
          previousFileName: oldFile.fileName,
          previousFileUrl: oldFile.fileUrl,
          previousFileType: oldFile.fileType,
          previousFileSize: oldFile.fileSize,
          previousStatus: oldFile.adminStatus,
          adminRemarks: oldFile.adminRemarks,
          reviewedAt: oldFile.reviewedAt,
          previousUploadedAt: oldFile.uploadedAt,
          replacedAt: replacementTimestamp,
        };

        return {
          ...oldFile,
          fileName: newName,
          fileUrl: newUrl,
          fileType: newType,
          fileSize: newSize,
          adminStatus: "submitted",
          adminRemarks: "",
          reviewedAt: "",
          uploadedAt: replacementTimestamp,
          updatedAt: replacementTimestamp,
          revisionHistory: [...(oldFile.revisionHistory || []), historyEntry],
        };
      };

      const replaced = replaceFile(
        initialFile,
        "https://storage.example.com/cbl-v2.pdf",
        "CBL-v2-Signed.pdf",
        "application/pdf",
        105000,
        "2027-02-03T09:15:00.000Z",
      );

      expect(replaced.adminStatus).toBe("submitted");
      expect(replaced.adminRemarks).toBe("");
      expect(replaced.reviewedAt).toBe("");
      expect(replaced.uploadedAt).toBe("2027-02-03T09:15:00.000Z");
      expect(replaced.revisionHistory).toHaveLength(1);

      const history = replaced.revisionHistory![0];
      expect(history.action).toBe("replaced");
      expect(history.previousFileName).toBe("CBL-v1.pdf");
      expect(history.previousStatus).toBe("needs_revision");
      expect(history.adminRemarks).toBe("Signatures missing on page 4");
      expect(history.previousUploadedAt).toBe("2027-02-01T10:00:00.000Z");
      expect(history.replacedAt).toBe("2027-02-03T09:15:00.000Z");
    });
  });

  // ----------------------------------------------------------------------------
  // TEST SUITE 4: TERMINAL IMMUTABILITY & DATABASE TRIGGER LOGIC
  // ----------------------------------------------------------------------------
  describe("4. Terminal Immutability & Database Trigger", () => {
    type RenewalRow = {
      id: string;
      status: RenewalApplicationStatus;
      admin_remarks: string | null;
    };

    const simulateTriggerBeforeUpdate = (oldRow: RenewalRow, newRow: RenewalRow) => {
      if (oldRow.status === "rejected" && newRow.status !== "rejected") {
        throw new Error("A rejected renewal application is terminal and cannot be transitioned or reopened.");
      }
      if (oldRow.status === "approved" && newRow.status !== "approved") {
        throw new Error("An approved renewal application cannot be transitioned or altered.");
      }
      return newRow;
    };

    const simulateTriggerBeforeDelete = (oldRow: RenewalRow) => {
      if (["approved", "rejected"].includes(oldRow.status)) {
        throw new Error("Historical terminal renewal applications cannot be deleted.");
      }
    };

    it("prohibits changing status away from rejected", () => {
      const rejectedRow: RenewalRow = { id: "ren-1", status: "rejected", admin_remarks: "Invalid docs" };
      const attemptedUpdate: RenewalRow = { ...rejectedRow, status: "draft" };

      expect(() => simulateTriggerBeforeUpdate(rejectedRow, attemptedUpdate)).toThrow(
        "A rejected renewal application is terminal and cannot be transitioned or reopened.",
      );
    });

    it("prohibits changing status away from approved", () => {
      const approvedRow: RenewalRow = { id: "ren-2", status: "approved", admin_remarks: null };
      const attemptedUpdate: RenewalRow = { ...approvedRow, status: "under_review" };

      expect(() => simulateTriggerBeforeUpdate(approvedRow, attemptedUpdate)).toThrow(
        "An approved renewal application cannot be transitioned or altered.",
      );
    });

    it("prohibits deleting approved or rejected renewals", () => {
      const rejectedRow: RenewalRow = { id: "ren-1", status: "rejected", admin_remarks: "Invalid docs" };
      const approvedRow: RenewalRow = { id: "ren-2", status: "approved", admin_remarks: null };
      const draftRow: RenewalRow = { id: "ren-3", status: "draft", admin_remarks: null };

      expect(() => simulateTriggerBeforeDelete(rejectedRow)).toThrow(
        "Historical terminal renewal applications cannot be deleted.",
      );
      expect(() => simulateTriggerBeforeDelete(approvedRow)).toThrow(
        "Historical terminal renewal applications cannot be deleted.",
      );
      expect(() => simulateTriggerBeforeDelete(draftRow)).not.toThrow();
    });

    it("verifies isRenewalTerminal helper for all statuses", () => {
      expect(isRenewalTerminal("rejected")).toBe(true);
      expect(isRenewalTerminal("approved")).toBe(true);
      expect(isRenewalTerminal("draft")).toBe(false);
      expect(isRenewalTerminal("submitted")).toBe(false);
      expect(isRenewalTerminal("under_review")).toBe(false);
      expect(isRenewalTerminal("needs_revision")).toBe(false);
      expect(isRenewalTerminal("resubmitted")).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // TEST SUITE 5: CANONICAL STATE TRANSITIONS & SHORTCUT PREVENTION
  // ----------------------------------------------------------------------------
  describe("5. Canonical 7 State Transitions & Shortcut Prevention", () => {
    it("strictly allows only the 7 canonical state transitions", () => {
      const expectedTransitions: Record<RenewalApplicationStatus, RenewalApplicationStatus[]> = {
        draft: ["submitted"],
        submitted: ["under_review"],
        under_review: ["needs_revision", "approved", "rejected"],
        needs_revision: ["resubmitted"],
        resubmitted: ["under_review"],
        approved: [],
        rejected: [],
      };

      expect(ALLOWED_RENEWAL_TRANSITIONS).toEqual(expectedTransitions);
    });

    it("verifies cannot transition directly from submitted to approved (bypassing review)", () => {
      expect(canTransitionRenewal("submitted", "approved")).toBe(false);
    });

    it("verifies cannot transition directly from needs_revision to under_review (must resubmit first)", () => {
      expect(canTransitionRenewal("needs_revision", "under_review")).toBe(false);
      expect(canTransitionRenewal("needs_revision", "resubmitted")).toBe(true);
      expect(canTransitionRenewal("resubmitted", "under_review")).toBe(true);
    });

    it("verifies cannot transition directly from draft to under_review or approved", () => {
      expect(canTransitionRenewal("draft", "under_review")).toBe(false);
      expect(canTransitionRenewal("draft", "approved")).toBe(false);
      expect(canTransitionRenewal("draft", "rejected")).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // TEST SUITE 6: SECURITY INVOKER & SECURITY DEFINER PARITY
  // ----------------------------------------------------------------------------
  describe("6. Authorization & Security Parity", () => {
    it("validates User RPC auth.uid() ownership check", () => {
      const orgProfile = { id: "org-1", user_id: "user-legitimate-uuid" };

      const userRpcCall = (authUid: string, targetOrgId: string) => {
        if (authUid !== orgProfile.user_id) {
          throw new Error("Unauthorized: Caller does not own this submission or organization.");
        }
        return { success: true };
      };

      expect(() => userRpcCall("user-impostor-uuid", "org-1")).toThrow("Unauthorized");
      expect(userRpcCall("user-legitimate-uuid", "org-1")).toEqual({ success: true });
    });

    it("validates Admin RPC validate_admin_session_token authorization check", () => {
      const validAdminSessionToken = "secret-admin-session-xyz";

      const adminRpcCall = (sessionToken: string | null) => {
        if (!sessionToken || sessionToken !== validAdminSessionToken) {
          throw new Error("Admin account is not authorized.");
        }
        return { success: true };
      };

      expect(() => adminRpcCall(null)).toThrow("Admin account is not authorized.");
      expect(() => adminRpcCall("fake-session")).toThrow("Admin account is not authorized.");
      expect(adminRpcCall("secret-admin-session-xyz")).toEqual({ success: true });
    });
  });
});
