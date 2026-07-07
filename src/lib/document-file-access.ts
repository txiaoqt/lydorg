import type { SubmissionFile } from "./lydo-connect-data";

const approvedStatuses = new Set(["approved", "approved_green"]);
const correctionStatuses = new Set(["needs_revision", "rejected_red"]);

export const isApprovedRegistrationDocument = (
  file?: Pick<SubmissionFile, "adminStatus"> | null,
) => Boolean(file && approvedStatuses.has(file.adminStatus));

export const resolveRegistrationDocumentAccess = ({
  file,
  submissionApproved = false,
}: {
  file?: Pick<SubmissionFile, "adminStatus" | "fileUrl"> | null;
  submissionApproved?: boolean;
}) => {
  const approved = isApprovedRegistrationDocument(file);
  const hasAttachedFile = Boolean(file?.fileUrl?.trim());
  return {
    approved,
    hasAttachedFile,
    canViewAttachedFile: hasAttachedFile,
    canReplaceOrRemove: Boolean(
      file &&
      !approved &&
      !submissionApproved &&
      correctionStatuses.has(file.adminStatus),
    ),
  };
};

