import type { ActivityLog, DocumentSubmission, SubmissionFile } from "@/lib/lydo-connect-data";

const isOrganizationBatchEntry = (log: ActivityLog) => {
  const action = log.action?.toLowerCase() || "";
  return (
    !action.includes("review") &&
    (action.includes("batch_submitted") || action.includes("submitted batch") || action.includes("batch document submission"))
  );
};

/**
 * One activity entry per submitted registration document, never a vague "batch" entry.
 * Older uploads predate the per-document log, so those are filled in from the file itself.
 */
export function withIndividualDocumentSubmissions(
  logs: ActivityLog[],
  files: SubmissionFile[],
  submission: Pick<DocumentSubmission, "id" | "organizationId" | "submittedBy"> | null | undefined,
): ActivityLog[] {
  const result = logs.filter((log) => !isOrganizationBatchEntry(log));
  if (!submission) return result;

  const loggedFileIds = new Set(
    result
      .filter((log) => log.action === "Submitted document" || log.action === "Replaced document")
      .map((log) => log.relatedId),
  );
  for (const file of files) {
    const uploadedAt = file.uploadedAt?.trim();
    if (
      file.submissionId !== submission.id ||
      file.adminStatus === "draft" ||
      loggedFileIds.has(file.id) ||
      !uploadedAt ||
      Number.isNaN(new Date(uploadedAt).getTime())
    ) {
      continue;
    }
    result.push({
      id: `document-submitted-${file.id}`,
      actorUserId: submission.submittedBy || "",
      organizationId: submission.organizationId,
      action: "Submitted document",
      relatedType: "document_submission_file",
      relatedId: file.id,
      description: `Submitted ${file.documentTypeName || file.fileName} for review.`,
      createdAt: uploadedAt,
    });
  }
  return result;
}
