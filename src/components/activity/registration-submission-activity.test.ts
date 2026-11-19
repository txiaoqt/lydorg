import { describe, expect, it } from "vitest";
import type { ActivityLog, SubmissionFile } from "@/lib/lydo-connect-data";
import { formatDocumentActivityLabel } from "./RecentActivityPreview";
import { withIndividualDocumentSubmissions } from "./registration-submission-activity";

const submission = { id: "sub-1", organizationId: "org-1", submittedBy: "user-1" };
const file = (id: string, extra: Partial<SubmissionFile> = {}) =>
  ({ id, submissionId: "sub-1", documentTypeName: `Doc ${id}`, fileName: `${id}.pdf`, adminStatus: "under_admin_review", uploadedAt: "2026-11-19T08:00:00Z", ...extra }) as SubmissionFile;
const log = (action: string, relatedId = "sub-1"): ActivityLog => ({
  id: action, actorUserId: "", organizationId: "org-1", action, relatedType: "document_submission", relatedId, description: "", createdAt: "2026-11-19T08:00:00Z",
});

describe("withIndividualDocumentSubmissions", () => {
  it("shows one entry per submitted document instead of a batch entry", () => {
    const logs = [log("batch_submitted"), { ...log("Submitted document", "a"), description: "Submitted Doc a for review." }];
    const result = withIndividualDocumentSubmissions(logs, [file("a"), file("b"), file("c", { adminStatus: "draft" })], submission);

    expect(result.map((entry) => formatDocumentActivityLabel(entry))).toEqual([
      "Doc a submitted for review",
      "Doc b submitted for review",
    ]);
  });

  it("keeps the admin's batch review entry", () => {
    const result = withIndividualDocumentSubmissions([log("Submitted batch document review")], [], submission);
    expect(result).toHaveLength(1);
  });
});
